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
import {
  Bold,
  Italic,
  Underline,
  Link2,
  ChevronRight,
  Folder,
  Globe,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RotateCcw,
  Copy,
  Scissors,
  SpellCheck,
} from 'lucide-react';
import { fetchSpellingSuggestion } from '@/lib/spellCheck';
import { toast } from 'sonner';
import type { TextAlign } from '@/lib/storyRichText';
import { useAppStore, useStore } from '@/store';
import {
  buildInsertionCatalog,
  INSERTION_CATEGORY_FOLDER_SCOPE,
  type InsertionCategory,
} from '@/lib/storyInsertionCatalog';
import { DEFAULT_FOLDER_COLOR } from '@/lib/folderSectionBridge';
import { clampMenuPosition, placeFlyoutMenu } from '@/lib/contextMenuPosition';
import { insertionMeta } from '@/lib/insertionMeta';
import {
  StoryRichTextEditor,
  type StoryRichTextEditorHandle,
  type RichFormatState,
} from '@/components/common/StoryRichTextEditor';
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
  worldId,
  insertionWorldId,
  onInsertionWorldChange,
  placeholder = 'Escribe aquí…',
  minHeight = '6rem',
  className = '',
  hideHint = false,
  showInsertionWorldPicker,
}: Props) {
  const worlds = useAppStore((s) => s.worlds.filter((w) => !w.isDeleted));
  const catalogWorldId = worldId || insertionWorldId || '';
  const [localInsertionWorld, setLocalInsertionWorld] = useState(catalogWorldId);

  useEffect(() => {
    if (worldId || insertionWorldId) {
      setLocalInsertionWorld(worldId || insertionWorldId || '');
    }
  }, [worldId, insertionWorldId]);

  const pickerWorldId = catalogWorldId || localInsertionWorld;

  const handleWorldSelect = (id: string) => {
    if (id === pickerWorldId) return;
    setLocalInsertionWorld(id);
    onInsertionWorldChange?.(id);
  };

  const needsWorldPicker =
    !pickerWorldId && showInsertionWorldPicker !== false && worlds.length > 0;

  const editorRef = useRef<StoryRichTextEditorHandle>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const catMenuRef = useRef<HTMLDivElement>(null);
  const itemsMenuRef = useRef<HTMLDivElement>(null);
  const folderItemsMenuRef = useRef<HTMLDivElement>(null);
  const folderButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [folderMenuReady, setFolderMenuReady] = useState(false);

  const [menu, setMenu] = useState<MenuPos | null>(null);
  const [insertionsOpen, setInsertionsOpen] = useState(false);
  const [insertCategory, setInsertCategory] = useState<string | null>(null);
  const [insertFolderId, setInsertFolderId] = useState<string | null>(null);
  const [insertQuery, setInsertQuery] = useState('');
  const entityFolders = useStore((s) => s.entityFolders);
  const [menuVisible, setMenuVisible] = useState(false);
  const [catPos, setCatPos] = useState({ left: 0, top: 0 });
  const [itemsPos, setItemsPos] = useState({ left: 0, top: 0 });
  const [folderItemsPos, setFolderItemsPos] = useState({ left: 0, top: 0 });
  const [formatState, setFormatState] = useState<RichFormatState>({
    bold: false,
    italic: false,
    underline: false,
    align: null,
  });
  const [chipContext, setChipContext] = useState(false);
  const [spellLoading, setSpellLoading] = useState(false);
  const [spellSuggestion, setSpellSuggestion] = useState<{
    word: string;
    suggestion: string;
  } | null>(null);
  const spellRangeRef = useRef<Range | null>(null);
  const spellAbortRef = useRef<AbortController | null>(null);

  const refreshFormatState = useCallback(() => {
    const next = editorRef.current?.getFormatState();
    if (next) setFormatState(next);
  }, []);

  const catalog = useMemo(() => {
    if (!pickerWorldId || !menu) return [];
    return buildInsertionCatalog(pickerWorldId, useStore.getState());
  }, [pickerWorldId, menu]);

  const closeMenu = useCallback(() => {
    spellAbortRef.current?.abort();
    setSpellLoading(false);
    setSpellSuggestion(null);
    spellRangeRef.current = null;
    setMenu(null);
    setInsertionsOpen(false);
    setInsertCategory(null);
    setInsertFolderId(null);
    setInsertQuery('');
    setMenuVisible(false);
  }, []);

  const applyFormat = (cmd: 'bold' | 'italic' | 'underline') => {
    editorRef.current?.applyFormat(cmd);
    requestAnimationFrame(refreshFormatState);
  };

  const applyAlign = (align: TextAlign) => {
    editorRef.current?.applyAlign(align);
    requestAnimationFrame(refreshFormatState);
  };

  const clearFormat = () => {
    editorRef.current?.clearFormat();
    requestAnimationFrame(refreshFormatState);
  };

  const copyRichText = () => {
    editorRef.current?.saveSelection();
    const copied = editorRef.current?.copyToClipboard();
    if (copied) toast.success('Texto copiado con formato');
    else toast.error('No hay texto para copiar');
    editorRef.current?.focus();
    closeMenu();
  };

  const cutChip = () => {
    const md = editorRef.current?.cutSelectedChip();
    if (md) toast.success('Inserción cortada — pégala donde quieras');
    else toast.error('Selecciona una inserción');
    editorRef.current?.focus();
    closeMenu();
  };

  const insertAtCursor = useCallback(
    (type: string, id: string, label: string) => {
      editorRef.current?.insertRef(type, id, label);
      editorRef.current?.focus();
      setInsertionsOpen(false);
      setInsertCategory(null);
      setInsertFolderId(null);
      setInsertQuery('');
      closeMenu();
    },
    [closeMenu]
  );

  const activeCategory = catalog.find((c) => c.id === insertCategory);

  const categoryFolders = useMemo(() => {
    if (!insertCategory || !pickerWorldId) return [];
    const scope = INSERTION_CATEGORY_FOLDER_SCOPE[insertCategory];
    if (!scope) return [];
    return entityFolders
      .filter((f) => f.worldId === pickerWorldId && f.scope === scope)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [insertCategory, pickerWorldId, entityFolders]);

  const activeFolder = insertFolderId
    ? categoryFolders.find((f) => f.id === insertFolderId)
    : null;

  const filteredItems = useMemo(() => {
    const items = activeCategory?.items ?? [];
    const q = insertQuery.trim().toLowerCase();
    return items.filter((it) => !q || it.label.toLowerCase().includes(q));
  }, [activeCategory, insertQuery]);

  const folderOnlyItems = useMemo(() => {
    if (!activeFolder) return [];
    const ids = new Set(activeFolder.itemIds);
    const q = insertQuery.trim().toLowerCase();
    return (activeCategory?.items ?? []).filter(
      (it) => ids.has(it.id) && (!q || it.label.toLowerCase().includes(q))
    );
  }, [activeCategory, activeFolder, insertQuery]);

  useEffect(() => {
    setInsertFolderId(null);
  }, [insertCategory]);

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

  const toggleInsertFolder = useCallback((folderId: string) => {
    if (insertFolderId === folderId) {
      setInsertFolderId(null);
      setFolderMenuReady(false);
      return;
    }
    setFolderMenuReady(false);
    setInsertFolderId(folderId);
  }, [insertFolderId]);

  useLayoutEffect(() => {
    if (!insertFolderId) {
      setFolderMenuReady(false);
      return;
    }
    const btn = folderButtonRefs.current.get(insertFolderId);
    if (!btn) return;
    const anchor = btn.getBoundingClientRect();
    const menuEl = folderItemsMenuRef.current;
    const menuHeight = menuEl?.offsetHeight || menuEl?.scrollHeight || SUB_EST_H;
    const pos = placeFlyoutMenu(anchor, ITEMS_W, menuHeight);
    setFolderItemsPos({ left: pos.left, top: pos.top });
    setFolderMenuReady(true);
  }, [insertFolderId, folderOnlyItems.length, insertQuery, menuVisible]);

  useEffect(() => {
    if (!menu) return;
    refreshFormatState();
    const onSelectionChange = () => refreshFormatState();
    document.addEventListener('selectionchange', onSelectionChange);
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
      document.removeEventListener('selectionchange', onSelectionChange);
      window.removeEventListener('mousedown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menu, closeMenu, refreshFormatState]);

  const formatBtnClass = (active: boolean) =>
    `flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-[#1E2230] ${
      active ? 'bg-[#D61E2B]/12 text-[#E8E9EB]' : 'text-[#E8E9EB]'
    }`;

  const loadSpellSuggestion = useCallback(() => {
    spellAbortRef.current?.abort();
    setSpellSuggestion(null);
    spellRangeRef.current = null;

    const target = editorRef.current?.getSpellingTarget();
    if (!target) {
      setSpellLoading(false);
      return;
    }

    spellRangeRef.current = target.range;
    setSpellLoading(true);
    const ac = new AbortController();
    spellAbortRef.current = ac;

    void fetchSpellingSuggestion(target.word, ac.signal).then((suggestion) => {
      if (ac.signal.aborted) return;
      setSpellLoading(false);
      if (suggestion) {
        setSpellSuggestion({ word: target.word, suggestion });
      }
    });
  }, []);

  const applySpellCorrection = () => {
    const range = spellRangeRef.current;
    if (!range || !spellSuggestion) return;
    editorRef.current?.replaceSpellingWord(range, spellSuggestion.suggestion);
    setSpellSuggestion(null);
    spellRangeRef.current = null;
    closeMenu();
  };

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    editorRef.current?.saveSelection();
    const onChip = editorRef.current?.selectionIsChipOnly() ?? false;
    setChipContext(onChip);
    if (onChip) {
      setInsertionsOpen(false);
      setInsertCategory(null);
      setInsertFolderId(null);
    }
    const fmt = editorRef.current?.getFormatState();
    if (fmt) setFormatState(fmt);
    setSpellLoading(true);
    setSpellSuggestion(null);
    loadSpellSuggestion();
    setMenuVisible(false);
    setMenu({
      x: e.clientX,
      y: e.clientY,
      left: e.clientX,
      top: e.clientY,
    });
    setInsertionsOpen(false);
    setInsertCategory(null);
    setInsertFolderId(null);
    setInsertQuery('');
  };

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
          {chipContext ? (
            <>
              <p className="border-b border-[#2A3045]/80 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#D61E2B]">
                Inserción
              </p>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={copyRichText}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#252A3C]">
                  <Copy size={13} className="text-[#E8E9EB]" />
                </span>
                Copiar
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={cutChip}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#252A3C]">
                  <Scissors size={13} className="text-[#E8E9EB]" />
                </span>
                Cortar
              </button>
            </>
          ) : (
            <>
          <p className="border-b border-[#2A3045]/80 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#D61E2B]">
            Formato
          </p>
          <button
            type="button"
            className={formatBtnClass(formatState.bold)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('bold')}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#252A3C]">
              <Bold size={13} className="text-[#E8E9EB]" />
            </span>
            Negrita
          </button>
          <button
            type="button"
            className={formatBtnClass(formatState.italic)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('italic')}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#252A3C]">
              <Italic size={13} className="text-[#E8E9EB]" />
            </span>
            Cursiva
          </button>
          <button
            type="button"
            className={formatBtnClass(formatState.underline)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('underline')}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#252A3C]">
              <Underline size={13} className="text-[#E8E9EB]" />
            </span>
            Subrayado
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearFormat}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#252A3C]">
              <RotateCcw size={13} className="text-[#E8E9EB]" />
            </span>
            Restaurar formato
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
            onMouseDown={(e) => e.preventDefault()}
            onClick={copyRichText}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#252A3C]">
              <Copy size={13} className="text-[#E8E9EB]" />
            </span>
            Copiar
          </button>
          <div className="my-1 border-t border-[#2A3045]/80" />
          <p className="border-b border-[#2A3045]/80 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#5A6078]">
            Alineación
          </p>
          <div className="flex items-center justify-between gap-1 px-2 py-1.5">
            {(
              [
                { align: 'left' as const, label: 'Izquierda', Icon: AlignLeft },
                { align: 'center' as const, label: 'Centro', Icon: AlignCenter },
                { align: 'right' as const, label: 'Derecha', Icon: AlignRight },
                { align: 'justify' as const, label: 'Justificado', Icon: AlignJustify },
              ] as const
            ).map(({ align, label, Icon }) => (
              <button
                key={align}
                type="button"
                title={label}
                aria-label={label}
                className={`flex h-8 flex-1 items-center justify-center rounded-md transition-colors hover:bg-[#1E2230] ${
                  formatState.align === align || (align === 'left' && !formatState.align)
                    ? 'bg-[#D61E2B]/15 text-[#E8E9EB]'
                    : 'text-[#E8E9EB]'
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyAlign(align)}
              >
                <Icon size={15} className="text-[#E8E9EB]" />
              </button>
            ))}
          </div>
            </>
          )}
          {!chipContext && (spellLoading || spellSuggestion) && (
            <>
              <div className="my-1 border-t border-[#2A3045]/80" />
              <p className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#5A6078]">
                Ortografía
              </p>
              {spellLoading && !spellSuggestion && (
                <p className="px-3 pb-2 text-xs text-[#5A6078]">Revisando palabra…</p>
              )}
              {spellSuggestion && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={applySpellCorrection}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#22C55E]/12">
                    <SpellCheck size={13} className="text-[#22C55E]" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-[#5A6078] line-through">{spellSuggestion.word}</span>
                    <span className="mx-1.5 text-[#5A6078]">→</span>
                    <span className="font-medium text-[#22C55E]">{spellSuggestion.suggestion}</span>
                  </span>
                </button>
              )}
            </>
          )}
          {pickerWorldId && catalog.length > 0 && !chipContext && (
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
                      onMouseEnter={() => {
                        setInsertCategory(cat.id);
                        setInsertFolderId(null);
                      }}
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
              data-story-rich-submenu="items"
              data-open={menuVisible}
              className={`fixed z-[252] flex max-h-[min(300px,58vh)] flex-col ${MENU_PANEL}`}
              style={{ left: itemsPos.left, top: itemsPos.top, width: ITEMS_W }}
              onMouseDown={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
              {...flyoutMotion}
            >
              <div
                ref={itemsMenuRef}
                className="flex max-h-[min(300px,58vh)] flex-col"
                onWheel={(e) => e.stopPropagation()}
              >
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
                  {categoryFolders.length > 0 && (
                    <div className="mb-2 space-y-0.5 border-b border-[#2A3045]/60 pb-2">
                      <p className="px-2 pb-1 text-[9px] font-mono uppercase tracking-wider text-[#5A6078]">
                        Carpetas
                      </p>
                      {categoryFolders.map((folder) => {
                        const color = folder.color ?? DEFAULT_FOLDER_COLOR;
                        const count = folder.itemIds.filter((id) =>
                          activeCategory?.items.some((it) => it.id === id)
                        ).length;
                        return (
                          <button
                            key={folder.id}
                            type="button"
                            ref={(el) => {
                              if (el) folderButtonRefs.current.set(folder.id, el);
                              else folderButtonRefs.current.delete(folder.id);
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-[#1E2230] ${
                              insertFolderId === folder.id ? 'bg-[#D61E2B]/12 text-[#E8E9EB]' : 'text-[#8B91A7]'
                            }`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => toggleInsertFolder(folder.id)}
                          >
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: `${color}18` }}
                            >
                              <Folder size={14} style={{ color }} strokeWidth={1.75} />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                            <span className="shrink-0 text-[10px] text-[#5A6078]">{count}</span>
                            <ChevronRight size={12} className="shrink-0 text-[#5A6078]" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="px-2 pb-1 text-[9px] font-mono uppercase tracking-wider text-[#5A6078]">
                    Todos
                  </p>
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

        <AnimatePresence>
          {insertFolderId && activeFolder && (
            <motion.div
              key={`folder-items-${insertFolderId}`}
              ref={folderItemsMenuRef}
              data-story-rich-submenu="folder-items"
              data-open={menuVisible}
              className={`fixed z-[253] flex max-h-[min(300px,58vh)] flex-col ${MENU_PANEL}`}
              style={{
                left: folderItemsPos.left,
                top: folderItemsPos.top,
                width: ITEMS_W,
                visibility: folderMenuReady ? 'visible' : 'hidden',
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
              {...flyoutMotion}
            >
              <div className="flex max-h-[min(300px,58vh)] flex-col" onWheel={(e) => e.stopPropagation()}>
                <div className="shrink-0 border-b border-[#2A3045]/80 p-2.5">
                  <p className="mb-1 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#D61E2B]">
                    <Folder
                      size={12}
                      style={{ color: activeFolder.color ?? DEFAULT_FOLDER_COLOR }}
                    />
                    {activeFolder.name}
                  </p>
                  <p className="text-[10px] text-[#5A6078]">{folderOnlyItems.length} en carpeta</p>
                </div>
                <div className={`min-h-0 flex-1 p-1.5 ${MENU_SCROLL}`}>
                  {folderOnlyItems.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-[#5A6078]">Carpeta vacía</p>
                  ) : (
                    folderOnlyItems.map((it) => {
                      const meta = insertionMeta(it.type);
                      const Icon = meta.icon;
                      return (
                        <button
                          key={`folder-${it.type}-${it.id}`}
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
            value={localInsertionWorld}
            onChange={(e) => handleWorldSelect(e.target.value)}
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
      <div className="story-input relative w-full overflow-hidden p-0" style={{ minHeight }}>
        <StoryRichTextEditor
          ref={editorRef}
          value={value}
          onChange={onChange}
          worldId={pickerWorldId || worldId}
          placeholder={placeholder}
          minHeight={minHeight}
          richMenuOpen={Boolean(menu)}
        />
      </div>
      {!hideHint && (
        <p className="text-[10px] text-[#5A6078]">
          Clic derecho: formato, alineación e inserciones · Ctrl+C/V en chips · Doble clic para renombrar
        </p>
      )}
      {contextMenu}
    </div>
  );
}
