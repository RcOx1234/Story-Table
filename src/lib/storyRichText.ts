import { chipIconHtml } from '@/lib/chipIconHtml';
import { insertionMeta } from '@/lib/insertionMeta';

/** Referencia embebida: [[tipo:id|etiqueta]] */
export const STORY_REF_RE = /\[\[([a-z_]+):([^|\]]+)\|([^\]]+)\]\]/g;

export function buildStoryRef(type: string, id: string, label: string): string {
  const safeLabel = label.replace(/\|/g, '·').replace(/\[\[/g, '');
  return `[[${type}:${id}|${safeLabel}]]`;
}

export type StoryRefToken = { type: string; id: string; label: string };

export type StorySegment =
  | { kind: 'text'; value: string }
  | { kind: 'ref'; type: string; id: string; label: string };

export function parseStorySegments(text: string): StorySegment[] {
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

/** Convierte marcadores a HTML seguro para vista previa y fichas. */
export function storyTextToHtml(text: string): string {
  if (!text) return '';

  const parts: string[] = [];
  let last = 0;
  const re = new RegExp(STORY_REF_RE.source, 'g');
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(formatInlineMarkdown(text.slice(last, m.index)));
    }
    const type = escapeHtml(m[1]);
    const id = escapeHtml(m[2]);
    const label = escapeHtml(m[3]);
    parts.push(
      `<button type="button" class="story-ref-chip" data-story-type="${type}" data-story-id="${id}">${label}</button>`
    );
    last = m.index + m[0].length;
  }

  if (last < text.length) parts.push(formatInlineMarkdown(text.slice(last)));

  return parts.join('').replace(/\n/g, '<br />');
}

export function storyTextHasFormatting(text: string): boolean {
  if (!text) return false;
  return /\*\*|__|\[\[/.test(text) || /(?<!\*)\*[^*]+\*(?!\*)/.test(text);
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
  return result.replace(/\u200B/g, '');
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

/** HTML para contenteditable (chips + formato inline). */
export function markdownToEditorHtml(text: string): string {
  if (!text) return '';

  const parts: string[] = [];
  let last = 0;
  const re = new RegExp(STORY_REF_RE.source, 'g');
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(formatInlineMarkdown(text.slice(last, m.index)));
    const type = m[1];
    const id = m[2];
    const label = m[3];
    const meta = insertionMeta(type);
    parts.push(chipHtml(type, id, label, meta.color, meta.bg));
    last = m.index + m[0].length;
  }

  if (last < text.length) parts.push(formatInlineMarkdown(text.slice(last)));

  const body = parts.join('').replace(/\n/g, '<br>');
  return body || '<br>';
}
