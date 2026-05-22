import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  deleteDoc,
  type DocumentData,
  type WriteBatch,
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

async function commitBatch(batch: WriteBatch): Promise<void> {
  await batch.commit();
}

async function runBatched(
  ops: Array<(batch: WriteBatch) => void>
): Promise<void> {
  let batch = writeBatch(db!);
  let count = 0;

  const flush = async () => {
    if (count === 0) return;
    await commitBatch(batch);
    batch = writeBatch(db!);
    count = 0;
  };

  for (const op of ops) {
    op(batch);
    count += 1;
    if (count >= BATCH_LIMIT) await flush();
  }
  await flush();
}

async function writeEntities(
  uid: string,
  libraryId: string,
  collectionName: LibraryEntityCollection,
  items: unknown[]
): Promise<void> {
  const ops: Array<(batch: WriteBatch) => void> = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const id = entityId(item);
    if (!id) continue;
    const payload = deepSanitizeForFirestore({ ...item, id });
    assertEntityUnderFirestoreLimit(payload, `${collectionName}/${id}`);
    const ref = entityDocRef(uid, libraryId, collectionName, id);
    ops.push((batch) => batch.set(ref, payload as DocumentData, { merge: true }));
  }
  await runBatched(ops);
}

async function deleteOrphanEntities(
  uid: string,
  libraryId: string,
  collectionName: LibraryEntityCollection,
  keepIds: Set<string>
): Promise<void> {
  const snap = await getDocs(entityCollectionRef(uid, libraryId, collectionName));
  const ops: Array<(batch: WriteBatch) => void> = [];
  for (const d of snap.docs) {
    if (!keepIds.has(d.id)) {
      ops.push((batch) => batch.delete(d.ref));
    }
  }
  await runBatched(ops);
}

function collectIds(items: unknown[]): Set<string> {
  const ids = new Set<string>();
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const id = entityId(raw as Record<string, unknown>);
    if (id) ids.add(id);
  }
  return ids;
}

async function saveAllEntityCollections(
  uid: string,
  libraryId: string,
  prepared: StorySlicePayload
): Promise<void> {
  await Promise.all(
    LIBRARY_ENTITY_COLLECTIONS.map(async (col) => {
      const items = Array.isArray(prepared[col]) ? (prepared[col] as unknown[]) : [];
      await writeEntities(uid, libraryId, col, items);
      await deleteOrphanEntities(uid, libraryId, col, collectIds(items));
    })
  );
}

async function loadEntityCollection<T>(
  uid: string,
  libraryId: string,
  collectionName: LibraryEntityCollection
): Promise<T[]> {
  const snap = await getDocs(entityCollectionRef(uid, libraryId, collectionName));
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
  const snap = await getDoc(libraryRootRef(uid, libraryId));
  if (!snap.exists()) return null;
  return snap.data() as Record<string, unknown>;
}

/** Migra un documento monolítico a subcolecciones y deja solo metadata en el doc raíz. */
export async function migrateMonolithicLibraryToSubcollections(
  uid: string,
  data: Record<string, unknown>,
  libraryId = LIBRARY_DOC_ID
): Promise<void> {
  if (!db) throw new Error('Firestore no disponible');
  const entities = extractLegacyEntities(data);
  const settings = extractLegacySettings(data);
  const now = new Date().toISOString();
  const prepared = await prepareStorySliceForFirestore(uid, {
    ...entities,
    characterOrderByWorld: settings.characterOrderByWorld,
    dashboardWorldIds: settings.dashboardWorldIds,
  } as StorySlicePayload);

  await saveAllEntityCollections(uid, libraryId, prepared);

  const metadata: LibraryMetadata = {
    name: typeof data.name === 'string' ? data.name : 'Mi biblioteca',
    ownerId: uid,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : now,
    updatedAt: now,
    version: typeof data.version === 'number' ? data.version + 1 : 1,
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    settings,
    migratedAt: now,
  };

  await setDoc(
    libraryRootRef(uid, libraryId),
    deepSanitizeForFirestore(metadata) as DocumentData
  );
}

export async function saveLibraryToFirestore(uid: string, slice: StorySlicePayload): Promise<void> {
  if (!db) throw new Error('Firestore no disponible');
  const libraryId = LIBRARY_DOC_ID;
  const existingRaw = await loadMetadataDoc(uid, libraryId);
  const existing =
    existingRaw && existingRaw.schemaVersion === LIBRARY_SCHEMA_VERSION
      ? (existingRaw as unknown as LibraryMetadata)
      : null;

  const prepared = await prepareStorySliceForFirestore(uid, slice);
  const metadata = buildMetadata(uid, prepared, existing);

  await saveAllEntityCollections(uid, libraryId, prepared);

  const root = libraryRootRef(uid, libraryId);
  const batch = writeBatch(db);
  batch.set(root, deepSanitizeForFirestore(metadata) as DocumentData, { merge: true });
  await batch.commit();
}

export async function loadLibraryFromFirestore(
  uid: string
): Promise<StorySlicePayload | null> {
  if (!db) return null;

  let libraryId: string = LIBRARY_DOC_ID;
  let rootData = await loadMetadataDoc(uid, libraryId);

  if (!rootData) {
    rootData = await loadMetadataDoc(uid, LEGACY_LIBRARY_DOC_ID);
    if (rootData) libraryId = LEGACY_LIBRARY_DOC_ID;
  }

  if (!rootData) return null;

  const wasLegacyDoc = libraryId === LEGACY_LIBRARY_DOC_ID;

  if (isLegacyMonolithicLibrary(rootData)) {
    await migrateMonolithicLibraryToSubcollections(uid, rootData, LIBRARY_DOC_ID);
    if (wasLegacyDoc) {
      await deleteDoc(libraryRootRef(uid, LEGACY_LIBRARY_DOC_ID)).catch(() => {});
    }
    rootData = await loadMetadataDoc(uid, LIBRARY_DOC_ID);
    libraryId = LIBRARY_DOC_ID;
  }

  if (!rootData || rootData.schemaVersion !== LIBRARY_SCHEMA_VERSION) {
    if (isLegacyMonolithicLibrary(rootData)) {
      await migrateMonolithicLibraryToSubcollections(uid, rootData!, LIBRARY_DOC_ID);
      rootData = await loadMetadataDoc(uid, LIBRARY_DOC_ID);
    } else {
      return null;
    }
  }

  const meta = rootData as unknown as LibraryMetadata;
  const entities = await loadAllEntities(uid, LIBRARY_DOC_ID);

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
