import type {
  World,
  Character,
  House,
  WorldFact,
  WorldDatum,
  PlaceCollection,
  Scene,
  Place,
  MapData,
  Plot,
  Component,
  Organization,
  Idea,
  Timeline,
} from '@/types';
import type { AppState } from '@/store';

export const STORY_EXPORT_VERSION = 1 as const;

export type StoryTableLibraryExport = {
  v: typeof STORY_EXPORT_VERSION;
  exportedAt: string;
  worlds: World[];
  characters: Character[];
  scenes: Scene[];
  places: Place[];
  maps: MapData[];
  plots: Plot[];
  components: Component[];
  organizations: Organization[];
  ideas: Idea[];
  timelines: Timeline[];
  houses: House[];
  worldFacts: WorldFact[];
  worldData: WorldDatum[];
  placeCollections: PlaceCollection[];
};

export type WorldScopedExport = {
  v: typeof STORY_EXPORT_VERSION;
  exportedAt: string;
  world: World;
  characters: Character[];
  scenes: Scene[];
  places: Place[];
  maps: MapData[];
  plots: Plot[];
  components: Component[];
  organizations: Organization[];
  ideas: Idea[];
  timelines: Timeline[];
};

export function buildLibraryExport(state: AppState): StoryTableLibraryExport {
  return {
    v: STORY_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    worlds: state.worlds,
    characters: state.characters,
    scenes: state.scenes,
    places: state.places,
    maps: state.maps,
    plots: state.plots,
    components: state.components,
    organizations: state.organizations,
    ideas: state.ideas,
    timelines: state.timelines,
    houses: state.houses,
    worldFacts: state.worldFacts,
    worldData: state.worldData,
    placeCollections: state.placeCollections,
  };
}

export function buildWorldExport(state: AppState, worldId: string): WorldScopedExport | null {
  const world = state.worlds.find((w) => w.id === worldId);
  if (!world) return null;
  return {
    v: STORY_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    world,
    characters: state.characters.filter((c) => c.worldId === worldId),
    scenes: state.scenes.filter((s) => s.worldId === worldId),
    places: state.places.filter((p) => p.worldId === worldId),
    maps: state.maps.filter((m) => m.worldId === worldId),
    plots: state.plots.filter((p) => p.worldId === worldId),
    components: state.components.filter((c) => c.worldId === worldId),
    organizations: state.organizations.filter((o) => o.worldId === worldId),
    ideas: state.ideas.filter((i) => i.worldId === worldId),
    timelines: state.timelines.filter((t) => t.worldId === worldId),
  };
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Aplica un JSON de biblioteca completa (validación mínima). */
export function parseLibraryImport(raw: unknown): Partial<StoryTableLibraryExport> | null {
  if (!isRecord(raw) || raw.v !== STORY_EXPORT_VERSION) return null;
  const keys = [
    'worlds',
    'characters',
    'scenes',
    'places',
    'maps',
    'plots',
    'components',
    'organizations',
    'ideas',
    'timelines',
    'houses',
    'worldFacts',
    'worldData',
    'placeCollections',
  ] as const;
  const out: Partial<StoryTableLibraryExport> = { v: STORY_EXPORT_VERSION, exportedAt: String(raw.exportedAt ?? '') };
  for (const k of keys) {
    if (!Array.isArray(raw[k])) return null;
    (out as Record<string, unknown>)[k] = raw[k];
  }
  return out;
}

/** Importa solo un mundo + entidades (añade al estado o sustituye si same id — responsabilidad del caller). */
export function parseWorldImport(raw: unknown): WorldScopedExport | null {
  if (!isRecord(raw) || raw.v !== STORY_EXPORT_VERSION) return null;
  if (!isRecord(raw.world) || typeof raw.world.id !== 'string') return null;
  const rest = ['characters', 'scenes', 'places', 'maps', 'plots', 'components', 'organizations', 'ideas', 'timelines'] as const;
  for (const k of rest) {
    if (!Array.isArray(raw[k])) return null;
  }
  return raw as unknown as WorldScopedExport;
}

function freshId(): string {
  return crypto.randomUUID();
}

/** Clona un mundo exportado con IDs nuevos para importar sin colisiones. */
export function remapWorldImport(bundle: WorldScopedExport): WorldScopedExport {
  const worldId = freshId();
  const map = new Map<string, string>();
  const rid = (old: string) => {
    if (!map.has(old)) map.set(old, freshId());
    return map.get(old)!;
  };

  const now = new Date().toISOString();
  const world: World = {
    ...(bundle.world as World),
    id: worldId,
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
  };

  const characters: Character[] = bundle.characters.map((c) => ({
    ...c,
    id: rid(c.id),
    worldId,
    isDeleted: false,
    deletedAt: undefined,
    relationships: c.relationships.map((r) => ({
      ...r,
      characterId: rid(r.characterId),
    })),
    createdAt: now,
    updatedAt: now,
  }));

  const timelines: Timeline[] = bundle.timelines.map((t) => ({
    ...t,
    id: rid(t.id),
    worldId,
    createdAt: now,
    updatedAt: now,
  }));

  const places: Place[] = bundle.places.map((p) => ({
    ...p,
    id: rid(p.id),
    worldId,
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
  }));

  const scenes: Scene[] = bundle.scenes.map((s) => ({
    ...s,
    id: rid(s.id),
    worldId,
    placeId: s.placeId ? rid(s.placeId) : '',
    timelineId: s.timelineId ? rid(s.timelineId) : '',
    characters: s.characters.map((cid) => rid(cid)),
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
  }));

  const maps: MapData[] = bundle.maps.map((m) => ({
    ...m,
    id: rid(m.id),
    worldId,
    markers: m.markers.map((mk) => ({
      ...mk,
      id: freshId(),
      placeId: mk.placeId ? rid(mk.placeId) : '',
      sceneId: mk.sceneId ? rid(mk.sceneId) : undefined,
      componentId: mk.componentId ? rid(mk.componentId) : undefined,
      organizationId: mk.organizationId ? rid(mk.organizationId) : undefined,
    })),
    createdAt: now,
    updatedAt: now,
  }));

  const plots: Plot[] = bundle.plots.map((p) => ({
    ...p,
    id: rid(p.id),
    worldId,
    characters: p.characters.map((cid) => rid(cid)),
    relatedPlots: p.relatedPlots.map((pid) => rid(pid)),
    relatedScenes: (p.relatedScenes ?? []).map((sid) => rid(sid)),
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
  }));

  const components: Component[] = bundle.components.map((c) => ({
    ...c,
    id: rid(c.id),
    worldId,
    scenes: c.scenes.map((sid) => rid(sid)),
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
  }));

  const organizations: Organization[] = bundle.organizations.map((o) => ({
    ...o,
    id: rid(o.id),
    worldId,
    members: o.members.map((mid) => rid(mid)),
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
  }));

  const ideas: Idea[] = bundle.ideas.map((i) => ({
    ...i,
    id: rid(i.id),
    worldId,
    linkedCharacterId: i.linkedCharacterId ? rid(i.linkedCharacterId) : null,
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
  }));

  return {
    v: STORY_EXPORT_VERSION,
    exportedAt: bundle.exportedAt,
    world,
    characters,
    scenes,
    places,
    maps,
    plots,
    components,
    organizations,
    ideas,
    timelines,
  };
}
