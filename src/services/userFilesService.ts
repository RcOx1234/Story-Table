import {
  deleteFileFromUserPath,
  listUserStorageFiles,
  storagePathFromDownloadUrl,
  uploadFileToUserPath,
  type ListedStorageFile,
} from '@/services/storageService';
import { isFirebaseConfigured } from '@/lib/firebase';

export type MediaFileKind = 'image' | 'audio' | 'video' | 'document' | 'other';

export type UserMediaFile = ListedStorageFile & {
  kind: MediaFileKind;
  displayName: string;
};

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|avi|mkv)$/i;
const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|md|json|zip|rar)$/i;

export function classifyMediaFile(file: ListedStorageFile): MediaFileKind {
  const ct = (file.contentType ?? '').toLowerCase();
  const name = file.name.toLowerCase();
  if (ct.startsWith('image/') || IMAGE_EXT.test(name)) return 'image';
  if (ct.startsWith('audio/') || AUDIO_EXT.test(name)) return 'audio';
  if (ct.startsWith('video/') || VIDEO_EXT.test(name)) return 'video';
  if (ct.startsWith('text/') || DOC_EXT.test(name)) return 'document';
  return 'other';
}

export function fileDisplayName(file: ListedStorageFile): string {
  return file.name.replace(/^[a-f0-9-]{36}\./i, '').replace(/_/g, ' ') || file.name;
}

export async function fetchUserMediaFiles(uid: string): Promise<UserMediaFile[]> {
  const raw = await listUserStorageFiles(uid);
  return raw.map((f) => ({
    ...f,
    kind: classifyMediaFile(f),
    displayName: fileDisplayName(f),
  }));
}

/** Sube un archivo a la carpeta `archivos/` del usuario. */
export async function uploadUserMediaFile(uid: string, file: File): Promise<UserMediaFile> {
  const safeName = file.name.replace(/[^\w.\-áéíóúñÁÉÍÓÚÑ ]+/g, '_').slice(0, 120);
  const path = `archivos/${Date.now()}_${safeName}`;
  const url = await uploadFileToUserPath(uid, path, file, file.type || undefined);
  const listed: ListedStorageFile = {
    relativePath: path,
    downloadUrl: url,
    name: safeName,
    contentType: file.type,
    updatedAt: new Date().toISOString(),
  };
  return { ...listed, kind: classifyMediaFile(listed), displayName: safeName };
}

export async function deleteUserMediaFile(uid: string, downloadUrl: string): Promise<void> {
  const path = storagePathFromDownloadUrl(downloadUrl, uid);
  if (!path) throw new Error('No se pudo resolver la ruta del archivo');
  await deleteFileFromUserPath(uid, path);
}

/** Copia el archivo con un nombre nuevo y devuelve la nueva URL (Firebase Storage no permite renombrar in-place). */
export async function renameUserMediaFile(
  uid: string,
  file: UserMediaFile,
  newBaseName: string
): Promise<string> {
  if (!isFirebaseConfigured()) throw new Error('Firebase no configurado');
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
  const safe = newBaseName.replace(/[^\w.\-áéíóúñÁÉÍÓÚÑ ]+/g, '_').trim() || 'archivo';
  const folder = file.relativePath.includes('/')
    ? file.relativePath.slice(0, file.relativePath.lastIndexOf('/'))
    : 'archivos';
  const newPath = `${folder}/${Date.now()}_${safe}${ext}`;
  const res = await fetch(file.downloadUrl);
  if (!res.ok) throw new Error('No se pudo leer el archivo');
  const blob = await res.blob();
  const newUrl = await uploadFileToUserPath(uid, newPath, blob, file.contentType);
  await deleteUserMediaFile(uid, file.downloadUrl);
  return newUrl;
}
