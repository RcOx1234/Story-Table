import type { World } from '@/types';

/** Mundos activos ordenados: manual (`orderIds`) o por `updatedAt` descendente. */
export function orderedActiveWorlds(worlds: World[], orderIds: string[]): World[] {
  const active = worlds.filter((w) => !w.isDeleted);
  if (!orderIds.length) {
    return [...active].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  const map = new Map(active.map((w) => [w.id, w]));
  const result: World[] = [];
  const seen = new Set<string>();
  for (const id of orderIds) {
    const w = map.get(id);
    if (w) {
      result.push(w);
      seen.add(id);
    }
  }
  for (const w of active) {
    if (!seen.has(w.id)) result.push(w);
  }
  return result;
}
