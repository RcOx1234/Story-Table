/** Metadatos embebidos en `Relationship.description` (prefijo `meta:`). */
const META_PREFIX = 'meta:';

export type RelationshipMeta = {
  birthOrder?: number;
  coParentId?: string;
};

export function encodeRelationshipDescription(meta: RelationshipMeta, note = ''): string {
  const parts: string[] = [];
  if (meta.birthOrder != null && meta.birthOrder > 0) parts.push(`order=${meta.birthOrder}`);
  if (meta.coParentId) parts.push(`coParent=${meta.coParentId}`);
  const metaStr = parts.length ? `${META_PREFIX}${parts.join(';')}` : '';
  const trimmedNote = note.trim();
  if (metaStr && trimmedNote) return `${metaStr}|${trimmedNote}`;
  if (metaStr) return metaStr;
  return trimmedNote;
}

export function parseRelationshipDescription(description: string): {
  meta: RelationshipMeta;
  note: string;
} {
  const raw = description ?? '';
  if (!raw.startsWith(META_PREFIX)) return { meta: {}, note: raw };
  const pipe = raw.indexOf('|');
  const metaPart = pipe >= 0 ? raw.slice(META_PREFIX.length, pipe) : raw.slice(META_PREFIX.length);
  const note = pipe >= 0 ? raw.slice(pipe + 1) : '';
  const meta: RelationshipMeta = {};
  for (const seg of metaPart.split(';')) {
    const [k, v] = seg.split('=');
    if (k === 'order' && v) meta.birthOrder = Number(v) || undefined;
    if (k === 'coParent' && v) meta.coParentId = v;
  }
  return { meta, note };
}

export function getBirthOrder(description: string): number {
  return parseRelationshipDescription(description).meta.birthOrder ?? 999;
}
