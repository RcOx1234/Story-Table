import { useStore } from '@/store';
import { loadUserStoryBundle, saveUserStoryBundle } from '@/services/firestoreService';
import { prepareStoryBundleForFirestore } from '@/lib/firestorePayload';
import type { AppState } from '@/store';

/** Documento principal de la biblioteca (nombre legible en Firestore). */
const DOC_ID = 'biblioteca';
const LEGACY_DOC_ID = 'library';

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
  | 'characterOrderByWorld'
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
  characterOrderByWorld: {},
};

/** Vacía la biblioteca local (p. ej. al cerrar sesión). */
export function applyEmptyStorySlice(): void {
  useStore.setState(EMPTY_STORY_SLICE);
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
    characterOrderByWorld: s.characterOrderByWorld,
  };
}

export async function pushStoryBundle(uid: string): Promise<void> {
  const raw = getStorySlice() as unknown as Record<string, unknown>;
  const prepared = await prepareStoryBundleForFirestore(uid, raw);
  await saveUserStoryBundle(uid, DOC_ID, prepared);
}

export async function pullStoryBundle(uid: string): Promise<boolean> {
  let data = await loadUserStoryBundle(uid, DOC_ID);
  if (!data || !Array.isArray(data.worlds)) {
    data = await loadUserStoryBundle(uid, LEGACY_DOC_ID);
  }
  if (!data || !Array.isArray(data.worlds)) return false;
  useStore.setState({
    worlds: data.worlds as AppState['worlds'],
    characters: data.characters as AppState['characters'],
    scenes: data.scenes as AppState['scenes'],
    places: data.places as AppState['places'],
    maps: data.maps as AppState['maps'],
    plots: data.plots as AppState['plots'],
    components: data.components as AppState['components'],
    organizations: data.organizations as AppState['organizations'],
    ideas: data.ideas as AppState['ideas'],
    timelines: data.timelines as AppState['timelines'],
    houses: (data.houses as AppState['houses']) ?? [],
    worldFacts: (data.worldFacts as AppState['worldFacts']) ?? [],
    worldData: (data.worldData as AppState['worldData']) ?? [],
    placeCollections: (data.placeCollections as AppState['placeCollections']) ?? [],
    mapCollections: (data.mapCollections as AppState['mapCollections']) ?? [],
    characterOrderByWorld: (data.characterOrderByWorld as AppState['characterOrderByWorld']) ?? {},
  });
  return true;
}
