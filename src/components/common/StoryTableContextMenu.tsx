import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Globe,
  Users,
  Search,
  Heart,
  Lightbulb,
  Trash2,
  ChevronRight,
  ExternalLink,
  Pencil,
  Sparkles,
  Compass,
} from 'lucide-react';
import { useAppStore, useStore } from '@/store';
import { clampMenuPosition, placeFlyoutMenu } from '@/lib/contextMenuPosition';
import { detectEntityFromTarget, type DetectedEntity } from '@/lib/storyEntityContext';
import { isEntityDetailPage, openEntityView } from '@/lib/entityActions';
import { MENU_ANIM, MENU_PANEL, MENU_SCROLL } from '@/lib/menuStyles';
import { toast } from 'sonner';

type MenuState = {
  x: number;
  y: number;
  left: number;
  top: number;
  entity: DetectedEntity | null;
};

const SKIP_SELECTOR =
  '[data-story-rich-text], [data-story-rich-menu], [data-story-rich-submenu], textarea, input, select, [contenteditable="true"], [role="dialog"], [data-radix-popper-content-wrapper]';

const NAV_LINKS = [
  { icon: Home, label: 'Inicio', path: '/' },
  { icon: Users, label: 'Personajes (global)', path: '/personajes' },
  { icon: Heart, label: 'Favoritos', path: '/favorites' },
  { icon: Lightbulb, label: 'Ideas', path: '/ideas' },
  { icon: Trash2, label: 'Papelera', path: '/trash' },
];

const MAIN_W = 200;
const SUB_W = 210;
const SUB_EST_H = 260;

export function StoryTableContextMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const setActiveModal = useAppStore((s) => s.setActiveModal);
  const openInsertionPreview = useAppStore((s) => s.openInsertionPreview);
  const requestEntityView = useAppStore((s) => s.requestEntityView);
  const requestEntityEdit = useAppStore((s) => s.requestEntityEdit);
  const worlds = useAppStore((s) => s.worlds.filter((w) => !w.isDeleted));

  const deleteCharacter = useStore((s) => s.deleteCharacter);
  const deleteScene = useStore((s) => s.deleteScene);
  const deletePlace = useStore((s) => s.deletePlace);
  const deleteHouse = useStore((s) => s.deleteHouse);
  const deleteMap = useStore((s) => s.deleteMap);
  const deleteComponent = useStore((s) => s.deleteComponent);
  const deleteOrganization = useStore((s) => s.deleteOrganization);
  const deletePlot = useStore((s) => s.deletePlot);
  const deleteIdea = useStore((s) => s.deleteIdea);
  const deleteWorldFact = useStore((s) => s.deleteWorldFact);
  const deleteWorldDatum = useStore((s) => s.deleteWorldDatum);
  const deleteFantasticElement = useStore((s) => s.deleteFantasticElement);

  const [menu, setMenu] = useState<MenuState | null>(null);
  const [submenu, setSubmenu] = useState<'nav' | 'worlds' | null>(null);
  const [visible, setVisible] = useState(false);
  const [subPos, setSubPos] = useState({ left: 0, top: 0 });
  const [confirmDelete, setConfirmDelete] = useState<DetectedEntity | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(SKIP_SELECTOR)) return;

      e.preventDefault();
      const entity = detectEntityFromTarget(target);
      setVisible(false);
      setSubmenu(null);
      setConfirmDelete(null);
      setMenu({
        x: e.clientX,
        y: e.clientY,
        left: e.clientX,
        top: e.clientY,
        entity,
      });
    };

    document.addEventListener('contextmenu', onContextMenu, true);
    return () => document.removeEventListener('contextmenu', onContextMenu, true);
  }, []);

  useLayoutEffect(() => {
    if (!menu || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const { left, top } = clampMenuPosition(menu.x, menu.y, rect.width, rect.height);
    if (left !== menu.left || top !== menu.top) {
      setMenu((m) => (m ? { ...m, left, top } : m));
    }
    requestAnimationFrame(() => setVisible(true));
  }, [menu?.x, menu?.y, menu?.entity, submenu, confirmDelete]);

  useLayoutEffect(() => {
    if (!menu || !submenu || !menuRef.current) return;
    const anchor = menuRef.current.getBoundingClientRect();
    const subH = subMenuRef.current?.getBoundingClientRect().height ?? SUB_EST_H;
    const { left, top } = placeFlyoutMenu(anchor, SUB_W, subH);
    setSubPos({ left, top });
  }, [menu, submenu, visible, worlds.length]);

  useEffect(() => {
    if (!menu) return;
    const dismiss = () => {
      setMenu(null);
      setSubmenu(null);
      setConfirmDelete(null);
      setVisible(false);
    };
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if ((t as Element).closest?.('[data-story-app-submenu]')) return;
      dismiss();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    const onScroll = () => dismiss();
    window.addEventListener('mousedown', close, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    const main = document.getElementById('main-scroll');
    main?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('mousedown', close, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      main?.removeEventListener('scroll', onScroll);
    };
  }, [menu]);

  const closeAll = () => {
    setMenu(null);
    setSubmenu(null);
    setConfirmDelete(null);
    setVisible(false);
  };

  const go = (path: string) => {
    closeAll();
    if (path !== location.pathname + location.search) navigate(path);
  };

  const openEntity = (entity: DetectedEntity) => {
    closeAll();
    openEntityView(entity, navigate, openInsertionPreview, (e) =>
      requestEntityView(e.worldId, e.type, e.id)
    );
  };

  const editEntity = (entity: DetectedEntity) => {
    if (!entity.worldId) {
      toast.error('No se puede editar este elemento aquí');
      return;
    }
    closeAll();
    requestEntityEdit(entity.worldId, entity.type, entity.id);
  };

  const runDelete = (entity: DetectedEntity) => {
    const { type, id } = entity;
    switch (type) {
      case 'character':
        deleteCharacter(id);
        break;
      case 'scene':
        deleteScene(id);
        break;
      case 'place':
        deletePlace(id);
        break;
      case 'house':
        deleteHouse(id);
        break;
      case 'map':
        deleteMap(id);
        break;
      case 'component':
        deleteComponent(id);
        break;
      case 'organization':
        deleteOrganization(id);
        break;
      case 'plot':
        deletePlot(id);
        break;
      case 'idea':
        deleteIdea(id);
        break;
      case 'fact':
        deleteWorldFact(id);
        break;
      case 'datum':
        deleteWorldDatum(id);
        break;
      case 'fantastic':
        deleteFantasticElement(id);
        break;
      case 'timeline':
        useStore.getState().deleteTimeline(id);
        break;
      default:
        return;
    }
    toast.success('Enviado a la papelera');
    closeAll();
  };

  if (!menu) return null;

  const onDetailPage = isEntityDetailPage(location.pathname);
  const allowDelete = menu.entity && !onDetailPage;

  const submenuPortal =
    submenu &&
    createPortal(
      <div
        ref={subMenuRef}
        data-story-app-submenu
        data-open={visible}
        className={`fixed z-[241] max-h-[min(300px,60vh)] py-1 ${MENU_PANEL} ${MENU_SCROLL} ${MENU_ANIM}`}
        style={{ left: subPos.left, top: subPos.top, width: SUB_W }}
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        {submenu === 'nav' &&
          NAV_LINKS.map(({ icon: Icon, label, path }) => (
            <button
              key={path}
              type="button"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
              onClick={() => go(path)}
            >
              <Icon size={14} className="text-[#8B91A7]" />
              {label}
            </button>
          ))}
        {submenu === 'worlds' &&
          (worlds.length === 0 ? (
            <p className="px-3 py-3 text-xs text-[#5A6078]">No hay mundos</p>
          ) : (
            worlds.map((w) => (
              <button
                key={w.id}
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
                onClick={() => go(`/world/${w.id}`)}
              >
                <Globe size={14} className="shrink-0 text-[#8B5CF6]" />
                <span className="truncate">{w.name}</span>
              </button>
            ))
          ))}
      </div>,
      document.body
    );

  return createPortal(
    <>
      <div
        ref={menuRef}
        data-story-app-menu
        data-open={visible}
        className={`fixed z-[240] min-w-[200px] overflow-hidden py-1 ${MENU_PANEL} ${MENU_ANIM}`}
        style={{ left: menu.left, top: menu.top, width: MAIN_W }}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className="border-b border-[#2A3045]/80 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-[#D61E2B]">
          Story Table
        </p>

        {menu.entity && !confirmDelete && (
          <>
            <p className="px-3 pt-2 text-[10px] uppercase tracking-wider text-[#5A6078]">
              {menu.entity.label || 'Elemento'}
            </p>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
              onClick={() => openEntity(menu.entity!)}
            >
              <ExternalLink size={14} className="text-[#8B91A7]" />
              Ver detalles
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
              onClick={() => editEntity(menu.entity!)}
            >
              <Pencil size={14} className="text-[#8B91A7]" />
              Editar
            </button>
            {allowDelete && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#D61E2B] transition-colors hover:bg-[#D61E2B]/10"
                onClick={() => setConfirmDelete(menu.entity)}
              >
                <Trash2 size={14} />
                Eliminar…
              </button>
            )}
            <div className="my-1 border-t border-[#2A3045]/80" />
          </>
        )}

        {confirmDelete && (
          <div className="border-b border-[#2A3045]/80 px-3 py-2">
            <p className="mb-2 text-xs text-[#8B91A7]">
              ¿Enviar «{confirmDelete.label}» a la papelera?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="story-btn-secondary flex-1 text-xs"
                onClick={() => setConfirmDelete(null)}
              >
                No
              </button>
              <button
                type="button"
                className="story-btn-primary flex-1 text-xs"
                onClick={() => runDelete(confirmDelete)}
              >
                Sí
              </button>
            </div>
          </div>
        )}

        {!confirmDelete && (
          <>
            <button
              type="button"
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#1E2230] ${
                submenu === 'nav' ? 'bg-[#D61E2B]/10 text-[#E8E9EB]' : 'text-[#E8E9EB]'
              }`}
              onMouseEnter={() => setSubmenu('nav')}
              onClick={() => setSubmenu((s) => (s === 'nav' ? null : 'nav'))}
            >
              <span className="flex items-center gap-2.5">
                <Compass size={14} className="text-[#8B91A7]" />
                Navegación
              </span>
              <ChevronRight size={14} className="text-[#5A6078]" />
            </button>
            <button
              type="button"
              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#1E2230] ${
                submenu === 'worlds' ? 'bg-[#D61E2B]/10 text-[#E8E9EB]' : 'text-[#E8E9EB]'
              }`}
              onMouseEnter={() => setSubmenu('worlds')}
              onClick={() => setSubmenu((s) => (s === 'worlds' ? null : 'worlds'))}
            >
              <span className="flex items-center gap-2.5">
                <Globe size={14} className="text-[#8B5CF6]" />
                Mundos
              </span>
              <ChevronRight size={14} className="text-[#5A6078]" />
            </button>
            <div className="my-1 border-t border-[#2A3045]/80" />
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
              onClick={() => {
                closeAll();
                setActiveModal('search');
              }}
            >
              <Search size={14} className="text-[#8B91A7]" />
              Buscar (Ctrl+K)
            </button>
            {location.pathname.startsWith('/world/') && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
                onClick={() => {
                  const worldId = location.pathname.split('/')[2];
                  if (worldId) go(`/world/${worldId}?tab=fantastic`);
                }}
              >
                <Sparkles size={14} className="text-[#8B5CF6]" />
                Fantásticos
              </button>
            )}
          </>
        )}
      </div>
      {submenuPortal}
    </>,
    document.body
  );
}
