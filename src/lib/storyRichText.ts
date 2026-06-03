import { chipIconHtml } from '@/lib/chipIconHtml';
import { insertionMeta } from '@/lib/insertionMeta';
import {
  collectInlineSegments,
  inlineSegmentsToMarkdown,
  parseInlineMarkdownToHtml,
} from '@/lib/storyRichTextSerialize';

/** Referencia embebida: [[tipo:id|etiqueta]] (tipo en camelCase, p. ej. placeCollection) */
export const STORY_REF_RE = /\[\[([a-z][a-zA-Z0-9_]*):([^|\]]+)\|([^\]]+)\]\]/g;

export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export const STORY_ALIGN_BLOCK_RE = /\{align:(left|center|right|justify)\}([\s\S]*?)\{\/align\}/g;

export function buildStoryRef(type: string, id: string, label: string): string {
  const safeLabel = label.replace(/\|/g, '·').replace(/\[\[/g, '');
  return `[[${type}:${id}|${safeLabel}]]`;
}

export type StoryRefToken = { type: string; id: string; label: string };

export type StorySegment =
  | { kind: 'text'; value: string }
  | { kind: 'ref'; type: string; id: string; label: string }
  | { kind: 'align'; align: TextAlign; value: string };

/** Parsea refs e inline dentro de un fragmento (sin bloques align). */
export function parseRichInline(text: string): StorySegment[] {
  if (!text) return [];
  const segments: StorySegment[] = [];
  let last = 0;
  const re = new RegExp(STORY_REF_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ kind: 'text', value: text.slice(last, m.index) });
    segments.push({ kind: 'ref', type: m[1], id: m[2], label: m[3] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ kind: 'text', value: text.slice(last) });
  return segments.length ? segments : [{ kind: 'text', value: text }];
}

export function parseStorySegments(text: string): StorySegment[] {
  if (!text) return [];
  const segments: StorySegment[] = [];
  let last = 0;
  const re = new RegExp(STORY_ALIGN_BLOCK_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push(...parseRichInline(text.slice(last, m.index)));
    const inner = m[2];
    if (inner.trim()) segments.push({ kind: 'align', align: m[1] as TextAlign, value: inner });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push(...parseRichInline(text.slice(last)));
  return segments;
}

export function parseStoryRefs(text: string): StoryRefToken[] {
  const out: StoryRefToken[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(STORY_REF_RE.source, 'g');
  while ((m = re.exec(text)) !== null) {
    out.push({ type: m[1], id: m[2], label: m[3] });
  }
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatInlineMarkdown(chunk: string): string {
  return parseInlineMarkdownToHtml(chunk);
}

function alignAttr(align: TextAlign): string {
  return ` data-story-align="${align}" style="text-align:${align}"`;
}

function formatRefsInChunk(chunk: string, refHtml: (type: string, id: string, label: string) => string): string {
  const parts: string[] = [];
  let last = 0;
  const re = new RegExp(STORY_REF_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(chunk)) !== null) {
    if (m.index > last) parts.push(formatInlineMarkdown(chunk.slice(last, m.index)));
    parts.push(refHtml(m[1], m[2], m[3]));
    last = m.index + m[0].length;
  }
  if (last < chunk.length) parts.push(formatInlineMarkdown(chunk.slice(last)));
  return parts.join('');
}

function formatChunkWithAlign(
  text: string,
  refHtml: (type: string, id: string, label: string) => string
): string {
  const parts: string[] = [];
  let last = 0;
  const re = new RegExp(STORY_ALIGN_BLOCK_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(formatRefsInChunk(text.slice(last, m.index), refHtml));
    const inner = formatRefsInChunk(m[2], refHtml).replace(/\n/g, '<br>');
    if (inner.trim()) parts.push(`<div${alignAttr(m[1] as TextAlign)}>${inner}</div>`);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(formatRefsInChunk(text.slice(last), refHtml));
  return parts.join('');
}

/** Convierte marcadores a HTML seguro para vista previa y fichas. */
export function storyTextToHtml(text: string): string {
  if (!text) return '';
  const body = formatChunkWithAlign(text, (type, id, label) => {
    const safeType = escapeHtml(type);
    const safeId = escapeHtml(id);
    const safeLabel = escapeHtml(label);
    return `<button type="button" class="story-ref-chip" data-story-type="${safeType}" data-story-id="${safeId}">${safeLabel}</button>`;
  });
  return body.replace(/\n/g, '<br />');
}

export function storyTextHasFormatting(text: string): boolean {
  if (!text) return false;
  return /\*\*|__|\[\[|\{align:/.test(text) || /(?<!\*)\*[^*]+\*(?!\*)/.test(text);
}

function readAlign(el: HTMLElement): TextAlign | null {
  const fromData = el.dataset.storyAlign as TextAlign | undefined;
  if (fromData && ['left', 'center', 'right', 'justify'].includes(fromData)) return fromData;
  const ta = el.style.textAlign;
  if (ta === 'center' || ta === 'right' || ta === 'justify') return ta;
  return null;
}

/** Serializa el DOM del editor enriquecido a markdown almacenado (segmentos atómicos). */
export function editorHtmlToMarkdown(root: HTMLElement): string {
  const parts: string[] = [];

  const serializeBlock = (el: HTMLElement) => {
    const segments = collectInlineSegments(el, root);
    const md = inlineSegmentsToMarkdown(segments);
    const align = readAlign(el);
    if (align && align !== 'left' && md.trim()) parts.push(`{align:${align}}${md}{/align}`);
    else parts.push(md);
  };

  root.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? '';
      if (text) parts.push(text);
      return;
    }
    if (child instanceof HTMLElement) {
      if (child.tagName === 'BR') {
        parts.push('\n');
        return;
      }
      serializeBlock(child);
    }
  });

  const cleaned = normalizeStoredMarkdown(parts.join(''));
  return cleaned.trim() === '' ? '' : cleaned;
}

function chipHtml(type: string, id: string, label: string, color: string, bg: string): string {
  const safe = escapeHtml(label);
  const icon = chipIconHtml(type, color);
  return (
    `<span contenteditable="false" data-story-ref="true" data-story-type="${escapeHtml(type)}" ` +
    `data-story-id="${escapeHtml(id)}" data-story-label="${safe}" ` +
    `class="story-inline-chip" style="--chip-color:${color};--chip-bg:${bg}">` +
    `<span class="story-inline-chip-icon-slot" aria-hidden="true">${icon}` +
    `<button type="button" class="story-inline-chip-remove" data-remove-chip aria-label="Quitar">×</button></span>` +
    `<span class="story-inline-chip-label">${safe}</span></span>`
  );
}

function formatBlockForEditor(chunk: string): string {
  return formatChunkWithAlign(chunk, (type, id, label) => {
    const meta = insertionMeta(type);
    return chipHtml(type, id, label, meta.color, meta.bg);
  });
}

function wrapPlainEditorLines(html: string): string {
  if (!html) return '<div data-story-paragraph="true"><br></div>';
  const lines = html.split(/<br\s*\/?>/i);
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '<div data-story-paragraph="true"><br></div>';
      if (/^<div\b/i.test(trimmed) && trimmed.includes('data-story-align')) {
        return trimmed.replace(/^<div\b/i, '<div data-story-paragraph="true"');
      }
      return `<div data-story-paragraph="true">${line}</div>`;
    })
    .join('');
}

/** HTML para contenteditable (chips + párrafos + formato inline). */
export function markdownToEditorHtml(text: string): string {
  if (!text) return '<div data-story-paragraph="true"><br></div>';
  const body = formatBlockForEditor(normalizeStoredMarkdown(text)).replace(/\n/g, '<br>');
  return wrapPlainEditorLines(body) || '<div data-story-paragraph="true"><br></div>';
}

/** Extrae refs del portapapeles o texto pegado. */
export function extractStoryRefsFromText(text: string): StoryRefToken[] {
  return parseStoryRefs(text);
}

/** Tokens inline para vista (negrita, cursiva, subrayado). */
const DISPLAY_BOLD_ITALIC_RE = /\*\*\*([^*]+?)\*\*\*/g;
const DISPLAY_BOLD_RE = /\*\*([^*]+?)\*\*/g;
const DISPLAY_UNDERLINE_RE = /__([^_]+?)__/g;
const DISPLAY_ITALIC_RE = /(?<!\*)\*([^*\n]+?)\*(?!\*)/g;

export type DisplayInlineToken = {
  type: 'text' | 'bold' | 'italic' | 'underline' | 'boldItalic';
  value: string;
};

function splitDisplayInlineChunk(text: string): DisplayInlineToken[] {
  if (!text) return [];
  const parts: DisplayInlineToken[] = [];
  let cursor = 0;

  const pushPlain = (end: number) => {
    if (end > cursor) parts.push({ type: 'text', value: text.slice(cursor, end) });
    cursor = end;
  };

  while (cursor < text.length) {
    DISPLAY_BOLD_ITALIC_RE.lastIndex = cursor;
    DISPLAY_BOLD_RE.lastIndex = cursor;
    DISPLAY_UNDERLINE_RE.lastIndex = cursor;
    DISPLAY_ITALIC_RE.lastIndex = cursor;

    const boldItalic = DISPLAY_BOLD_ITALIC_RE.exec(text);
    const bold = DISPLAY_BOLD_RE.exec(text);
    const underline = DISPLAY_UNDERLINE_RE.exec(text);
    const italic = DISPLAY_ITALIC_RE.exec(text);

    const candidates = [boldItalic, bold, underline, italic].filter(Boolean) as RegExpExecArray[];
    if (candidates.length === 0) {
      parts.push({ type: 'text', value: text.slice(cursor) });
      break;
    }

    const next = candidates.reduce((a, b) => (a.index <= b.index ? a : b));
    pushPlain(next.index);

    if (next === boldItalic) {
      parts.push({ type: 'boldItalic', value: next[1] });
    } else if (next === bold) {
      parts.push({ type: 'bold', value: next[1] });
    } else if (next === underline) {
      parts.push({ type: 'underline', value: next[1] });
    } else {
      parts.push({ type: 'italic', value: next[1] });
    }
    cursor = next.index + next[0].length;
  }

  return parts.length ? parts : [{ type: 'text', value: text }];
}

/** Repara marcadores pegados a la palabra siguiente (texto ya guardado sin espacio). */
function repairMarkerSpacing(s: string): string {
  const letter = '[\\p{L}\\p{N}]';
  s = s.replace(new RegExp(`(\\*\\*\\*[^*]+?\\*\\*\\*)(?=${letter})`, 'gu'), '$1 ');
  s = s.replace(new RegExp(`(\\*\\*[^*]+?\\*\\*)(?=${letter})`, 'gu'), '$1 ');
  s = s.replace(new RegExp(`(?<!\\*)\\*([^*\\n]+?)\\*(?!\\*)(?=${letter})`, 'gu'), '*$1* ');
  s = s.replace(new RegExp(`(__[^_]+?__)(?=${letter})`, 'gu'), '$1 ');
  return s;
}

/** Normaliza marcadores rotos (espacios, anidación mal serializada) tras edición enriquecida. */
export function normalizeStoredMarkdown(text: string): string {
  if (!text) return '';
  let s = text.replace(/\u200B/g, '');
  s = s.replace(/\*\*<u>([\s\S]*?)<\/u>\*\*/gi, '<u>***$1***</u>');
  s = s.replace(/\*\*\*<u>([\s\S]*?)<\/u>\*\*\*/gi, '<u>***$1***</u>');
  s = s.replace(/\*\*\\?\*([^*]+?)\\?\*\\?\*\*/g, '***$1***');
  s = s.replace(/(?<!\*)\*\\?\*\*([^*]+?)\\?\*\\?\*(?!\*)/g, '***$1***');
  s = s.replace(/\*\*<u>\*([^*]+?)\*<\/u>\*\*/gi, '***$1***');
  s = s.replace(/\*<u>\*\*([^*]+?)\*\*<\/u>\*/gi, '***$1***');
  s = s.replace(/\*\*\s+([^*]+?)\s+\*\*/g, '**$1**');
  s = s.replace(/\*\*\s+([^*]+?)\*\*/g, '**$1**');
  s = s.replace(/\*\*([^*]+?)\s+\*\*/g, '**$1**');
  s = s.replace(/\*\*\*([^*]+?)\s+\*\*\*/g, '***$1***');
  s = s.replace(/(?<!\*)\*\s+([^*\n]+?)\s+\*(?!\*)/g, '*$1*');
  s = s.replace(/(?<!\*)\*\s+([^*\n]+?)\*(?!\*)/g, '*$1*');
  s = s.replace(/(?<!\*)\*([^*\n]+?)\s+\*(?!\*)/g, '*$1*');
  s = s.replace(/__\s+([^_]+?)\s+__/g, '__$1__');
  s = repairMarkerSpacing(s);
  return s;
}

export function splitDisplayInline(text: string): DisplayInlineToken[] {
  if (!text) return [];
  const segments = parseRichInline(text);
  const parts: DisplayInlineToken[] = [];
  for (const seg of segments) {
    if (seg.kind === 'ref') {
      parts.push({ type: 'text', value: buildStoryRef(seg.type, seg.id, seg.label) });
      continue;
    }
    parts.push(...splitDisplayInlineChunk(seg.value));
  }
  return parts.length ? parts : [{ type: 'text', value: text }];
}
