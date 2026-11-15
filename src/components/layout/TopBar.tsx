import { cloudConflictReview } from '@/services/cloudConflictReview';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { stageLibraryImport } from '@/lib/conflictReview';
import { ConflictReviewModal } from '@/components/sync/ConflictReviewModal';
import { MobileNavigation } from './MobileNavigation';
import { useAppStore, useStore } from '@/store';
import { Search, Plus, Bell, Command, User, Settings, LogOut, Lightbulb, FileText, Sparkles, Download, Upload, CloudUpload, CloudCog, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRef, useState, useMemo, useSyncExternalStore, type ChangeEvent } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { isFirebaseConfigured } from '@/lib/firebase';
import { logout as firebaseLogout } from '@/services/authService';
import { buildLibraryExport } from '@/lib/storyImportExport';
import { pushStoryBundle, getStorySlice, resolveCloudConflict, refreshCloudConflict } from '@/services/storyBundleSync';
import { formatFirestoreSaveError } from '@/lib/firestorePayload';
import { AccountSettingsModal } from '@/components/modals/AccountSettingsModal';

export function TopBar() {
  const fileImportRef = useRef<HTMLInputElement>(null);
  const setActiveModal = useAppStore((s) => s.setActiveModal);
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const logoutStore = useAppStore((s) => s.logout);
  const ideasFree = useAppStore((s) => s.ideas.filter((i) => !i.isDeleted && !i.worldId).length);
  const scenesRecent = useAppStore((s) => s.scenes.filter((sc) => !sc.isDeleted).slice(-3));
  const [savingCloud, setSavingCloud] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [recoveryOpen,setRecoveryOpen]=useState(false);
  const [importBusy,setImportBusy]=useState(false);
  const [reviewInitial,setReviewInitial]=useState<ReturnType<typeof stageLibraryImport>|undefined>();
  const [reviewKey,setReviewKey]=useState(0);
  const capturedConflict=useSyncExternalStore(cloudConflictReview.subscribe,cloudConflictReview.getSnapshot,()=>null);
  const [dismissedConflict,setDismissedConflict]=useState<number|null>(null);
  const activeConflict=capturedConflict?.ownerId===user?.id?capturedConflict:null;
  const capturedCopies=useMemo(()=>activeConflict?stageLibraryImport(
    JSON.parse(JSON.stringify(activeConflict.local)),
    JSON.parse(JSON.stringify(activeConflict.remote)),
    'Versión de la nube al detectar el conflicto'):undefined,[activeConflict]);
  const syncError = useAppStore((s) => s.firebaseSyncError);
  const autoSaveEnabled = useAppStore((s) => s.firebaseAutoSaveEnabled);
  const autoSaveSyncing = useAppStore((s) => s.firebaseAutoSaveSyncing);
  const setAutoSaveEnabled = useAppStore((s) => s.setFirebaseAutoSaveEnabled);

  const handleLogout = async () => {
    try {
      if (isFirebaseConfigured()) await firebaseLogout();
    } catch {
      /* ignore */
    }
    logoutStore();
    toast.success('Sesión cerrada');
    navigate(isFirebaseConfigured() ? '/login' : '/');
  };


  const handleImportLibrary = async (e: ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0];e.target.value='';
    if(!file||importBusy) return;
    setImportBusy(true);
    try {
      if(file.size>20*1024*1024) throw Error('El límite de revisión es 20 MB por archivo.');
      const incoming=JSON.parse(await file.text());
      const staged=stageLibraryImport(JSON.parse(JSON.stringify(getStorySlice())),incoming,file.name);
      setReviewInitial(staged);setReviewKey(k=>k+1);setRecoveryOpen(false);setReviewOpen(true);
      toast.info('Archivo abierto para revisión. Tu biblioteca no se ha reemplazado.');
    } catch(error) {
      toast.error(error instanceof Error?error.message:'No se pudo leer la copia.');
    } finally {setImportBusy(false);}
  };
  const openComparison=()=>{setReviewInitial(undefined);setReviewKey(k=>k+1);setRecoveryOpen(false);setReviewOpen(true);};

  const exportToFirebase = async () => {
    const uid = user?.id;
    if (!uid) {
      toast.error('Inicia sesión para guardar en Firebase');
      navigate('/login');
      return;
    }
    setSavingCloud(true);
    try {
      await pushStoryBundle(uid);
      toast.success('Guardado en Firebase');
    } catch (err) {
      toast.error(formatFirestoreSaveError(err));
    } finally {
      setSavingCloud(false);
    }
  };

  const exportRecoverySnapshot = () => {
    const state = useStore.getState();
    const payload = {
      format: 'storytable-local-recovery-v1',
      exportedAt: new Date().toISOString(),
      ownerId: state.user?.id ?? null,
      includesTrash: true,
      linkedFilesIncluded: false,
      library: structuredClone(getStorySlice()),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'story-table-copia-local-' + Date.now() + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.info('Copia local descargada con papelera. Las imágenes enlazadas necesitan respaldo aparte.');
  };

  const exportLibraryFile = () => {
    const payload = buildLibraryExport(useStore.getState());
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `story-table-biblioteca-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Biblioteca exportada');
  };

  return (
    <>
    <header className="story-topbar sticky top-0 z-40 flex h-16 flex-shrink-0 items-center gap-2 sm:gap-4 border-b border-[#B51823] bg-[#D61E2B] px-2 sm:px-6">
      <MobileNavigation />
      <button
        aria-label="Buscar en Story Table"
        type="button"
        onClick={() => setActiveModal('search')}
        className="flex min-w-0 max-w-md flex-1 items-center gap-3 rounded-xl border border-[#2A3045] bg-[#1E2230] px-4 py-2 text-sm text-[#5A6078] transition-all hover:border-[#3A4460]"
      >
        <Search size={16} />
        <span className="min-w-0 flex-1 truncate text-left"><span className="sm:hidden">Buscar.</span><span className="hidden sm:inline">Buscar mundos, personajes, escenas...</span></span>
        <div className="hidden sm:flex items-center gap-1 text-xs text-[#5A6078]">
          <Command size={12} />
          <span>K</span>
        </div>
      </button>

      <div className="hidden sm:block flex-1" />

      <div className="flex items-center gap-2">
        <button type="button" aria-label="Capturar idea" onClick={() => setActiveModal('quick-capture')} className="story-btn-primary text-sm">
          <Plus size={16} />
          <span className="hidden sm:inline">Capturar</span>
        </button>

        {!isFirebaseConfigured() && (
          <button
            type="button"
            aria-label="Guardar copia local"
            title="Descargar copia local con papelera. Este preview no guarda en Firebase."
            onClick={exportRecoverySnapshot}
            className="flex items-center gap-1 rounded-xl p-2.5 text-white transition-all hover:bg-[#1E2230]"
          >
            <Download size={20} />
            <span className="hidden sm:inline text-xs">Guardar copia</span>
          </button>
        )}

        {isFirebaseConfigured() && (
          <>
            <button
              type="button"
              aria-label={
                autoSaveSyncing
                  ? 'Guardando en Firebase.'
                  : autoSaveEnabled
                    ? 'Desactivar auto-guardado'
                    : 'Activar auto-guardado'
              }
              title={
                autoSaveSyncing
                  ? 'Guardando.'
                  : autoSaveEnabled
                    ? 'Auto-guardado activo'
                    : 'Auto-guardado desactivado'
              }
              onClick={() => {
                if (autoSaveSyncing) return;
                setAutoSaveEnabled(!autoSaveEnabled);
                toast.success(autoSaveEnabled ? 'Auto-guardado desactivado' : 'Auto-guardado activado');
              }}
              className={`rounded-xl p-2.5 transition-all hover:bg-[#1E2230] ${
                autoSaveEnabled ? 'text-white' : 'text-white/50'
              } ${autoSaveSyncing ? 'pointer-events-none' : ''}`}
            >
              {autoSaveSyncing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <CloudCog size={20} />
              )}
            </button>
            <button
              type="button"
              aria-label="Guardar en Firebase"
              title="Guardar en Firebase"
              disabled={savingCloud}
              onClick={() => void exportToFirebase()}
              className="rounded-xl p-2.5 text-white/90 transition-all hover:bg-[#1E2230] hover:text-white disabled:opacity-50"
            >
              <CloudUpload size={20} className={savingCloud ? 'animate-pulse' : ''} />
            </button>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Notificaciones"
              className="relative rounded-xl p-2.5 text-[#8B91A7] transition-all hover:bg-[#1E2230] hover:text-[#E8E9EB]"
            >
              <Bell size={18} />
              {ideasFree > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#D61E2B]" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 border-[#2A3045] bg-[#111318] text-[#E8E9EB]">
            <p className="px-2 py-1.5 text-xs font-mono uppercase text-[#5A6078]">Resumen</p>
            <DropdownMenuItem className="cursor-pointer focus:bg-[#1E2230]" onClick={() => navigate('/ideas')}>
              <Lightbulb size={14} className="mr-2 text-[#EAB308]" />
              Ideas sin organizar ({ideasFree})
            </DropdownMenuItem>
            {scenesRecent.length > 0 ? (
              scenesRecent.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  className="cursor-pointer focus:bg-[#1E2230]"
                  onClick={() => navigate(`/world/${s.worldId}/scene/${s.id}`)}
                >
                  <FileText size={14} className="mr-2 text-[#22C55E]" />
                  <span className="truncate">{s.title}</span>
                </DropdownMenuItem>
              ))
            ) : (
              <p className="px-2 py-2 text-xs text-[#5A6078]">No hay escenas recientes</p>
            )}
            <DropdownMenuSeparator className="bg-[#2A3045]" />
            <DropdownMenuItem className="cursor-pointer focus:bg-[#1E2230]" onClick={() => toast.info('Más alertas en la siguiente fase')}>
              <Sparkles size={14} className="mr-2" />
              Elementos pendientes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Menú de usuario"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D61E2B]/20 text-sm font-semibold text-[#D61E2B] transition-all hover:bg-[#D61E2B]/30"
            >
              {user?.displayName?.charAt(0) || 'U'}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px] border-[#2A3045] bg-[#111318] text-[#E8E9EB]">
            <div className="border-b border-[#2A3045] px-2 py-2">
              <p className="truncate text-sm font-medium">{user?.displayName || 'Invitado'}</p>
              <p className="truncate text-xs text-[#5A6078]">{user?.email || 'Sin sesión'}</p>
            </div>

            <DropdownMenuItem className="cursor-pointer focus:bg-[#1E2230]" onClick={exportRecoverySnapshot}>
              <Download size={14} className="mr-2" /> Guardar una copia
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer focus:bg-[#1E2230]" onClick={() => setRecoveryOpen(true)}>
              <CloudCog size={14} className="mr-2" /> Copias y recuperación
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#2A3045]" />
            <DropdownMenuItem
              className="cursor-pointer focus:bg-[#1E2230]"
              onClick={() => {
                if (!isFirebaseConfigured() || !user?.isAuthenticated) {
                  toast.error('Inicia sesión con Firebase para gestionar tu cuenta');
                  return;
                }
                setAccountOpen(true);
              }}
            >
              <User size={14} className="mr-2" /> Cuenta y contraseña
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer focus:bg-[#1E2230]" onClick={() => setAccountOpen(true)}>
              <Settings size={14} className="mr-2" /> Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#2A3045]" />
            <DropdownMenuItem className="cursor-pointer text-[#D61E2B] focus:bg-[#D61E2B]/10" onClick={() => void handleLogout()}>
              <LogOut size={14} className="mr-2" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AccountSettingsModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    </header>
            <input
              ref={fileImportRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void handleImportLibrary(e)}
            />
    {activeConflict&&capturedCopies&&<ConflictReviewModal key={'cloud-'+activeConflict.id} open={dismissedConflict!==activeConflict.id} initial={capturedCopies} onApply={choices=>resolveCloudConflict(activeConflict.ownerId,activeConflict.id,choices)} onRefresh={()=>refreshCloudConflict(activeConflict.ownerId,activeConflict.id)} onClose={()=>setDismissedConflict(activeConflict.id)} />}
    <ConflictReviewModal key={reviewKey} open={reviewOpen} initial={reviewInitial} onClose={() => setReviewOpen(false)} />
    <BaseModal open={recoveryOpen} onClose={()=>setRecoveryOpen(false)} title="Copias y recuperación" description="Protege tu trabajo o revisa una copia sin reemplazar la biblioteca." maxWidthClass="max-w-2xl">
      <div className="space-y-4 text-sm text-[#E8E9EB]">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="font-semibold">{isFirebaseConfigured()?'Herramientas de recuperación':'Preview · Solo este navegador'}</p>
          <p className="mt-1 text-[#AAB0C0]">{isFirebaseConfigured()?'Estas herramientas son independientes del guardado habitual.':'Este entorno no guarda en la nube. Guardar una copia descarga un archivo de respaldo.'}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={exportRecoverySnapshot} className="rounded-xl border border-white/15 p-4 text-left hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white">
            <Download size={20}/><span className="mt-2 block font-semibold">Guardar una copia</span><span className="mt-1 block text-xs text-[#AAB0C0]">Incluye la papelera. Las imágenes enlazadas requieren respaldo aparte.</span>
          </button>
          <button type="button" disabled={importBusy} onClick={()=>fileImportRef.current?.click()} className="rounded-xl border border-white/15 p-4 text-left hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50">
            <Upload size={20}/><span className="mt-2 block font-semibold">{importBusy?'Leyendo copia…':'Revisar una copia'}</span><span className="mt-1 block text-xs text-[#AAB0C0]">Abre un archivo y lo compara con este navegador. No reemplaza ni envía contenido.</span>
          </button>
        </div>
        <details className="rounded-xl border border-white/10 p-4">
          <summary className="cursor-pointer font-medium">Herramientas avanzadas</summary>
          <div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={openComparison} className="story-btn-secondary">Comparar dos copias</button><button type="button" onClick={exportLibraryFile} className="story-btn-secondary">Exportar formato de biblioteca</button></div>
          <p className="mt-2 text-xs text-[#AAB0C0]">La exportación tradicional no incluye la papelera. Las propuestas revisadas todavía no pueden aplicarse.</p>
        </details>
      </div>
    </BaseModal>
    {syncError && (
      <div role="alert" className="border-b border-amber-500/40 bg-amber-950 px-4 py-3 text-sm text-amber-100">
        <p>{syncError}</p>
        {activeConflict&&<button type="button" className="mr-4 mt-2 underline" onClick={()=>setDismissedConflict(null)}>Revisar conflicto detectado</button>}
        <button type="button" onClick={exportRecoverySnapshot} className="mt-2 underline">
          Guardar copia local con papelera
        </button>
      </div>
    )}
    </>
  );
}

