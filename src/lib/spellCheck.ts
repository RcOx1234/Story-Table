/** Código LanguageTool más cercano al idioma del navegador. */
export function spellCheckLanguageCode(): string {
  const nav = navigator.language || 'en';
  const primary = nav.split('-')[0].toLowerCase();
  const map: Record<string, string> = {
    es: 'es',
    en: 'en-US',
    fr: 'fr',
    pt: 'pt-BR',
    de: 'de-DE',
    it: 'it',
    ca: 'ca',
    gl: 'gl',
    eu: 'eu',
  };
  return map[primary] ?? nav.replace('_', '-');
}

/** Una sola sugerencia para una palabra (LanguageTool, idioma del navegador). */
export async function fetchSpellingSuggestion(
  word: string,
  signal?: AbortSignal
): Promise<string | null> {
  const trimmed = word.trim();
  if (trimmed.length < 2 || /^\d+$/.test(trimmed)) return null;

  try {
    const res = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        text: trimmed,
        language: spellCheckLanguageCode(),
        enabledOnly: 'false',
      }),
      signal,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      matches?: Array<{ replacements?: Array<{ value?: string }> }>;
    };
    const replacement = data.matches?.[0]?.replacements?.[0]?.value?.trim();
    if (!replacement || replacement.includes(' ')) return null;
    if (replacement.toLowerCase() === trimmed.toLowerCase()) return null;
    return replacement;
  } catch {
    return null;
  }
}

const WORD_CHAR = /[\p{L}\p{M}\p{N}'’\-]/u;

export function isWordCharacter(ch: string): boolean {
  return WORD_CHAR.test(ch);
}

/** Expande un rango colapsado al límite de la palabra en un nodo de texto. */
export function expandRangeToWord(range: Range): Range | null {
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent ?? '';
  let start = range.startOffset;
  let end = range.startOffset;
  while (start > 0 && isWordCharacter(text[start - 1]!)) start--;
  while (end < text.length && isWordCharacter(text[end]!)) end++;
  if (start >= end) return null;
  const wordRange = document.createRange();
  wordRange.setStart(node, start);
  wordRange.setEnd(node, end);
  return wordRange;
}

export function caretRangeFromPoint(x: number, y: number): Range | null {
  if (typeof document.caretRangeFromPoint === 'function') {
    return document.caretRangeFromPoint(x, y);
  }
  const pos = document.caretPositionFromPoint?.(x, y);
  if (!pos) return null;
  const range = document.createRange();
  range.setStart(pos.offsetNode, pos.offset);
  range.collapse(true);
  return range;
}
