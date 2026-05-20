import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bold, Italic, Underline, Link2, ChevronRight, Globe } from 'lucide-react';
import { useAppStore, useStore } from '@/store';
import { buildInsertionCatalog, type InsertionCategory } from '@/lib/storyInsertionCatalog';
import { clampMenuPosition, placeFlyoutMenu } from '@/lib/contextMenuPosition';
import { insertionMeta } from '@/lib/insertionMeta';
import { StoryRichTextEditor, type StoryRichTextEditorHandle } from '@/components/common/StoryRichTextEditor';
import { MENU_ANIM, MENU_PANEL, MENU_SCROLL } from '@/lib/menuStyles';

type Props = {
  value: string;
  onChange: (value: string) => void;
  worldId?: string;
  insertionWorldId?: string;
  onInsertionWorldChange?: (id: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  hideHint?: boolean;
  showInsertionWorldPicker?: boolean;
};

type MenuPos = { x: number; y: number; left: number; top: number };

const MENU_W = 204;
const SUB_W = 212;
const ITEMS_W = 236;
const SUB_EST_H = 280;

const flyoutMotion = {
  initial: { opacity: 0, x: -6, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -4, scale: 0.98 },
  transition: { duration: 0.18, ease: 'easeOut' as const },
};

export function StoryRichTextField({
  value,
  onChange,
  worldId = '',
  insertionWorldId: insertionWorldIdProp,
  onInsertionWorldChange,
  placeholder = 'Escribe aquí…',
  minHeight = '6rem',
  className = '',
  hideHint = false,
  showInsertionWorldPicker,
}: Props) {
  const worlds = useAppStore((s) => s.worlds.filter((w) => !w.isDeleted));
  const [localInsertionWorld, setLocalInsertionWorld] = useState('');
  const insertionWorldId = insertionWorldIdProp ?? localInsertionWorld;
  const setInsertionWorldId = onInsertionWorldChange ?? setLocalInsertionWorld;

  const catalogWorldId = worldId || insertionWorldId;
  const needsWorldPicker =
    !worldId && showInsertionWorldPicker !== false && worlds.length > 0;

  const editorRef = useRef<StoryRichTextEditorHandle>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const catMenuRef = useRef<HTMLDivElement>(null);
  const itemsMenuRef = useRef<HTMLDivElement>(null);

  const [menu, setMenu] = useState<MenuPos | null>(null);
  const [insertionsOpen, setInsertionsOpen] = useState(false);
  const [insertCategory, setInsertCategory] = useState<string | null>(null);
  const [insertQuery, setInsertQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [catPos, setCatPos] = useState({ left: 0, top: 0 });
  const [itemsPos, setItemsPos] = useState({ left: 0, top: 0 });

  const catalog = useMemo(() => {
    if (!catalogWorldId || !menu) return [];
    return buildInsertionCatalog(catalogWorldId, useStore.getState());
  }, [catalogWorldId, menu]);

  const closeMenu = useCallback(() => {
    setMenu(null);
    setInsertionsOpen(false);
    setInsertCategory(null);
    setInsertQuery('');
    setMenuVisible(false);
  }, []);

  const applyFormat = (cmd: 'bold' | 'italic' | 'underline') => {
    editorRef.current?.applyFormat(cmd);
    editorRef.current?.focus();
  };

  const insertAtCursor = useCallback(
    (type: string, id: string, label: string) => {
      editorRef.current?.insertRef(type, id, label);
      editorRef.current?.focus();
      setInsertionsOpen(false);
      setInsertCategory(null);
      setInsertQuery('');
      closeMenu();
    },
    [closeMenu]
  );

  useLayoutEffect(() => {
    if (!menu || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const { left, top } = clampMenuPosition(menu.x, menu.y, rect.width, rect.height);
    if (left !== menu.left || top !== menu.top) {
      setMenu((m) => (m ? { ...m, left, top } : m));
    }
    requestAnimationFrame(() => setMenuVisible(true));
  }, [menu?.x, menu?.y]);

  useLayoutEffect(() => {
    if (!menu || !insertionsOpen || !menuRef.current) return;
    const anchor = menuRef.current.getBoundingClientRect();
    const catH = catMenuRef.current?.getBoundingClientRect().height ?? SUB_EST_H;
    const cat = placeFlyoutMenu(anchor, SUB_W, catH);
    setCatPos({ left: cat.left, top: cat.top });
  }, [menu, insertionsOpen, menuVisible, catalog.length]);

  useLayoutEffect(() => {
    if (!menu || !insertCategory || !catMenuRef.current) return;
    const catAnchor = catMenuRef.current.getBoundingClientRect();
    const itemsH = itemsMenuRef.current?.getBoundingClientRect().height ?? SUB_EST_H;
    const items = placeFlyoutMenu(catAnchor, ITEMS_W, itemsH);
    setItemsPos({ left: items.left, top: items.top });
  }, [menu, insertCategory, menuVisible, insertQuery, catalog.length]);

  useEffect(() => {
    if (!menu) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        t instanceof Element &&
        (t.closest('[data-story-rich-menu]') || t.closest('[data-story-rich-submenu]'))
      ) {
        return;
      }
      closeMenu();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('mousedown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menu, closeMenu]);

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuVisible(false);
    setMenu({
      x: e.clientX,
      y: e.clientY,
      left: e.clientX,
      top: e.clientY,
    });
    setInsertionsOpen(false);
    setInsertCategory(null);
    setInsertQuery('');
  };

  const activeCategory = catalog.find((c) => c.id === insertCategory);
  const filteredItems = activeCategory?.items.filter(
    (it) => !insertQuery || it.label.toLowerCase().includes(insertQuery.toLowerCase())
  );

  const contextMenu =
    menu &&
    createPortal(
      <>
        <div
          ref={menuRef}
          data-story-rich-menu
          data-open={menuVisible}
          className={`fixed z-[250] overflow-visible py-1 ${MENU_PANEL} ${MENU_ANIM}`}
          style={{ left: menu.left, top: menu.top, width: MENU_W }}
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <p className="border-b border-[#2A3045]/80 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#D61E2B]">
            Formato
          </p>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
            onClick={() => applyFormat('bold')}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#252A3C]">
              <Bold size={13} className="text-[#E8E9EB]" />
            </span>
            Negrita
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
            onClick={() => applyFormat('italic')}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#252A3C]">
              <Italic size={13} className="text-[#E8E9EB]" />
            </span>
            Cursiva
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
            onClick={() => applyFormat('underline')}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#252A3C]">
              <Underline size={13} className="text-[#E8E9EB]" />
            </span>
            Subrayado
          </button>
          {catalogWorldId && catalog.length > 0 && (
            <>
              <div className="my-1 border-t border-[#2A3045]/80" />
              <button
                type="button"
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#1E2230] ${
                  insertionsOpen ? 'bg-[#D61E2B]/10 text-[#E8E9EB]' : 'text-[#E8E9EB]'
                }`}
                onMouseEnter={() => setInsertionsOpen(true)}
                onClick={() => {
                  setInsertionsOpen((o) => !o);
                  if (insertionsOpen) setInsertCategory(null);
                }}
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#D61E2B]/15">
                    <Link2 size={13} className="text-[#D61E2B]" />
                  </span>
                  Inserciones
                </span>
                <ChevronRight size={14} className="text-[#5A6078]" />
              </button>
            </>
          )}
        </div>

        <AnimatePresence>
          {insertionsOpen && catalog.length > 0 && (
            <motion.div
              key="categories"
              ref={catMenuRef}
              data-story-rich-submenu="categories"
              data-open={menuVisible}
              className={`fixed z-[251] flex max-h-[min(300px,58vh)] flex-col ${MENU_PANEL}`}
              style={{ left: catPos.left, top: catPos.top, width: SUB_W }}
              onMouseDown={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
              {...flyoutMotion}
            >
              <div className={`min-h-0 flex-1 py-1 ${MENU_SCROLL}`} onWheel={(e) => e.stopPropagation()}>
                <p className="border-b border-[#2A3045]/80 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-[#5A6078]">
                  Categoría
                </p>
                {catalog.map((cat: InsertionCategory) => {
                  const Icon = insertionMeta(cat.items[0]?.type ?? 'character').icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#1E2230] ${
                        insertCategory === cat.id ? 'bg-[#D61E2B]/12 text-[#E8E9EB]' : 'text-[#8B91A7]'
                      }`}
                      onMouseEnter={() => setInsertCategory(cat.id)}
                    >
                      <Icon size={14} className="shrink-0 opacity-80" />
                      <span className="min-w-0 flex-1 truncate">{cat.label}</span>
                      <span className="shrink-0 rounded bg-[#252A3C] px-1.5 py-0.5 text-[10px] text-[#5A6078]">
                        {cat.items.length}
                      </span>
                      <ChevronRight size={12} className="shrink-0 text-[#5A6078]" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {insertCategory && activeCategory && (
            <motion.div
              key={`items-${insertCategory}`}
              ref={itemsMenuRef}
              data-story-rich-submenu="items"
              data-open={menuVisible}
              className={`fixed z-[252] flex max-h-[min(300px,58vh)] flex-col ${MENU_PANEL}`}
              style={{ left: itemsPos.left, top: itemsPos.top, width: ITEMS_W }}
              onMouseDown={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
              {...flyoutMotion}
            >
              <div className="flex max-h-[min(300px,58vh)] flex-col" onWheel={(e) => e.stopPropagation()}>
                <div className="shrink-0 border-b border-[#2A3045]/80 p-2.5">
                  <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-[#D61E2B]">
                    {activeCategory.label}
                  </p>
                  <input
                    className="story-input w-full text-xs"
                    placeholder="Buscar…"
                    value={insertQuery}
                    onChange={(e) => setInsertQuery(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </div>
                <div className={`min-h-0 flex-1 p-1.5 ${MENU_SCROLL}`}>
                  {(filteredItems?.length ?? 0) === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-[#5A6078]">Sin resultados</p>
                  ) : (
                    filteredItems!.map((it) => {
                      const meta = insertionMeta(it.type);
                      const Icon = meta.icon;
                      return (
                        <button
                          key={`${it.type}-${it.id}`}
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
                          onClick={() => insertAtCursor(it.type, it.id, it.label)}
                        >
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: meta.bg }}
                          >
                            <Icon size={14} style={{ color: meta.color }} />
                          </span>
                          <span className="min-w-0 truncate">{it.label}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>,
      document.body
    );

  return (
    <div className={`relative space-y-2 ${className}`} data-story-rich-text onContextMenu={openMenu}>
      {needsWorldPicker && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#2A3045]/70 bg-[#111318]/60 px-3 py-2">
          <Globe size={14} className="shrink-0 text-[#8B5CF6]" />
          <span className="text-xs text-[#8B91A7]">Inserciones del mundo:</span>
          <select
            className="story-input min-w-[10rem] flex-1 text-xs"
            value={insertionWorldId}
            onChange={(e) => setInsertionWorldId(e.target.value)}
          >
            <option value="">Selecciona un mundo…</option>
            {worlds.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div
        className="story-input relative w-full overflow-hidden p-0"
        style={{ minHeight }}
        onContextMenu={openMenu}
      >
        <StoryRichTextEditor
          ref={editorRef}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minHeight={minHeight}
          onContextMenu={openMenu}
        />
      </div>
      {!hideHint && (
        <p className="text-[10px] text-[#5A6078]">
          Clic derecho: formato e inserciones · Pasa el cursor sobre un chip para quitarlo
        </p>
      )}
      {contextMenu}
    </div>
  );
}
