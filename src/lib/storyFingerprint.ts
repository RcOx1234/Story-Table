import type { AppState } from '@/store';

/** Huella del contenido de la biblioteca (sin estado de UI). */
export function storyContentFingerprint(state: AppState): string {
  return JSON.stringify({
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
    fantasticElements: state.fantasticElements,
    houses: state.houses,
    worldFacts: state.worldFacts,
    worldData: state.worldData,
    placeCollections: state.placeCollections,
    mapCollections: state.mapCollections,
    worldTags: state.worldTags,
    entityFolders: state.entityFolders,
    characterOrderByWorld: state.characterOrderByWorld,
    dashboardWorldIds: state.dashboardWorldIds,
  });
}
