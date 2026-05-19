import { normalizeKey } from '@/lib/normalizeLabels';
import type { WorldTag } from '@/types';

export function findTagByName(tags: WorldTag[], name: string): WorldTag | undefined {
  const key = normalizeKey(name);
  return tags.find((t) => normalizeKey(t.name) === key);
}

export function resolveTagNames(tagIds: string[] | undefined, worldTags: WorldTag[]): string[] {
  if (!tagIds?.length) return [];
  const map = new Map(worldTags.map((t) => [t.id, t.name]));
  return tagIds.map((id) => map.get(id)).filter((n): n is string => Boolean(n));
}

export function mergeTagIdsAndLegacy(
  tagIds: string[] | undefined,
  legacyTags: string[] | undefined,
  worldTags: WorldTag[]
): string[] {
  const ids = new Set(tagIds ?? []);
  for (const name of legacyTags ?? []) {
    const found = findTagByName(worldTags, name);
    if (found) ids.add(found.id);
  }
  return [...ids];
}

export const TAG_CHIP_COLORS = [
  '#D61E2B',
  '#3B82F6',
  '#22C55E',
  '#EAB308',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
];

export function tagChipStyle(color?: string): { backgroundColor: string; color: string; borderColor: string } {
  const c = color || '#5A6078';
  return { backgroundColor: `${c}18`, color: c, borderColor: `${c}40` };
}
