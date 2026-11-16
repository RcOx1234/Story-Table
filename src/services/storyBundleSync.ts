import { resolveReviewedConflict, sameReviewContent } from '@/lib/conflictResolution';
import type { Choice } from '@/lib/conflictReview';
import { cloudConflictReview, isStoryConflict } from '@/services/cloudConflictReview';
import { formatSaveFailure } from '@/lib/saveFailure';
import { useStore } from '@/store';
import { auth } from '@/lib/firebase';
import { createSnapshotSaveQueue } from '@/lib/snapshotSaveQueue';
import { saveLibraryToFirestore, loadLibraryFromFirestore, forgetLibraryVersion } from '@/services/libraryFirestoreService';
import type { AppState } from '@/store';
import { storyContentFingerprint } from '@/lib/storyFingerprint';

const PERSIST_STORAGE_KEY = 'story-table-cloud-preview-v1';

let lastHydratedUid: string | null = null;
let hydrateInFlight: Promise<void> | null = null;
let hydrateInFlightUid: string | null = null;



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
  cloudConflictReview.clear();
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

const saveSnapshot = createSnapshotSaveQueue<StorySlice>({
  read: getStorySlice,
  write: (uid, snapshot) => {
    if (cloudConflictReview.getSnapshot()?.ownerId === uid) throw new Error('Hay una revisión pendiente.');
    return saveLibraryToFirestore(uid, snapshot as unknown as Record<string, unknown>);
  },
  acknowledge: (snapshot) => {
    useStore.getState().setLastFirebaseSyncFingerprint(fingerprintFromSlice(snapshot));
    useStore.setState({ firebaseSyncError: null });
  },
  isOwnerActive: (uid) => auth?.currentUser?.uid === uid,
});


export async function pushStoryBundle(uid: string): Promise<void> {
  if (cloudConflictReview.getSnapshot()?.ownerId === uid) {
    throw new Error('Hay una revisión de conflicto pendiente. No se enviaron cambios nuevos.');
  }
  try {
    await saveSnapshot(uid);
  } catch (error) {
    const active=()=>auth?.currentUser?.uid===uid&&useStore.getState().user?.id===uid;
    if(active()) {
      useStore.setState({firebaseSyncError:formatSaveFailure(error)});
      if(isStoryConflict(error)) {
        try {
          await cloudConflictReview.capture(uid,
            ()=>getStorySlice() as unknown as Record<string,unknown>,
            async()=> {
              const remote=await loadLibraryFromFirestore(uid,{establishBaseline:false});
              if(!remote) throw new Error('No hay una copia remota disponible para comparar.');
              return remote;
            },active);
        } catch {
          if(active()) useStore.setState({firebaseSyncError:'Se detectó un conflicto, pero no se pudo leer la copia remota. Tus cambios no fueron reemplazados. Conserva una copia local y vuelve a intentar cuando haya conexión.'});
        }
      }
    }
    throw error;
  }
}

/** Carga la biblioteca desde Firebase; muestra splash mientras tanto. */
export async function hydrateStoryBundleFromFirebase(uid: string): Promise<void> {
  if (hydrateInFlight && hydrateInFlightUid === uid) return hydrateInFlight;
  hydrateInFlightUid = uid;
  forgetLibraryVersion(uid);
  hydrateInFlight = (async () => {
    useStore.getState().setStoryDataLoading(true);
    useStore.setState({ firebaseSyncError: null });
    try {
      await waitForStoreRehydration();
      if (auth?.currentUser?.uid !== uid) return;
      if (lastHydratedUid != null && lastHydratedUid !== uid) {
        throw new Error('Cambio de cuenta: conserva la copia local antes de cargar otra biblioteca.');
      }
      lastHydratedUid = uid;
      const fromMemory = getStorySlice();
      const fromStorage = readPersistedStorySlice();
      const local = pickRicherSlice(fromMemory, fromStorage ?? fromMemory);
      const localFingerprint = fingerprintFromSlice(local);
      const startFingerprint = fingerprintFromSlice(fromMemory);
      const lastSynced = useStore.getState().lastFirebaseSyncFingerprint;
      const pending = lastSynced !== localFingerprint &&
        (lastSynced != null || sliceHasContent(local));
      const remote = await loadLibraryFromFirestore(uid);
      if (auth?.currentUser?.uid !== uid) { forgetLibraryVersion(uid); return; }
      if (fingerprintFromSlice(getStorySlice()) !== startFingerprint) {
        forgetLibraryVersion(uid);
        throw new Error('Hay ediciones realizadas durante la carga. Se conservan pendientes; guarda una copia local.');
      }
      if (pending || (!remote && sliceHasContent(local))) {
        const same = remote && localFingerprint === fingerprintFromSlice(remote as unknown as StorySlice);
        if (!same) {
          forgetLibraryVersion(uid);
          // Do not temporarily apply remote data: persistence would erase pending local edits.
          if (!sliceHasContent(fromMemory) && sliceHasContent(local)) applyStorySlice(local as unknown as Record<string, unknown>);
          throw new Error('Hay cambios locales pendientes y una copia remota diferente. No se reemplazó ni se envió ninguna copia. Descarga tu copia local antes de resolver el conflicto.');
        }
      }
      if (remote) applyStorySlice(remote);
      markStoryBundleSynced();
    } catch (error) {
      forgetLibraryVersion(uid);
      if (auth?.currentUser?.uid === uid) useStore.setState({
        firebaseSyncError: error instanceof Error ? error.message : 'No se pudo cargar la nube. Tus cambios locales siguen pendientes.',
      });
    } finally {
      if (hydrateInFlightUid === uid) {
        useStore.getState().setStoryDataLoading(false);
        hydrateInFlight = null;
        hydrateInFlightUid = null;
      }
    }
  })();
  return hydrateInFlight;
}

export async function pullStoryBundle(uid: string): Promise<boolean> {
  const before = fingerprintFromSlice(getStorySlice());
  const synced = useStore.getState().lastFirebaseSyncFingerprint;
  if (before !== synced && (synced != null || sliceHasContent(getStorySlice()))) {
    throw new Error('Hay cambios locales pendientes. Guarda una copia antes de cargar desde la nube.');
  }
  const data = await loadLibraryFromFirestore(uid);
  if (auth?.currentUser?.uid !== uid || before !== fingerprintFromSlice(getStorySlice())) {
    forgetLibraryVersion(uid);
    throw new Error('La sesión o los datos locales cambiaron durante la carga.');
  }
  if (!data || !Array.isArray(data.worlds)) return false;
  applyStorySlice(data);
  markStoryBundleSynced();
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


function preserveConflictArchive(uid:string,archive:unknown):void {
  const key='storytable-conflict-backup-v1:'+uid+':'+crypto.randomUUID();
  const raw=JSON.stringify({ownerId:uid,archive});
  try {
    localStorage.setItem(key,raw);
    if(localStorage.getItem(key)!==raw) throw Error('No se verificó la copia.');
  } catch {
    throw Error('No hay espacio o acceso para conservar la copia de seguridad local. Descarga ambas originales; no se aplicó la revisión.');
  }
}

export async function resolveCloudConflict(uid:string,id:number,choices:Record<string,Choice>):Promise<void> {
  const submitted=structuredClone(choices);
  return saveSnapshot.runExclusive(async()=>{
    const session=cloudConflictReview.getSnapshot();
    if(!session||session.id!==id||session.ownerId!==uid) throw Error('La revisión cambió. Vuelve a abrirla.');
    const active=()=>auth?.currentUser?.uid===uid&&useStore.getState().user?.id===uid&&cloudConflictReview.getSnapshot()===session;
    try {
      await resolveReviewedConflict({
        local:JSON.parse(JSON.stringify(session.local)),remote:JSON.parse(JSON.stringify(session.remote)),choices:submitted,isActive:active,
        readLocal:()=>JSON.parse(JSON.stringify(getStorySlice())),
        readRemote:async()=>{
          const remote=await loadLibraryFromFirestore(uid);
          if(!remote) throw Error('La copia remota ya no está disponible. No se aplicó la revisión.');
          return remote;
        },
        backup:async archive=>preserveConflictArchive(uid,archive),
        apply:proposal=>{applyStorySlice(proposal);useStore.setState({firebaseSyncError:'Versión revisada pendiente de confirmación en la nube.'});},
        write:proposal=>saveLibraryToFirestore(uid,proposal,{reviewedReplacement:true}),
        acknowledge:proposal=>{
          useStore.getState().setLastFirebaseSyncFingerprint(fingerprintFromSlice(proposal as unknown as StorySlice));
          useStore.setState({firebaseSyncError:null});
          cloudConflictReview.clear();
        },
      });
    } catch(error) {
      forgetLibraryVersion(uid);
      if(auth?.currentUser?.uid===uid) useStore.setState({firebaseSyncError:formatSaveFailure(error)});
      throw error;
    }
  });
}

export async function refreshCloudConflict(uid:string,id:number):Promise<void> {
  return saveSnapshot.runExclusive(async()=>{
    const session=cloudConflictReview.getSnapshot();
    if(!session||session.id!==id||session.ownerId!==uid) throw Error('La revisión cambió.');
    const active=()=>auth?.currentUser?.uid===uid&&useStore.getState().user?.id===uid;
    if(!active()) throw Error('La sesión cambió.');
    const local=JSON.parse(JSON.stringify(getStorySlice()));
    const remote=await loadLibraryFromFirestore(uid,{establishBaseline:false});
    if(!active()||cloudConflictReview.getSnapshot()!==session) throw Error('La sesión o revisión cambió.');
    if(!sameReviewContent(local,JSON.parse(JSON.stringify(getStorySlice())))) throw Error('Hay ediciones nuevas. Vuelve a actualizar la revisión.');
    if(!remote) throw Error('No se pudo obtener la copia de la nube.');
    preserveConflictArchive(uid,{format:'storytable-review-refresh-v1',previous:session,currentLocal:local,currentRemote:remote});
    cloudConflictReview.clear();
    await cloudConflictReview.capture(uid,()=>local,async()=>remote,active);
  });
}
