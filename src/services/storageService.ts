import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
