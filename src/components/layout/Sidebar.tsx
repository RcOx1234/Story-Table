import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store';
import {
  LayoutDashboard, Globe, Lightbulb, Heart, Trash2,
  ChevronLeft, ChevronRight, BookOpen, Feather, LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { isFirebaseConfigured } from '@/lib/firebase';
import { logout as firebaseLogout } from '@/services/authService';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const user = useAppStore((s) => s.user);
  const logoutStore = useAppStore((s) => s.logout);
  const worlds = useAppStore((s) => s.worlds.filter((w) => !w.isDeleted));
  const ideas = useAppStore((s) => s.ideas.filter((i) => !i.worldId && !i.isDeleted));

  const menuItems = [
    { id: 'mesa', icon: LayoutDashboard, label: 'Mi Mesa', path: '/', count: null as number | null },
    { id: 'mundos', icon: Globe, label: 'Mis Mundos', path: '/mundos', count: worlds.length },
    { id: 'ideas', icon: Lightbulb, label: 'Ideas', path: '/ideas', count: ideas.length },
    { id: 'fav', icon: Heart, label: 'Favoritos', path: '/favorites', count: null },
    { id: 'trash', icon: Trash2, label: 'Papelera', path: '/trash', count: null },
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

  if (!sidebarOpen) {
    return (
      <div className="w-14 bg-[#111318] border-r border-[#1E2230] flex flex-col items-center py-4 flex-shrink-0">
        <button onClick={toggleSidebar} className="p-2 text-[#5A6078] hover:text-[#E8E9EB] transition-colors">
          <ChevronRight size={18} />
        </button>
        <div className="mt-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`p-2 rounded-lg transition-all ${
                isActive(item.path) ? 'text-[#D61E2B] bg-[#D61E2B]/10' : 'text-[#5A6078] hover:text-[#E8E9EB] hover:bg-[#1E2230]'
              }`}
              title={item.label}
            >
              <item.icon size={18} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside className="w-[260px] bg-[#111318] border-r border-[#1E2230] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-[#1E2230]">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-8 h-8 rounded-lg bg-[#D61E2B] flex items-center justify-center">
            <Feather size={16} className="text-white" />
          </div>
          <span className="font-semibold text-lg text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>Story Table</span>
        </div>
        <button onClick={toggleSidebar} className="p-1.5 text-[#5A6078] hover:text-[#E8E9EB] transition-colors">
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-b border-[#1E2230]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#D61E2B]/20 flex items-center justify-center text-[#D61E2B] font-semibold text-sm">
            {user?.displayName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#E8E9EB] truncate">{user?.displayName || 'Story Table'}</p>
            <p className="text-xs text-[#5A6078] truncate">{user?.email || 'Modo sin login'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`story-sidebar-item w-full ${isActive(item.path) ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span className="flex-1 text-left text-sm">{item.label}</span>
            {item.count !== null && (
              <span className="text-xs text-[#5A6078] bg-[#1E2230] px-2 py-0.5 rounded-full">{item.count}</span>
            )}
          </button>
        ))}

        {/* Worlds quick access */}
        {worlds.length > 0 && (
          <div className="mt-6">
            <p className="px-3 text-xs font-medium text-[#5A6078] uppercase tracking-wider mb-2">Tus Mundos</p>
            {worlds.map((world) => (
              <button
                key={world.id}
                onClick={() => navigate(`/world/${world.id}`)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all w-full ${
                  location.pathname === `/world/${world.id}` 
                    ? 'text-[#D61E2B] bg-[#D61E2B]/10' 
                    : 'text-[#8B91A7] hover:text-[#E8E9EB] hover:bg-[#1E2230]'
                }`}
              >
                <BookOpen size={14} />
                <span className="flex-1 text-left truncate">{world.name}</span>
                {world.isFavorite && <Heart size={12} className="text-[#D61E2B]" />}
              </button>
            ))}
          </div>
        )}
      </nav>

      <div className="border-t border-[#1E2230] p-3">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="story-sidebar-item w-full text-[#8B91A7] hover:text-[#D61E2B]"
        >
          <LogOut size={18} />
          <span className="flex-1 text-left text-sm">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
