import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, forwardRef } from 'react';
import { editorHtmlToMarkdown, markdownToEditorHtml } from '@/lib/storyRichText';
import { chipIconHtml } from '@/lib/chipIconHtml';
import { insertionMeta } from '@/lib/insertionMeta';

export type StoryRichTextEditorHandle = {
  focus: () => void;
  saveSelection: () => void;
  applyFormat: (cmd: 'bold' | 'italic' | 'underline') => void;
  insertRef: (type: string, id: string, label: string) => void;
  getSelectionOffsets: () => { start: number; end: number } | null;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  onContextMenu?: (e: React.MouseEvent) => void;
  className?: string;
};

function normalizeStoredValue(text: string): string {
  const t = text.replace(/\u200B/g, '').trim();
  return t === '' ? '' : text.replace(/\u200B/g, '');
}

export const StoryRichTextEditor = forwardRef<StoryRichTextEditorHandle, Props>(function StoryRichTextEditor(
  { value, onChange, placeholder = 'Escribe aquí…', minHeight = '6rem', onContextMenu, className = '' },
  ref
) {
  const editorRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const isFocusedRef = useRef(false);
  const mountedRef = useRef(false);
  const lastValueRef = useRef(normalizeStoredValue(value));
  const savedRangeRef = useRef<Range | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
    if (!el || syncingRef.current) return;
    const md = editorHtmlToMarkdown(el);
    if (md === lastValueRef.current) return;
    lastValueRef.current = md;
    onChangeRef.current(md);
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

  useLayoutEffect(() => {
    syncFromValue(value);
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current || isFocusedRef.current) return;
    const normalized = normalizeStoredValue(value);
    if (normalized === lastValueRef.current) return;
    syncFromValue(value);
  }, [value, syncFromValue]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      editorRef.current?.focus();
    },
    saveSelection,
    applyFormat: (cmd) => {
      editorRef.current?.focus();
      restoreSelection();
      document.execCommand(cmd, false);
      syncToParent();
    },
    insertRef: (type, id, label) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      restoreSelection();
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

      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (el.contains(range.commonAncestorContainer)) {
          range.deleteContents();
          range.insertNode(chip);
          const spacer = document.createTextNode('\u200B');
          chip.after(spacer);
          range.setStartAfter(spacer);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          el.appendChild(chip);
          el.appendChild(document.createTextNode('\u200B'));
        }
      } else {
        el.appendChild(chip);
        el.appendChild(document.createTextNode('\u200B'));
      }
      syncToParent();
    },
    getSelectionOffsets: () => null,
  }));

  const onInput = () => {
    if (!syncingRef.current) syncToParent();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    syncToParent();
  };

  const onClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-remove-chip]');
    if (!target || !editorRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const chip = target.closest('[data-story-ref="true"]');
    if (chip) {
      const next = chip.nextSibling;
      chip.remove();
      if (next?.nodeType === Node.TEXT_NODE && next.textContent === '\u200B') next.remove();
      syncToParent();
    }
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
      onClick={onClick}
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
        if (isBlurInsideField(e) || syncingRef.current) return;
        syncToParent();
      }}
    />
  );
});
