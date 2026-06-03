import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, forwardRef } from 'react';
import {
  editorHtmlToMarkdown,
  markdownToEditorHtml,
  buildStoryRef,
  parseStoryRefs,
  STORY_REF_RE,
  type TextAlign,
} from '@/lib/storyRichText';
import type { InlineMarks } from '@/lib/storyRichTextSerialize';
import {
  getTextSelectionBookmark,
  restoreTextSelectionBookmark,
  selectRange,
  toggleFormatOnRange,
  normalizeEditorDom,
  rangeAllHasFormat,
  clearInlineFormattingInRange,
  type FormatKind,
} from '@/lib/storyRichTextDom';
import { chipIconHtml } from '@/lib/chipIconHtml';
import { insertionMeta } from '@/lib/insertionMeta';
import { expandRangeToWord } from '@/lib/spellCheck';

export type RichFormatState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: TextAlign | null;
};

export type StoryRichTextEditorHandle = {
  focus: () => void;
  saveSelection: () => void;
  applyFormat: (cmd: 'bold' | 'italic' | 'underline') => void;
  applyAlign: (align: TextAlign) => void;
  clearFormat: () => void;
  insertRef: (type: string, id: string, label: string) => void;
  getMarkdown: () => string;
  copyToClipboard: () => boolean;
  getFormatState: () => RichFormatState;
  getSelectedChip: () => HTMLElement | null;
  selectionIsChipOnly: () => boolean;
  cutSelectedChip: () => string | null;
  pasteCutChip: () => boolean;
  getSelectionOffsets: () => { start: number; end: number } | null;
  getSpellingTarget: () => { word: string; range: Range } | null;
  replaceSpellingWord: (range: Range, replacement: string) => void;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  worldId?: string;
  placeholder?: string;
  minHeight?: string;
  onContextMenu?: (e: React.MouseEvent) => void;
  className?: string;
  /** Evita re-render del HTML mientras el menú contextual de formato está abierto. */
  richMenuOpen?: boolean;
};

function normalizeStoredValue(text: string): string {
  const t = text.replace(/\u200B/g, '').trim();
  return t === '' ? '' : text.replace(/\u200B/g, '');
}

function buildChipElement(type: string, id: string, label: string): HTMLSpanElement {
  const meta = insertionMeta(type);
  const chip = document.createElement('span');
  chip.contentEditable = 'false';
  chip.dataset.storyRef = 'true';
  chip.dataset.storyType = type;
  chip.dataset.storyId = id;
  chip.dataset.storyLabel = label;
  chip.className = 'story-inline-chip';
  chip.style.setProperty('--chip-color', meta.color);
  chip.style.setProperty('--chip-bg', meta.bg);
  chip.innerHTML =
    `<span class="story-inline-chip-icon-slot" aria-hidden="true">${chipIconHtml(type, meta.color)}` +
    `<button type="button" class="story-inline-chip-remove" data-remove-chip aria-label="Quitar">×</button></span>` +
    `<span class="story-inline-chip-label">${label.replace(/</g, '')}</span>`;
  return chip;
}

/** Párrafo = hijo directo del editor o bloque marcado. */
function findParagraphBlock(node: Node | null, root: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  if (current?.nodeType === Node.TEXT_NODE) current = current.parentNode;
  while (current && current !== root) {
    if (current instanceof HTMLElement) {
      if (current.parentNode === root) return current;
      if (current.dataset.storyParagraph === 'true' || current.dataset.storyAlign) return current;
    }
    current = current.parentNode;
  }
  return null;
}

function normalizeEditorParagraphs(root: HTMLElement) {
  const hasParagraphs = root.querySelector('[data-story-paragraph], [data-story-align]');
  if (hasParagraphs) return;

  const fragment = document.createDocumentFragment();
  let buffer: Node[] = [];

  const flush = () => {
    const div = document.createElement('div');
    div.dataset.storyParagraph = 'true';
    if (buffer.length === 0) div.appendChild(document.createElement('br'));
    else buffer.forEach((n) => div.appendChild(n));
    fragment.appendChild(div);
    buffer = [];
  };

  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR') {
      flush();
    } else {
      buffer.push(node);
    }
  });
  flush();

  root.innerHTML = '';
  root.appendChild(fragment);
}

function paragraphsInRange(range: Range, root: HTMLElement): HTMLElement[] {
  const paragraphs = new Set<HTMLElement>();

  const consider = (node: Node | null) => {
    const p = findParagraphBlock(node, root);
    if (p) paragraphs.add(p);
  };

  consider(range.startContainer);
  consider(range.endContainer);

  if (!range.collapsed) {
    Array.from(root.children).forEach((child) => {
      if (child instanceof HTMLElement && range.intersectsNode(child)) paragraphs.add(child);
    });
  }

  return [...paragraphs];
}

function setBlockAlignment(block: HTMLElement, align: TextAlign) {
  block.dataset.storyParagraph = 'true';
  if (align === 'left') {
    delete block.dataset.storyAlign;
    block.style.textAlign = '';
    return;
  }
  block.dataset.storyAlign = align;
  block.style.textAlign = align;
}

function applyAlignmentToSelection(el: HTMLElement, align: TextAlign) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.commonAncestorContainer)) return;

  normalizeEditorParagraphs(el);

  let paragraphs = paragraphsInRange(range, el);
  if (paragraphs.length === 0) {
    const single = findParagraphBlock(range.startContainer, el);
    if (single) paragraphs = [single];
  }

  paragraphs.forEach((block) => setBlockAlignment(block, align));
}

function readAlignFromParagraph(p: HTMLElement): TextAlign | null {
  const fromData = p.dataset.storyAlign as TextAlign | undefined;
  if (fromData && fromData !== 'left') return fromData;
  const ta = p.style.textAlign;
  if (ta === 'center' || ta === 'right' || ta === 'justify') return ta;
  return null;
}

function rangeStillInEditor(range: Range, root: HTMLElement): boolean {
  return root.contains(range.startContainer) && root.contains(range.endContainer);
}

function isInsideChip(node: Node | null, root: HTMLElement): boolean {
  let current: Node | null = node;
  if (current?.nodeType === Node.TEXT_NODE) current = current.parentNode;
  while (current && current !== root) {
    if (current instanceof HTMLElement && current.dataset.storyRef === 'true') return true;
    current = current.parentNode;
  }
  return false;
}

function chipElementFromNode(node: Node | null, root: HTMLElement): HTMLElement | null {
  if (!node) return null;
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const chip = el?.closest('[data-story-ref="true"]') as HTMLElement | null;
  if (!chip || !root.contains(chip)) return null;
  return chip;
}

function runEditorNormalize(root: HTMLElement) {
  normalizeEditorDom(root, normalizeEditorParagraphs);
}

/** Ajusta el rango para no aplicar formato dentro de inserciones (chips). */
function adjustRangeForFormatting(range: Range, root: HTMLElement): Range | null {
  const r = range.cloneRange();
  if (isInsideChip(r.startContainer, root)) {
    const chip = chipElementFromNode(r.startContainer, root);
    if (chip) r.setStartAfter(chip);
  }
  if (isInsideChip(r.endContainer, root)) {
    const chip = chipElementFromNode(r.endContainer, root);
    if (chip) r.setEndBefore(chip);
  }
  if (r.collapsed) return null;
  const text = r.toString().replace(/\u200B/g, '').trim();
  if (!text) return null;
  return r;
}

function readFormatState(
  el: HTMLElement,
  fallbackRange: Range | null,
  pendingMarks?: InlineMarks
): RichFormatState {
  const empty: RichFormatState = { bold: false, italic: false, underline: false, align: null };

  let range: Range | null = null;

  if (fallbackRange && rangeStillInEditor(fallbackRange, el)) {
    range = fallbackRange.cloneRange();
  } else {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && sel.anchorNode && el.contains(sel.anchorNode)) {
      range = sel.getRangeAt(0);
    }
  }
  if (!range) return empty;

  const anchor = range.collapsed ? range.startContainer : range.commonAncestorContainer;

  const bold = range.collapsed && pendingMarks ? pendingMarks.bold : rangeAllHasFormat(range, el, 'bold');
  const italic =
    range.collapsed && pendingMarks ? pendingMarks.italic : rangeAllHasFormat(range, el, 'italic');
  const underline =
    range.collapsed && pendingMarks
      ? pendingMarks.underline
      : rangeAllHasFormat(range, el, 'underline');

  const paragraphs = paragraphsInRange(range, el);
  const alignTargets = paragraphs.length
    ? paragraphs
    : [findParagraphBlock(anchor, el)].filter((p): p is HTMLElement => Boolean(p));

  let align: TextAlign | null = null;
  for (const p of alignTargets) {
    const a = readAlignFromParagraph(p);
    if (!a) continue;
    if (align === null) align = a;
    else if (align !== a) {
      align = null;
      break;
    }
  }

  return { bold, italic, underline, align };
}

const CHIP_SELECT_STYLES: Record<string, { color: string; bg: string }> = {
  character: { color: '#EC4899', bg: 'rgba(236,72,153,0.24)' },
  scene: { color: '#F97316', bg: 'rgba(249,115,22,0.24)' },
  place: { color: '#22C55E', bg: 'rgba(34,197,94,0.24)' },
  house: { color: '#A855F7', bg: 'rgba(168,85,247,0.24)' },
  component: { color: '#06B6D4', bg: 'rgba(6,182,212,0.24)' },
  organization: { color: '#EAB308', bg: 'rgba(234,179,8,0.24)' },
  idea: { color: '#D61E2B', bg: 'rgba(214,30,43,0.24)' },
  fact: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.24)' },
  datum: { color: '#3B82F6', bg: 'rgba(59,130,246,0.24)' },
  fantastic: { color: '#F472B6', bg: 'rgba(244,114,182,0.24)' },
  default: { color: '#EC4899', bg: 'rgba(236,72,153,0.24)' },
};

const UNDO_LIMIT = 80;

export const StoryRichTextEditor = forwardRef<StoryRichTextEditorHandle, Props>(function StoryRichTextEditor(
  {
    value,
    onChange,
    worldId: _worldId,
    placeholder = 'Escribe aquí…',
    minHeight = '6rem',
    onContextMenu,
    className = '',
    richMenuOpen = false,
  },
  ref
) {
  const editorRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const skipPropSyncRef = useRef(false);
  const isFocusedRef = useRef(false);
  const mountedRef = useRef(false);
  const lastValueRef = useRef(normalizeStoredValue(value));
  const savedRangeRef = useRef<Range | null>(null);
  const onChangeRef = useRef(onChange);
  const renamingChipRef = useRef<HTMLElement | null>(null);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isHistoryRef = useRef(false);
  const mountGuardRef = useRef(true);
  const browserLang =
    typeof navigator !== 'undefined' ? navigator.language : undefined;
  onChangeRef.current = onChange;

  const cutChipRef = useRef<{ type: string; id: string; label: string } | null>(null);
  const pendingMarksRef = useRef<InlineMarks>({ bold: false, italic: false, underline: false });

  const getInsertionRange = useCallback((): Range | null => {
    const el = editorRef.current;
    if (!el) return null;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const current = sel.getRangeAt(0);
      if (el.contains(current.commonAncestorContainer)) return current.cloneRange();
    }
    if (savedRangeRef.current && rangeStillInEditor(savedRangeRef.current, el)) {
      return savedRangeRef.current.cloneRange();
    }
    const blocks = el.querySelectorAll('[data-story-paragraph], [data-story-align]');
    const lastBlock = blocks.length ? (blocks[blocks.length - 1] as HTMLElement) : el;
    const r = document.createRange();
    if (lastBlock.lastChild) {
      r.setStartAfter(lastBlock.lastChild);
    } else {
      r.selectNodeContents(lastBlock);
    }
    r.collapse(true);
    return r;
  }, []);

  const placeCaretAfterNode = useCallback((node: Node) => {
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    const after = node.nextSibling;
    if (after?.nodeType === Node.TEXT_NODE && after.textContent === '\u200B') {
      range.setStartAfter(after);
    } else {
      const spacer = document.createTextNode('\u200B');
      if (node.parentNode) node.parentNode.insertBefore(spacer, node.nextSibling);
      range.setStartAfter(spacer);
    }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    savedRangeRef.current = range.cloneRange();
  }, []);

  const saveSelection = useCallback(() => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (el.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const range = savedRangeRef.current;
    if (!range) return false;
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }, []);

  const syncToParent = useCallback(() => {
    const el = editorRef.current;
    if (!el || syncingRef.current || mountGuardRef.current) return;
    runEditorNormalize(el);
    const prev = lastValueRef.current;
    const md = editorHtmlToMarkdown(el);
    const normalized = normalizeStoredValue(md);
    if (normalized === prev) return;
    if (!isHistoryRef.current && isFocusedRef.current) {
      undoStackRef.current.push(prev);
      if (undoStackRef.current.length > UNDO_LIMIT) undoStackRef.current.shift();
      redoStackRef.current = [];
    }
    lastValueRef.current = normalized;
    skipPropSyncRef.current = true;
    onChangeRef.current(normalized);
  }, []);

  const isBlurInsideField = (e: React.FocusEvent<HTMLDivElement>) => {
    const related = e.relatedTarget as Node | null;
    if (!related) return false;
    if (related instanceof Element) {
      if (
        related.closest('[data-story-rich-text]') ||
        related.closest('[data-story-rich-menu]') ||
        related.closest('[data-story-rich-submenu]')
      ) {
        return true;
      }
    }
    const field = e.currentTarget.closest('[data-story-rich-text]');
    return Boolean(field?.contains(related));
  };

  const syncFromValue = useCallback((text: string) => {
    const el = editorRef.current;
    if (!el) return;
    const normalized = normalizeStoredValue(text);
    syncingRef.current = true;
    const html = normalized ? markdownToEditorHtml(normalized) : '<br>';
    if (el.innerHTML !== html) {
      el.innerHTML = html;
      runEditorNormalize(el);
    }
    lastValueRef.current = normalized;
    queueMicrotask(() => {
      syncingRef.current = false;
    });
  }, []);

  const applyHistoryValue = useCallback(
    (value: string) => {
      isHistoryRef.current = true;
      lastValueRef.current = normalizeStoredValue(value);
      skipPropSyncRef.current = true;
      syncFromValue(value);
      onChangeRef.current(value);
      queueMicrotask(() => {
        isHistoryRef.current = false;
      });
    },
    [syncFromValue]
  );

  const insertPlainTextAtSelection = useCallback(
    (text: string, marks?: InlineMarks) => {
      const el = editorRef.current;
      if (!el || !text) return;
      el.focus();
      const range = getInsertionRange();
      if (!range) return;
      const sel = window.getSelection();
      range.deleteContents();
      let node: Node = document.createTextNode(text);
      const m = marks ?? pendingMarksRef.current;
      if (m.underline) {
        const u = document.createElement('u');
        u.appendChild(node);
        node = u;
      }
      if (m.italic) {
        const em = document.createElement('em');
        em.appendChild(node);
        node = em;
      }
      if (m.bold) {
        const strong = document.createElement('strong');
        strong.appendChild(node);
        node = strong;
      }
      range.insertNode(node);
      const after = document.createRange();
      after.setStartAfter(node);
      after.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(after);
      savedRangeRef.current = after.cloneRange();
    },
    [getInsertionRange]
  );

  const insertChipAtSelection = useCallback(
    (type: string, id: string, label: string, opts?: { skipSync?: boolean }) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const chip = buildChipElement(type, id, label);
      const range = getInsertionRange();
      if (!range) return;
      const sel = window.getSelection();
      range.deleteContents();
      range.insertNode(chip);
      placeCaretAfterNode(chip);
      if (sel && sel.rangeCount) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      if (!opts?.skipSync) syncToParent();
    },
    [getInsertionRange, placeCaretAfterNode, syncToParent]
  );

  const pasteRichMarkdownAtSelection = useCallback(
    (text: string) => {
      const el = editorRef.current;
      const re = new RegExp(STORY_REF_RE.source, 'g');
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(text)) !== null) {
        if (match.index > lastIndex) {
          insertPlainTextAtSelection(text.slice(lastIndex, match.index));
        }
        insertChipAtSelection(match[1], match[2], match[3], { skipSync: true });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) insertPlainTextAtSelection(text.slice(lastIndex));
      if (el) runEditorNormalize(el);
      syncToParent();
    },
    [insertChipAtSelection, insertPlainTextAtSelection, syncToParent]
  );

  const updateChipSelectionHighlight = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll('[data-story-ref="true"]').forEach((node) => {
      const chip = node as HTMLElement;
      chip.classList.remove('story-inline-chip-selected');
      chip.style.removeProperty('--chip-select-color');
      chip.style.removeProperty('--chip-select-bg');
    });
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const anchor = sel.anchorNode;
    if (!anchor || !el.contains(anchor)) return;
    el.querySelectorAll('[data-story-ref="true"]').forEach((node) => {
      const chip = node as HTMLElement;
      const range = sel.getRangeAt(0);
      if (!range.intersectsNode(chip)) return;
      const type = chip.dataset.storyType ?? 'default';
      const style = CHIP_SELECT_STYLES[type] ?? CHIP_SELECT_STYLES.default;
      chip.classList.add('story-inline-chip-selected');
      chip.style.setProperty('--chip-select-color', style.color);
      chip.style.setProperty('--chip-select-bg', style.bg);
    });
  }, []);

  useLayoutEffect(() => {
    syncFromValue(value);
    lastValueRef.current = normalizeStoredValue(value);
    undoStackRef.current = [];
    redoStackRef.current = [];
    mountedRef.current = true;
    queueMicrotask(() => {
      mountGuardRef.current = false;
    });
    return () => {
      mountedRef.current = false;
      mountGuardRef.current = true;
    };
  }, []);

  useEffect(() => {
    const onSelectionChange = () => {
      updateChipSelectionHighlight();
      const el = editorRef.current;
      if (!el || !isFocusedRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!range.collapsed || !el.contains(range.startContainer)) return;
      pendingMarksRef.current = {
        bold: rangeAllHasFormat(range, el, 'bold'),
        italic: rangeAllHasFormat(range, el, 'italic'),
        underline: rangeAllHasFormat(range, el, 'underline'),
      };
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [updateChipSelectionHighlight]);

  useEffect(() => {
    if (!mountedRef.current || isFocusedRef.current) return;
    if (skipPropSyncRef.current) {
      skipPropSyncRef.current = false;
      return;
    }
    const normalized = normalizeStoredValue(value);
    if (normalized === lastValueRef.current) return;
    syncFromValue(value);
  }, [value, syncFromValue]);

  const startChipRename = useCallback(
    (chip: HTMLElement) => {
      if (renamingChipRef.current) return;
      const labelEl = chip.querySelector('.story-inline-chip-label') as HTMLElement | null;
      if (!labelEl) return;
      renamingChipRef.current = chip;
      const current = chip.dataset.storyLabel ?? labelEl.textContent ?? '';
      labelEl.contentEditable = 'true';
      labelEl.classList.add('story-inline-chip-label-editing');
      labelEl.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(labelEl);
      sel?.removeAllRanges();
      sel?.addRange(range);

      const finish = (save: boolean) => {
        if (renamingChipRef.current !== chip) return;
        const next = (labelEl.textContent ?? '').trim() || current;
        labelEl.contentEditable = 'false';
        labelEl.classList.remove('story-inline-chip-label-editing');
        labelEl.textContent = save ? next : current;
        if (save) chip.dataset.storyLabel = next;
        renamingChipRef.current = null;
        if (save && next !== current) syncToParent();
      };

      const onKeyDown = (e: KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          finish(true);
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        }
      };
      const onBlur = () => finish(true);

      labelEl.addEventListener('keydown', onKeyDown);
      labelEl.addEventListener('blur', onBlur, { once: true });
    },
    [syncToParent]
  );

  const getSelectedChip = useCallback((): HTMLElement | null => {
    const el = editorRef.current;
    if (!el) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return null;
    const startChip = chipElementFromNode(range.startContainer, el);
    const endChip = chipElementFromNode(range.endContainer, el);
    if (startChip && startChip === endChip) return startChip;
    if (!range.collapsed) return null;
    return chipElementFromNode(sel.anchorNode, el);
  }, []);

  const selectionIsChipOnly = useCallback((): boolean => {
    const el = editorRef.current;
    if (!el) return false;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return false;
    const chip = getSelectedChip();
    if (!chip) return false;
    if (!range.collapsed) {
      const frag = range.cloneContents();
      const chips = frag.querySelectorAll('[data-story-ref="true"]');
      const text = frag.textContent?.replace(/\u200B/g, '').trim() ?? '';
      return chips.length === 1 && text === '';
    }
    return true;
  }, [getSelectedChip]);

  const getMarkdownFromEditor = useCallback((): string => {
    const el = editorRef.current;
    if (!el) return lastValueRef.current;
    return editorHtmlToMarkdown(el);
  }, []);

  const copyMarkdownToClipboard = useCallback((): boolean => {
    const el = editorRef.current;
    const sel = window.getSelection();
    let md = getMarkdownFromEditor();

    if (el && sel && !sel.isCollapsed && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (el.contains(range.commonAncestorContainer)) {
        const tmp = document.createElement('div');
        tmp.appendChild(range.cloneContents());
        md = editorHtmlToMarkdown(tmp);
      }
    } else {
      const chip = getSelectedChip();
      if (chip) {
        const type = chip.dataset.storyType ?? '';
        const id = chip.dataset.storyId ?? '';
        const label = chip.dataset.storyLabel ?? '';
        if (type && id) md = buildStoryRef(type, id, label);
      }
    }

    if (!md) return false;
    void navigator.clipboard.writeText(md);
    return true;
  }, [getMarkdownFromEditor, getSelectedChip]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      editorRef.current?.focus({ preventScroll: true });
    },
    saveSelection,
    getMarkdown: getMarkdownFromEditor,
    copyToClipboard: copyMarkdownToClipboard,
    applyFormat: (cmd: FormatKind) => {
      const el = editorRef.current;
      if (!el) return;
      restoreSelection();
      el.focus({ preventScroll: true });
      restoreSelection();

      const sel = window.getSelection();
      let workRange =
        savedRangeRef.current?.cloneRange() ??
        (sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null);

      if (!workRange || !rangeStillInEditor(workRange, el)) return;

      if (selectionIsChipOnly()) return;

      if (workRange.collapsed) {
        pendingMarksRef.current = {
          ...pendingMarksRef.current,
          [cmd]: !pendingMarksRef.current[cmd],
        };
        savedRangeRef.current = workRange.cloneRange();
        return;
      }

      const adjusted = adjustRangeForFormatting(workRange, el);
      if (adjusted) workRange = adjusted;

      const bookmark = getTextSelectionBookmark(el, workRange);
      toggleFormatOnRange(workRange, el, cmd);
      runEditorNormalize(el);

      const restored = bookmark ? restoreTextSelectionBookmark(el, bookmark) : null;
      if (restored) {
        selectRange(restored);
        savedRangeRef.current = restored.cloneRange();
      } else if (sel && sel.rangeCount > 0) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      }
      syncToParent();
    },
    applyAlign: (align) => {
      const el = editorRef.current;
      if (!el) return;
      restoreSelection();
      el.focus({ preventScroll: true });
      restoreSelection();
      const bookmark =
        savedRangeRef.current && rangeStillInEditor(savedRangeRef.current, el)
          ? getTextSelectionBookmark(el, savedRangeRef.current)
          : null;
      applyAlignmentToSelection(el, align);
      runEditorNormalize(el);
      if (bookmark) {
        const restored = restoreTextSelectionBookmark(el, bookmark);
        if (restored) {
          selectRange(restored);
          savedRangeRef.current = restored.cloneRange();
        }
      }
      syncToParent();
    },
    clearFormat: () => {
      const el = editorRef.current;
      if (!el) return;
      restoreSelection();
      el.focus({ preventScroll: true });
      restoreSelection();
      pendingMarksRef.current = { bold: false, italic: false, underline: false };
      const sel = window.getSelection();
      const range =
        savedRangeRef.current?.cloneRange() ??
        (sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null);
      clearInlineFormattingInRange(
        range && rangeStillInEditor(range, el) ? range : null,
        el
      );
      runEditorNormalize(el);
      syncToParent();
    },
    insertRef: (type, id, label) => {
      insertChipAtSelection(type, id, label);
    },
    getSelectedChip,
    selectionIsChipOnly,
    cutSelectedChip: () => {
      const el = editorRef.current;
      const chip = getSelectedChip();
      if (!el || !chip) return null;
      const type = chip.dataset.storyType ?? '';
      const id = chip.dataset.storyId ?? '';
      const label = chip.dataset.storyLabel ?? '';
      if (!type || !id) return null;
      const md = buildStoryRef(type, id, label);
      cutChipRef.current = { type, id, label };
      const next = chip.nextSibling;
      chip.remove();
      if (next?.nodeType === Node.TEXT_NODE && next.textContent === '\u200B') next.remove();
      void navigator.clipboard.writeText(md);
      syncToParent();
      return md;
    },
    pasteCutChip: () => {
      const payload = cutChipRef.current;
      if (!payload) return false;
      insertChipAtSelection(payload.type, payload.id, payload.label);
      cutChipRef.current = null;
      return true;
    },
    getFormatState: () => {
      const el = editorRef.current;
      if (!el) return { bold: false, italic: false, underline: false, align: null };
      const saved = savedRangeRef.current?.cloneRange() ?? null;
      return readFormatState(el, saved, pendingMarksRef.current);
    },
    getSelectionOffsets: () => null,
    getSpellingTarget: (): { word: string; range: Range } | null => {
      const el = editorRef.current;
      if (!el) return null;

      let base: Range | null = savedRangeRef.current?.cloneRange() ?? null;
      if (!base) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && sel.anchorNode && el.contains(sel.anchorNode)) {
          base = sel.getRangeAt(0).cloneRange();
        }
      }
      if (!base || !rangeStillInEditor(base, el)) return null;

      const wordRange = base.collapsed ? expandRangeToWord(base) : base.cloneRange();
      if (!wordRange) return null;

      const word = wordRange.toString().trim();
      if (word.length < 2 || /\s/.test(word)) return null;

      return { word, range: wordRange.cloneRange() };
    },
    replaceSpellingWord: (range: Range, replacement: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      try {
        range.deleteContents();
        const textNode = document.createTextNode(replacement);
        range.insertNode(textNode);
        const sel = window.getSelection();
        if (sel) {
          const after = document.createRange();
          after.setStartAfter(textNode);
          after.collapse(true);
          sel.removeAllRanges();
          sel.addRange(after);
          savedRangeRef.current = after.cloneRange();
        }
      } catch {
        /* rango inválido */
      }
      syncToParent();
    },
  }));

  const onInput = () => {
    if (!syncingRef.current) syncToParent();
  };

  const onCopy = (e: React.ClipboardEvent) => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel) return;

    if (!sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) return;
      e.preventDefault();
      const tmp = document.createElement('div');
      tmp.appendChild(range.cloneContents());
      const md = editorHtmlToMarkdown(tmp);
      e.clipboardData.setData('text/plain', md);
      return;
    }

    const chip = getSelectedChip();
    if (!chip) return;
    const type = chip.dataset.storyType ?? '';
    const id = chip.dataset.storyId ?? '';
    const label = chip.dataset.storyLabel ?? '';
    if (!type || !id) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', buildStoryRef(type, id, label));
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const cutPayload = cutChipRef.current;
    if (cutPayload) {
      insertChipAtSelection(cutPayload.type, cutPayload.id, cutPayload.label);
      cutChipRef.current = null;
      return;
    }
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    if (parseStoryRefs(text).length > 0) {
      pasteRichMarkdownAtSelection(text);
      return;
    }
    insertPlainTextAtSelection(text);
    const el = editorRef.current;
    if (el) runEditorNormalize(el);
    syncToParent();
  };

  const onBeforeInput = (e: React.FormEvent<HTMLDivElement>) => {
    const native = e.nativeEvent as InputEvent;
    if (native.inputType !== 'insertText' || !native.data) return;
    const marks = pendingMarksRef.current;
    if (!marks.bold && !marks.italic && !marks.underline) return;
    e.preventDefault();
    insertPlainTextAtSelection(native.data, marks);
    const el = editorRef.current;
    if (el) runEditorNormalize(el);
    syncToParent();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      const prev = undoStackRef.current.pop();
      if (prev !== undefined) {
        redoStackRef.current.push(lastValueRef.current);
        applyHistoryValue(prev);
      }
      return;
    }
    if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey))) {
      e.preventDefault();
      const next = redoStackRef.current.pop();
      if (next !== undefined) {
        undoStackRef.current.push(lastValueRef.current);
        applyHistoryValue(next);
      }
    }
  };

  const onClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-remove-chip]')) {
      e.preventDefault();
      e.stopPropagation();
      const chip = target.closest('[data-story-ref="true"]');
      if (chip && editorRef.current) {
        const next = chip.nextSibling;
        chip.remove();
        if (next?.nodeType === Node.TEXT_NODE && next.textContent === '\u200B') next.remove();
        syncToParent();
      }
      return;
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const label = (e.target as HTMLElement).closest('.story-inline-chip-label');
    const chip = label?.closest('[data-story-ref="true"]') as HTMLElement | null;
    if (!chip) return;
    e.preventDefault();
    e.stopPropagation();
    startChipRename(chip);
  };

  return (
    <div
        ref={editorRef}
        role="textbox"
        aria-multiline
        contentEditable
        spellCheck
        lang={browserLang}
        suppressContentEditableWarning
        data-story-rich-editor
        className={`story-rich-editor min-h-[inherit] w-full px-3 py-2.5 text-sm leading-relaxed text-[#E8E9EB] outline-none empty:before:pointer-events-none empty:before:text-[#5A6078] empty:before:content-[attr(data-placeholder)] ${className}`}
        style={{ minHeight }}
        data-placeholder={placeholder}
        onInput={onInput}
        onBeforeInput={onBeforeInput}
        onPaste={onPaste}
        onCopy={onCopy}
        onKeyDown={onKeyDown}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onContextMenuCapture={() => {
          saveSelection();
        }}
        onContextMenu={(e) => {
          saveSelection();
          onContextMenu?.(e);
        }}
        onBlur={(e) => {
          isFocusedRef.current = false;
          saveSelection();
          if (
            richMenuOpen ||
            isBlurInsideField(e) ||
            syncingRef.current ||
            renamingChipRef.current
          ) {
            return;
          }
          syncToParent();
        }}
      />
  );
});
