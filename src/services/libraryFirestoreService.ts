import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  runTransaction,
  getDocs,
  writeBatch,
  deleteDoc,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  deepSanitizeForFirestore,
  prepareStorySliceForFirestore,
  assertEntityUnderFirestoreLimit,
  formatFirestoreSaveError,
} from '@/lib/firestorePayload';
import {
  LIBRARY_DOC_ID,
  LEGACY_LIBRARY_DOC_ID,
  LIBRARY_ENTITY_COLLECTIONS,
  LIBRARY_SCHEMA_VERSION,
  type LibraryEntityCollection,
  type LibraryMetadata,
} from '@/lib/libraryFirestoreSchema';
import {
  extractLegacyEntities,
  extractLegacySettings,
  isLegacyMonolithicLibrary,
} from '@/lib/libraryFirestoreMigrate';
const BATCH_LIMIT = 400;
// Conservative preview bound: do not split a logical save into partial commits.
const MAX_ATOMIC_ENTITIES = 399;
const loadedVersions = new Map<string, number>();
export function forgetLibraryVersion(uid: string): void { loadedVersions.delete(uid); }
function conflict(): Error {
  return Object.assign(new Error('Conflicto de sincronización: hay otra versión o falta una carga verificada. Tus cambios locales siguen pendientes.'), { code: 'storytable/conflict' });
}
function revision(data: Record<string, unknown> | null): number {
  if (!data) return 0;
  if (data.schemaVersion !== LIBRARY_SCHEMA_VERSION ||
      !Number.isSafeInteger(data.version) || Number(data.version) < 1) {
    throw new Error('Biblioteca antigua o formato desconocido: guardado detenido para conservar el original.');
  }
  return Number(data.version);
}

export type StorySlicePayload = Record<string, unknown>;

function libraryRootRef(uid: string, libraryId: string = LIBRARY_DOC_ID) {
  if (!db) throw new Error('Firestore no disponible');
  return doc(db, 'users', uid, 'storyTable', libraryId);
}

function entityCollectionRef(uid: string, libraryId: string, collectionName: LibraryEntityCollection) {
  if (!db) throw new Error('Firestore no disponible');
  return collection(db, 'users', uid, 'storyTable', libraryId, collectionName);
}

function entityDocRef(
  uid: string,
  libraryId: string,
  collectionName: LibraryEntityCollection,
  entityId: string
) {
  if (!db) throw new Error('Firestore no disponible');
  return doc(db, 'users', uid, 'storyTable', libraryId, collectionName, entityId);
}

function buildMetadata(uid: string, slice: StorySlicePayload, existing?: LibraryMetadata | null): LibraryMetadata {
  const now = new Date().toISOString();
  const settings = {
    characterOrderByWorld:
      (slice.characterOrderByWorld as Record<string, string[]>) ??
      existing?.settings.characterOrderByWorld ??
      {},
    dashboardWorldIds:
      (slice.dashboardWorldIds as string[]) ?? existing?.settings.dashboardWorldIds ?? [],
  };
  return {
    name: existing?.name ?? 'Mi biblioteca',
    ownerId: uid,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    version: (existing?.version ?? 0) + 1,
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    settings,
  };
}

function entityId(item: Record<string, unknown>): string | null {
  const id = item.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

async function loadEntityCollection<T>(
  uid: string,
  libraryId: string,
  collectionName: LibraryEntityCollection
): Promise<T[]> {
  const snap = await getDocsFromServer(entityCollectionRef(uid, libraryId, collectionName));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

async function loadAllEntities(uid: string, libraryId: string): Promise<StorySlicePayload> {
  const entries = await Promise.all(
    LIBRARY_ENTITY_COLLECTIONS.map(async (col) => {
      const items = await loadEntityCollection(uid, libraryId, col);
      return [col, items] as const;
    })
  );
  const slice: StorySlicePayload = {};
  for (const [col, items] of entries) slice[col] = items;
  return slice;
}

async function loadMetadataDoc(
  uid: string,
  libraryId: string
): Promise<Record<string, unknown> | null> {
  if (!db) return null;
  const snap = await getDocFromServer(libraryRootRef(uid, libraryId));
  if (!snap.exists()) return null;
  return snap.data() as Record<string, unknown>;
}

/** Automatic migration is disabled until a verified backup and explicit workflow exist. */
export async function migrateMonolithicLibraryToSubcollections(
  _uid: string,
  _data: Record<string, unknown>,
  _libraryId = LIBRARY_DOC_ID
): Promise<void> {
  throw new Error('La migración requiere una copia verificada y un proceso explícito. El origen no fue modificado.');
}

export async function saveLibraryToFirestore(uid: string, slice: StorySlicePayload): Promise<void> {
  if (!db) throw new Error('Firestore no disponible');
  const root = libraryRootRef(uid);
  const current = await loadMetadataDoc(uid, LIBRARY_DOC_ID);
  const legacy = current ? null : await loadMetadataDoc(uid, LEGACY_LIBRARY_DOC_ID);
  if (legacy) throw new Error('Biblioteca antigua: guardado detenido para conservar el original.');
  const actualVersion = revision(current);
  const expectedVersion = loadedVersions.get(uid);
  if (expectedVersion == null || actualVersion !== expectedVersion) {
    forgetLibraryVersion(uid);
    throw conflict();
  }
  const count = LIBRARY_ENTITY_COLLECTIONS.reduce((n, col) =>
    n + (Array.isArray(slice[col]) ? (slice[col] as unknown[]).length : 0), 0);
  if (count > MAX_ATOMIC_ENTITIES) {
    throw new Error('Este preview admite hasta 399 entidades por guardado atómico. No se enviaron cambios; conserva tu copia local.');
  }
  // Preflight IDs before any image upload; silently skipping an entity is unsafe.
  for (const col of LIBRARY_ENTITY_COLLECTIONS) {
    const seen = new Set<string>();
    for (const item of (Array.isArray(slice[col]) ? slice[col] : []) as unknown[]) {
      const id = item && typeof item === 'object' ? entityId(item as Record<string, unknown>) : null;
      if (!id || id.includes('/') || seen.has(id)) throw new Error('Identificador inválido o duplicado en ' + col);
      seen.add(id);
    }
  }
  const prepared = await prepareStorySliceForFirestore(uid, slice);
  const writes = LIBRARY_ENTITY_COLLECTIONS.flatMap((col) =>
    ((Array.isArray(prepared[col]) ? prepared[col] : []) as Record<string, unknown>[]).map((item) => {
      const payload = deepSanitizeForFirestore(item);
      const id = entityId(item)!;
      assertEntityUnderFirestoreLimit(payload, col + '/' + id);
      return { ref: entityDocRef(uid, LIBRARY_DOC_ID, col, id), payload };
    }));
  try {
    const nextVersion = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(root);
      const remote = snapshot.exists() ? snapshot.data() as Record<string, unknown> : null;
      if (!remote) {
        const old = await transaction.get(libraryRootRef(uid, LEGACY_LIBRARY_DOC_ID));
        if (old.exists()) throw conflict();
      }
      if (revision(remote) !== expectedVersion) throw conflict();
      const metadata = buildMetadata(uid, prepared, remote as unknown as LibraryMetadata | null);
      for (const write of writes) transaction.set(write.ref, write.payload as DocumentData, { merge: true });
      transaction.set(root, deepSanitizeForFirestore(metadata) as DocumentData, { merge: true });
      return metadata.version;
    });
    loadedVersions.set(uid, nextVersion);
  } catch (error) {
    // Keep the last verified version after a transport failure. Every retry checks
    // the server again, so an unchanged revision can be retried without a false
    // conflict. A committed write with a lost acknowledgement still conflicts
    // on the next attempt; never advance the baseline without confirmation.
    if (typeof error === 'object' && error !== null &&
        'code' in error && error.code === 'storytable/conflict') {
      forgetLibraryVersion(uid);
    }
    throw error;
  }
}

export async function loadLibraryFromFirestore(
  uid: string,
  options: { establishBaseline?: boolean } = {}
): Promise<StorySlicePayload | null> {
  const establishBaseline = options.establishBaseline !== false;
  if (establishBaseline) forgetLibraryVersion(uid);
  if (!db) return null;

  let libraryId: string = LIBRARY_DOC_ID;
  let rootData = await loadMetadataDoc(uid, libraryId);

  if (!rootData) {
    rootData = await loadMetadataDoc(uid, LEGACY_LIBRARY_DOC_ID);
    if (rootData) libraryId = LEGACY_LIBRARY_DOC_ID;
  }

  if (!rootData) { if (establishBaseline) loadedVersions.set(uid, 0); return null; }

  if (isLegacyMonolithicLibrary(rootData)) {
    const legacyEntities = extractLegacyEntities(rootData);
    return {
      ...Object.fromEntries(LIBRARY_ENTITY_COLLECTIONS.map((key) => [key, legacyEntities[key] ?? []])),
      ...extractLegacySettings(rootData),
    };
  }

  if (rootData.schemaVersion !== LIBRARY_SCHEMA_VERSION) {
    throw new Error('Formato de biblioteca no reconocido. No se modificaron los datos.');
  }

  const version = revision(rootData);
  const entities = await loadAllEntities(uid, libraryId);
  const after = await loadMetadataDoc(uid, libraryId);
  if (revision(after) !== version) throw conflict();
  if (libraryId !== LIBRARY_DOC_ID) throw new Error('Biblioteca antigua: requiere revisión antes de guardar.');
  if (establishBaseline) loadedVersions.set(uid, version);
  const meta = rootData as unknown as LibraryMetadata;

  return {
    ...entities,
    characterOrderByWorld: meta.settings?.characterOrderByWorld ?? {},
    dashboardWorldIds: meta.settings?.dashboardWorldIds ?? [],
  };
}

/** Elimina la biblioteca del usuario (todas las subcolecciones y metadatos). */
export async function deleteEntireUserLibrary(uid: string): Promise<void> {
  if (!db) return;
  for (const libId of [LIBRARY_DOC_ID, LEGACY_LIBRARY_DOC_ID]) {
    for (const coll of LIBRARY_ENTITY_COLLECTIONS) {
      const snap = await getDocs(entityCollectionRef(uid, libId, coll));
      if (snap.empty) continue;
      let batch = writeBatch(db);
      let n = 0;
      for (const d of snap.docs) {
        batch.delete(d.ref);
        n++;
        if (n >= BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(db);
          n = 0;
        }
      }
      if (n > 0) await batch.commit();
    }
    await deleteDoc(libraryRootRef(uid, libId)).catch(() => undefined);
  }
}

export { formatFirestoreSaveError };
