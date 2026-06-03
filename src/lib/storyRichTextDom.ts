import type { TextAlign } from '@/lib/storyRichText';

export type FormatKind = 'bold' | 'italic' | 'underline';

export type TextSelectionBookmark = {
  start: number;
  end: number;
};

const FORMAT_TAGS: Record<FormatKind, string[]> = {
  bold: ['STRONG', 'B'],
  italic: ['EM', 'I'],
  underline: ['U'],
};

export function formatTagName(format: FormatKind): string {
  if (format === 'bold') return 'strong';
  if (format === 'italic') return 'em';
  return 'u';
}

function isChip(el: Element): boolean {
  return el instanceof HTMLElement && el.dataset.storyRef === 'true';
}

function isWhitespaceChar(ch: string): boolean {
  return /[\s\u00A0\u200B]/.test(ch);
}

export function isInsideChip(node: Node | null, root: HTMLElement): boolean {
  let current: Node | null = node;
  if (current?.nodeType === Node.TEXT_NODE) current = current.parentNode;
  while (current && current !== root) {
    if (current instanceof HTMLElement && current.dataset.storyRef === 'true') return true;
    current = current.parentNode;
  }
  return false;
}

/** Text nodes editables en orden de documento (sin chips). */
export function getLogicalTextNodes(root: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (isInsideChip(n, root)) continue;
    nodes.push(n as Text);
  }
  return nodes;
}

function isLogicalChar(ch: string): boolean {
  return ch !== '\u200B';
}

function boundaryToLogicalOffset(root: HTMLElement, container: Node, offset: number): number | null {
  if (isInsideChip(container, root)) return null;

  const marker = document.createRange();
  try {
    marker.selectNodeContents(root);
    marker.setEnd(container, offset);
  } catch {
    return null;
  }

  let count = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode: Node | null;
  while ((textNode = walker.nextNode())) {
    if (isInsideChip(textNode, root)) continue;
    const text = textNode.textContent ?? '';
    for (let i = 0; i < text.length; i++) {
      if (!isLogicalChar(text[i])) continue;
      const charEnd = document.createRange();
      charEnd.setStart(textNode, i + 1);
      charEnd.setEnd(textNode, i + 1);
      if (marker.compareBoundaryPoints(Range.END_TO_END, charEnd) >= 0) {
        count += 1;
      } else {
        return count;
      }
    }
  }
  return count;
}

function logicalOffsetToDomPoint(root: HTMLElement, logicalOffset: number): { node: Text; offset: number } | null {
  let pos = 0;
  for (const node of getLogicalTextNodes(root)) {
    const text = node.textContent ?? '';
    for (let i = 0; i < text.length; i++) {
      if (!isLogicalChar(text[i])) continue;
      if (pos === logicalOffset) return { node, offset: i };
      pos += 1;
    }
  }

  const nodes = getLogicalTextNodes(root);
  const last = nodes[nodes.length - 1];
  if (!last) return null;
  if (logicalOffset === pos) return { node: last, offset: (last.textContent ?? '').length };
  return null;
}

export function getTextSelectionBookmark(root: HTMLElement, range: Range): TextSelectionBookmark | null {
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;

  const start = boundaryToLogicalOffset(root, range.startContainer, range.startOffset);
  const end = boundaryToLogicalOffset(root, range.endContainer, range.endOffset);
  if (start === null || end === null) return null;
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

export function restoreTextSelectionBookmark(
  root: HTMLElement,
  bookmark: TextSelectionBookmark
): Range | null {
  const startPoint = logicalOffsetToDomPoint(root, bookmark.start);
  const endPoint = logicalOffsetToDomPoint(root, bookmark.end);
  if (!startPoint || !endPoint) return null;
  try {
    const range = document.createRange();
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);
    return range;
  } catch {
    return null;
  }
}

export function selectRange(range: Range) {
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

export function getTextNodesInRange(range: Range, root: HTMLElement): Text[] {
  const nodes: Text[] = [];
  for (const node of getLogicalTextNodes(root)) {
    try {
      if (range.intersectsNode(node)) nodes.push(node);
    } catch {
      /* fuera del rango */
    }
  }
  return nodes;
}

export function splitRangeBoundaries(range: Range, root: HTMLElement) {
  if (range.collapsed) return;

  let startContainer = range.startContainer;
  let startOffset = range.startOffset;
  let endContainer = range.endContainer;
  let endOffset = range.endOffset;

  if (startContainer.nodeType === Node.TEXT_NODE && !isInsideChip(startContainer, root)) {
    const text = startContainer as Text;
    if (startOffset > 0 && startOffset < text.length) {
      const afterStart = text.splitText(startOffset);
      if (endContainer === startContainer) {
        endContainer = afterStart;
        endOffset = endOffset - startOffset;
      }
      startContainer = afterStart;
      startOffset = 0;
    }
  }

  if (endContainer.nodeType === Node.TEXT_NODE && !isInsideChip(endContainer, root)) {
    const text = endContainer as Text;
    if (endOffset > 0 && endOffset < text.length) {
      text.splitText(endOffset);
    }
  }

  range.setStart(startContainer, startOffset);
  range.setEnd(endContainer, endOffset);
}

export function trimRangeWhitespace(range: Range, root: HTMLElement): Range | null {
  const r = range.cloneRange();
  const nodes = getTextNodesInRange(r, root);
  if (!nodes.length) return null;

  for (const node of nodes) {
    const text = node.textContent ?? '';
    let start = node === r.startContainer ? r.startOffset : 0;
    const end = node === r.endContainer ? r.endOffset : text.length;
    while (start < end && isWhitespaceChar(text[start] ?? '')) start += 1;
    if (start !== (node === r.startContainer ? r.startOffset : 0)) r.setStart(node, start);
    if (start < end) break;
  }

  const nodesAfter = getTextNodesInRange(r, root);
  for (let i = nodesAfter.length - 1; i >= 0; i--) {
    const node = nodesAfter[i];
    const text = node.textContent ?? '';
    let end = node === r.endContainer ? r.endOffset : text.length;
    const start = node === r.startContainer ? r.startOffset : 0;
    while (end > start && isWhitespaceChar(text[end - 1] ?? '')) end -= 1;
    if (end !== (node === r.endContainer ? r.endOffset : text.length)) r.setEnd(node, end);
    if (end > start) break;
  }

  if (!r.toString().replace(/\u200B/g, '').trim()) return null;
  return r;
}

function isFormatActiveAt(node: Node, root: HTMLElement, kind: FormatKind): boolean {
  let el: Element | null =
    node.nodeType === Node.TEXT_NODE ? (node.parentElement as Element | null) : (node as Element | null);
  const tags = FORMAT_TAGS[kind];
  while (el && el !== root) {
    if (isChip(el)) return false;
    if (tags.includes(el.tagName)) return true;
    el = el.parentElement;
  }
  return false;
}

/** true solo si cada carácter lógico del rango tiene el formato. */
export function rangeAllHasFormat(range: Range, root: HTMLElement, kind: FormatKind): boolean {
  if (range.collapsed) {
    return isFormatActiveAt(range.startContainer, root, kind);
  }

  let found = false;
  for (const text of getTextNodesInRange(range, root)) {
    const content = text.textContent ?? '';
    const start = text === range.startContainer ? range.startOffset : 0;
    const end = text === range.endContainer ? range.endOffset : content.length;

    for (let i = start; i < end; i++) {
      const ch = content[i] ?? '';
      if (!isLogicalChar(ch)) continue;
      if (isWhitespaceChar(ch)) continue;
      found = true;
      const probe = document.createRange();
      probe.setStart(text, i);
      probe.setEnd(text, i + 1);
      if (!isFormatActiveAt(probe.startContainer, root, kind)) return false;
    }
  }

  return found;
}

function unwrapElements(elements: HTMLElement[]) {
  const sorted = [...elements].sort((a, b) => {
    if (a.contains(b)) return 1;
    if (b.contains(a)) return -1;
    return 0;
  });
  for (const el of sorted) {
    const parent = el.parentNode;
    if (!parent) continue;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    el.remove();
  }
}

export function stripFormatFromFragment(fragment: DocumentFragment, format: FormatKind) {
  const tag = formatTagName(format);
  const names = FORMAT_TAGS[format];
  const toUnwrap = [
    ...Array.from(fragment.querySelectorAll(tag)),
    ...(format === 'bold' ? Array.from(fragment.querySelectorAll('b')) : []),
    ...(format === 'italic' ? Array.from(fragment.querySelectorAll('i')) : []),
  ];
  toUnwrap.forEach((el) => {
    if (!names.includes(el.tagName) && el.tagName.toLowerCase() !== tag) return;
    unwrapElements([el as HTMLElement]);
  });
}

/** Quita solo un formato dentro del rango (tras partir límites). */
export function removeInlineFormatInsideRange(
  _root: HTMLElement,
  range: Range,
  format: FormatKind
) {
  const fragment = range.extractContents();
  stripFormatFromFragment(fragment, format);
  range.insertNode(fragment);
}

function surroundRange(range: Range, tag: string): boolean {
  const wrapper = document.createElement(tag);
  try {
    range.surroundContents(wrapper);
    return true;
  } catch {
    return false;
  }
}

function wrapFragmentWithTag(range: Range, tag: string) {
  const fragment = range.extractContents();
  const bucket = document.createDocumentFragment();
  let core = document.createDocumentFragment();

  const flushCore = () => {
    if (!core.childNodes.length) return;
    const wrap = document.createElement(tag);
    wrap.appendChild(core);
    bucket.appendChild(wrap);
    core = document.createDocumentFragment();
  };

  Array.from(fragment.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      const lead = text.match(/^[\s\u00A0\u200B]+/)?.[0] ?? '';
      const trail = text.match(/[\s\u00A0\u200B]+$/)?.[0] ?? '';
      const mid = text.slice(lead.length, text.length - trail.length);
      if (lead) bucket.appendChild(document.createTextNode(lead));
      if (mid) {
        core.appendChild(document.createTextNode(mid));
        flushCore();
      }
      if (trail) bucket.appendChild(document.createTextNode(trail));
      return;
    }
    core.appendChild(node);
  });
  flushCore();

  if (!bucket.childNodes.length) {
    const fallback = document.createElement(tag);
    fallback.appendChild(fragment);
    range.insertNode(fallback);
  } else {
    range.insertNode(bucket);
  }
}

export function applyFormatToRange(range: Range, _root: HTMLElement, format: FormatKind) {
  const tag = formatTagName(format);
  if (!surroundRange(range, tag)) wrapFragmentWithTag(range, tag);
}

export function toggleFormatOnRange(range: Range, root: HTMLElement, format: FormatKind) {
  splitRangeBoundaries(range, root);
  const trimmed = trimRangeWhitespace(range, root);
  if (!trimmed) return;

  if (rangeAllHasFormat(trimmed, root, format)) {
    removeInlineFormatInsideRange(root, trimmed, format);
  } else {
    applyFormatToRange(trimmed, root, format);
  }
}

function renameTag(el: HTMLElement, tag: string) {
  const replacement = document.createElement(tag);
  while (el.firstChild) replacement.appendChild(el.firstChild);
  el.replaceWith(replacement);
}

function removeEmptyInline(root: HTMLElement) {
  root.querySelectorAll('strong, b, em, i, u').forEach((node) => {
    const el = node as HTMLElement;
    if (isChip(el)) return;
    if (!(el.textContent ?? '').replace(/\u200B/g, '').length) el.remove();
  });
}

function unwrapNestedDuplicateTags(root: HTMLElement) {
  const tags = ['strong', 'b', 'em', 'i', 'u'] as const;
  for (const tag of tags) {
    root.querySelectorAll(`${tag} ${tag}`).forEach((inner) => {
      const el = inner as HTMLElement;
      if (isChip(el)) return;
      const parent = el.parentElement;
      if (!parent || parent.tagName.toLowerCase() !== tag) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      el.remove();
    });
  }
}

function mergeAdjacentSameTags(root: HTMLElement) {
  const merge = (tag: string) => {
    root.querySelectorAll(tag).forEach((el) => {
      const node = el as HTMLElement;
      if (isChip(node)) return;
      let next = node.nextSibling;
      while (next instanceof HTMLElement && next.tagName.toLowerCase() === tag && !isChip(next)) {
        while (next.firstChild) node.appendChild(next.firstChild);
        const toRemove = next;
        next = next.nextSibling;
        toRemove.remove();
      }
    });
  };
  merge('strong');
  merge('em');
  merge('u');
}

/** Normaliza DOM del editor antes de guardar o tras aplicar formato. */
export function normalizeEditorDom(root: HTMLElement, normalizeParagraphs: (el: HTMLElement) => void) {
  normalizeParagraphs(root);
  root.querySelectorAll('b').forEach((el) => renameTag(el as HTMLElement, 'strong'));
  root.querySelectorAll('i').forEach((el) => renameTag(el as HTMLElement, 'em'));
  unwrapNestedDuplicateTags(root);
  mergeAdjacentSameTags(root);
  removeEmptyInline(root);
  root.querySelectorAll('span').forEach((span) => {
    const el = span as HTMLElement;
    if (isChip(el)) return;
    if (!(el.textContent ?? '').replace(/\u200B/g, '').length && !el.querySelector('[data-story-ref]')) {
      el.remove();
    }
  });
}

export function clearInlineFormattingInRange(range: Range | null, root: HTMLElement) {
  const formats: FormatKind[] = ['bold', 'italic', 'underline'];
  if (range && !range.collapsed) {
    const working = range.cloneRange();
    splitRangeBoundaries(working, root);
    for (const f of formats) {
      const trimmed = trimRangeWhitespace(working, root);
      if (trimmed) removeInlineFormatInsideRange(root, trimmed, f);
    }
    return;
  }
  root.querySelectorAll('strong, b, em, i, u').forEach((el) => {
    if (isChip(el)) return;
    unwrapElements([el as HTMLElement]);
  });
}

export function readAlignFromBlock(block: HTMLElement): TextAlign | null {
  const fromData = block.dataset.storyAlign as TextAlign | undefined;
  if (fromData && fromData !== 'left' && ['center', 'right', 'justify'].includes(fromData)) return fromData;
  const ta = block.style.textAlign;
  if (ta === 'center' || ta === 'right' || ta === 'justify') return ta;
  return null;
}
