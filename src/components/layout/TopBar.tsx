import { useAppStore, useStore, type AppState } from '@/store';
import { Search, Plus, Bell, Command, User, Settings, LogOut, Lightbulb, FileText, Sparkles, Download, Upload, CloudUpload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRef, useState, type ChangeEvent } from 'react';
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
import { buildLibraryExport, parseLibraryImport } from '@/lib/storyImportExport';
import { pushStoryBundle } from '@/services/storyBundleSync';
import { formatFirestoreSaveError } from '@/lib/firestorePayload';

export function TopBar() {
  const fileImportRef = useRef<HTMLInputElement>(null);
  const setActiveModal = useAppStore((s) => s.setActiveModal);
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const logoutStore = useAppStore((s) => s.logout);
  const ideasFree = useAppStore((s) => s.ideas.filter((i) => !i.isDeleted && !i.worldId).length);
  const scenesRecent = useAppStore((s) => s.scenes.filter((sc) => !sc.isDeleted).slice(-3));
  const [savingCloud, setSavingCloud] = useState(false);

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
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const data = parseLibraryImport(JSON.parse(text));
      if (!data?.worlds) {
        toast.error('El archivo no tiene el formato de biblioteca Story Table');
        return;
      }
      if (
        !window.confirm(
          'Esto reemplazará todos tus mundos y entidades en este navegador por los del archivo. ¿Continuar?'
        )
      ) {
        return;
      }
      useStore.setState({
        worlds: data.worlds as AppState['worlds'],
        characters: data.characters as AppState['characters'],
        scenes: data.scenes as AppState['scenes'],
        places: data.places as AppState['places'],
        maps: data.maps as AppState['maps'],
        plots: data.plots as AppState['plots'],
        components: data.components as AppState['components'],
        organizations: data.organizations as AppState['organizations'],
        ideas: data.ideas as AppState['ideas'],
        timelines: data.timelines as AppState['timelines'],
        dashboardWorldIds: [],
      });
      toast.success('Biblioteca importada');
      const uid = useStore.getState().user?.id;
      if (isFirebaseConfigured() && uid) {
        void pushStoryBundle(uid)
          .then(() => toast.success('Biblioteca sincronizada con Firebase'))
          .catch(() => toast.error('Importado localmente, pero no se pudo subir a Firebase'));
      }
    } catch {
      toast.error('No se pudo leer el JSON');
    }
  };

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
    <header className="sticky top-0 z-40 flex h-16 flex-shrink-0 items-center gap-4 border-b border-[#B51823] bg-[#D61E2B] px-6">
      <button
        type="button"
        onClick={() => setActiveModal('search')}
        className="flex max-w-md flex-1 items-center gap-3 rounded-xl border border-[#2A3045] bg-[#1E2230] px-4 py-2 text-sm text-[#5A6078] transition-all hover:border-[#3A4460]"
      >
        <Search size={16} />
        <span className="flex-1 text-left">Buscar mundos, personajes, escenas...</span>
        <div className="flex items-center gap-1 text-xs text-[#5A6078]">
          <Command size={12} />
          <span>K</span>
        </div>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setActiveModal('quick-capture')} className="story-btn-primary text-sm">
          <Plus size={16} />
          <span className="hidden sm:inline">Capturar</span>
        </button>

        {isFirebaseConfigured() && (
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
            <input
              ref={fileImportRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void handleImportLibrary(e)}
            />
            <div className="border-b border-[#2A3045] px-2 py-2">
              <p className="truncate text-sm font-medium">{user?.displayName || 'Invitado'}</p>
              <p className="truncate text-xs text-[#5A6078]">{user?.email || 'Sin sesión'}</p>
            </div>
            <DropdownMenuItem className="cursor-pointer focus:bg-[#1E2230]" onClick={() => exportLibraryFile()}>
              <Download size={14} className="mr-2" /> Exportar biblioteca (JSON)
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer focus:bg-[#1E2230]" onClick={() => fileImportRef.current?.click()}>
              <Upload size={14} className="mr-2" /> Importar biblioteca…
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#2A3045]" />
            <DropdownMenuItem className="cursor-pointer focus:bg-[#1E2230]" onClick={() => toast.info('Perfil: próximamente')}>
              <User size={14} className="mr-2" /> Mi perfil
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer focus:bg-[#1E2230]" onClick={() => toast.info('Configuración: próximamente')}>
              <Settings size={14} className="mr-2" /> Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#2A3045]" />
            <DropdownMenuItem className="cursor-pointer text-[#D61E2B] focus:bg-[#D61E2B]/10" onClick={() => void handleLogout()}>
              <LogOut size={14} className="mr-2" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
