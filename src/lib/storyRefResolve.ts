import type { AppState } from '@/store';
import { normalizeInsertionType } from '@/lib/storyInsertionCatalog';

export type ResolvedStoryRef = {
  type: string;
  id: string;
  label: string;
};

function normLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function pickById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((i) => i.id === id);
}

function pickByLabel<T>(items: T[], label: string, getLabel: (item: T) => string): T | undefined {
  const target = normLabel(label);
  if (!target) return undefined;
  return items.find((item) => normLabel(getLabel(item)) === target);
}

/** Resuelve una inserción por ID o, si falla, por etiqueta visible (refs antiguas / mundos importados). */
export function resolveStoryRef(
  worldId: string,
  type: string,
  id: string,
  label: string,
  state: AppState
): ResolvedStoryRef | null {
  const normalizedType = normalizeInsertionType(type);

  const resolve = <T extends { id: string }>(
    items: T[],
    getLabel: (item: T) => string
  ): ResolvedStoryRef | null => {
    const byId = pickById(items, id);
    if (byId) return { type: normalizedType, id: byId.id, label: getLabel(byId) };
    const byLabel = pickByLabel(items, label, getLabel);
    if (byLabel) return { type: normalizedType, id: byLabel.id, label: getLabel(byLabel) };
    return null;
  };

  switch (normalizedType) {
    case 'character':
      return resolve(
        state.characters.filter((c) => c.worldId === worldId && !c.isDeleted),
        (c) => c.name
      );
    case 'scene':
      return resolve(
        state.scenes.filter((s) => s.worldId === worldId && !s.isDeleted),
        (s) => s.title
      );
    case 'place':
      return resolve(
        state.places.filter((p) => p.worldId === worldId && !p.isDeleted),
        (p) => p.name
      );
    case 'placeCollection':
      return resolve(
        state.placeCollections.filter((c) => c.worldId === worldId && !c.isDeleted),
        (c) => c.name
      );
    case 'mapCollection':
      return resolve(
        (state.mapCollections ?? []).filter((c) => c.worldId === worldId),
        (c) => c.name
      );
    case 'house':
      return resolve(
        state.houses.filter((h) => h.worldId === worldId && !h.isDeleted),
        (h) => h.name
      );
    case 'map':
      return resolve(
        state.maps.filter((m) => m.worldId === worldId),
        (m) => m.name
      );
    case 'component':
      return resolve(
        state.components.filter((c) => c.worldId === worldId && !c.isDeleted),
        (c) => c.name
      );
    case 'organization':
      return resolve(
        state.organizations.filter((o) => o.worldId === worldId && !o.isDeleted),
        (o) => o.name
      );
    case 'plot':
      return resolve(
        state.plots.filter((p) => p.worldId === worldId && !p.isDeleted),
        (p) => p.title
      );
    case 'timeline':
      return resolve(
        state.timelines.filter((t) => t.worldId === worldId),
        (t) => t.name
      );
    case 'fact':
      return resolve(
        state.worldFacts.filter((f) => f.worldId === worldId && !f.isDeleted),
        (f) => f.title
      );
    case 'datum':
      return resolve(
        state.worldData.filter((d) => d.worldId === worldId && !d.isDeleted),
        (d) => d.title
      );
    case 'idea':
      return resolve(
        state.ideas.filter((i) => i.worldId === worldId && !i.isDeleted),
        (i) => i.description.slice(0, 48) || 'Idea'
      );
    case 'fantastic':
      return resolve(
        state.fantasticElements.filter((f) => f.worldId === worldId && !f.isDeleted),
        (f) => f.name
      );
    default:
      return null;
  }
}
