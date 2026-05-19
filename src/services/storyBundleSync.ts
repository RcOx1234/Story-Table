import { useStore } from '@/store';
import { saveLibraryToFirestore, loadLibraryFromFirestore } from '@/services/libraryFirestoreService';
import type { AppState } from '@/store';

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
  | 'houses'
  | 'worldFacts'
  | 'worldData'
  | 'placeCollections'
  | 'mapCollections'
  | 'worldTags'
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
  houses: [],
  worldFacts: [],
  worldData: [],
  placeCollections: [],
  mapCollections: [],
  worldTags: [],
  characterOrderByWorld: {},
  dashboardWorldIds: [],
};

/** Vacía la biblioteca local (p. ej. al cerrar sesión). */
export function applyEmptyStorySlice(): void {
  lastHydratedUid = null;
  hydrateInFlight = null;
  hydrateInFlightUid = null;
  useStore.setState(EMPTY_STORY_SLICE);
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
    houses: s.houses,
    worldFacts: s.worldFacts,
    worldData: s.worldData,
    placeCollections: s.placeCollections,
    mapCollections: s.mapCollections,
    worldTags: s.worldTags,
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
    houses: (data.houses as AppState['houses']) ?? [],
    worldFacts: (data.worldFacts as AppState['worldFacts']) ?? [],
    worldData: (data.worldData as AppState['worldData']) ?? [],
    placeCollections: (data.placeCollections as AppState['placeCollections']) ?? [],
    mapCollections: (data.mapCollections as AppState['mapCollections']) ?? [],
    worldTags: (data.worldTags as AppState['worldTags']) ?? [],
    characterOrderByWorld: (data.characterOrderByWorld as AppState['characterOrderByWorld']) ?? {},
    dashboardWorldIds: (data.dashboardWorldIds as AppState['dashboardWorldIds']) ?? [],
  });
}

export async function pushStoryBundle(uid: string): Promise<void> {
  const raw = getStorySlice() as unknown as Record<string, unknown>;
  await saveLibraryToFirestore(uid, raw);
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

    if (lastHydratedUid !== uid) {
      useStore.setState(EMPTY_STORY_SLICE);
      lastHydratedUid = uid;
    }

    try {
      const pulled = await pullStoryBundle(uid);
      if (!pulled) await pushStoryBundle(uid);
    } catch {
      /* sync opcional; la app sigue con estado local */
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
