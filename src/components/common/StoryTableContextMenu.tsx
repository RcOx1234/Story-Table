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
  Compass,
  FolderPlus,
  FolderOpen,
  Settings2,
  Copy,
  Files,
  FolderInput,
  ArrowRightLeft,
} from 'lucide-react';
import { useAppStore, useStore } from '@/store';
import { clampMenuPosition, placeFlyoutMenu } from '@/lib/contextMenuPosition';
import { detectEntityFromTarget, type DetectedEntity } from '@/lib/storyEntityContext';
import { isEntityDetailPage, openEntityView } from '@/lib/entityActions';
import { canEditInPlaceEntity } from '@/lib/storyInsertionPreview';
import { MENU_ANIM, MENU_PANEL, MENU_SCROLL } from '@/lib/menuStyles';
import { navigateWithReturnState } from '@/lib/storyNavigation';
import { toast } from 'sonner';
import { DUPLICATABLE_ENTITY_TYPES } from '@/lib/duplicateStoryEntity';
import {
  entityTypeSupportsFolders,
  folderScopeForEntity,
} from '@/lib/entityFolderScopeMap';
import { collectDescendantFolderIds } from '@/lib/entityFolders';
import { EntityFolderPickerFlyout } from '@/components/common/EntityFolderPickerFlyout';

type MenuState = {
  x: number;
  y: number;
  left: number;
  top: number;
  entity: DetectedEntity | null;
  folderId: string | null;
  folderSectionEmpty: boolean;
};

const SKIP_SELECTOR =
  '[data-story-rich-text], [data-story-rich-menu], [data-story-rich-submenu], [data-genealogy-person], [data-slot="context-menu-trigger"], textarea, input, select, [contenteditable="true"], [role="dialog"], [data-radix-popper-content-wrapper]';

const FOLDER_SKIP_SELECTOR =
  'input, select, textarea, button, a, .story-card, [data-entity-folder-card], [data-story-rich-text], [role="dialog"]';

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
  const folderBridge = useAppStore((s) => s.folderSectionBridge);
  const entityFolders = useStore((s) => s.entityFolders);
  const duplicateStoryEntity = useStore((s) => s.duplicateStoryEntity);
  const moveItemToFolder = useStore((s) => s.moveItemToFolder);
  const copyItemToFolder = useStore((s) => s.copyItemToFolder);
  const moveEntityFolderTo = useStore((s) => s.moveEntityFolderTo);

  const [menu, setMenu] = useState<MenuState | null>(null);
  const [submenu, setSubmenu] = useState<'nav' | 'worlds' | 'folderEntityActions' | null>(null);
  const [folderPickMode, setFolderPickMode] = useState<'moveItem' | 'copyItem' | 'moveFolder' | null>(
    null
  );
  const [visible, setVisible] = useState(false);
  const [subPos, setSubPos] = useState({ left: 0, top: 0 });
  const [folderPickPos, setFolderPickPos] = useState({ left: 0, top: 0 });
  const [confirmDelete, setConfirmDelete] = useState<DetectedEntity | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const folderActionsMenuRef = useRef<HTMLDivElement>(null);
  const folderPickMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(SKIP_SELECTOR)) return;

      e.preventDefault();
      const entity = detectEntityFromTarget(target);
      const folderEl = target.closest('[data-entity-folder-id]');
      const folderId = folderEl?.getAttribute('data-entity-folder-id') ?? null;
      const inFolderSection = target.closest('[data-folder-section]');
      const folderSectionEmpty = Boolean(
        folderBridge &&
          inFolderSection &&
          !folderId &&
          !entity &&
          !target.closest(FOLDER_SKIP_SELECTOR)
      );

      setVisible(false);
      setSubmenu(null);
      setFolderPickMode(null);
      setConfirmDelete(null);
      setMenu({
        x: e.clientX,
        y: e.clientY,
        left: e.clientX,
        top: e.clientY,
        entity,
        folderId,
        folderSectionEmpty,
      });
    };

    document.addEventListener('contextmenu', onContextMenu, true);
    return () => document.removeEventListener('contextmenu', onContextMenu, true);
  }, [folderBridge]);

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
    if (!menu || !submenu) return;
    const anchorRect = menuRef.current?.getBoundingClientRect();
    if (!anchorRect) return;
    const pickRef =
      submenu === 'folderEntityActions' ? folderActionsMenuRef : subMenuRef;
    const subH = pickRef.current?.getBoundingClientRect().height ?? SUB_EST_H;
    const { left, top } = placeFlyoutMenu(anchorRect, SUB_W, subH);
    setSubPos({ left, top });
  }, [menu, submenu, visible]);

  useLayoutEffect(() => {
    if (!menu || !folderPickMode) return;
    const pickW = 248;
    const fromActions =
      folderPickMode === 'moveItem' || folderPickMode === 'copyItem';
    const anchorEl = fromActions ? folderActionsMenuRef.current : menuRef.current;
    if (!anchorEl) return;
    const anchorRect = anchorEl.getBoundingClientRect();
    const pickH = folderPickMenuRef.current?.getBoundingClientRect().height ?? 300;
    const { left, top } = placeFlyoutMenu(anchorRect, pickW, pickH);
    setFolderPickPos({ left, top });
  }, [menu, folderPickMode, visible, submenu]);

  useEffect(() => {
    if (!menu) return;
    const dismiss = () => {
      setMenu(null);
      setSubmenu(null);
      setFolderPickMode(null);
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
    setFolderPickMode(null);
    setConfirmDelete(null);
    setVisible(false);
  };

  const runDuplicate = (entity: DetectedEntity) => {
    if (!DUPLICATABLE_ENTITY_TYPES.includes(entity.type)) {
      toast.error('Este elemento no se puede duplicar');
      return;
    }
    const newId = duplicateStoryEntity(entity.type, entity.id);
    if (!newId) {
      toast.error('No se pudo duplicar');
      return;
    }
    toast.success('Elemento duplicado');
    closeAll();
  };

  const go = (path: string) => {
    closeAll();
    const current = location.pathname + location.search;
    if (path !== current) navigateWithReturnState(navigate, path);
  };

  const openEntity = (entity: DetectedEntity) => {
    closeAll();
    openEntityView(entity, navigate, (e) => requestEntityView(e.worldId, e.type, e.id));
  };

  const editEntity = (entity: DetectedEntity) => {
    if (!entity.worldId) {
      toast.error('No se puede editar este elemento aquí');
      return;
    }
    if (!canEditInPlaceEntity(entity.type, location.pathname, location.search)) {
      toast.info('Abre la sección correspondiente del mundo para editar este elemento.');
      closeAll();
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
  const allowEdit =
    menu.entity &&
    (!menu.entity.worldId ||
      canEditInPlaceEntity(menu.entity.type, location.pathname, location.search));

  const activeFolderId = menu.folderId ?? (menu.folderSectionEmpty ? folderBridge?.openFolderId ?? null : null);
  const activeFolder = activeFolderId ? entityFolders.find((f) => f.id === activeFolderId) : null;
  const showFolderActions = Boolean(folderBridge && (menu.folderId || menu.folderSectionEmpty));
  const configureFolderId = menu.folderId ?? folderBridge?.openFolderId ?? null;

  const scopeFolders =
    folderBridge &&
    entityFolders.filter((f) => f.worldId === folderBridge.worldId && f.scope === folderBridge.scope);

  const entityMatchesFolderSection =
    menu.entity &&
    folderBridge &&
    entityTypeSupportsFolders(menu.entity.type) &&
    folderScopeForEntity(menu.entity.type) === folderBridge.scope &&
    menu.entity.worldId === folderBridge.worldId;

  const canDuplicate = menu.entity && DUPLICATABLE_ENTITY_TYPES.includes(menu.entity.type);

  const openFolderPicker = (mode: 'moveItem' | 'copyItem' | 'moveFolder') => {
    setFolderPickMode(mode);
    if (mode === 'moveFolder') {
      setSubmenu(null);
      return;
    }
    if (submenu !== 'folderEntityActions') {
      setSubmenu('folderEntityActions');
    }
  };

  const openEntityFolderActions = () => {
    setFolderPickMode(null);
    setSubmenu('folderEntityActions');
  };

  const handleFolderPick = (targetFolderId: string | null) => {
    if (!folderBridge || !folderPickMode) return;

    if (folderPickMode === 'moveItem' && menu.entity) {
      if (!targetFolderId) {
        toast.info('Elige una carpeta de destino');
        return;
      }
      moveItemToFolder(menu.entity.id, targetFolderId, folderBridge.openFolderId);
      toast.success('Movido a la carpeta');
      closeAll();
      return;
    }

    if (folderPickMode === 'copyItem' && menu.entity) {
      if (!targetFolderId) {
        toast.info('Elige una carpeta de destino');
        return;
      }
      copyItemToFolder(menu.entity.id, targetFolderId);
      toast.success('Añadido a la carpeta');
      closeAll();
      return;
    }

    if (folderPickMode === 'moveFolder' && menu.folderId) {
      if (targetFolderId === menu.folderId) {
        closeAll();
        return;
      }
      const ok = moveEntityFolderTo(menu.folderId, targetFolderId);
      if (!ok) {
        toast.error('No se puede mover la carpeta ahí');
        return;
      }
      toast.success(targetFolderId ? 'Carpeta movida' : 'Carpeta en la raíz');
      closeAll();
    }
  };

  const folderPickExclude =
    folderPickMode === 'moveFolder' && menu.folderId && scopeFolders
      ? collectDescendantFolderIds(scopeFolders, menu.folderId)
      : undefined;

  const runFolderAction = (fn: () => void) => {
    fn();
    closeAll();
  };

  const submenuPortal =
    (submenu === 'nav' || submenu === 'worlds') &&
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

  const folderEntityActionsPortal =
    submenu === 'folderEntityActions' &&
    createPortal(
      <div
        ref={folderActionsMenuRef}
        data-story-app-submenu="folder-actions"
        data-open={visible}
        className={`fixed z-[241] min-w-[200px] py-1 ${MENU_PANEL} ${MENU_ANIM}`}
        style={{ left: subPos.left, top: subPos.top, width: SUB_W }}
        onMouseDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <p className="border-b border-[#2A3045]/80 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-[#5A6078]">
          Carpeta
        </p>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
          onClick={(e) => {
            e.stopPropagation();
            openFolderPicker('moveItem');
          }}
        >
          <ArrowRightLeft size={14} className="text-[#3B82F6]" />
          Mover a carpeta
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
          onClick={(e) => {
            e.stopPropagation();
            openFolderPicker('copyItem');
          }}
        >
          <Copy size={14} className="text-[#22C55E]" />
          Copiar a carpeta
        </button>
      </div>,
      document.body
    );

  const folderPickPortal =
    folderPickMode &&
    scopeFolders &&
    createPortal(
      <EntityFolderPickerFlyout
        open
        visible={visible}
        left={folderPickPos.left}
        top={folderPickPos.top}
        title={
          folderPickMode === 'moveItem'
            ? 'Mover a'
            : folderPickMode === 'copyItem'
              ? 'Copiar a'
              : 'Mover carpeta a'
        }
        folders={scopeFolders}
        excludeIds={folderPickExclude}
        includeRoot={folderPickMode === 'moveFolder'}
        rootLabel="Raíz de la sección"
        onPick={handleFolderPick}
        menuRef={folderPickMenuRef}
      />,
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
            {allowEdit && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
                onClick={() => editEntity(menu.entity!)}
              >
                <Pencil size={14} className="text-[#8B91A7]" />
                Editar
              </button>
            )}
            {canDuplicate && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
                onClick={() => runDuplicate(menu.entity!)}
              >
                <Files size={14} className="text-[#8B5CF6]" />
                Duplicar
              </button>
            )}
            {entityMatchesFolderSection && scopeFolders && scopeFolders.length > 0 && (
              <button
                type="button"
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#1E2230] ${
                  submenu === 'folderEntityActions' || folderPickMode
                    ? 'bg-[#D61E2B]/10 text-[#E8E9EB]'
                    : 'text-[#E8E9EB]'
                }`}
                onMouseEnter={openEntityFolderActions}
                onClick={openEntityFolderActions}
              >
                <span className="flex items-center gap-2.5">
                  <FolderOpen size={14} className="text-[#3B82F6]" />
                  Acciones
                </span>
                <ChevronRight size={14} className="text-[#5A6078]" />
              </button>
            )}
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

        {!confirmDelete && showFolderActions && (
          <>
            <p className="px-3 pt-2 text-[10px] uppercase tracking-wider text-[#5A6078]">Carpetas</p>
            {menu.folderSectionEmpty && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
                onClick={() =>
                  runFolderAction(() =>
                    folderBridge!.promptCreateFolder(folderBridge!.openFolderId)
                  )
                }
              >
                <FolderPlus size={14} className="text-[#3B82F6]" />
                {folderBridge!.openFolderId ? 'Nueva subcarpeta' : 'Nueva carpeta'}
              </button>
            )}
            {menu.folderId && (
              <>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
                  onClick={() =>
                    runFolderAction(() => folderBridge!.openFolder(menu.folderId!))
                  }
                >
                  <FolderOpen size={14} className="text-[#3B82F6]" />
                  Abrir carpeta
                </button>
                {scopeFolders && scopeFolders.length > 0 && (
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#1E2230] ${
                      folderPickMode === 'moveFolder'
                        ? 'bg-[#D61E2B]/10 text-[#E8E9EB]'
                        : 'text-[#E8E9EB]'
                    }`}
                    onClick={() => openFolderPicker('moveFolder')}
                  >
                    <span className="flex items-center gap-2.5">
                      <FolderInput size={14} className="text-[#3B82F6]" />
                      Mover carpeta a…
                    </span>
                    <ChevronRight size={14} className="text-[#5A6078]" />
                  </button>
                )}
              </>
            )}
            {configureFolderId && (
              <>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
                  onClick={() =>
                    runFolderAction(() => folderBridge!.promptRenameFolder(configureFolderId))
                  }
                >
                  <Pencil size={14} className="text-[#8B91A7]" />
                  Renombrar carpeta
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
                  onClick={() =>
                    runFolderAction(() => folderBridge!.promptManageFolder(configureFolderId))
                  }
                >
                  <Settings2 size={14} className="text-[#8B91A7]" />
                  Gestionar carpeta
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#D61E2B] transition-colors hover:bg-[#D61E2B]/10"
                  onClick={() =>
                    runFolderAction(() => folderBridge!.promptDeleteFolder(configureFolderId))
                  }
                >
                  <Trash2 size={14} />
                  Eliminar carpeta
                </button>
              </>
            )}
            {activeFolder && menu.folderId && (
              <p className="px-3 pb-1 text-[10px] text-[#5A6078] truncate">«{activeFolder.name}»</p>
            )}
            <div className="my-1 border-t border-[#2A3045]/80" />
          </>
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
          </>
        )}
      </div>
      {submenuPortal}
      {folderEntityActionsPortal}
      {folderPickPortal}
    </>,
    document.body
  );
}
