import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigateWithReturn, useRememberWorldsListPath } from '@/hooks/useNavigationReturn';
import { useAppStore, useStore } from '@/store';
import { motion } from 'framer-motion';
import {
  Globe,
  Users,
  FileText,
  Heart,
  Plus,
  MoreVertical,
  Clock,
  Eye,
  ChevronUp,
  ChevronDown,
  Download,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { sha256Hex } from '@/lib/password';
import { verifyAccountPassword } from '@/services/authService';
import type { World } from '@/types';
import { orderedActiveWorlds } from '@/lib/worldOrder';
import { buildWorldExport, parseWorldImport, remapWorldImport } from '@/lib/storyImportExport';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WorldFormModal, type WorldFormValues } from '@/components/modals/crud/WorldFormModal';
import { WorldDetailModal } from '@/components/modals/crud/WorldDetailModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
const DASHBOARD_WORLD_LIMIT = 9;

function downloadWorldJson(worldId: string) {
  const bundle = buildWorldExport(useStore.getState(), worldId);
  if (!bundle) {
    toast.error('No se pudo exportar');
    return;
  }
  const safeName = bundle.world.name.replace(/[^\w\s-]/g, '').slice(0, 40) || worldId;
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `story-table-mundo-${safeName}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast.success('Mundo exportado');
}

type Variant = 'dashboard' | 'full';

type Props = {
  variant: Variant;
};

export function WorldsGridSection({ variant }: Props) {
  const navigate = useNavigate();
  const navigateWithReturn = useNavigateWithReturn();
  useRememberWorldsListPath();
  const worldsAll = useAppStore((s) => s.worlds);
  const orderIds = useAppStore((s) => s.dashboardWorldIds);
  const shiftDashboardWorld = useAppStore((s) => s.shiftDashboardWorld);
  const characters = useAppStore((s) => s.characters.filter((c) => !c.isDeleted));
  const scenes = useAppStore((s) => s.scenes.filter((sc) => !sc.isDeleted));
  const toggleFavoriteWorld = useAppStore((s) => s.toggleFavoriteWorld);
  const addWorld = useAppStore((s) => s.addWorld);
  const updateWorld = useAppStore((s) => s.updateWorld);
  const deleteWorld = useAppStore((s) => s.deleteWorld);
  const duplicateWorld = useAppStore((s) => s.duplicateWorld);
  const importWorld = useAppStore((s) => s.importWorld);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [worldModalOpen, setWorldModalOpen] = useState(false);
  const [editingWorld, setEditingWorld] = useState<World | null>(null);
  const [detailWorld, setDetailWorld] = useState<World | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<World | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const ordered = orderedActiveWorlds(worldsAll, orderIds);
  const isDashboard = variant === 'dashboard';
  const displayWorlds = isDashboard ? ordered.slice(0, DASHBOARD_WORLD_LIMIT) : ordered;
  const hasMore = isDashboard && ordered.length > DASHBOARD_WORLD_LIMIT;

  const buildWorldPayload = async (values: WorldFormValues, existing?: World | null) => {
    let passwordHash = existing?.passwordHash;
    let password = existing?.password;
    if (values.protected) {
      if (values.password) {
        if (existing?.protected && (existing.passwordHash || existing.password)) {
          const accountOk = await verifyAccountPassword(values.accountPassword ?? '');
          if (!accountOk) {
            toast.error('Contraseña de cuenta incorrecta');
            return null;
          }
        }
        passwordHash = await sha256Hex(values.password);
        password = undefined;
      } else if (!existing?.passwordHash && !existing?.password) {
        toast.error('La contraseña es obligatoria si proteges el mundo');
        return null;
      }
    } else {
      passwordHash = undefined;
      password = undefined;
    }

    const base: Omit<World, 'id' | 'createdAt' | 'updatedAt'> = {
      name: values.name,
      description: values.description,
      imageUrl: values.imageUrl,
      tags: values.tags,
      worldType: values.worldType,
      protected: values.protected,
      passwordHash,
      password,
      isFavorite: existing?.isFavorite ?? false,
      isPinned: existing?.isPinned ?? false,
      isDeleted: false,
    };
    return base;
  };

  const handleWorldSubmit = async (values: WorldFormValues) => {
    const payload = await buildWorldPayload(values, editingWorld);
    if (!payload) return;

    if (editingWorld) {
      updateWorld(editingWorld.id, payload);
      toast.success('Mundo actualizado');
      setEditingWorld(null);
    } else {
      addWorld(payload);
      toast.success('Mundo creado');
    }
    setWorldModalOpen(false);
  };

  const openCreateWorld = () => {
    setEditingWorld(null);
    setWorldModalOpen(true);
  };

  const handleImportFile = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text()) as unknown;
      const bundle = parseWorldImport(raw);
      if (!bundle) {
        toast.error('JSON inválido. Usa un archivo exportado desde Mis Mundos.');
        return;
      }
      const remapped = remapWorldImport(bundle);
      const newId = importWorld(remapped);
      toast.success(`Mundo “${remapped.world.name}” importado`);
      navigateWithReturn(`/world/${newId}`);
    } catch {
      toast.error('No se pudo leer el archivo JSON');
    }
  };

  const cardNavigate = (worldId: string) => navigateWithReturn(`/world/${worldId}`);

  return (
    <>
      <div className={isDashboard ? '' : 'space-y-6'}>
        {!isDashboard && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
                Mis Mundos
              </h1>
              <p className="text-sm text-[#5A6078]">{ordered.length} mundos activos</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                aria-label="Importar mundo JSON"
                title="Importar mundo JSON"
                onClick={() => importInputRef.current?.click()}
                className="story-btn-secondary flex h-9 w-9 items-center justify-center p-0"
              >
                <Upload size={16} />
              </button>
              <button type="button" onClick={openCreateWorld} className="story-btn-primary text-sm">
                <Plus size={16} /> Nuevo Mundo
              </button>
            </div>
          </div>
        )}

        {isDashboard && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
              Mis Mundos
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {hasMore && (
                <button
                  type="button"
                  onClick={() => navigate('/mundos')}
                  className="story-btn-secondary text-sm"
                >
                  Ver más ({ordered.length - DASHBOARD_WORLD_LIMIT} más)
                </button>
              )}
              <button type="button" onClick={openCreateWorld} className="story-btn-primary text-sm">
                <Plus size={16} /> Nuevo Mundo
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {displayWorlds.map((world, i) => (
            <motion.div
              key={world.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="story-card group cursor-pointer overflow-hidden"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') cardNavigate(world.id);
              }}
              onClick={(e) => {
                if (menuOpenId) return;
                const t = e.target as HTMLElement;
                if (t.closest('[data-no-nav]')) return;
                cardNavigate(world.id);
              }}
            >
              <div className="relative aspect-video overflow-hidden">
                {world.imageUrl ? (
                  <img
                    src={world.imageUrl}
                    alt={world.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1E2230] to-[#2A3045]">
                    <Globe size={48} className="text-[#3A4460]" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#151820] via-transparent to-transparent" />

                {isDashboard && ordered.length > 1 && (
                  <div
                    data-no-nav
                    className="absolute left-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <button
                      type="button"
                      aria-label="Subir en el tablero"
                      data-no-nav
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        shiftDashboardWorld(world.id, -1);
                      }}
                      className="rounded-lg bg-black/50 p-1.5 text-white backdrop-blur-sm hover:bg-black/70"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label="Bajar en el tablero"
                      data-no-nav
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        shiftDashboardWorld(world.id, 1);
                      }}
                      className="rounded-lg bg-black/50 p-1.5 text-white backdrop-blur-sm hover:bg-black/70"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                )}

                <div
                  data-no-nav
                  className="absolute top-3 right-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    aria-label="Favorito"
                    data-no-nav
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteWorld(world.id);
                    }}
                    className="rounded-lg bg-black/40 p-2 backdrop-blur-sm transition-all hover:bg-[#D61E2B]/80"
                  >
                    <Heart size={14} className={world.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-white'} />
                  </button>
                  <DropdownMenu
                    open={menuOpenId === world.id}
                    onOpenChange={(open) => setMenuOpenId(open ? world.id : null)}
                  >
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Menú del mundo"
                        data-no-nav
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg bg-black/40 p-2 backdrop-blur-sm transition-all hover:bg-[#1E2230]/80"
                      >
                        <MoreVertical size={14} className="text-white" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="min-w-[200px] border-[#2A3045] bg-[#111318] text-[#E8E9EB]"
                      onCloseAutoFocus={(e) => e.preventDefault()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        className="cursor-pointer focus:bg-[#1E2230]"
                        onSelect={(e) => {
                          e.preventDefault();
                          setMenuOpenId(null);
                          setDetailWorld(world);
                        }}
                      >
                        <Eye size={14} className="mr-2" /> Ver detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer focus:bg-[#1E2230]"
                        onSelect={(e) => {
                          e.preventDefault();
                          setMenuOpenId(null);
                          setEditingWorld(world);
                          setWorldModalOpen(true);
                        }}
                      >
                        Editar mundo
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer focus:bg-[#1E2230]"
                        onSelect={(e) => {
                          e.preventDefault();
                          setMenuOpenId(null);
                          const nid = duplicateWorld(world.id);
                          if (nid) toast.success('Mundo duplicado');
                        }}
                      >
                        Duplicar mundo
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer focus:bg-[#1E2230]"
                        onSelect={(e) => {
                          e.preventDefault();
                          setMenuOpenId(null);
                          toggleFavoriteWorld(world.id);
                        }}
                      >
                        {world.isFavorite ? 'Quitar favorito' : 'Marcar favorito'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer focus:bg-[#1E2230]"
                        onSelect={(e) => {
                          e.preventDefault();
                          setMenuOpenId(null);
                          setEditingWorld(world);
                          setWorldModalOpen(true);
                        }}
                      >
                        Proteger con contraseña
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer focus:bg-[#1E2230]"
                        onSelect={(e) => {
                          e.preventDefault();
                          setMenuOpenId(null);
                          downloadWorldJson(world.id);
                        }}
                      >
                        <Download size={14} className="mr-2" /> Exportar JSON
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-[#2A3045]" />
                      <DropdownMenuItem
                        className="cursor-pointer text-[#D61E2B] focus:bg-[#D61E2B]/10"
                        onSelect={(e) => {
                          e.preventDefault();
                          setMenuOpenId(null);
                          setDeleteTarget(world);
                        }}
                      >
                        Eliminar a papelera
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="mb-1 text-lg font-semibold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
                    {world.name}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {world.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#8B91A7]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 border-t border-[#1E2230] px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs text-[#5A6078]">
                  <Users size={12} />
                  <span>{characters.filter((c) => c.worldId === world.id).length}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#5A6078]">
                  <FileText size={12} />
                  <span>{scenes.filter((s) => s.worldId === world.id).length}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#5A6078]">
                  <Clock size={12} />
                  <span>{new Date(world.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: displayWorlds.length * 0.05 }}
            onClick={openCreateWorld}
            className="story-card flex aspect-[16/10] min-h-[200px] cursor-pointer flex-col items-center justify-center border-dashed border-[#3A4460] transition-all hover:border-[#D61E2B]"
          >
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#1E2230] transition-all group-hover:bg-[#D61E2B]/10">
              <Plus size={24} className="text-[#5A6078]" />
            </div>
            <p className="text-sm text-[#5A6078]">Crear Nuevo Mundo</p>
          </motion.div>
        </div>
      </div>

      <WorldFormModal
        open={worldModalOpen}
        onClose={() => {
          setWorldModalOpen(false);
          setEditingWorld(null);
        }}
        initialData={editingWorld ?? undefined}
        onSubmit={handleWorldSubmit}
      />

      <WorldDetailModal
        open={!!detailWorld}
        onClose={() => setDetailWorld(null)}
        world={detailWorld}
        onEdit={() => {
          if (!detailWorld) return;
          setEditingWorld(detailWorld);
          setWorldModalOpen(true);
        }}
      />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar mundo"
        message={`¿Enviar “${deleteTarget?.name ?? ''}” y su contenido a la papelera?`}
        confirmLabel="Sí, eliminar"
        onConfirm={() => {
          if (deleteTarget) {
            deleteWorld(deleteTarget.id);
            toast.success('Mundo enviado a la papelera');
          }
        }}
      />
    </>
  );
}
