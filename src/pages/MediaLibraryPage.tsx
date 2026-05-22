import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Archive,
  Copy,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  FolderOpen,
  LayoutGrid,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { isFirebaseConfigured } from '@/lib/firebase';
import {
  fetchUserMediaFiles,
  uploadUserMediaFile,
  deleteUserMediaFile,
  renameUserMediaFile,
  type UserMediaFile,
  type MediaFileKind,
} from '@/services/userFilesService';
import { findUrlReferencesInState } from '@/lib/storeUrlReferences';
import { useStore } from '@/store';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { AudioPlayer } from '@/components/common/AudioPlayer';

const KIND_META: Record<MediaFileKind, { label: string; icon: typeof FileImage; color: string }> = {
  image: { label: 'Imagen', icon: FileImage, color: '#3B82F6' },
  audio: { label: 'Audio', icon: FileAudio, color: '#8B5CF6' },
  video: { label: 'Video', icon: FileVideo, color: '#22C55E' },
  document: { label: 'Documento', icon: FileText, color: '#EAB308' },
  other: { label: 'Otro', icon: Archive, color: '#5A6078' },
};

const FILTER_OPTIONS: { id: MediaFileKind | 'all'; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'all', label: 'Todos', icon: LayoutGrid },
  { id: 'image', label: 'Imagen', icon: FileImage },
  { id: 'audio', label: 'Audio', icon: FileAudio },
  { id: 'video', label: 'Video', icon: FileVideo },
  { id: 'document', label: 'Documento', icon: FileText },
  { id: 'other', label: 'Otro', icon: Archive },
];

function formatBytes(n?: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibraryPage() {
  const user = useAppStore((s) => s.user);
  const replaceUrl = useAppStore((s) => s.replaceStorageUrlInStore);
  const [files, setFiles] = useState<UserMediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MediaFileKind | 'all'>('all');
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<UserMediaFile | null>(null);
  const [renameTarget, setRenameTarget] = useState<UserMediaFile | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [detail, setDetail] = useState<UserMediaFile | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !isFirebaseConfigured()) {
      setFiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchUserMediaFiles(user.id);
      setFiles(list);
    } catch {
      toast.error('No se pudieron cargar los archivos');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files.filter((f) => {
      if (filter !== 'all' && f.kind !== filter) return false;
      if (!q) return true;
      return (
        f.displayName.toLowerCase().includes(q) ||
        f.relativePath.toLowerCase().includes(q)
      );
    });
  }, [files, filter, query]);

  const onUpload = async (fileList: FileList | null) => {
    if (!fileList?.length || !user?.id) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        await uploadUserMediaFile(user.id, file);
      }
      toast.success('Archivo(s) subido(s)');
      await load();
    } catch {
      toast.error('Error al subir');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !user?.id) return;
    const refs = findUrlReferencesInState(useStore.getState(), deleteTarget.downloadUrl);
    try {
      await deleteUserMediaFile(user.id, deleteTarget.downloadUrl);
      if (refs.length > 0) {
        replaceUrl(deleteTarget.downloadUrl, '');
        toast.info('Referencias en la biblioteca limpiadas');
      }
      toast.success('Archivo eliminado');
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const confirmRename = async () => {
    if (!renameTarget || !user?.id || !renameValue.trim()) return;
    try {
      const newUrl = await renameUserMediaFile(user.id, renameTarget, renameValue.trim());
      replaceUrl(renameTarget.downloadUrl, newUrl);
      toast.success('Archivo renombrado y referencias actualizadas');
      setRenameTarget(null);
      await load();
    } catch {
      toast.error('No se pudo renombrar');
    }
  };

  const copyUrl = (url: string) => {
    void navigator.clipboard.writeText(url);
    toast.success('URL copiada');
  };

  if (!isFirebaseConfigured()) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl">
        <div className="story-card p-8 text-center">
          <FolderOpen size={40} className="mx-auto mb-4 text-[#5A6078]" />
          <h1 className="text-xl font-semibold text-[#E8E9EB]">Biblioteca de archivos</h1>
          <p className="mt-2 text-sm text-[#8B91A7]">
            Conecta Firebase Storage para indexar y gestionar tus archivos subidos.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
            Biblioteca de archivos
          </h1>
          <p className="mt-1 text-sm text-[#5A6078]">
            {files.length} archivo{files.length !== 1 ? 's' : ''} en Firebase Storage
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="story-btn-secondary text-sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
          <label className={`story-btn-primary text-sm cursor-pointer ${uploading ? 'opacity-60' : ''}`}>
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Subir archivo
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void onUpload(e.target.files)}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
          <input
            className="story-input w-full pl-10"
            placeholder="Buscar por nombre o ruta…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = filter === opt.id;
            const color = opt.id === 'all' ? '#D61E2B' : KIND_META[opt.id as MediaFileKind]?.color ?? '#5A6078';
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                title={opt.label}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-200 ${
                  active
                    ? 'border-transparent text-white shadow-md'
                    : 'border-[#2A3045] bg-[#1E2230] text-[#8B91A7] hover:border-[#3A4460] hover:text-[#E8E9EB]'
                }`}
                style={active ? { backgroundColor: color, borderColor: color } : undefined}
              >
                <Icon size={14} className="shrink-0" />
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-[#D61E2B]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="story-card py-16 text-center">
          <Archive size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="text-[#5A6078]">No hay archivos{filter !== 'all' ? ' de este tipo' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((file) => {
            const meta = KIND_META[file.kind];
            const Icon = meta.icon;
            const refs = findUrlReferencesInState(useStore.getState(), file.downloadUrl);
            return (
              <div
                key={file.relativePath + file.downloadUrl}
                className="story-card group overflow-hidden p-0 transition-all hover:border-[#D61E2B]/30"
              >
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => setDetail(file)}
                >
                  <div className="flex h-36 items-center justify-center bg-[#0B0D10]">
                    {file.kind === 'image' ? (
                      <img src={file.downloadUrl} alt="" className="h-full w-full object-cover" />
                    ) : file.kind === 'audio' ? (
                      <FileAudio size={40} className="text-[#8B5CF6]" />
                    ) : (
                      <Icon size={40} style={{ color: meta.color }} />
                    )}
                  </div>
                </button>
                <div className="space-y-2 p-3">
                  <p className="truncate text-sm font-medium text-[#E8E9EB]" title={file.displayName}>
                    {file.displayName}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-[#5A6078]">
                    <span>{meta.label}</span>
                    <span>{formatBytes(file.sizeBytes)}</span>
                  </div>
                  {refs.length > 0 && (
                    <p className="text-[10px] text-[#8B5CF6]">
                      Usado en {refs.length} lugar{refs.length > 1 ? 'es' : ''}
                    </p>
                  )}
                  <div className="flex gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 hover:bg-[#1E2230]"
                      title="Copiar URL"
                      onClick={() => copyUrl(file.downloadUrl)}
                    >
                      <Copy size={14} className="text-[#8B91A7]" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 hover:bg-[#1E2230]"
                      title="Renombrar"
                      onClick={() => {
                        setRenameTarget(file);
                        setRenameValue(file.displayName.replace(/\.[^.]+$/, ''));
                      }}
                    >
                      <Pencil size={14} className="text-[#8B91A7]" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 hover:bg-[#D61E2B]/10"
                      title="Eliminar"
                      onClick={() => setDeleteTarget(file)}
                    >
                      <Trash2 size={14} className="text-[#D61E2B]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BaseModal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.displayName ?? 'Archivo'}
        description={detail?.relativePath}
        maxWidthClass="max-w-xl"
        footer={
          <button type="button" className="story-btn-secondary text-sm" onClick={() => setDetail(null)}>
            Cerrar
          </button>
        }
      >
        {detail && (
          <div className="space-y-4">
            {detail.kind === 'image' && (
              <img src={detail.downloadUrl} alt="" className="max-h-72 w-full rounded-xl border border-[#2A3045] object-contain" />
            )}
            {detail.kind === 'audio' && <AudioPlayer src={detail.downloadUrl} />}
            {detail.kind === 'video' && (
              <video src={detail.downloadUrl} controls className="max-h-72 w-full rounded-xl border border-[#2A3045]" />
            )}
            <p className="break-all text-xs text-[#5A6078]">{detail.downloadUrl}</p>
            <div>
              <p className="mb-2 text-xs font-mono uppercase text-[#5A6078]">Referencias en tu biblioteca</p>
              {findUrlReferencesInState(useStore.getState(), detail.downloadUrl).length === 0 ? (
                <p className="text-sm text-[#8B91A7]">Sin referencias activas</p>
              ) : (
                <ul className="space-y-1 text-sm text-[#E8E9EB]">
                  {findUrlReferencesInState(useStore.getState(), detail.downloadUrl).map((r, i) => (
                    <li key={i} className="rounded-lg bg-[#1E2230] px-3 py-2">
                      {r.entityLabel}
                      <span className="text-[#5A6078]"> · {r.fieldPath}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </BaseModal>

      <BaseModal
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title="Renombrar archivo"
        description="Se actualizarán las URLs en todas las entidades que lo usen."
        footer={
          <>
            <button type="button" className="story-btn-secondary text-sm" onClick={() => setRenameTarget(null)}>
              Cancelar
            </button>
            <button type="button" className="story-btn-primary text-sm" onClick={() => void confirmRename()}>
              Guardar
            </button>
          </>
        }
      >
        <input
          className="story-input w-full"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          placeholder="Nuevo nombre"
        />
      </BaseModal>

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        message={
          deleteTarget
            ? `¿Eliminar "${deleteTarget.displayName}"? Las referencias en tu biblioteca quedarán vacías.`
            : ''
        }
        onConfirm={() => void confirmDelete()}
      />
    </motion.div>
  );
}
