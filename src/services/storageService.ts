import { ref, uploadBytes, getDownloadURL, deleteObject, listAll, type StorageReference } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '@/lib/firebase';

export async function uploadFileToUserPath(
  uid: string,
  relativePath: string,
  file: Blob | File,
  contentType?: string
): Promise<string> {
  if (!storage || !isFirebaseConfigured()) {
    throw new Error('Firebase Storage no está configurado');
  }
  const storageRef = ref(storage, `users/${uid}/${relativePath}`);
  await uploadBytes(storageRef, file, contentType ? { contentType } : undefined);
  return getDownloadURL(storageRef);
}

/** Extrae la ruta relativa `users/{uid}/...` desde una URL de descarga de Firebase Storage. */
export function storagePathFromDownloadUrl(downloadUrl: string, uid: string): string | null {
  try {
    const u = new URL(downloadUrl);
    const encoded = u.pathname.split('/o/')[1]?.split('?')[0];
    if (!encoded) return null;
    const full = decodeURIComponent(encoded);
    const prefix = `users/${uid}/`;
    if (!full.startsWith(prefix)) return null;
    return full.slice(prefix.length);
  } catch {
    return null;
  }
}

export async function deleteFileFromUserPath(uid: string, relativePath: string): Promise<void> {
  if (!storage || !isFirebaseConfigured()) return;
  const storageRef = ref(storage, `users/${uid}/${relativePath}`);
  await deleteObject(storageRef);
}

export async function deleteStorageUrl(uid: string, downloadUrl: string): Promise<void> {
  const path = storagePathFromDownloadUrl(downloadUrl, uid);
  if (!path) return;
  try {
    await deleteFileFromUserPath(uid, path);
  } catch {
    /* archivo ya eliminado o sin permiso */
  }
}

export async function deleteStorageUrls(uid: string, urls: string[]): Promise<void> {
  await Promise.all(urls.map((url) => deleteStorageUrl(uid, url)));
}

async function deleteFolderRecursive(folderRef: StorageReference): Promise<void> {
  const listing = await listAll(folderRef);
  await Promise.all(listing.items.map((item) => deleteObject(item).catch(() => undefined)));
  await Promise.all(listing.prefixes.map((sub) => deleteFolderRecursive(sub)));
}

/** Elimina recursivamente una carpeta bajo `users/{uid}/{relativePrefix}/`. */
export async function deleteStoragePrefix(uid: string, relativePrefix: string): Promise<void> {
  if (!storage || !isFirebaseConfigured()) return;
  const folderRef = ref(storage, `users/${uid}/${relativePrefix.replace(/\/$/, '')}`);
  try {
    await deleteFolderRecursive(folderRef);
  } catch {
    /* carpeta vacía o inexistente */
  }
}
