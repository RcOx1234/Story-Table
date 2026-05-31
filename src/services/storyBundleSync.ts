import { useStore } from '@/store';
import { saveLibraryToFirestore, loadLibraryFromFirestore } from '@/services/libraryFirestoreService';
import type { AppState } from '@/store';
import { storyContentFingerprint } from '@/lib/storyFingerprint';

const PERSIST_STORAGE_KEY = 'story-table-storage';

let lastHydratedUid: string | null = null;
let hydrateInFlight: Promise<void> | null = null;
let hydrateInFlightUid: string | null = null;

const HYDRATE_TIMEOUT_MS = 18_000;

type StorySlice = Pick<
  AppState,
  | 'worlds'
  | 'characters'
  | 'scenes'
  | 'places'
  | 'maps'
  | 'plots'
  | 'components'
  | 'organizations'
  | 'ideas'
  | 'timelines'
  | 'fantasticElements'
  | 'houses'
  | 'worldFacts'
  | 'worldData'
  | 'placeCollections'
  | 'mapCollections'
  | 'worldTags'
  | 'entityFolders'
  | 'characterOrderByWorld'
  | 'dashboardWorldIds'
>;

export const EMPTY_STORY_SLICE: StorySlice = {
  worlds: [],
  characters: [],
  scenes: [],
  places: [],
  maps: [],
  plots: [],
  components: [],
  organizations: [],
  ideas: [],
  timelines: [],
  fantasticElements: [],
  houses: [],
  worldFacts: [],
  worldData: [],
  placeCollections: [],
  mapCollections: [],
  worldTags: [],
  entityFolders: [],
  characterOrderByWorld: {},
  dashboardWorldIds: [],
};

function waitForStoreRehydration(): Promise<void> {
  return new Promise((resolve) => {
    if (useStore.persist.hasHydrated()) {
      resolve();
      return;
    }
    const unsub = useStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

/** Lee el backup en localStorage (por si la memoria quedó vacía tras un refresh). */
function readPersistedStorySlice(): StorySlice | null {
  try {
    const raw = localStorage.getItem(PERSIST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    const state = (parsed.state ?? parsed) as Record<string, unknown>;
    if (!state || typeof state !== 'object') return null;
    const worlds = state.worlds;
    if (!Array.isArray(worlds)) return null;
    return {
      worlds: worlds as AppState['worlds'],
      characters: (state.characters as AppState['characters']) ?? [],
      scenes: (state.scenes as AppState['scenes']) ?? [],
      places: (state.places as AppState['places']) ?? [],
      maps: (state.maps as AppState['maps']) ?? [],
      plots: (state.plots as AppState['plots']) ?? [],
      components: (state.components as AppState['components']) ?? [],
      organizations: (state.organizations as AppState['organizations']) ?? [],
      ideas: (state.ideas as AppState['ideas']) ?? [],
      timelines: (state.timelines as AppState['timelines']) ?? [],
      fantasticElements: (state.fantasticElements as AppState['fantasticElements']) ?? [],
      houses: (state.houses as AppState['houses']) ?? [],
      worldFacts: (state.worldFacts as AppState['worldFacts']) ?? [],
      worldData: (state.worldData as AppState['worldData']) ?? [],
      placeCollections: (state.placeCollections as AppState['placeCollections']) ?? [],
      mapCollections: (state.mapCollections as AppState['mapCollections']) ?? [],
      worldTags: (state.worldTags as AppState['worldTags']) ?? [],
      entityFolders: (state.entityFolders as AppState['entityFolders']) ?? [],
      characterOrderByWorld: (state.characterOrderByWorld as AppState['characterOrderByWorld']) ?? {},
      dashboardWorldIds: (state.dashboardWorldIds as AppState['dashboardWorldIds']) ?? [],
    };
  } catch {
    return null;
  }
}

function sliceHasContent(slice: StorySlice): boolean {
  return (
    slice.worlds.length > 0 ||
    slice.characters.length > 0 ||
    slice.scenes.length > 0 ||
    slice.places.length > 0 ||
    slice.ideas.length > 0 ||
    slice.houses.length > 0 ||
    slice.entityFolders.length > 0
  );
}

function pickRicherSlice(a: StorySlice, b: StorySlice): StorySlice {
  const score = (s: StorySlice) =>
    s.worlds.length +
    s.characters.length +
    s.scenes.length +
    s.places.length +
    s.ideas.length +
    s.entityFolders.length;
  return score(a) >= score(b) ? a : b;
}

/** Vacía la biblioteca local (p. ej. al cerrar sesión). */
export function applyEmptyStorySlice(): void {
  lastHydratedUid = null;
  hydrateInFlight = null;
  hydrateInFlightUid = null;
  useStore.setState({
    ...EMPTY_STORY_SLICE,
    lastFirebaseSyncFingerprint: null,
  });
  useStore.getState().setStoryDataLoading(false);
}

export function getStorySlice(): StorySlice {
  const s = useStore.getState();
  return {
    worlds: s.worlds,
    characters: s.characters,
    scenes: s.scenes,
    places: s.places,
    maps: s.maps,
    plots: s.plots,
    components: s.components,
    organizations: s.organizations,
    ideas: s.ideas,
    timelines: s.timelines,
    fantasticElements: s.fantasticElements,
    houses: s.houses,
    worldFacts: s.worldFacts,
    worldData: s.worldData,
    placeCollections: s.placeCollections,
    mapCollections: s.mapCollections,
    worldTags: s.worldTags,
    entityFolders: s.entityFolders,
    characterOrderByWorld: s.characterOrderByWorld,
    dashboardWorldIds: s.dashboardWorldIds,
  };
}

function applyStorySlice(data: Record<string, unknown>): void {
  useStore.setState({
    worlds: (data.worlds as AppState['worlds']) ?? [],
    characters: (data.characters as AppState['characters']) ?? [],
    scenes: (data.scenes as AppState['scenes']) ?? [],
    places: (data.places as AppState['places']) ?? [],
    maps: (data.maps as AppState['maps']) ?? [],
    plots: (data.plots as AppState['plots']) ?? [],
    components: (data.components as AppState['components']) ?? [],
    organizations: (data.organizations as AppState['organizations']) ?? [],
    ideas: (data.ideas as AppState['ideas']) ?? [],
    timelines: (data.timelines as AppState['timelines']) ?? [],
    fantasticElements: (data.fantasticElements as AppState['fantasticElements']) ?? [],
    houses: (data.houses as AppState['houses']) ?? [],
    worldFacts: (data.worldFacts as AppState['worldFacts']) ?? [],
    worldData: (data.worldData as AppState['worldData']) ?? [],
    placeCollections: (data.placeCollections as AppState['placeCollections']) ?? [],
    mapCollections: (data.mapCollections as AppState['mapCollections']) ?? [],
    worldTags: (data.worldTags as AppState['worldTags']) ?? [],
    entityFolders: (data.entityFolders as AppState['entityFolders']) ?? [],
    characterOrderByWorld: (data.characterOrderByWorld as AppState['characterOrderByWorld']) ?? {},
    dashboardWorldIds: (data.dashboardWorldIds as AppState['dashboardWorldIds']) ?? [],
  });
}

function fingerprintFromSlice(slice: StorySlice): string {
  return storyContentFingerprint({ ...useStore.getState(), ...slice });
}

/** Marca la biblioteca actual como sincronizada con Firebase. */
export function markStoryBundleSynced(): void {
  const fp = storyContentFingerprint(useStore.getState());
  useStore.getState().setLastFirebaseSyncFingerprint(fp);
}

export async function pushStoryBundle(uid: string): Promise<void> {
  const raw = getStorySlice() as unknown as Record<string, unknown>;
  await saveLibraryToFirestore(uid, raw);
  markStoryBundleSynced();
}

/** Carga la biblioteca desde Firebase; muestra splash mientras tanto. */
export async function hydrateStoryBundleFromFirebase(uid: string): Promise<void> {
  if (hydrateInFlight && hydrateInFlightUid === uid) {
    return hydrateInFlight;
  }

  hydrateInFlightUid = uid;
  hydrateInFlight = (async () => {
    const { setStoryDataLoading } = useStore.getState();
    setStoryDataLoading(true);

    const forceDone = setTimeout(() => {
      useStore.getState().setStoryDataLoading(false);
    }, HYDRATE_TIMEOUT_MS);

    try {
      await waitForStoreRehydration();

      // Solo vaciar al cambiar de cuenta en la misma sesión (no en cada refresh).
      if (lastHydratedUid != null && lastHydratedUid !== uid) {
        useStore.setState(EMPTY_STORY_SLICE);
      }
      lastHydratedUid = uid;

      const fromMemory = getStorySlice();
      const fromStorage = readPersistedStorySlice();
      const localSnapshot = pickRicherSlice(
        fromMemory,
        fromStorage && sliceHasContent(fromStorage) ? fromStorage : fromMemory
      );

      if (sliceHasContent(localSnapshot) && !sliceHasContent(fromMemory)) {
        applyStorySlice(localSnapshot as unknown as Record<string, unknown>);
      }

      const fpBeforePull = fingerprintFromSlice(localSnapshot);
      const lastSynced = useStore.getState().lastFirebaseSyncFingerprint;
      const hasUnsyncedLocal = lastSynced != null && lastSynced !== fpBeforePull;

      const pulled = await pullStoryBundle(uid);
      const remote = getStorySlice();

      if (!pulled) {
        if (sliceHasContent(localSnapshot)) {
          await pushStoryBundle(uid);
        }
        return;
      }

      if (!sliceHasContent(remote) && sliceHasContent(localSnapshot)) {
        applyStorySlice(localSnapshot as unknown as Record<string, unknown>);
        await pushStoryBundle(uid);
        return;
      }

      if (hasUnsyncedLocal && fpBeforePull !== storyContentFingerprint(useStore.getState())) {
        applyStorySlice(localSnapshot as unknown as Record<string, unknown>);
        await pushStoryBundle(uid);
        return;
      }

      markStoryBundleSynced();
    } catch {
      const fallback = readPersistedStorySlice();
      if (fallback && sliceHasContent(fallback) && !sliceHasContent(getStorySlice())) {
        applyStorySlice(fallback as unknown as Record<string, unknown>);
      }
    } finally {
      clearTimeout(forceDone);
      useStore.getState().setStoryDataLoading(false);
      hydrateInFlight = null;
      hydrateInFlightUid = null;
    }
  })();

  return hydrateInFlight;
}

export async function pullStoryBundle(uid: string): Promise<boolean> {
  const data = await loadLibraryFromFirestore(uid);
  if (!data || !Array.isArray(data.worlds)) return false;
  applyStorySlice(data);
  return true;
}

function scoreStorySlice(slice: StorySlice): number {
  return (
    slice.worlds.length +
    slice.characters.length +
    slice.scenes.length +
    slice.places.length +
    slice.ideas.length +
    slice.entityFolders.length
  );
}

/** Intenta recuperar la biblioteca desde localStorage si la sesión quedó vacía. */
export function recoverLocalStoryBackup(): { recovered: boolean; worlds: number; ideas: number } {
  const backup = readPersistedStorySlice();
  const current = getStorySlice();
  if (!backup || !sliceHasContent(backup)) {
    return { recovered: false, worlds: current.worlds.length, ideas: current.ideas.length };
  }
  if (sliceHasContent(current) && scoreStorySlice(current) >= scoreStorySlice(backup)) {
    return { recovered: false, worlds: current.worlds.length, ideas: current.ideas.length };
  }
  applyStorySlice(backup as unknown as Record<string, unknown>);
  return { recovered: true, worlds: backup.worlds.length, ideas: backup.ideas.length };
}
