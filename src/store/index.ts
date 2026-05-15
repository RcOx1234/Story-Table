import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type {
  World, Character, Scene, Place, MapData, Plot, Component, Organization, Idea, Timeline, User, SectionType
} from '@/types';

export interface AppState {
  // Auth
  user: User | null;
  login: (user: User) => void;
  logout: () => void;

  // Worlds
  worlds: World[];
  addWorld: (world: Omit<World, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateWorld: (id: string, data: Partial<World>) => void;
  deleteWorld: (id: string) => void;
  restoreWorld: (id: string) => void;
  duplicateWorld: (id: string) => string | null;
  toggleFavoriteWorld: (id: string) => void;
  toggleFavoriteMap: (id: string) => void;
  getWorldById: (id: string) => World | undefined;

  // Characters
  characters: Character[];
  addCharacter: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCharacter: (id: string, data: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  restoreCharacter: (id: string) => void;
  toggleFavoriteCharacter: (id: string) => void;
  getCharactersByWorld: (worldId: string) => Character[];
  getCharacterById: (id: string) => Character | undefined;

  // Scenes
  scenes: Scene[];
  addScene: (scene: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateScene: (id: string, data: Partial<Scene>) => void;
  deleteScene: (id: string) => void;
  restoreScene: (id: string) => void;
  toggleFavoriteScene: (id: string) => void;
  getScenesByWorld: (worldId: string) => Scene[];
  getSceneById: (id: string) => Scene | undefined;

  // Places
  places: Place[];
  addPlace: (place: Omit<Place, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePlace: (id: string, data: Partial<Place>) => void;
  deletePlace: (id: string) => void;
  restorePlace: (id: string) => void;
  toggleFavoritePlace: (id: string) => void;
  getPlacesByWorld: (worldId: string) => Place[];
  getPlaceById: (id: string) => Place | undefined;

  // Maps
  maps: MapData[];
  addMap: (map: Omit<MapData, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateMap: (id: string, data: Partial<MapData>) => void;
  deleteMap: (id: string) => void;
  getMapsByWorld: (worldId: string) => MapData[];

  // Plots
  plots: Plot[];
  addPlot: (plot: Omit<Plot, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePlot: (id: string, data: Partial<Plot>) => void;
  deletePlot: (id: string) => void;
  restorePlot: (id: string) => void;
  toggleFavoritePlot: (id: string) => void;
  getPlotsByWorld: (worldId: string) => Plot[];

  // Components
  components: Component[];
  addComponent: (component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateComponent: (id: string, data: Partial<Component>) => void;
  deleteComponent: (id: string) => void;
  restoreComponent: (id: string) => void;
  toggleFavoriteComponent: (id: string) => void;
  getComponentsByWorld: (worldId: string) => Component[];

  // Organizations
  organizations: Organization[];
  addOrganization: (organization: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateOrganization: (id: string, data: Partial<Organization>) => void;
  deleteOrganization: (id: string) => void;
  restoreOrganization: (id: string) => void;
  toggleFavoriteOrganization: (id: string) => void;
  getOrganizationsByWorld: (worldId: string) => Organization[];

  // Ideas
  ideas: Idea[];
  addIdea: (idea: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateIdea: (id: string, data: Partial<Idea>) => void;
  deleteIdea: (id: string) => void;
  restoreIdea: (id: string) => void;
  toggleFavoriteIdea: (id: string) => void;
  getIdeasByWorld: (worldId: string | null) => Idea[];

  // Timelines
  timelines: Timeline[];
  addTimeline: (timeline: Omit<Timeline, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTimeline: (id: string, data: Partial<Timeline>) => void;
  deleteTimeline: (id: string) => void;
  getTimelinesByWorld: (worldId: string) => Timeline[];

  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeSection: SectionType;
  setActiveSection: (section: SectionType) => void;

  // Trash
  getTrashItems: () => {
    characters: Character[];
    scenes: Scene[];
    places: Place[];
    plots: Plot[];
    components: Component[];
    organizations: Organization[];
    ideas: Idea[];
    worlds: World[];
  };
  emptyTrash: () => void;

  // Favorites
  getFavorites: () => {
    characters: Character[];
    scenes: Scene[];
    worlds: World[];
    places: Place[];
    plots: Plot[];
    components: Component[];
    organizations: Organization[];
    ideas: Idea[];
    maps: MapData[];
  };

  // Stats
  getStats: () => { totalWorlds: number; totalCharacters: number; totalScenes: number; totalIdeas: number };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),

      // Worlds
      worlds: [],
      addWorld: (world) => {
        const newWorld: World = {
          ...world,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDeleted: false,
        };
        set((state) => ({ worlds: [...state.worlds, newWorld] }));
        return newWorld.id;
      },
      updateWorld: (id, data) =>
        set((state) => ({
          worlds: state.worlds.map((w) => (w.id === id ? { ...w, ...data, updatedAt: new Date().toISOString() } : w)),
        })),
      deleteWorld: (id) =>
        set((state) => ({
          worlds: state.worlds.map((w) =>
            w.id === id ? { ...w, isDeleted: true, deletedAt: new Date().toISOString() } : w
          ),
          characters: state.characters.map((c) => c.worldId === id ? { ...c, isDeleted: true, deletedAt: new Date().toISOString() } : c),
          scenes: state.scenes.map((s) => s.worldId === id ? { ...s, isDeleted: true, deletedAt: new Date().toISOString() } : s),
          places: state.places.map((p) => p.worldId === id ? { ...p, isDeleted: true, deletedAt: new Date().toISOString() } : p),
          plots: state.plots.map((p) => p.worldId === id ? { ...p, isDeleted: true, deletedAt: new Date().toISOString() } : p),
          components: state.components.map((c) => c.worldId === id ? { ...c, isDeleted: true, deletedAt: new Date().toISOString() } : c),
          organizations: state.organizations.map((o) => o.worldId === id ? { ...o, isDeleted: true, deletedAt: new Date().toISOString() } : o),
          ideas: state.ideas.map((i) => i.worldId === id ? { ...i, worldId: null } : i),
          timelines: state.timelines.filter((t) => t.worldId !== id),
          maps: state.maps.filter((m) => m.worldId !== id),
        })),
      restoreWorld: (id) =>
        set((state) => ({
          worlds: state.worlds.map((w) => (w.id === id ? { ...w, isDeleted: false, deletedAt: undefined } : w)),
        })),
      duplicateWorld: (id) => {
        const w = get().worlds.find((x) => x.id === id);
        if (!w || w.isDeleted) return null;
        const nid = crypto.randomUUID();
        const copy: World = {
          ...w,
          id: nid,
          name: `${w.name} (copia)`,
          isFavorite: false,
          isPinned: false,
          isDeleted: false,
          deletedAt: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ worlds: [...state.worlds, copy] }));
        return nid;
      },
      toggleFavoriteWorld: (id) =>
        set((state) => ({
          worlds: state.worlds.map((w) => (w.id === id ? { ...w, isFavorite: !w.isFavorite } : w)),
        })),
      getWorldById: (id) => get().worlds.find((w) => w.id === id),
      toggleFavoriteMap: (id) =>
        set((state) => ({
          maps: state.maps.map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m)),
        })),

      // Characters
      characters: [],
      addCharacter: (character) => {
        const newCharacter: Character = {
          ...character,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ characters: [...state.characters, newCharacter] }));
      },
      updateCharacter: (id, data) =>
        set((state) => ({
          characters: state.characters.map((c) => (c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c)),
        })),
      deleteCharacter: (id) =>
        set((state) => ({
          characters: state.characters.map((c) => (c.id === id ? { ...c, isDeleted: true, deletedAt: new Date().toISOString() } : c)),
        })),
      restoreCharacter: (id) =>
        set((state) => ({
          characters: state.characters.map((c) => (c.id === id ? { ...c, isDeleted: false, deletedAt: undefined } : c)),
        })),
      toggleFavoriteCharacter: (id) =>
        set((state) => ({
          characters: state.characters.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c)),
        })),
      getCharactersByWorld: (worldId) => get().characters.filter((c) => c.worldId === worldId && !c.isDeleted),
      getCharacterById: (id) => get().characters.find((c) => c.id === id),

      // Scenes
      scenes: [],
      addScene: (scene) => {
        const newScene: Scene = {
          ...scene,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ scenes: [...state.scenes, newScene] }));
      },
      updateScene: (id, data) =>
        set((state) => ({
          scenes: state.scenes.map((s) => (s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s)),
        })),
      deleteScene: (id) =>
        set((state) => ({
          scenes: state.scenes.map((s) => (s.id === id ? { ...s, isDeleted: true, deletedAt: new Date().toISOString() } : s)),
        })),
      restoreScene: (id) =>
        set((state) => ({
          scenes: state.scenes.map((s) => (s.id === id ? { ...s, isDeleted: false, deletedAt: undefined } : s)),
        })),
      toggleFavoriteScene: (id) =>
        set((state) => ({
          scenes: state.scenes.map((s) => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s)),
        })),
      getScenesByWorld: (worldId) => get().scenes.filter((s) => s.worldId === worldId && !s.isDeleted),
      getSceneById: (id) => get().scenes.find((s) => s.id === id),

      // Places
      places: [],
      addPlace: (place) => {
        const newPlace: Place = {
          ...place,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ places: [...state.places, newPlace] }));
      },
      updatePlace: (id, data) =>
        set((state) => ({
          places: state.places.map((p) => (p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)),
        })),
      deletePlace: (id) =>
        set((state) => ({
          places: state.places.map((p) => (p.id === id ? { ...p, isDeleted: true, deletedAt: new Date().toISOString() } : p)),
        })),
      restorePlace: (id) =>
        set((state) => ({
          places: state.places.map((p) => (p.id === id ? { ...p, isDeleted: false, deletedAt: undefined } : p)),
        })),
      toggleFavoritePlace: (id) =>
        set((state) => ({
          places: state.places.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)),
        })),
      getPlacesByWorld: (worldId) => get().places.filter((p) => p.worldId === worldId && !p.isDeleted),
      getPlaceById: (id) => get().places.find((p) => p.id === id),

      // Maps
      maps: [],
      addMap: (map) => {
        const newMap: MapData = {
          ...map,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ maps: [...state.maps, newMap] }));
        return newMap.id;
      },
      updateMap: (id, data) =>
        set((state) => ({
          maps: state.maps.map((m) => (m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m)),
        })),
      deleteMap: (id) =>
        set((state) => ({ maps: state.maps.filter((m) => m.id !== id) })),
      getMapsByWorld: (worldId) => get().maps.filter((m) => m.worldId === worldId),

      // Plots
      plots: [],
      addPlot: (plot) => {
        const newPlot: Plot = {
          ...plot,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ plots: [...state.plots, newPlot] }));
      },
      updatePlot: (id, data) =>
        set((state) => ({
          plots: state.plots.map((p) => (p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)),
        })),
      deletePlot: (id) =>
        set((state) => ({
          plots: state.plots.map((p) => (p.id === id ? { ...p, isDeleted: true, deletedAt: new Date().toISOString() } : p)),
        })),
      restorePlot: (id) =>
        set((state) => ({
          plots: state.plots.map((p) => (p.id === id ? { ...p, isDeleted: false, deletedAt: undefined } : p)),
        })),
      toggleFavoritePlot: (id) =>
        set((state) => ({
          plots: state.plots.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)),
        })),
      getPlotsByWorld: (worldId) => get().plots.filter((p) => p.worldId === worldId && !p.isDeleted),

      // Components
      components: [],
      addComponent: (component) => {
        const newComponent: Component = {
          ...component,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ components: [...state.components, newComponent] }));
      },
      updateComponent: (id, data) =>
        set((state) => ({
          components: state.components.map((c) => (c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c)),
        })),
      deleteComponent: (id) =>
        set((state) => ({
          components: state.components.map((c) => (c.id === id ? { ...c, isDeleted: true, deletedAt: new Date().toISOString() } : c)),
        })),
      restoreComponent: (id) =>
        set((state) => ({
          components: state.components.map((c) => (c.id === id ? { ...c, isDeleted: false, deletedAt: undefined } : c)),
        })),
      toggleFavoriteComponent: (id) =>
        set((state) => ({
          components: state.components.map((c) => (c.id === id ? { ...c, isFavorite: !c.isFavorite } : c)),
        })),
      getComponentsByWorld: (worldId) => get().components.filter((c) => c.worldId === worldId && !c.isDeleted),

      // Organizations
      organizations: [],
      addOrganization: (organization) => {
        const newOrganization: Organization = {
          ...organization,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ organizations: [...state.organizations, newOrganization] }));
      },
      updateOrganization: (id, data) =>
        set((state) => ({
          organizations: state.organizations.map((o) => (o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o)),
        })),
      deleteOrganization: (id) =>
        set((state) => ({
          organizations: state.organizations.map((o) => (o.id === id ? { ...o, isDeleted: true, deletedAt: new Date().toISOString() } : o)),
        })),
      restoreOrganization: (id) =>
        set((state) => ({
          organizations: state.organizations.map((o) => (o.id === id ? { ...o, isDeleted: false, deletedAt: undefined } : o)),
        })),
      toggleFavoriteOrganization: (id) =>
        set((state) => ({
          organizations: state.organizations.map((o) => (o.id === id ? { ...o, isFavorite: !o.isFavorite } : o)),
        })),
      getOrganizationsByWorld: (worldId) => get().organizations.filter((o) => o.worldId === worldId && !o.isDeleted),

      // Ideas
      ideas: [],
      addIdea: (idea) => {
        const newIdea: Idea = {
          ...idea,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ ideas: [...state.ideas, newIdea] }));
      },
      updateIdea: (id, data) =>
        set((state) => ({
          ideas: state.ideas.map((i) => (i.id === id ? { ...i, ...data, updatedAt: new Date().toISOString() } : i)),
        })),
      deleteIdea: (id) =>
        set((state) => ({
          ideas: state.ideas.map((i) => (i.id === id ? { ...i, isDeleted: true, deletedAt: new Date().toISOString() } : i)),
        })),
      restoreIdea: (id) =>
        set((state) => ({
          ideas: state.ideas.map((i) => (i.id === id ? { ...i, isDeleted: false, deletedAt: undefined } : i)),
        })),
      toggleFavoriteIdea: (id) =>
        set((state) => ({
          ideas: state.ideas.map((i) => (i.id === id ? { ...i, isFavorite: !i.isFavorite } : i)),
        })),
      getIdeasByWorld: (worldId) => get().ideas.filter((i) => (worldId ? i.worldId === worldId : i.worldId === null) && !i.isDeleted),

      // Timelines
      timelines: [],
      addTimeline: (timeline) => {
        const newTimeline: Timeline = {
          ...timeline,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ timelines: [...state.timelines, newTimeline] }));
      },
      updateTimeline: (id, data) =>
        set((state) => ({
          timelines: state.timelines.map((t) => (t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t)),
        })),
      deleteTimeline: (id) =>
        set((state) => ({ timelines: state.timelines.filter((t) => t.id !== id) })),
      getTimelinesByWorld: (worldId) => get().timelines.filter((t) => t.worldId === worldId),

      // UI State
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      activeModal: null,
      setActiveModal: (modal) => set({ activeModal: modal }),
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      activeSection: 'characters',
      setActiveSection: (section) => set({ activeSection: section }),

      // Trash
      getTrashItems: () => {
        const state = get();
        return {
          worlds: state.worlds.filter((w) => w.isDeleted),
          characters: state.characters.filter((c) => c.isDeleted),
          scenes: state.scenes.filter((s) => s.isDeleted),
          places: state.places.filter((p) => p.isDeleted),
          plots: state.plots.filter((p) => p.isDeleted),
          components: state.components.filter((c) => c.isDeleted),
          organizations: state.organizations.filter((o) => o.isDeleted),
          ideas: state.ideas.filter((i) => i.isDeleted),
        };
      },
      emptyTrash: () =>
        set((state) => ({
          worlds: state.worlds.filter((w) => !w.isDeleted),
          characters: state.characters.filter((c) => !c.isDeleted),
          scenes: state.scenes.filter((s) => !s.isDeleted),
          places: state.places.filter((p) => !p.isDeleted),
          plots: state.plots.filter((p) => !p.isDeleted),
          components: state.components.filter((c) => !c.isDeleted),
          organizations: state.organizations.filter((o) => !o.isDeleted),
          ideas: state.ideas.filter((i) => !i.isDeleted),
        })),

      // Favorites
      getFavorites: () => {
        const state = get();
        const activeWorldIds = new Set(state.worlds.filter((w) => !w.isDeleted).map((w) => w.id));
        return {
          characters: state.characters.filter((c) => c.isFavorite && !c.isDeleted),
          scenes: state.scenes.filter((s) => s.isFavorite && !s.isDeleted),
          worlds: state.worlds.filter((w) => w.isFavorite && !w.isDeleted),
          places: state.places.filter((p) => p.isFavorite && !p.isDeleted),
          plots: state.plots.filter((p) => p.isFavorite && !p.isDeleted),
          components: state.components.filter((c) => c.isFavorite && !c.isDeleted),
          organizations: state.organizations.filter((o) => o.isFavorite && !o.isDeleted),
          ideas: state.ideas.filter((i) => i.isFavorite && !i.isDeleted),
          maps: state.maps.filter((m) => m.isFavorite && activeWorldIds.has(m.worldId)),
        };
      },

      // Stats
      getStats: () => {
        const state = get();
        return {
          totalWorlds: state.worlds.filter((w) => !w.isDeleted).length,
          totalCharacters: state.characters.filter((c) => !c.isDeleted).length,
          totalScenes: state.scenes.filter((s) => !s.isDeleted).length,
          totalIdeas: state.ideas.filter((i) => !i.isDeleted && !i.worldId).length,
        };
      },
    }),
    {
      name: 'story-table-storage',
      partialize: (state) => ({
        user: state.user,
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
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

/** Evita bucles infinitos cuando el selector devuelve arrays/objetos nuevos (.filter, etc.). */
export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(useShallow(selector));
}
