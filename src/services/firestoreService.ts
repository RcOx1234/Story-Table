import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';

export function listenCollection(
  pathSegments: string[],
  callback: (docs: { id: string; data: DocumentData }[]) => void
): Unsubscribe | null {
  if (!db || !isFirebaseConfigured()) return null;
  const colRef = collection(db, pathSegments[0]!, ...pathSegments.slice(1));
  return onSnapshot(colRef, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, data: d.data() })));
  });
}

export async function createDocument(pathSegments: string[], id: string, data: DocumentData): Promise<void> {
  if (!db) throw new Error('Firestore no disponible');
  const ref = doc(db, pathSegments[0]!, ...pathSegments.slice(1), id);
  await setDoc(ref, data);
}

export async function updateDocument(pathSegments: string[], id: string, data: DocumentData): Promise<void> {
  if (!db) throw new Error('Firestore no disponible');
  const ref = doc(db, pathSegments[0]!, ...pathSegments.slice(1), id);
  await updateDoc(ref, data);
}

export async function softDeleteDocument(pathSegments: string[], id: string): Promise<void> {
  await updateDocument(pathSegments, id, { isDeleted: true, deletedAt: new Date().toISOString() });
}

export async function deleteDocumentPermanent(pathSegments: string[], id: string): Promise<void> {
  if (!db) throw new Error('Firestore no disponible');
  const ref = doc(db, pathSegments[0]!, ...pathSegments.slice(1), id);
  await deleteDoc(ref);
}

/**
 * @deprecated Usar loadLibraryFromFirestore (subcolecciones).
 * Carga el documento agregado de la biblioteca (`biblioteca` o legado `library`).
 */
export async function loadUserStoryBundle(
  uid: string,
  docId = 'biblioteca'
): Promise<Record<string, unknown> | null> {
  if (!db) return null;
  const ref = doc(db, 'users', uid, 'storyTable', docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Record<string, unknown>;
}

/** @deprecated Usar saveLibraryToFirestore (subcolecciones). */
export async function saveUserStoryBundle(
  uid: string,
  docId: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!db) throw new Error('Firestore no disponible');
  const ref = doc(db, 'users', uid, 'storyTable', docId);
  await setDoc(ref, { ...payload, updatedAt: new Date().toISOString() }, { merge: true });
}
