import type {
  World,
  Character,
  House,
  WorldFact,
  WorldDatum,
  PlaceCollection,
  MapCollection,
  Scene,
  Place,
  MapData,
  Plot,
  Component,
  Organization,
  Idea,
  Timeline,
  FantasticElement,
  WorldTag,
  EntityFolder,
} from '@/types';
import type { AppState } from '@/store';
import { remapRecordKeys, rewriteStoryRefsInText } from '@/lib/storyRefRewrite';

export const STORY_EXPORT_VERSION = 2 as const;
/** Compatibilidad con exportaciones v1. */
export const STORY_EXPORT_VERSION_LEGACY = 1 as const;

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
  mapCollections: MapCollection[];
  fantasticElements: FantasticElement[];
  worldTags: WorldTag[];
  entityFolders: EntityFolder[];
  characterOrderByWorld: Record<string, string[]>;
  dashboardWorldIds: string[];
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
  houses: House[];
  worldFacts: WorldFact[];
  worldData: WorldDatum[];
  placeCollections: PlaceCollection[];
  mapCollections: MapCollection[];
  fantasticElements: FantasticElement[];
  worldTags: WorldTag[];
  entityFolders: EntityFolder[];
  characterOrder: string[];
};

type SoftDeletable = { id: string; isDeleted?: boolean };

function isActiveEntity<T extends SoftDeletable>(item: T): boolean {
  return !item.isDeleted;
}

function filterActive<T extends SoftDeletable>(items: T[]): T[] {
  return items.filter(isActiveEntity);
}

function activeIdSet(items: SoftDeletable[]): Set<string> {
  return new Set(filterActive(items).map((i) => i.id));
}

function cleanEntityFoldersForExport(folders: EntityFolder[], activeIds: Set<string>): EntityFolder[] {
  return folders.map((f) => ({
    ...f,
    itemIds: f.itemIds.filter((id) => activeIds.has(id)),
  }));
}

function cleanCharacterOrder(
  orderByWorld: Record<string, string[]>,
  characters: Character[]
): Record<string, string[]> {
  const active = activeIdSet(characters);
  const out: Record<string, string[]> = {};
  for (const [worldId, order] of Object.entries(orderByWorld)) {
    out[worldId] = order.filter((id) => active.has(id));
  }
  return out;
}

/** Excluye entidades soft-deleted para que no reaparezcan al importar. */
export function buildLibraryExport(state: AppState): StoryTableLibraryExport {
  const worlds = filterActive(state.worlds);
  const characters = filterActive(state.characters);
  const scenes = filterActive(state.scenes);
  const places = filterActive(state.places);
  const maps = filterActive(state.maps);
  const plots = filterActive(state.plots);
  const components = filterActive(state.components);
  const organizations = filterActive(state.organizations);
  const ideas = filterActive(state.ideas);
  const timelines = filterActive(state.timelines);
  const houses = filterActive(state.houses);
  const worldFacts = filterActive(state.worldFacts);
  const worldData = filterActive(state.worldData);
  const placeCollections = filterActive(state.placeCollections);
  const fantasticElements = filterActive(state.fantasticElements);
  const activeWorldIds = new Set(worlds.map((w) => w.id));
  const folderItemIds = new Set([
    ...characters.map((c) => c.id),
    ...scenes.map((s) => s.id),
    ...components.map((c) => c.id),
    ...organizations.map((o) => o.id),
    ...worldFacts.map((f) => f.id),
    ...worldData.map((d) => d.id),
    ...fantasticElements.map((f) => f.id),
  ]);

  return {
    v: STORY_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    worlds,
    characters,
    scenes,
    places,
    maps,
    plots,
    components,
    organizations,
    ideas,
    timelines,
    houses,
    worldFacts,
    worldData,
    placeCollections,
    mapCollections: state.mapCollections,
    fantasticElements,
    worldTags: state.worldTags.filter((t) => activeWorldIds.has(t.worldId)),
    entityFolders: cleanEntityFoldersForExport(
      state.entityFolders.filter((f) => activeWorldIds.has(f.worldId)),
      folderItemIds
    ),
    characterOrderByWorld: cleanCharacterOrder(state.characterOrderByWorld, characters),
    dashboardWorldIds: state.dashboardWorldIds.filter((id) => activeWorldIds.has(id)),
  };
}

export function buildWorldExport(state: AppState, worldId: string): WorldScopedExport | null {
  const world = state.worlds.find((w) => w.id === worldId && !w.isDeleted);
  if (!world) return null;

  const characters = filterActive(state.characters.filter((c) => c.worldId === worldId));
  const scenes = filterActive(state.scenes.filter((s) => s.worldId === worldId));
  const places = filterActive(state.places.filter((p) => p.worldId === worldId));
  const plots = filterActive(state.plots.filter((p) => p.worldId === worldId));
  const components = filterActive(state.components.filter((c) => c.worldId === worldId));
  const organizations = filterActive(state.organizations.filter((o) => o.worldId === worldId));
  const ideas = filterActive(state.ideas.filter((i) => i.worldId === worldId));
  const houses = filterActive(state.houses.filter((h) => h.worldId === worldId));
  const worldFacts = filterActive(state.worldFacts.filter((f) => f.worldId === worldId));
  const worldData = filterActive(state.worldData.filter((d) => d.worldId === worldId));
  const placeCollections = filterActive(state.placeCollections.filter((c) => c.worldId === worldId));
  const fantasticElements = filterActive(state.fantasticElements.filter((f) => f.worldId === worldId));
  const folderItemIds = new Set([
    ...characters.map((c) => c.id),
    ...scenes.map((s) => s.id),
    ...components.map((c) => c.id),
    ...organizations.map((o) => o.id),
    ...worldFacts.map((f) => f.id),
    ...worldData.map((d) => d.id),
    ...fantasticElements.map((f) => f.id),
  ]);
  const characterOrder = (state.characterOrderByWorld[worldId] ?? []).filter((id) =>
    characters.some((c) => c.id === id)
  );

  return {
    v: STORY_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    world,
    characters,
    scenes,
    places,
    maps: state.maps.filter((m) => m.worldId === worldId),
    plots,
    components,
    organizations,
    ideas,
    timelines: state.timelines.filter((t) => t.worldId === worldId),
    houses,
    worldFacts,
    worldData,
    placeCollections,
    mapCollections: state.mapCollections.filter((c) => c.worldId === worldId),
    fantasticElements,
    worldTags: state.worldTags.filter((t) => t.worldId === worldId),
    entityFolders: cleanEntityFoldersForExport(
      state.entityFolders.filter((f) => f.worldId === worldId),
      folderItemIds
    ),
    characterOrder,
  };
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

const LIBRARY_REQUIRED_ARRAYS = [
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
] as const;

const LIBRARY_OPTIONAL_ARRAYS = [
  'houses',
  'worldFacts',
  'worldData',
  'placeCollections',
  'mapCollections',
  'fantasticElements',
  'worldTags',
  'entityFolders',
] as const;

/** Aplica un JSON de biblioteca completa (v1 o v2). */
export function parseLibraryImport(raw: unknown): Partial<StoryTableLibraryExport> | null {
  if (!isRecord(raw)) return null;
  const v = raw.v;
  if (v !== STORY_EXPORT_VERSION && v !== STORY_EXPORT_VERSION_LEGACY) return null;

  for (const k of LIBRARY_REQUIRED_ARRAYS) {
    if (!Array.isArray(raw[k])) return null;
  }

  const out: Partial<StoryTableLibraryExport> = {
    v: STORY_EXPORT_VERSION,
    exportedAt: String(raw.exportedAt ?? ''),
  };

  for (const k of [...LIBRARY_REQUIRED_ARRAYS, ...LIBRARY_OPTIONAL_ARRAYS]) {
    if (Array.isArray(raw[k])) {
      (out as Record<string, unknown>)[k] = raw[k];
    } else if (LIBRARY_OPTIONAL_ARRAYS.includes(k as (typeof LIBRARY_OPTIONAL_ARRAYS)[number])) {
      (out as Record<string, unknown>)[k] = [];
    }
  }

  const order = raw.characterOrderByWorld;
  out.characterOrderByWorld =
    order && typeof order === 'object' && !Array.isArray(order)
      ? (order as Record<string, string[]>)
      : {};

  const dash = raw.dashboardWorldIds;
  out.dashboardWorldIds = Array.isArray(dash) ? (dash as string[]) : [];

  return out;
}

/** Filtra soft-deletes de importaciones antiguas que aún los incluyen en el JSON. */
export function sanitizeLibraryImport(data: Partial<StoryTableLibraryExport>): Partial<StoryTableLibraryExport> {
  const worlds = filterActive((data.worlds as World[]) ?? []);
  const characters = filterActive((data.characters as Character[]) ?? []);
  const scenes = filterActive((data.scenes as Scene[]) ?? []);
  const places = filterActive((data.places as Place[]) ?? []);
  const plots = filterActive((data.plots as Plot[]) ?? []);
  const components = filterActive((data.components as Component[]) ?? []);
  const organizations = filterActive((data.organizations as Organization[]) ?? []);
  const ideas = filterActive((data.ideas as Idea[]) ?? []);
  const houses = filterActive((data.houses as House[]) ?? []);
  const worldFacts = filterActive((data.worldFacts as WorldFact[]) ?? []);
  const worldData = filterActive((data.worldData as WorldDatum[]) ?? []);
  const placeCollections = filterActive((data.placeCollections as PlaceCollection[]) ?? []);
  const fantasticElements = filterActive((data.fantasticElements as FantasticElement[]) ?? []);
  const activeWorldIds = new Set(worlds.map((w) => w.id));
  const folderItemIds = new Set([
    ...characters.map((c) => c.id),
    ...scenes.map((s) => s.id),
    ...components.map((c) => c.id),
    ...organizations.map((o) => o.id),
    ...worldFacts.map((f) => f.id),
    ...worldData.map((d) => d.id),
    ...fantasticElements.map((f) => f.id),
  ]);

  return {
    ...data,
    worlds,
    characters,
    scenes,
    places,
    plots,
    components,
    organizations,
    ideas,
    houses,
    worldFacts,
    worldData,
    placeCollections,
    fantasticElements,
    worldTags: ((data.worldTags as WorldTag[]) ?? []).filter((t) => activeWorldIds.has(t.worldId)),
    entityFolders: cleanEntityFoldersForExport(
      ((data.entityFolders as EntityFolder[]) ?? []).filter((f) => activeWorldIds.has(f.worldId)),
      folderItemIds
    ),
    characterOrderByWorld: cleanCharacterOrder(data.characterOrderByWorld ?? {}, characters),
    dashboardWorldIds: (data.dashboardWorldIds ?? []).filter((id) => activeWorldIds.has(id)),
  };
}

const WORLD_OPTIONAL_ARRAYS = [
  'houses',
  'worldFacts',
  'worldData',
  'placeCollections',
  'mapCollections',
  'fantasticElements',
  'worldTags',
  'entityFolders',
] as const;

/** Importa solo un mundo + entidades (añade al estado o sustituye si same id — responsabilidad del caller). */
export function parseWorldImport(raw: unknown): WorldScopedExport | null {
  if (!isRecord(raw)) return null;
  const v = raw.v;
  if (v !== STORY_EXPORT_VERSION && v !== STORY_EXPORT_VERSION_LEGACY) return null;
  if (!isRecord(raw.world) || typeof raw.world.id !== 'string') return null;
  const rest = [
    'characters',
    'scenes',
    'places',
    'maps',
    'plots',
    'components',
    'organizations',
    'ideas',
    'timelines',
  ] as const;
  for (const k of rest) {
    if (!Array.isArray(raw[k])) return null;
  }

  const bundle = { ...raw, v: STORY_EXPORT_VERSION } as unknown as WorldScopedExport;
  for (const k of WORLD_OPTIONAL_ARRAYS) {
    if (!Array.isArray((bundle as Record<string, unknown>)[k])) {
      (bundle as Record<string, unknown>)[k] = [];
    }
  }
  if (!Array.isArray(bundle.characterOrder)) {
    bundle.characterOrder = [];
  }
  if (!bundle.entityFolders?.length && Array.isArray(raw.characterFolders)) {
    bundle.entityFolders = (raw.characterFolders as EntityFolder[]).map((f) => ({
      ...f,
      scope: 'character' as const,
      parentFolderId: (f as EntityFolder).parentFolderId ?? null,
      itemIds: (f as EntityFolder).itemIds ?? (f as { characterIds?: string[] }).characterIds ?? [],
    }));
  }
  return bundle;
}

function freshId(): string {
  return crypto.randomUUID();
}

function rewriteWorldBundleRefs(bundle: WorldScopedExport, idMap: Map<string, string>): WorldScopedExport {
  const rw = (text?: string) => rewriteStoryRefsInText(text ?? '', idMap);
  return {
    ...bundle,
    world: {
      ...bundle.world,
      description: rw(bundle.world.description),
    },
    characters: bundle.characters.map((c) => ({
      ...c,
      appearance: rw(c.appearance),
      personality: rw(c.personality),
      backstory: rw(c.backstory),
      goals: rw(c.goals),
      fears: rw(c.fears),
      powers: rw(c.powers),
      traumas: rw(c.traumas),
      breakingPoint: rw(c.breakingPoint),
      arc: rw(c.arc),
      extraFields: (c.extraFields ?? []).map((ef) => ({ ...ef, value: rw(ef.value) })),
    })),
    scenes: bundle.scenes.map((s) => ({
      ...s,
      description: rw(s.description),
      content: rw(s.content),
    })),
    places: bundle.places.map((p) => ({ ...p, description: rw(p.description) })),
    plots: bundle.plots.map((p) => ({ ...p, synopsis: rw(p.synopsis) })),
    components: bundle.components.map((c) => ({ ...c, description: rw(c.description), history: rw(c.history) })),
    organizations: bundle.organizations.map((o) => ({
      ...o,
      goals: rw(o.goals),
      symbols: rw(o.symbols),
      hierarchy: rw(o.hierarchy),
      history: rw(o.history),
    })),
    ideas: bundle.ideas.map((i) => ({ ...i, description: rw(i.description) })),
    houses: (bundle.houses ?? []).map((h) => ({ ...h, description: rw(h.description), motto: rw(h.motto) })),
    worldFacts: (bundle.worldFacts ?? []).map((f) => ({ ...f, description: rw(f.description) })),
    worldData: (bundle.worldData ?? []).map((d) => ({ ...d, content: rw(d.content) })),
    fantasticElements: (bundle.fantasticElements ?? []).map((f) => ({ ...f, description: rw(f.description) })),
    timelines: bundle.timelines.map((t) => ({ ...t, description: rw(t.description) })),
  };
}

/** Quita soft-deletes de un bundle (p. ej. exportaciones antiguas). */
function stripDeletedFromWorldBundle(bundle: WorldScopedExport): WorldScopedExport {
  if (bundle.world.isDeleted) {
    throw new Error('Cannot import a deleted world');
  }
  return {
    ...bundle,
    characters: filterActive(bundle.characters),
    scenes: filterActive(bundle.scenes),
    places: filterActive(bundle.places),
    plots: filterActive(bundle.plots),
    components: filterActive(bundle.components),
    organizations: filterActive(bundle.organizations),
    ideas: filterActive(bundle.ideas),
    houses: filterActive(bundle.houses ?? []),
    worldFacts: filterActive(bundle.worldFacts ?? []),
    worldData: filterActive(bundle.worldData ?? []),
    placeCollections: filterActive(bundle.placeCollections ?? []),
    fantasticElements: filterActive(bundle.fantasticElements ?? []),
  };
}

/** Clona un mundo exportado con IDs nuevos para importar sin colisiones. */
export function remapWorldImport(rawBundle: WorldScopedExport): WorldScopedExport {
  const bundle = stripDeletedFromWorldBundle(rawBundle);
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
    mainTimelineId: bundle.world.mainTimelineId ? rid(bundle.world.mainTimelineId) : undefined,
    tagIds: (bundle.world.tagIds ?? []).map((tid) => rid(tid)),
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
  };

  const characters: Character[] = bundle.characters.map((c) => ({
    ...c,
    id: rid(c.id),
    worldId,
    houseId: c.houseId ? rid(c.houseId) : undefined,
    tagIds: (c.tagIds ?? []).map((tid) => rid(tid)),
    ageByTimeline: remapRecordKeys(c.ageByTimeline, rid),
    statusByTimeline: remapRecordKeys(c.statusByTimeline, rid),
    deathByTimeline: remapRecordKeys(c.deathByTimeline, rid),
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
    relatedCharacterIds: (i.relatedCharacterIds ?? []).map((cid) => rid(cid)),
    relatedPlaceIds: (i.relatedPlaceIds ?? []).map((pid) => rid(pid)),
    relatedSceneIds: (i.relatedSceneIds ?? []).map((sid) => rid(sid)),
    relatedHouseIds: (i.relatedHouseIds ?? []).map((hid) => rid(hid)),
    relatedOrganizationIds: (i.relatedOrganizationIds ?? []).map((oid) => rid(oid)),
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
  }));

  const houses: House[] = (bundle.houses ?? []).map((h) => ({
    ...h,
    id: rid(h.id),
    worldId,
    parentHouseId: h.parentHouseId ? rid(h.parentHouseId) : undefined,
    members: (h.members ?? []).map((m) => ({
      ...m,
      characterId: rid(m.characterId),
      fatherId: m.fatherId ? rid(m.fatherId) : m.fatherId,
      motherId: m.motherId ? rid(m.motherId) : m.motherId,
      parentCharacterId: m.parentCharacterId ? rid(m.parentCharacterId) : m.parentCharacterId,
      adoptedParentIds: (m.adoptedParentIds ?? []).map((pid) => rid(pid)),
      spouseIds: (m.spouseIds ?? []).map((sid) => rid(sid)),
      joinedAtTimelineId: m.joinedAtTimelineId ? rid(m.joinedAtTimelineId) : m.joinedAtTimelineId,
    })),
    familyPeople: (h.familyPeople ?? []).map((p) => ({
      ...p,
      characterId: rid(p.characterId),
    })),
    familyRelations: (h.familyRelations ?? []).map((r) => ({
      ...r,
      id: freshId(),
      fromCharacterId: rid(r.fromCharacterId),
      toCharacterId: rid(r.toCharacterId),
      timelineId: r.timelineId ? rid(r.timelineId) : r.timelineId,
      timelineIds: (r.timelineIds ?? []).map((tid) => rid(tid)),
      familyUnitId: r.familyUnitId ? freshId() : r.familyUnitId,
    })),
    familyUnits: (h.familyUnits ?? []).map((u) => ({
      ...u,
      id: freshId(),
      parentIds: u.parentIds.map((pid) => rid(pid)),
      childIds: u.childIds.map((cid) => rid(cid)),
      timelineId: u.timelineId ? rid(u.timelineId) : u.timelineId,
      timelineIds: (u.timelineIds ?? []).map((tid) => rid(tid)),
    })),
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
  }));

  const worldFacts: WorldFact[] = (bundle.worldFacts ?? []).map((f) => ({
    ...f,
    id: rid(f.id),
    worldId,
    timelineId: f.timelineId ? rid(f.timelineId) : f.timelineId,
    relatedCharacterIds: (f.relatedCharacterIds ?? []).map((cid) => rid(cid)),
    relatedPlaceIds: (f.relatedPlaceIds ?? []).map((pid) => rid(pid)),
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
  }));

  const worldData: WorldDatum[] = (bundle.worldData ?? []).map((d) => ({
    ...d,
    id: rid(d.id),
    worldId,
    relatedCharacterIds: (d.relatedCharacterIds ?? []).map((cid) => rid(cid)),
    relatedPlaceIds: (d.relatedPlaceIds ?? []).map((pid) => rid(pid)),
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
  }));

  const placeCollections: PlaceCollection[] = (bundle.placeCollections ?? []).map((c) => ({
    ...c,
    id: rid(c.id),
    worldId,
    placeIds: (c.placeIds ?? []).map((pid) => rid(pid)),
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
  }));

  const mapCollections: MapCollection[] = (bundle.mapCollections ?? []).map((c) => ({
    ...c,
    id: rid(c.id),
    worldId,
    mapIds: (c.mapIds ?? []).map((mid) => rid(mid)),
    createdAt: now,
    updatedAt: now,
  }));

  const fantasticElements: FantasticElement[] = (bundle.fantasticElements ?? []).map((f) => ({
    ...f,
    id: rid(f.id),
    worldId,
    linkedCharacterIds: (f.linkedCharacterIds ?? []).map((cid) => rid(cid)),
    isDeleted: false,
    deletedAt: undefined,
    createdAt: now,
    updatedAt: now,
  }));

  const worldTags: WorldTag[] = (bundle.worldTags ?? []).map((t) => ({
    ...t,
    id: rid(t.id),
    worldId,
    createdAt: now,
    updatedAt: now,
  }));

  const rawFolders = (bundle.entityFolders ??
    (bundle as { characterFolders?: EntityFolder[] }).characterFolders ??
    []) as EntityFolder[];
  const entityFolders: EntityFolder[] = rawFolders.map((f) => ({
    ...f,
    id: rid(f.id),
    worldId,
    scope: f.scope ?? 'character',
    parentFolderId: f.parentFolderId ? rid(f.parentFolderId) : null,
    itemIds: (f.itemIds ?? (f as { characterIds?: string[] }).characterIds ?? []).map((cid) => rid(cid)),
    createdAt: now,
    updatedAt: now,
  }));

  const characterOrder = (bundle.characterOrder ?? []).map((cid) => rid(cid));

  const remapped: WorldScopedExport = {
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
    houses,
    worldFacts,
    worldData,
    placeCollections,
    mapCollections,
    fantasticElements,
    worldTags,
    entityFolders,
    characterOrder,
  };

  return rewriteWorldBundleRefs(remapped, map);
}
