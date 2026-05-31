import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, forwardRef } from 'react';
import {
  editorHtmlToMarkdown,
  markdownToEditorHtml,
  buildStoryRef,
  STORY_REF_RE,
  type TextAlign,
} from '@/lib/storyRichText';
import { chipIconHtml } from '@/lib/chipIconHtml';
import { insertionMeta } from '@/lib/insertionMeta';

export type StoryRichTextEditorHandle = {
  focus: () => void;
  saveSelection: () => void;
  applyFormat: (cmd: 'bold' | 'italic' | 'underline') => void;
  applyAlign: (align: TextAlign) => void;
  clearFormat: () => void;
  insertRef: (type: string, id: string, label: string) => void;
  getMarkdown: () => string;
  copyToClipboard: () => boolean;
  getSelectionOffsets: () => { start: number; end: number } | null;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  worldId?: string;
  placeholder?: string;
  minHeight?: string;
  onContextMenu?: (e: React.MouseEvent) => void;
  className?: string;
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

function findAlignBlock(node: Node | null, root: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  if (current?.nodeType === Node.TEXT_NODE) current = current.parentNode;
  while (current && current !== root) {
    if (current instanceof HTMLElement && current.dataset.storyAlign) return current;
    current = current.parentNode;
  }
  return null;
}

function findBlockContainer(node: Node | null, root: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  if (current?.nodeType === Node.TEXT_NODE) current = current.parentNode;
  while (current && current !== root) {
    if (current instanceof HTMLElement) {
      const tag = current.tagName.toLowerCase();
      if (tag === 'div' || tag === 'p') return current;
    }
    current = current.parentNode;
  }
  return null;
}

function unwrapAlignBlock(block: HTMLElement) {
  const parent = block.parentNode;
  if (!parent) return;
  while (block.firstChild) parent.insertBefore(block.firstChild, block);
  block.remove();
}

function applyAlignmentToSelection(el: HTMLElement, align: TextAlign) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.commonAncestorContainer)) return;

  const existing = findAlignBlock(range.commonAncestorContainer, el);

  if (align === 'left') {
    if (existing) unwrapAlignBlock(existing);
    else {
      const block = findBlockContainer(range.commonAncestorContainer, el);
      if (block && block !== el) {
        block.style.textAlign = '';
        delete block.dataset.storyAlign;
      }
    }
    return;
  }

  if (existing) {
    existing.dataset.storyAlign = align;
    existing.style.textAlign = align;
    return;
  }

  const block = findBlockContainer(range.commonAncestorContainer, el);
  if (block && block !== el && !block.dataset.storyRef) {
    block.dataset.storyAlign = align;
    block.style.textAlign = align;
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.dataset.storyAlign = align;
  wrapper.style.textAlign = align;

  if (range.collapsed) {
    wrapper.appendChild(document.createElement('br'));
    range.insertNode(wrapper);
    range.selectNodeContents(wrapper);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    return;
  }

  try {
    range.surroundContents(wrapper);
  } catch {
    const fragment = range.extractContents();
    wrapper.appendChild(fragment);
    range.insertNode(wrapper);
  }
  range.selectNodeContents(wrapper);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
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
  { value, onChange, worldId: _worldId, placeholder = 'Escribe aquí…', minHeight = '6rem', onContextMenu, className = '' },
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
      editorRef.current?.focus();
    },
    saveSelection,
    getMarkdown: getMarkdownFromEditor,
    copyToClipboard: copyMarkdownToClipboard,
    applyFormat: (cmd) => {
      editorRef.current?.focus();
      restoreSelection();
      document.execCommand(cmd, false);
      syncToParent();
    },
    applyAlign: (align) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      restoreSelection();
      applyAlignmentToSelection(el, align);
      syncToParent();
    },
    clearFormat: () => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      restoreSelection();
      clearFormattingInEditor(el);
      syncToParent();
    },
    insertRef: (type, id, label) => {
      insertChipAtSelection(type, id, label);
    },
    getSelectionOffsets: () => null,
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
    if (STORY_REF_RE.test(text)) {
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
      onContextMenu={(e) => {
        saveSelection();
        onContextMenu?.(e);
      }}
      onBlur={(e) => {
        isFocusedRef.current = false;
        saveSelection();
        if (isBlurInsideField(e) || syncingRef.current || renamingChipRef.current) return;
        syncToParent();
      }}
    />
  );
});
