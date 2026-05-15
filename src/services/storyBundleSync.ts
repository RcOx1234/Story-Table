import { useStore } from '@/store';
import { loadUserStoryBundle, saveUserStoryBundle } from '@/services/firestoreService';
import type { AppState } from '@/store';

const DOC_ID = 'library';

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
>;

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
  };
}

export async function pushStoryBundle(uid: string): Promise<void> {
  await saveUserStoryBundle(uid, DOC_ID, getStorySlice() as unknown as Record<string, unknown>);
}

export async function pullStoryBundle(uid: string): Promise<boolean> {
  const data = await loadUserStoryBundle(uid);
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
  });
  return true;
}
