import type { AppState } from '@/store';

export type InsertionCategory = {
  id: string;
  label: string;
  items: { type: string; id: string; label: string; sublabel?: string }[];
};

export function buildInsertionCatalog(worldId: string, state: AppState): InsertionCategory[] {
  const chars = state.characters.filter((c) => c.worldId === worldId && !c.isDeleted);
  const scenes = state.scenes.filter((s) => s.worldId === worldId && !s.isDeleted);
  const places = state.places.filter((p) => p.worldId === worldId && !p.isDeleted);
  const placeCollections = state.placeCollections.filter((c) => c.worldId === worldId && !c.isDeleted);
  const mapCollections = (state.mapCollections ?? []).filter((c) => c.worldId === worldId);
  const houses = state.houses.filter((h) => h.worldId === worldId && !h.isDeleted);
  const maps = state.maps.filter((m) => m.worldId === worldId);
  const components = state.components.filter((c) => c.worldId === worldId && !c.isDeleted);
  const orgs = state.organizations.filter((o) => o.worldId === worldId && !o.isDeleted);
  const plots = state.plots.filter((p) => p.worldId === worldId && !p.isDeleted);
  const timelines = state.timelines.filter((t) => t.worldId === worldId);
  const facts = state.worldFacts.filter((f) => f.worldId === worldId && !f.isDeleted);
  const data = state.worldData.filter((d) => d.worldId === worldId && !d.isDeleted);
  const ideas = state.ideas.filter((i) => i.worldId === worldId && !i.isDeleted);
  const fantasy = state.fantasticElements.filter((f) => f.worldId === worldId && !f.isDeleted);

  const map = (type: string, list: { id: string; name?: string; title?: string; description?: string }[]) =>
    list.map((x) => ({
      type,
      id: x.id,
      label: x.name ?? x.title ?? x.description?.slice(0, 40) ?? 'Sin nombre',
    }));

  return [
    { id: 'characters', label: 'Personajes', items: map('character', chars) },
    { id: 'scenes', label: 'Escenas', items: map('scene', scenes) },
    { id: 'places', label: 'Lugares', items: map('place', places) },
    { id: 'placeCollections', label: 'Colecciones / reinos', items: map('placeCollection', placeCollections) },
    { id: 'houses', label: 'Casas', items: map('house', houses) },
    { id: 'maps', label: 'Mapas', items: map('map', maps) },
    { id: 'mapCollections', label: 'Colecciones de mapas', items: map('mapCollection', mapCollections) },
    { id: 'components', label: 'Componentes', items: map('component', components) },
    { id: 'organizations', label: 'Organizaciones', items: map('organization', orgs) },
    { id: 'plots', label: 'Tramas', items: map('plot', plots) },
    { id: 'timelines', label: 'Timeline', items: map('timeline', timelines) },
    { id: 'facts', label: 'Hechos', items: map('fact', facts) },
    { id: 'data', label: 'Datos', items: map('datum', data) },
    { id: 'ideas', label: 'Ideas', items: map('idea', ideas) },
    { id: 'fantastic', label: 'Elementos fantásticos', items: map('fantastic', fantasy) },
  ].filter((c) => c.items.length > 0);
}

const INSERTION_TYPE_ALIASES: Record<string, string> = {
  data: 'datum',
  dato: 'datum',
  hecho: 'fact',
  fantasticElement: 'fantastic',
  fantasticelement: 'fantastic',
  placecollection: 'placeCollection',
  mapcollection: 'mapCollection',
  org: 'organization',
};

/** Normaliza tipos de inserción antiguos o alternativos al tipo canónico. */
export function normalizeInsertionType(type: string): string {
  const trimmed = type.trim();
  if (INSERTION_TYPE_ALIASES[trimmed]) return INSERTION_TYPE_ALIASES[trimmed];
  const lower = trimmed.toLowerCase();
  if (INSERTION_TYPE_ALIASES[lower]) return INSERTION_TYPE_ALIASES[lower];
  return trimmed;
}

export function storyRefPath(worldId: string, type: string, id: string): string | null {
  const t = normalizeInsertionType(type);
  switch (t) {
    case 'character':
      return `/world/${worldId}/character/${id}`;
    case 'scene':
      return `/world/${worldId}/scene/${id}`;
    case 'place':
      return `/world/${worldId}/place/${id}`;
    case 'placeCollection':
      return `/world/${worldId}?tab=places&collection=${id}`;
    case 'mapCollection':
      return `/world/${worldId}?tab=maps&collection=${id}`;
    case 'house':
      return `/world/${worldId}/house/${id}`;
    case 'map':
      return `/world/${worldId}/map/${id}`;
    case 'component':
      return `/world/${worldId}?tab=components`;
    case 'organization':
      return `/world/${worldId}?tab=organizations`;
    case 'plot':
      return `/world/${worldId}?tab=plots`;
    case 'timeline':
      return `/world/${worldId}?tab=timelines`;
    case 'fact':
      return `/world/${worldId}?tab=hechos`;
    case 'datum':
      return `/world/${worldId}?tab=datos`;
    case 'idea':
      return `/world/${worldId}?tab=ideas`;
    case 'fantastic':
      return `/world/${worldId}?tab=fantastic`;
    default:
      return null;
  }
}
