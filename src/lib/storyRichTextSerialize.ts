const STORY_REF_INLINE_RE = /\[\[([a-z][a-zA-Z0-9_]*):([^|\]]+)\|([^\]]+)\]\]/;

function buildRefToken(type: string, id: string, label: string): string {
  const safeLabel = label.replace(/\|/g, '·').replace(/\[\[/g, '');
  return `[[${type}:${id}|${safeLabel}]]`;
}

export type InlineMarks = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

export type InlineTextSegment = { kind: 'text'; text: string; marks: InlineMarks };
export type InlineRefSegment = { kind: 'ref'; type: string; id: string; label: string };
export type InlineSegment = InlineTextSegment | InlineRefSegment;

const EMPTY_MARKS: InlineMarks = { bold: false, italic: false, underline: false };

export function marksEqual(a: InlineMarks, b: InlineMarks): boolean {
  return a.bold === b.bold && a.italic === b.italic && a.underline === b.underline;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Serializa un fragmento de texto con marcas (orden fijo, determinista). */
export function marksToMarkdown(text: string, marks: InlineMarks): string {
  if (!text) return '';
  const lead = text.match(/^\s*/)?.[0] ?? '';
  const trail = text.match(/\s*$/)?.[0] ?? '';
  const core = text.slice(lead.length, text.length - trail.length);
  if (!core) return text;
  if (!marks.bold && !marks.italic && !marks.underline) return text;

  let body = core;
  if (marks.bold && marks.italic) body = `***${body}***`;
  else if (marks.bold) body = `**${body}**`;
  else if (marks.italic) body = `*${body}*`;
  if (marks.underline) body = `<u>${body}</u>`;
  return `${lead}${body}${trail}`;
}

/** HTML del editor: strong > em > u (fijo). */
export function marksToEditorHtml(text: string, marks: InlineMarks): string {
  if (!text) return '';
  const lead = text.match(/^\s*/)?.[0] ?? '';
  const trail = text.match(/\s*$/)?.[0] ?? '';
  const core = text.slice(lead.length, text.length - trail.length);
  if (!core) return escapeHtml(text);

  let inner = escapeHtml(core);
  if (marks.underline) inner = `<u>${inner}</u>`;
  if (marks.italic) inner = `<em>${inner}</em>`;
  if (marks.bold) inner = `<strong>${inner}</strong>`;
  return `${escapeHtml(lead)}${inner}${escapeHtml(trail)}`;
}

function readMarksFromElementChain(node: Text, root: HTMLElement): InlineMarks {
  const marks: InlineMarks = { bold: false, italic: false, underline: false };
  let el: Element | null = node.parentElement;
  while (el && el !== root) {
    if (el instanceof HTMLElement && el.dataset.storyRef === 'true') break;
    const tag = el.tagName;
    if (tag === 'STRONG' || tag === 'B') marks.bold = true;
    if (tag === 'EM' || tag === 'I') marks.italic = true;
    if (tag === 'U') marks.underline = true;
    el = el.parentElement;
  }
  return marks;
}

function pushTextSegment(segments: InlineSegment[], text: string, marks: InlineMarks) {
  if (!text) return;
  const last = segments[segments.length - 1];
  if (last?.kind === 'text' && marksEqual(last.marks, marks)) {
    last.text += text;
    return;
  }
  segments.push({ kind: 'text', text, marks: { ...marks } });
}

/** Recorre un bloque y produce segmentos planos en orden de documento. */
export function collectInlineSegments(block: HTMLElement, root: HTMLElement): InlineSegment[] {
  const segments: InlineSegment[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (!text || isInsideChipNode(node, root)) return;
      pushTextSegment(segments, text, readMarksFromElementChain(node as Text, root));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.dataset.storyRef === 'true') {
      const type = el.dataset.storyType ?? '';
      const id = el.dataset.storyId ?? '';
      const label = el.dataset.storyLabel ?? '';
      if (type && id) segments.push({ kind: 'ref', type, id, label });
      return;
    }
    el.childNodes.forEach(walk);
  };

  block.childNodes.forEach(walk);
  return segments;
}

function isInsideChipNode(node: Node, root: HTMLElement): boolean {
  let current: Node | null = node;
  while (current && current !== root) {
    if (current instanceof HTMLElement && current.dataset.storyRef === 'true') return true;
    current = current.parentNode;
  }
  return false;
}

export function inlineSegmentsToMarkdown(segments: InlineSegment[]): string {
  return segments
    .map((seg) =>
      seg.kind === 'ref' ? buildRefToken(seg.type, seg.id, seg.label) : marksToMarkdown(seg.text, seg.marks)
    )
    .join('');
}

function findNextInlineTokenIndex(s: string): number {
  const needles = ['***', '**', '__', '<u>', '*', '[['];
  let min = -1;
  for (const n of needles) {
    const i = s.indexOf(n);
    if (i >= 0 && (min < 0 || i < min)) min = i;
  }
  return min;
}

function parseDelimited(
  s: string,
  open: string,
  close: string,
  wrap: (inner: string) => string
): { html: string; rest: string } | null {
  if (!s.startsWith(open)) return null;
  const end = s.indexOf(close, open.length);
  if (end < 0) return null;
  const inner = s.slice(open.length, end);
  return { html: wrap(parseInlineMarkdownToHtml(inner)), rest: s.slice(end + close.length) };
}

/** Convierte markdown inline a HTML (orden de tokens de mayor a menor longitud). */
export function parseInlineMarkdownToHtml(chunk: string): string {
  let remaining = chunk;
  let out = '';

  while (remaining.length > 0) {
    const idx = findNextInlineTokenIndex(remaining);
    if (idx < 0) {
      out += escapeHtml(remaining);
      break;
    }
    if (idx > 0) {
      out += escapeHtml(remaining.slice(0, idx));
      remaining = remaining.slice(idx);
    }

    const refRe = new RegExp(`^${STORY_REF_INLINE_RE.source}`);
    const refMatch = refRe.exec(remaining);
    if (refMatch) {
      const label = escapeHtml(refMatch[3]);
      const type = escapeHtml(refMatch[1]);
      const id = escapeHtml(refMatch[2]);
      out += `[[${type}:${id}|${label}]]`;
      remaining = remaining.slice(refMatch[0].length);
      continue;
    }

    const uHtml = parseDelimited(remaining, '<u>', '</u>', (inner) => `<u>${inner}</u>`);
    if (uHtml) {
      out += uHtml.html;
      remaining = uHtml.rest;
      continue;
    }

    const bi = parseDelimited(remaining, '***', '***', (inner) => `<strong><em>${inner}</em></strong>`);
    if (bi) {
      out += bi.html;
      remaining = bi.rest;
      continue;
    }

    const b = parseDelimited(remaining, '**', '**', (inner) => `<strong>${inner}</strong>`);
    if (b) {
      out += b.html;
      remaining = b.rest;
      continue;
    }

    const under = parseDelimited(remaining, '__', '__', (inner) => `<u>${inner}</u>`);
    if (under) {
      out += under.html;
      remaining = under.rest;
      continue;
    }

    if (remaining.startsWith('*') && !remaining.startsWith('**')) {
      const end = remaining.indexOf('*', 1);
      if (end > 1) {
        const inner = remaining.slice(1, end);
        out += `<em>${parseInlineMarkdownToHtml(inner)}</em>`;
        remaining = remaining.slice(end + 1);
        continue;
      }
    }

    out += escapeHtml(remaining[0]);
    remaining = remaining.slice(1);
  }

  return out;
}

export { EMPTY_MARKS };
