import { buildStoryRef, STORY_REF_RE } from '@/lib/storyRichText';

/** Reemplaza IDs embebidos en markdown de inserciones tras importar/remapear entidades. */
export function rewriteStoryRefsInText(text: string, idMap: Map<string, string>): string {
  if (!text || idMap.size === 0) return text;
  return text.replace(new RegExp(STORY_REF_RE.source, 'g'), (full, type: string, id: string, label: string) => {
    const nextId = idMap.get(id);
    return nextId ? buildStoryRef(type, nextId, label) : full;
  });
}

export function remapRecordKeys<T>(record: Record<string, T> | undefined, rid: (old: string) => string): Record<string, T> {
  if (!record) return {};
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(record)) {
    out[rid(key)] = value;
  }
  return out;
}
