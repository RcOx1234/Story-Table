import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
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

export const StoryRichTextEditor = forwardRef<StoryRichTextEditorHandle, Props>(function StoryRichTextEditor(
  { value, onChange, placeholder = 'Escribe aquí…', minHeight = '6rem', onContextMenu, className = '' },
  ref
) {
  const editorRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const lastValueRef = useRef(value);
  const savedRangeRef = useRef<Range | null>(null);

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
    onChange(md);
  }, [onChange]);

  const syncFromValue = useCallback((text: string) => {
    const el = editorRef.current;
    if (!el) return;
    syncingRef.current = true;
    const html = markdownToEditorHtml(text);
    if (el.innerHTML !== html) {
      el.innerHTML = html || '';
    }
    lastValueRef.current = text;
    queueMicrotask(() => {
      syncingRef.current = false;
    });
  }, []);

  useEffect(() => {
    syncFromValue(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  useEffect(() => {
    if (value === lastValueRef.current) return;
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
      onContextMenu={(e) => {
        saveSelection();
        onContextMenu?.(e);
      }}
      onBlur={() => {
        saveSelection();
        syncToParent();
      }}
    />
  );
});
