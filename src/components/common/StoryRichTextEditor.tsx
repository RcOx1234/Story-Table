import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, forwardRef } from 'react';
import {
  editorHtmlToMarkdown,
  markdownToEditorHtml,
  buildStoryRef,
  parseStoryRefs,
  STORY_REF_RE,
  type TextAlign,
} from '@/lib/storyRichText';
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

function unwrapAlignBlock(block: HTMLElement) {
  const parent = block.parentNode;
  if (!parent) return;
  while (block.firstChild) parent.insertBefore(block.firstChild, block);
  block.remove();
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

function isFormatActive(
  node: Node | null,
  root: HTMLElement,
  kind: 'bold' | 'italic' | 'underline'
): boolean {
  let el: Element | null =
    node?.nodeType === Node.TEXT_NODE ? (node.parentElement as Element | null) : (node as Element | null);
  const tags = kind === 'bold' ? ['STRONG', 'B'] : kind === 'italic' ? ['EM', 'I'] : ['U'];
  while (el && el !== root) {
    if (tags.includes(el.tagName)) return true;
    if (el instanceof HTMLElement) {
      if (kind === 'bold') {
        const fw = el.style.fontWeight;
        if (fw === 'bold' || fw === '700' || (Number.parseInt(fw, 10) || 0) >= 600) return true;
      }
      if (kind === 'italic' && el.style.fontStyle === 'italic') return true;
      if (kind === 'underline' && el.style.textDecoration.includes('underline')) return true;
    }
    el = el.parentElement;
  }
  return false;
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

/** true si todo el texto del rango tiene el formato (sin foco ni queryCommand). */
function rangeHasFormat(
  range: Range,
  root: HTMLElement,
  kind: 'bold' | 'italic' | 'underline'
): boolean {
  if (range.collapsed) {
    return isFormatActive(range.startContainer, root, kind);
  }

  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    try {
      if (range.intersectsNode(node)) textNodes.push(node as Text);
    } catch {
      /* nodo fuera del rango */
    }
  }

  if (textNodes.length === 0) {
    return isFormatActive(range.startContainer, root, kind);
  }

  return textNodes.every((text) => isFormatActive(text, root, kind));
}

function readFormatState(el: HTMLElement, fallbackRange: Range | null): RichFormatState {
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

  const bold = rangeHasFormat(range, el, 'bold');
  const italic = rangeHasFormat(range, el, 'italic');
  const underline = rangeHasFormat(range, el, 'underline');

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

function clearFormattingInEditor(el: HTMLElement) {
  document.execCommand('removeFormat', false);
  el.querySelectorAll('[data-story-align]').forEach((node) => {
    if (node instanceof HTMLElement) unwrapAlignBlock(node);
  });
  el.querySelectorAll('div, p').forEach((node) => {
    const block = node as HTMLElement;
    if (block.dataset.storyAlign) return;
    if (block.style.textAlign) block.style.textAlign = '';
  });
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

  const getInsertionRange = useCallback((): Range | null => {
    const el = editorRef.current;
    if (!el) return null;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (el.contains(r.commonAncestorContainer)) return r.cloneRange();
    }
    if (savedRangeRef.current && el.contains(savedRangeRef.current.commonAncestorContainer)) {
      return savedRangeRef.current.cloneRange();
    }
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
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
      normalizeEditorParagraphs(el);
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
    (text: string) => {
      const el = editorRef.current;
      if (!el || !text) return;
      el.focus();
      const range = getInsertionRange();
      if (!range) return;
      const sel = window.getSelection();
      range.deleteContents();
      const node = document.createTextNode(text);
      range.insertNode(node);
      placeCaretAfterNode(node);
      if (sel && sel.rangeCount) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    },
    [getInsertionRange, placeCaretAfterNode]
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
    const onSelectionChange = () => updateChipSelectionHighlight();
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
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const node = sel.anchorNode;
    if (!node) return null;
    const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    return el?.closest('[data-story-ref="true"]') as HTMLElement | null;
  }, []);

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
    applyFormat: (cmd) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      restoreSelection();
      document.execCommand(cmd, false);
      syncToParent();
    },
    applyAlign: (align) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      restoreSelection();
      applyAlignmentToSelection(el, align);
      syncToParent();
    },
    clearFormat: () => {
      const el = editorRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      restoreSelection();
      clearFormattingInEditor(el);
      syncToParent();
    },
    insertRef: (type, id, label) => {
      insertChipAtSelection(type, id, label);
    },
    getFormatState: () => {
      const el = editorRef.current;
      if (!el) return { bold: false, italic: false, underline: false, align: null };
      const saved = savedRangeRef.current?.cloneRange() ?? null;
      return readFormatState(el, saved);
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
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    if (parseStoryRefs(text).length > 0) {
      pasteRichMarkdownAtSelection(text);
      return;
    }
    insertPlainTextAtSelection(text);
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
