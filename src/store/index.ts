import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { TrashEntityType } from '@/lib/trashStorage';
import type { WorldScopedExport } from '@/lib/storyImportExport';
import { applyEmptyStorySlice } from '@/services/storyBundleSync';
import type {
  World,
  Character,
  Scene,
  Place,
  PlaceCollection,
  MapData,
  MapCollection,
  Plot,
  Component,
  Organization,
  House,
  WorldFact,
  WorldDatum,
  Idea,
  Timeline,
  FantasticElement,
  User,
  SectionType,
  WorldTag,
  EntityFolder,
  EntityFolderScope,
} from '@/types';
import { migrateLegacyCharacterFolders } from '@/lib/entityFolders';
import { captureNavigationReturn, pushInsertionPreviewHistory } from '@/lib/storyNavigation';
import {
  addChildRelationship,
  repairCharacterRelationships,
  syncAllRelationshipsFromCharacter,
  syncRelationshipChange,
  type AddChildOptions,
} from '@/lib/relationshipSync';
import { resolveTagNames } from '@/lib/worldTags';
import { worldInitialSectionConfig } from '@/lib/worldSections';
import { buildStateWithReplacedUrl } from '@/lib/storeUrlReferences';

export interface AppState {
  // Auth
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  replaceStorageUrlInStore: (oldUrl: string, newUrl: string) => void;

  // Worlds
  worlds: World[];
  addWorld: (world: Omit<World, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateWorld: (id: string, data: Partial<World>) => void;
  deleteWorld: (id: string) => void;
  restoreWorld: (id: string) => void;
  duplicateWorld: (id: string) => string | null;
  importWorld: (bundle: WorldScopedExport) => string;
  toggleFavoriteWorld: (id: string) => void;
  toggleFavoriteMap: (id: string) => void;
  getWorldById: (id: string) => World | undefined;

  // Characters
  characters: Character[];
  addCharacter: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCharacter: (id: string, data: Partial<Character>, options?: { syncRelationships?: boolean }) => void;
  deleteCharacter: (id: string) => void;
  syncCharacterRelationship: (
    sourceId: string,
    patch: {
      characterId: string;
      characterName: string;
      type: string;
      description?: string;
      action: 'add' | 'remove' | 'update';
      previousType?: string;
      inverseType?: string;
    }
  ) => void;
  syncChildRelationship: (parentId: string, childId: string, options: AddChildOptions) => void;
  repairWorldRelationships: (worldId: string) => number;
  restoreCharacter: (id: string) => void;
  toggleFavoriteCharacter: (id: string) => void;
  getCharactersByWorld: (worldId: string) => Character[];
  getCharacterById: (id: string) => Character | undefined;

  // World tags
  worldTags: WorldTag[];
  addWorldTag: (tag: Omit<WorldTag, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateWorldTag: (id: string, data: Partial<WorldTag>) => void;
  getWorldTagsByWorld: (worldId: string) => WorldTag[];

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

  // Elementos fantásticos
  fantasticElements: FantasticElement[];
  addFantasticElement: (el: Omit<FantasticElement, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateFantasticElement: (id: string, data: Partial<FantasticElement>) => void;
  deleteFantasticElement: (id: string) => void;
  restoreFantasticElement: (id: string) => void;
  toggleFavoriteFantasticElement: (id: string) => void;
  getFantasticElementsByWorld: (worldId: string) => FantasticElement[];

  // Houses
  houses: House[];
  addHouse: (house: Omit<House, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateHouse: (id: string, data: Partial<House>) => void;
  deleteHouse: (id: string) => void;
  getHousesByWorld: (worldId: string) => House[];

  // World facts (hechos)
  worldFacts: WorldFact[];
  addWorldFact: (fact: Omit<WorldFact, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateWorldFact: (id: string, data: Partial<WorldFact>) => void;
  deleteWorldFact: (id: string) => void;
  getWorldFactsByWorld: (worldId: string) => WorldFact[];

  // World data (datos)
  worldData: WorldDatum[];
  addWorldDatum: (datum: Omit<WorldDatum, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateWorldDatum: (id: string, data: Partial<WorldDatum>) => void;
  deleteWorldDatum: (id: string) => void;
  getWorldDataByWorld: (worldId: string) => WorldDatum[];

  // Place collections
  placeCollections: PlaceCollection[];
  addPlaceCollection: (c: Omit<PlaceCollection, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updatePlaceCollection: (id: string, data: Partial<PlaceCollection>) => void;
  deletePlaceCollection: (id: string) => void;
  getPlaceCollectionsByWorld: (worldId: string) => PlaceCollection[];

  // Map collections
  mapCollections: MapCollection[];
  addMapCollection: (c: Omit<MapCollection, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateMapCollection: (id: string, data: Partial<MapCollection>) => void;
  deleteMapCollection: (id: string) => void;
  getMapCollectionsByWorld: (worldId: string) => MapCollection[];

  /** Orden manual de personajes por mundo. */
  characterOrderByWorld: Record<string, string[]>;
  setCharacterOrder: (worldId: string, ids: string[]) => void;

  /** Carpetas manuales por sección y mundo (personajes, escenas, etc.). */
  entityFolders: EntityFolder[];
  addEntityFolder: (folder: Omit<EntityFolder, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateEntityFolder: (id: string, data: Partial<EntityFolder>) => void;
  deleteEntityFolder: (id: string) => void;
  getEntityFoldersByWorld: (worldId: string, scope: EntityFolderScope) => EntityFolder[];
  addItemToFolder: (folderId: string, itemId: string) => void;
  removeItemFromFolder: (folderId: string, itemId: string) => void;

  /** Puente temporal para acciones de carpeta desde el menú contextual global. */
  folderSectionBridge: import('@/lib/folderSectionBridge').FolderSectionBridge | null;
  setFolderSectionBridge: (bridge: import('@/lib/folderSectionBridge').FolderSectionBridge | null) => void;

  /** Auto-guardado en Firebase (persistido). */
  firebaseAutoSaveEnabled: boolean;
  setFirebaseAutoSaveEnabled: (enabled: boolean) => void;
  /** Indicador visual: subida a Firebase en curso. */
  firebaseAutoSaveSyncing: boolean;
  setFirebaseAutoSaveSyncing: (syncing: boolean) => void;

  /** Sincronización inicial de biblioteca desde Firebase. */
  storyDataLoading: boolean;
  setStoryDataLoading: (loading: boolean) => void;
  /** Huella del último guardado exitoso en Firebase (evita pisar cambios locales al recargar). */
  lastFirebaseSyncFingerprint: string | null;
  setLastFirebaseSyncFingerprint: (fp: string | null) => void;

  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  /** Vista previa de inserción (componente, idea, etc.) sin cambiar de página. */
  insertionPreview: { worldId: string; type: string; id: string } | null;
  openInsertionPreview: (
    worldId: string,
    type: string,
    id: string,
    returnTo?: import('@/hooks/useNavigationReturn').NavigationReturnState
  ) => void;
  closeInsertionPreview: () => void;
  entityEditRequest: { worldId: string; type: string; id: string } | null;
  requestEntityEdit: (worldId: string, type: string, id: string) => void;
  clearEntityEditRequest: () => void;
  entityViewRequest: { worldId: string; type: string; id: string } | null;
  requestEntityView: (worldId: string, type: string, id: string) => void;
  clearEntityViewRequest: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeSection: SectionType;
  setActiveSection: (section: SectionType) => void;

  /** Orden manual de mundos en el tablero (ids). Vacío = orden por fecha de actualización. */
  dashboardWorldIds: string[];
  setDashboardWorldOrder: (ids: string[]) => void;
  shiftDashboardWorld: (worldId: string, direction: -1 | 1) => void;

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
  permanentlyDeleteTrashItem: (type: TrashEntityType, id: string) => void;

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
      logout: () => {
        applyEmptyStorySlice();
        set({ user: null });
      },
      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),
      replaceStorageUrlInStore: (oldUrl, newUrl) =>
        set((state) => ({
          ...buildStateWithReplacedUrl(state, oldUrl, newUrl),
        })),

      // Worlds
      worlds: [],
      addWorld: (world) => {
        const sectionDefaults =
          world.enabledSections?.length || world.sectionOrder?.length
            ? {}
            : worldInitialSectionConfig();
        const newWorld: World = {
          ...world,
          ...sectionDefaults,
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
      deleteWorld: (id) => {
        const now = new Date().toISOString();
        const markDeleted = <T extends { isDeleted?: boolean; deletedAt?: string }>(item: T): T => ({
          ...item,
          isDeleted: true,
          deletedAt: now,
        });
        set((state) => ({
          worlds: state.worlds.map((w) => (w.id === id ? markDeleted(w) : w)),
          characters: state.characters.map((c) => (c.worldId === id ? markDeleted(c) : c)),
          scenes: state.scenes.map((s) => (s.worldId === id ? markDeleted(s) : s)),
          places: state.places.map((p) => (p.worldId === id ? markDeleted(p) : p)),
          plots: state.plots.map((p) => (p.worldId === id ? markDeleted(p) : p)),
          components: state.components.map((c) => (c.worldId === id ? markDeleted(c) : c)),
          organizations: state.organizations.map((o) => (o.worldId === id ? markDeleted(o) : o)),
          ideas: state.ideas.map((i) => (i.worldId === id ? markDeleted(i) : i)),
          maps: state.maps.map((m) => (m.worldId === id ? markDeleted(m) : m)),
          timelines: state.timelines.map((t) => (t.worldId === id ? markDeleted(t) : t)),
          houses: state.houses.map((h) => (h.worldId === id ? markDeleted(h) : h)),
          worldFacts: state.worldFacts.map((f) => (f.worldId === id ? markDeleted(f) : f)),
          worldData: state.worldData.map((d) => (d.worldId === id ? markDeleted(d) : d)),
          placeCollections: state.placeCollections.map((c) => (c.worldId === id ? markDeleted(c) : c)),
          mapCollections: state.mapCollections.map((c) => (c.worldId === id ? markDeleted(c) : c)),
          fantasticElements: state.fantasticElements.map((f) => (f.worldId === id ? markDeleted(f) : f)),
        }));
      },
      restoreWorld: (id) =>
        set((state) => {
          const clearDeleted = <T extends { isDeleted?: boolean; deletedAt?: string }>(item: T): T => ({
            ...item,
            isDeleted: false,
            deletedAt: undefined,
          });
          return {
            worlds: state.worlds.map((w) => (w.id === id ? clearDeleted(w) : w)),
            characters: state.characters.map((c) => (c.worldId === id ? clearDeleted(c) : c)),
            scenes: state.scenes.map((s) => (s.worldId === id ? clearDeleted(s) : s)),
            places: state.places.map((p) => (p.worldId === id ? clearDeleted(p) : p)),
            plots: state.plots.map((p) => (p.worldId === id ? clearDeleted(p) : p)),
            components: state.components.map((c) => (c.worldId === id ? clearDeleted(c) : c)),
            organizations: state.organizations.map((o) => (o.worldId === id ? clearDeleted(o) : o)),
            ideas: state.ideas.map((i) => (i.worldId === id ? clearDeleted(i) : i)),
            maps: state.maps.map((m) => (m.worldId === id ? clearDeleted(m) : m)),
            timelines: state.timelines.map((t) => (t.worldId === id ? clearDeleted(t) : t)),
            houses: state.houses.map((h) => (h.worldId === id ? clearDeleted(h) : h)),
            worldFacts: state.worldFacts.map((f) => (f.worldId === id ? clearDeleted(f) : f)),
            worldData: state.worldData.map((d) => (d.worldId === id ? clearDeleted(d) : d)),
            placeCollections: state.placeCollections.map((c) => (c.worldId === id ? clearDeleted(c) : c)),
            mapCollections: state.mapCollections.map((c) => (c.worldId === id ? clearDeleted(c) : c)),
            fantasticElements: state.fantasticElements.map((f) => (f.worldId === id ? clearDeleted(f) : f)),
          };
        }),
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
      importWorld: (bundle) => {
        const w = bundle.world;
        set((state) => ({
          worlds: [...state.worlds, w],
          characters: [...state.characters, ...bundle.characters],
          scenes: [...state.scenes, ...bundle.scenes],
          places: [...state.places, ...bundle.places],
          maps: [...state.maps, ...bundle.maps],
          plots: [...state.plots, ...bundle.plots],
          components: [...state.components, ...bundle.components],
          organizations: [...state.organizations, ...bundle.organizations],
          ideas: [...state.ideas, ...bundle.ideas],
          timelines: [...state.timelines, ...bundle.timelines],
          houses: [...state.houses, ...(bundle.houses ?? [])],
          worldFacts: [...state.worldFacts, ...(bundle.worldFacts ?? [])],
          worldData: [...state.worldData, ...(bundle.worldData ?? [])],
          placeCollections: [...state.placeCollections, ...(bundle.placeCollections ?? [])],
          mapCollections: [...state.mapCollections, ...(bundle.mapCollections ?? [])],
          fantasticElements: [...state.fantasticElements, ...(bundle.fantasticElements ?? [])],
          worldTags: [...state.worldTags, ...(bundle.worldTags ?? [])],
          entityFolders: [...state.entityFolders, ...(bundle.entityFolders ?? [])],
          characterOrderByWorld: {
            ...state.characterOrderByWorld,
            [w.id]: bundle.characterOrder ?? [],
          },
        }));
        return w.id;
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
      updateCharacter: (id, data, options) => {
        const syncRelationships = options?.syncRelationships ?? Boolean(data.relationships);
        set((state) => {
          const chars = state.characters;
          const current = chars.find((c) => c.id === id);
          if (!current) return state;

          let nextChars = chars;
          if (syncRelationships && data.relationships) {
            const merged: Character = {
              ...current,
              ...data,
              relationships: data.relationships,
            } as Character;
            const batch = syncAllRelationshipsFromCharacter(chars, merged);
            nextChars = chars.map((c) => {
              const patch = batch.get(c.id);
              return patch ? ({ ...c, ...patch } as Character) : c;
            });
          } else {
            nextChars = chars.map((c) =>
              c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
            );
          }

          const worldTags = state.worldTags;
          nextChars = nextChars.map((c) => {
            if (c.tagIds?.length) {
              return { ...c, tags: resolveTagNames(c.tagIds, worldTags) };
            }
            return c;
          });

          return { characters: nextChars };
        });
      },
      syncCharacterRelationship: (sourceId, patch) =>
        set((state) => {
          const batch = syncRelationshipChange(state.characters, sourceId, {
            ...patch,
            action: patch.action,
          });
          const characters = state.characters.map((c) => {
            const p = batch.get(c.id);
            return p ? ({ ...c, ...p } as Character) : c;
          });
          return { characters };
        }),
      syncChildRelationship: (parentId, childId, options) =>
        set((state) => {
          const batch = addChildRelationship(state.characters, parentId, childId, options);
          const characters = state.characters.map((c) => {
            const p = batch.get(c.id);
            return p ? ({ ...c, ...p } as Character) : c;
          });
          return { characters };
        }),
      repairWorldRelationships: (worldId) => {
        const worldChars = get().characters.filter((c) => c.worldId === worldId && !c.isDeleted);
        const batch = repairCharacterRelationships(worldChars);
        if (batch.size === 0) return 0;
        set((state) => ({
          characters: state.characters.map((c) => {
            const p = batch.get(c.id);
            return p ? ({ ...c, ...p } as Character) : c;
          }),
        }));
        return batch.size;
      },
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
      getCharactersByWorld: (worldId) => {
        const list = get().characters.filter((c) => c.worldId === worldId && !c.isDeleted);
        const order = get().characterOrderByWorld[worldId];
        if (!order?.length) return list;
        const rank = new Map(order.map((id, i) => [id, i]));
        return [...list].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
      },
      getCharacterById: (id) => get().characters.find((c) => c.id === id),

      worldTags: [],
      addWorldTag: (tag) => {
        const newTag: WorldTag = {
          ...tag,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ worldTags: [...state.worldTags, newTag] }));
        return newTag.id;
      },
      updateWorldTag: (id, data) =>
        set((state) => ({
          worldTags: state.worldTags.map((t) =>
            t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t
          ),
        })),
      getWorldTagsByWorld: (worldId) => get().worldTags.filter((t) => t.worldId === worldId),

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
      getMapsByWorld: (worldId) => get().maps.filter((m) => m.worldId === worldId && !m.isDeleted),

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
      getTimelinesByWorld: (worldId) =>
        get()
          .timelines.filter((t) => t.worldId === worldId && !t.isDeleted)
          .sort((a, b) => a.order - b.order),

      fantasticElements: [],
      addFantasticElement: (el) => {
        const item: FantasticElement = {
          ...el,
          id: crypto.randomUUID(),
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ fantasticElements: [...state.fantasticElements, item] }));
      },
      updateFantasticElement: (id, data) =>
        set((state) => ({
          fantasticElements: state.fantasticElements.map((f) =>
            f.id === id ? { ...f, ...data, updatedAt: new Date().toISOString() } : f
          ),
        })),
      deleteFantasticElement: (id) =>
        set((state) => ({
          fantasticElements: state.fantasticElements.map((f) =>
            f.id === id ? { ...f, isDeleted: true, deletedAt: new Date().toISOString() } : f
          ),
        })),
      restoreFantasticElement: (id) =>
        set((state) => ({
          fantasticElements: state.fantasticElements.map((f) =>
            f.id === id ? { ...f, isDeleted: false, deletedAt: undefined } : f
          ),
        })),
      toggleFavoriteFantasticElement: (id) =>
        set((state) => ({
          fantasticElements: state.fantasticElements.map((f) =>
            f.id === id ? { ...f, isFavorite: !f.isFavorite } : f
          ),
        })),
      getFantasticElementsByWorld: (worldId) =>
        get().fantasticElements.filter((f) => f.worldId === worldId && !f.isDeleted),

      houses: [],
      addHouse: (house) => {
        const h: House = {
          ...house,
          members: house.members ?? [],
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ houses: [...state.houses, h] }));
        return h.id;
      },
      updateHouse: (id, data) =>
        set((state) => ({
          houses: state.houses.map((h) => (h.id === id ? { ...h, ...data, updatedAt: new Date().toISOString() } : h)),
        })),
      deleteHouse: (id) =>
        set((state) => ({
          houses: state.houses.map((h) => (h.id === id ? { ...h, isDeleted: true, deletedAt: new Date().toISOString() } : h)),
        })),
      getHousesByWorld: (worldId) =>
        get()
          .houses.filter((h) => h.worldId === worldId && !h.isDeleted)
          .sort((a, b) => b.influenceLevel - a.influenceLevel),

      worldFacts: [],
      addWorldFact: (fact) => {
        const f: WorldFact = { ...fact, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        set((state) => ({ worldFacts: [...state.worldFacts, f] }));
      },
      updateWorldFact: (id, data) =>
        set((state) => ({
          worldFacts: state.worldFacts.map((f) => (f.id === id ? { ...f, ...data, updatedAt: new Date().toISOString() } : f)),
        })),
      deleteWorldFact: (id) =>
        set((state) => ({
          worldFacts: state.worldFacts.map((f) => (f.id === id ? { ...f, isDeleted: true, deletedAt: new Date().toISOString() } : f)),
        })),
      getWorldFactsByWorld: (worldId) => get().worldFacts.filter((f) => f.worldId === worldId && !f.isDeleted),

      worldData: [],
      addWorldDatum: (datum) => {
        const d: WorldDatum = { ...datum, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        set((state) => ({ worldData: [...state.worldData, d] }));
      },
      updateWorldDatum: (id, data) =>
        set((state) => ({
          worldData: state.worldData.map((d) => (d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d)),
        })),
      deleteWorldDatum: (id) =>
        set((state) => ({
          worldData: state.worldData.map((d) => (d.id === id ? { ...d, isDeleted: true, deletedAt: new Date().toISOString() } : d)),
        })),
      getWorldDataByWorld: (worldId) => get().worldData.filter((d) => d.worldId === worldId && !d.isDeleted),

      placeCollections: [],
      addPlaceCollection: (c) => {
        const col: PlaceCollection = { ...c, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        set((state) => ({ placeCollections: [...state.placeCollections, col] }));
        return col.id;
      },
      updatePlaceCollection: (id, data) =>
        set((state) => ({
          placeCollections: state.placeCollections.map((c) =>
            c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
          ),
        })),
      deletePlaceCollection: (id) =>
        set((state) => ({
          placeCollections: state.placeCollections.map((c) =>
            c.id === id ? { ...c, isDeleted: true, deletedAt: new Date().toISOString() } : c
          ),
        })),
      getPlaceCollectionsByWorld: (worldId) => get().placeCollections.filter((c) => c.worldId === worldId && !c.isDeleted),

      mapCollections: [],
      addMapCollection: (c) => {
        const col: MapCollection = { ...c, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        set((state) => ({ mapCollections: [...state.mapCollections, col] }));
        return col.id;
      },
      updateMapCollection: (id, data) =>
        set((state) => ({
          mapCollections: state.mapCollections.map((c) =>
            c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
          ),
        })),
      deleteMapCollection: (id) => set((state) => ({ mapCollections: state.mapCollections.filter((c) => c.id !== id) })),
      getMapCollectionsByWorld: (worldId) => get().mapCollections.filter((c) => c.worldId === worldId && !c.isDeleted),

      characterOrderByWorld: {},
      setCharacterOrder: (worldId, ids) =>
        set((state) => ({ characterOrderByWorld: { ...state.characterOrderByWorld, [worldId]: ids } })),

      entityFolders: [],
      addEntityFolder: (folder) => {
        const item: EntityFolder = {
          ...folder,
          id: crypto.randomUUID(),
          parentFolderId: folder.parentFolderId ?? null,
          itemIds: folder.itemIds ?? [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ entityFolders: [...state.entityFolders, item] }));
        return item.id;
      },
      updateEntityFolder: (id, data) =>
        set((state) => ({
          entityFolders: state.entityFolders.map((f) =>
            f.id === id ? { ...f, ...data, updatedAt: new Date().toISOString() } : f
          ),
        })),
      deleteEntityFolder: (id) =>
        set((state) => {
          const collect = (folderId: string, acc: Set<string>) => {
            acc.add(folderId);
            state.entityFolders.filter((f) => f.parentFolderId === folderId).forEach((c) => collect(c.id, acc));
            return acc;
          };
          const removeIds = collect(id, new Set<string>());
          return { entityFolders: state.entityFolders.filter((f) => !removeIds.has(f.id)) };
        }),
      getEntityFoldersByWorld: (worldId, scope) =>
        get().entityFolders.filter((f) => f.worldId === worldId && f.scope === scope),
      addItemToFolder: (folderId, itemId) =>
        set((state) => ({
          entityFolders: state.entityFolders.map((f) =>
            f.id === folderId && !f.itemIds.includes(itemId)
              ? { ...f, itemIds: [...f.itemIds, itemId], updatedAt: new Date().toISOString() }
              : f
          ),
        })),
      removeItemFromFolder: (folderId, itemId) =>
        set((state) => ({
          entityFolders: state.entityFolders.map((f) =>
            f.id === folderId
              ? {
                  ...f,
                  itemIds: f.itemIds.filter((cid) => cid !== itemId),
                  updatedAt: new Date().toISOString(),
                }
              : f
          ),
        })),

      folderSectionBridge: null,
      setFolderSectionBridge: (bridge) => set({ folderSectionBridge: bridge }),

      firebaseAutoSaveEnabled: true,
      setFirebaseAutoSaveEnabled: (enabled) => set({ firebaseAutoSaveEnabled: enabled }),
      firebaseAutoSaveSyncing: false,
      setFirebaseAutoSaveSyncing: (syncing) => set({ firebaseAutoSaveSyncing: syncing }),

      storyDataLoading: false,
      setStoryDataLoading: (loading) => set({ storyDataLoading: loading }),
      lastFirebaseSyncFingerprint: null,
      setLastFirebaseSyncFingerprint: (fp) => set({ lastFirebaseSyncFingerprint: fp }),

      // UI State
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      activeModal: null,
      setActiveModal: (modal) => set({ activeModal: modal }),
      insertionPreview: null,
      openInsertionPreview: (worldId, type, id, returnTo) => {
        const ret = returnTo ?? captureNavigationReturn();
        pushInsertionPreviewHistory({ worldId, type, id }, ret);
        set({ insertionPreview: { worldId, type, id } });
      },
      closeInsertionPreview: () => {
        if (window.history.state?.overlay === 'insertion-preview') {
          window.history.back();
          return;
        }
        set({ insertionPreview: null });
      },
      entityEditRequest: null,
      requestEntityEdit: (worldId, type, id) => set({ entityEditRequest: { worldId, type, id } }),
      clearEntityEditRequest: () => set({ entityEditRequest: null }),
      entityViewRequest: null,
      requestEntityView: (worldId, type, id) => set({ entityViewRequest: { worldId, type, id } }),
      clearEntityViewRequest: () => set({ entityViewRequest: null }),
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      activeSection: 'characters',
      setActiveSection: (section) => set({ activeSection: section }),

      dashboardWorldIds: [],
      setDashboardWorldOrder: (ids) => set({ dashboardWorldIds: ids }),
      shiftDashboardWorld: (worldId, direction) =>
        set((state) => {
          const active = state.worlds.filter((w) => !w.isDeleted);
          const activeIds = active.map((w) => w.id);
          let order = state.dashboardWorldIds.filter((id) => activeIds.includes(id));
          for (const id of activeIds) {
            if (!order.includes(id)) order.push(id);
          }
          const idx = order.indexOf(worldId);
          if (idx < 0) return state;
          const ni = idx + direction;
          if (ni < 0 || ni >= order.length) return state;
          const next = [...order];
          [next[idx], next[ni]] = [next[ni]!, next[idx]!];
          return { dashboardWorldIds: next };
        }),

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
      permanentlyDeleteTrashItem: (type, id) =>
        set((state) => {
          const remove = <T extends { id: string; isDeleted?: boolean }>(arr: T[]) =>
            arr.filter((x) => !(x.id === id && x.isDeleted));
          switch (type) {
            case 'world':
              return {
                worlds: remove(state.worlds),
                characters: state.characters.filter((c) => c.worldId !== id),
                scenes: state.scenes.filter((s) => s.worldId !== id),
                places: state.places.filter((p) => p.worldId !== id),
                plots: state.plots.filter((p) => p.worldId !== id),
                components: state.components.filter((c) => c.worldId !== id),
                organizations: state.organizations.filter((o) => o.worldId !== id),
                maps: state.maps.filter((m) => m.worldId !== id),
                timelines: state.timelines.filter((t) => t.worldId !== id),
                houses: state.houses.filter((h) => h.worldId !== id),
                worldFacts: state.worldFacts.filter((f) => f.worldId !== id),
                worldData: state.worldData.filter((d) => d.worldId !== id),
                placeCollections: state.placeCollections.filter((c) => c.worldId !== id),
                mapCollections: state.mapCollections.filter((c) => c.worldId !== id),
                fantasticElements: state.fantasticElements.filter((f) => f.worldId !== id),
                worldTags: state.worldTags.filter((t) => t.worldId !== id),
                entityFolders: state.entityFolders.filter((f) => f.worldId !== id),
                ideas: state.ideas.filter((i) => i.worldId !== id),
                characterOrderByWorld: Object.fromEntries(
                  Object.entries(state.characterOrderByWorld).filter(([wid]) => wid !== id)
                ),
              };
            case 'character':
              return { characters: remove(state.characters) };
            case 'scene':
              return { scenes: remove(state.scenes) };
            case 'place':
              return { places: remove(state.places) };
            case 'plot':
              return { plots: remove(state.plots) };
            case 'component':
              return { components: remove(state.components) };
            case 'organization':
              return { organizations: remove(state.organizations) };
            case 'idea':
              return { ideas: remove(state.ideas) };
            default:
              return state;
          }
        }),

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
        fantasticElements: state.fantasticElements,
        houses: state.houses,
        worldFacts: state.worldFacts,
        worldData: state.worldData,
        placeCollections: state.placeCollections,
        mapCollections: state.mapCollections,
        worldTags: state.worldTags,
        entityFolders: state.entityFolders,
        characterOrderByWorld: state.characterOrderByWorld,
        firebaseAutoSaveEnabled: state.firebaseAutoSaveEnabled,
        lastFirebaseSyncFingerprint: state.lastFirebaseSyncFingerprint,
        sidebarOpen: state.sidebarOpen,
        dashboardWorldIds: state.dashboardWorldIds,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        const cur = current as AppState;
        let entityFolders = (p.entityFolders as EntityFolder[] | undefined) ?? cur.entityFolders ?? [];
        if (!entityFolders.length && Array.isArray(p.characterFolders)) {
          entityFolders = migrateLegacyCharacterFolders(
            p.characterFolders as Array<{
              id: string;
              worldId: string;
              name: string;
              characterIds?: string[];
              createdAt: string;
              updatedAt: string;
            }>
          );
        }
        return { ...cur, ...p, entityFolders };
      },
    }
  )
);

/** Evita bucles infinitos cuando el selector devuelve arrays/objetos nuevos (.filter, etc.). */
export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(useShallow(selector));
}
