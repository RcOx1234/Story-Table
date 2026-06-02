import { chipIconHtml } from '@/lib/chipIconHtml';
import { insertionMeta } from '@/lib/insertionMeta';

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
  let s = escapeHtml(chunk);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__(.+?)__/g, '<u>$1</u>');
  s = s.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');
  return s;
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

function childrenToMarkdown(node: Node): string {
  let out = '';
  node.childNodes.forEach((child) => {
    out += nodeToMarkdown(child);
  });
  return out;
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  if (el.dataset.storyRef === 'true') {
    const type = el.dataset.storyType ?? '';
    const id = el.dataset.storyId ?? '';
    const label = el.dataset.storyLabel ?? '';
    if (type && id) return buildStoryRef(type, id, label);
    return '';
  }

  const tag = el.tagName.toLowerCase();
  if (tag === 'br') return '\n';
  if (tag === 'strong' || tag === 'b') return `**${childrenToMarkdown(el)}**`;
  if (tag === 'em' || tag === 'i') return `*${childrenToMarkdown(el)}*`;
  if (tag === 'u') return `__${childrenToMarkdown(el)}__`;
  if (tag === 'div' || tag === 'p') {
    const inner = childrenToMarkdown(el);
    const align = readAlign(el);
    if (align && align !== 'left' && inner.trim()) return `{align:${align}}${inner}{/align}`;
    return inner;
  }

  return childrenToMarkdown(el);
}

/** Serializa el DOM del editor enriquecido a markdown almacenado. */
export function editorHtmlToMarkdown(root: HTMLElement): string {
  let result = '';
  root.childNodes.forEach((child) => {
    result += nodeToMarkdown(child);
  });
  const cleaned = result.replace(/\u200B/g, '');
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
  const body = formatBlockForEditor(text).replace(/\n/g, '<br>');
  return wrapPlainEditorLines(body) || '<div data-story-paragraph="true"><br></div>';
}

/** Extrae refs del portapapeles o texto pegado. */
export function extractStoryRefsFromText(text: string): StoryRefToken[] {
  return parseStoryRefs(text);
}

/** Tokens inline para vista (negrita, cursiva, subrayado) sin lookbehind. */
const DISPLAY_INLINE_RE = /(\*\*[^*]+?\*\*|__[^_]+?__|\*[^*\n]+?\*|_{1}[^_\n]+?_{1})/g;

export function splitDisplayInline(text: string): Array<{ type: 'text' | 'bold' | 'italic' | 'underline'; value: string }> {
  const parts: Array<{ type: 'text' | 'bold' | 'italic' | 'underline'; value: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(DISPLAY_INLINE_RE.source, 'g');
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
    const token = m[1];
    if (token.startsWith('**')) parts.push({ type: 'bold', value: token.slice(2, -2) });
    else if (token.startsWith('__')) parts.push({ type: 'underline', value: token.slice(2, -2) });
    else if (token.startsWith('*')) parts.push({ type: 'italic', value: token.slice(1, -1) });
    else parts.push({ type: 'text', value: token });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts.length ? parts : [{ type: 'text', value: text }];
}
