import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import {
  LayoutDashboard,
  Globe,
  Lightbulb,
  Heart,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Feather,
  LogOut,
  Users,
  FolderOpen,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { isFirebaseConfigured } from '@/lib/firebase';
import { logout as firebaseLogout } from '@/services/authService';

const sidebarMotion = { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const };

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const user = useAppStore((s) => s.user);
  const logoutStore = useAppStore((s) => s.logout);
  const worlds = useAppStore((s) => s.worlds.filter((w) => !w.isDeleted));
  const characterCount = useAppStore((s) => s.characters.filter((c) => !c.isDeleted).length);
  const ideas = useAppStore((s) => s.ideas.filter((i) => i.worldId == null && !i.isDeleted));

  const menuItems = [
    { id: 'mesa', icon: LayoutDashboard, label: 'Mi Mesa', path: '/', count: null as number | null },
    { id: 'mundos', icon: Globe, label: 'Mis Mundos', path: '/mundos', count: worlds.length },
    { id: 'personajes', icon: Users, label: 'Personajes', path: '/personajes', count: characterCount },
    { id: 'ideas', icon: Lightbulb, label: 'Ideas', path: '/ideas', count: ideas.length },
    { id: 'archivos', icon: FolderOpen, label: 'Archivos', path: '/archivos', count: null },
    { id: 'fav', icon: Heart, label: 'Favoritos', path: '/favorites', count: null },
    { id: 'trash', icon: Trash2, label: 'Papelera', path: '/trash', count: null },
    { id: 'ajustes', icon: Settings, label: 'Ajustes', path: '/ajustes', count: null },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

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

  const profileInitial = user?.displayName?.charAt(0)?.toUpperCase() || 'U';

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 260 : 56 }}
      transition={sidebarMotion}
      className="relative flex shrink-0 flex-col overflow-hidden border-r border-[#1E2230] bg-[#111318]"
    >
      <div
        className={`flex h-16 shrink-0 items-center border-b border-[#1E2230] ${
          sidebarOpen ? 'justify-between px-5' : 'justify-center px-0'
        }`}
      >
        <AnimatePresence mode="wait">
          {sidebarOpen ? (
            <motion.div
              key="brand-open"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="flex min-w-0 flex-1 items-center gap-2.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D61E2B]">
                <Feather size={16} className="text-white" />
              </div>
              <span className="truncate text-lg font-semibold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
                Story Table
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="brand-closed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D61E2B]"
            >
              <Feather size={16} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={toggleSidebar}
          className={`shrink-0 p-1.5 text-[#5A6078] transition-colors hover:text-[#E8E9EB] ${
            sidebarOpen ? '' : 'absolute right-1 top-4'
          }`}
          aria-label={sidebarOpen ? 'Contraer barra lateral' : 'Expandir barra lateral'}
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {sidebarOpen && (
        <div className="shrink-0 px-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/perfil')}
            className="mx-auto flex w-full items-center gap-3 rounded-xl border border-[#2A3045]/60 bg-[#111318]/80 px-3 py-3 text-left shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all hover:border-[#3A4460] hover:bg-[#1E2230]"
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#252A3C]">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#8B91A7]">
                  {profileInitial}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#E8E9EB]">{user?.displayName || 'Story Table'}</p>
              <p className="truncate text-xs text-[#5A6078]">{user?.email || 'Modo sin login'}</p>
            </div>
          </button>
        </div>
      )}
      {!sidebarOpen && (
        <div className="flex shrink-0 justify-center py-3">
          <button
            type="button"
            onClick={() => navigate('/perfil')}
            title="Perfil"
            className="h-9 w-9 overflow-hidden rounded-full border border-[#2A3045] bg-[#252A3C] shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all hover:border-[#3A4460]"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#8B91A7]">
                {profileInitial}
              </span>
            )}
          </button>
        </div>
      )}

      <nav
        className={`flex-1 space-y-1 overflow-y-auto py-4 scrollbar-thin ${
          sidebarOpen ? 'px-3' : 'flex flex-col items-center px-1'
        }`}
      >
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.path)}
            title={!sidebarOpen ? item.label : undefined}
            className={
              sidebarOpen
                ? `story-sidebar-item w-full ${isActive(item.path) ? 'active' : ''}`
                : `flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                    isActive(item.path)
                      ? 'bg-[#D61E2B]/10 text-[#D61E2B]'
                      : 'text-[#5A6078] hover:bg-[#1E2230] hover:text-[#E8E9EB]'
                  }`
            }
          >
            <item.icon size={18} className="shrink-0" />
            {sidebarOpen && (
              <>
                <span className="flex-1 text-left text-sm">{item.label}</span>
                {item.count !== null && (
                  <span className="rounded-full bg-[#1E2230] px-2 py-0.5 text-xs text-[#5A6078]">{item.count}</span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      <div className={`shrink-0 border-t border-[#1E2230] p-3 ${sidebarOpen ? '' : 'flex justify-center'}`}>
        <button
          type="button"
          onClick={() => void handleLogout()}
          title={!sidebarOpen ? 'Cerrar sesión' : undefined}
          className={
            sidebarOpen
              ? 'story-sidebar-item w-full text-[#8B91A7] hover:text-[#D61E2B]'
              : 'flex h-10 w-10 items-center justify-center rounded-lg text-[#5A6078] transition-all hover:bg-[#1E2230] hover:text-[#D61E2B]'
          }
        >
          <LogOut size={18} className="shrink-0" />
          {sidebarOpen && <span className="flex-1 text-left text-sm">Cerrar sesión</span>}
        </button>
      </div>
    </motion.aside>
  );
}
