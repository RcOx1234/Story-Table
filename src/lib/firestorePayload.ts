import { uploadFileToUserPath } from '@/services/storageService';
import { pathInWorld, storageSlug, worldStorageFolder } from '@/lib/storagePaths';

const FIRESTORE_DOC_LIMIT = 1_048_576;

/** Elimina `undefined` (Firestore los rechaza) y normaliza el árbol. */
export function deepSanitizeForFirestore<T>(value: T): T {
  if (value === undefined) return value;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => deepSanitizeForFirestore(item)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (val === undefined) continue;
    out[key] = deepSanitizeForFirestore(val);
  }
  return out as T;
}

function estimateBytes(value: unknown): number {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return 0;
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(header ?? '')?.[1] ?? 'application/octet-stream';
  const binary = atob(base64 ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function extFromMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  return 'jpg';
}

async function replaceDataUrl(uid: string, path: string, dataUrl: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  return uploadFileToUserPath(uid, path, blob, blob.type || undefined);
}

type WorldMeta = { id: string; name: string };

function buildWorldIndex(worlds: Array<Record<string, unknown>> | undefined): Map<string, WorldMeta> {
  const index = new Map<string, WorldMeta>();
  if (!Array.isArray(worlds)) return index;
  for (const w of worlds) {
    index.set(String(w.id), { id: String(w.id), name: String(w.name ?? 'mundo') });
  }
  return index;
}

async function inlineDataUrls(uid: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const clone = structuredClone(payload) as Record<string, unknown>;
  const worlds = clone.worlds as Array<Record<string, unknown>> | undefined;
  const worldIndex = buildWorldIndex(worlds);

  if (Array.isArray(worlds)) {
    for (const w of worlds) {
      if (typeof w.imageUrl === 'string' && w.imageUrl.startsWith('data:')) {
        const ext = extFromMime(dataUrlToBlob(w.imageUrl).type);
        const wid = String(w.id);
        w.imageUrl = await replaceDataUrl(
          uid,
          pathInWorld(String(w.name ?? 'mundo'), wid, `portada.${ext}`),
          w.imageUrl
        );
      }
    }
  }

  const characters = clone.characters as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(characters)) {
    for (const c of characters) {
      const world = worldIndex.get(String(c.worldId));
      if (!world || !Array.isArray(c.images)) continue;
      const charFolder = storageSlug(String(c.name ?? 'personaje'), String(c.id));
      const next: string[] = [];
      for (let i = 0; i < c.images.length; i++) {
        const url = c.images[i];
        if (typeof url === 'string' && url.startsWith('data:')) {
          const ext = extFromMime(dataUrlToBlob(url).type);
          const suffix = i === 0 ? 'principal' : `img-${i}`;
          next.push(
            await replaceDataUrl(
              uid,
              pathInWorld(world.name, world.id, 'personajes', charFolder, `${suffix}.${ext}`),
              url
            )
          );
        } else if (typeof url === 'string') {
          next.push(url);
        }
      }
      c.images = next;
    }
  }

  const places = clone.places as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(places)) {
    for (const p of places) {
      const world = worldIndex.get(String(p.worldId));
      if (!world || typeof p.mapUrl !== 'string' || !p.mapUrl.startsWith('data:')) continue;
      const ext = extFromMime(dataUrlToBlob(p.mapUrl).type);
      const placeFolder = storageSlug(String(p.name ?? 'lugar'), String(p.id));
      p.mapUrl = await replaceDataUrl(
        uid,
        pathInWorld(world.name, world.id, 'lugares', placeFolder, `imagen.${ext}`),
        p.mapUrl
      );
    }
  }

  const maps = clone.maps as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(maps)) {
    for (const m of maps) {
      const world = worldIndex.get(String(m.worldId));
      if (!world || typeof m.imageUrl !== 'string' || !m.imageUrl.startsWith('data:')) continue;
      const ext = extFromMime(dataUrlToBlob(m.imageUrl).type);
      const mapFolder = storageSlug(String(m.name ?? 'mapa'), String(m.id));
      m.imageUrl = await replaceDataUrl(
        uid,
        pathInWorld(world.name, world.id, 'mapas', mapFolder, `base.${ext}`),
        m.imageUrl
      );
    }
  }

  const scenes = clone.scenes as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(scenes)) {
    for (const s of scenes) {
      const world = worldIndex.get(String(s.worldId));
      if (!world || !Array.isArray(s.images)) continue;
      const sceneFolder = storageSlug(String(s.title ?? 'escena'), String(s.id));
      const next: string[] = [];
      for (let i = 0; i < s.images.length; i++) {
        const url = s.images[i];
        if (typeof url === 'string' && url.startsWith('data:')) {
          const ext = extFromMime(dataUrlToBlob(url).type);
          next.push(
            await replaceDataUrl(
              uid,
              pathInWorld(world.name, world.id, 'escenas', sceneFolder, `img-${i}.${ext}`),
              url
            )
          );
        } else if (typeof url === 'string') {
          next.push(url);
        }
      }
      s.images = next;
    }
  }

  const components = clone.components as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(components)) {
    for (const comp of components) {
      const world = worldIndex.get(String(comp.worldId));
      if (!world || typeof comp.imageUrl !== 'string' || !comp.imageUrl.startsWith('data:')) continue;
      const ext = extFromMime(dataUrlToBlob(comp.imageUrl).type);
      const compFolder = storageSlug(String(comp.name ?? 'componente'), String(comp.id));
      comp.imageUrl = await replaceDataUrl(
        uid,
        pathInWorld(world.name, world.id, 'componentes', compFolder, `imagen.${ext}`),
        comp.imageUrl
      );
    }
  }

  const houses = clone.houses as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(houses)) {
    for (const h of houses) {
      const world = worldIndex.get(String(h.worldId));
      if (!world) continue;
      const houseFolder = storageSlug(String(h.name ?? 'casa'), String(h.id));
      for (const field of ['imageUrl', 'coatOfArms'] as const) {
        const url = h[field];
        if (typeof url === 'string' && url.startsWith('data:')) {
          const ext = extFromMime(dataUrlToBlob(url).type);
          h[field] = await replaceDataUrl(
            uid,
            pathInWorld(world.name, world.id, 'casas', houseFolder, `${field}.${ext}`),
            url
          );
        }
      }
    }
  }

  const worldFacts = clone.worldFacts as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(worldFacts)) {
    for (const f of worldFacts) {
      const world = worldIndex.get(String(f.worldId));
      if (!world || !Array.isArray(f.images)) continue;
      const factFolder = storageSlug(String(f.title ?? 'hecho'), String(f.id));
      const next: string[] = [];
      for (let i = 0; i < f.images.length; i++) {
        const url = f.images[i];
        if (typeof url === 'string' && url.startsWith('data:')) {
          const ext = extFromMime(dataUrlToBlob(url).type);
          next.push(
            await replaceDataUrl(
              uid,
              pathInWorld(world.name, world.id, 'hechos', factFolder, `img-${i}.${ext}`),
              url
            )
          );
        } else if (typeof url === 'string') {
          next.push(url);
        }
      }
      f.images = next;
    }
  }

  const worldData = clone.worldData as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(worldData)) {
    for (const d of worldData) {
      const world = worldIndex.get(String(d.worldId));
      if (!world || !Array.isArray(d.images)) continue;
      const datumFolder = storageSlug(String(d.title ?? 'dato'), String(d.id));
      const next: string[] = [];
      for (let i = 0; i < d.images.length; i++) {
        const url = d.images[i];
        if (typeof url === 'string' && url.startsWith('data:')) {
          const ext = extFromMime(dataUrlToBlob(url).type);
          next.push(
            await replaceDataUrl(
              uid,
              pathInWorld(world.name, world.id, 'datos', datumFolder, `img-${i}.${ext}`),
              url
            )
          );
        } else if (typeof url === 'string') {
          next.push(url);
        }
      }
      d.images = next;
    }
  }

  const placeCollections = clone.placeCollections as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(placeCollections)) {
    for (const c of placeCollections) {
      const world = worldIndex.get(String(c.worldId));
      if (!world || typeof c.imageUrl !== 'string' || !c.imageUrl.startsWith('data:')) continue;
      const ext = extFromMime(dataUrlToBlob(c.imageUrl).type);
      const folder = storageSlug(String(c.name ?? 'coleccion'), String(c.id));
      c.imageUrl = await replaceDataUrl(
        uid,
        pathInWorld(world.name, world.id, 'colecciones-lugares', folder, `portada.${ext}`),
        c.imageUrl
      );
    }
  }

  const mapCollections = clone.mapCollections as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(mapCollections)) {
    for (const c of mapCollections) {
      const world = worldIndex.get(String(c.worldId));
      if (!world || typeof c.imageUrl !== 'string' || !c.imageUrl.startsWith('data:')) continue;
      const ext = extFromMime(dataUrlToBlob(c.imageUrl).type);
      const folder = storageSlug(String(c.name ?? 'coleccion-mapas'), String(c.id));
      c.imageUrl = await replaceDataUrl(
        uid,
        pathInWorld(world.name, world.id, 'colecciones-mapas', folder, `portada.${ext}`),
        c.imageUrl
      );
    }
  }

  const ideas = clone.ideas as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(ideas)) {
    for (const idea of ideas) {
      const ideaFolder = storageSlug(String(idea.description ?? 'idea').slice(0, 32), String(idea.id));
      const worldId = idea.worldId ? String(idea.worldId) : null;
      const world = worldId ? worldIndex.get(worldId) : null;
      const basePath = world
        ? pathInWorld(world.name, world.id, 'ideas', ideaFolder)
        : `bandeja-ideas/${ideaFolder}`;

      if (typeof idea.imageUrl === 'string' && idea.imageUrl.startsWith('data:')) {
        const ext = extFromMime(dataUrlToBlob(idea.imageUrl).type);
        idea.imageUrl = await replaceDataUrl(uid, `${basePath}/imagen.${ext}`, idea.imageUrl);
      }
      if (typeof idea.audioUrl === 'string' && idea.audioUrl.startsWith('data:')) {
        const ext = extFromMime(dataUrlToBlob(idea.audioUrl).type);
        idea.audioUrl = await replaceDataUrl(uid, `${basePath}/nota-voz.${ext}`, idea.audioUrl);
      }
    }
  }

  return clone;
}

export function formatFirestoreSaveError(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
  if (code === 'permission-denied') {
    return 'Sin permiso en Firestore (revisa reglas y sesión)';
  }
  if (code === 'resource-exhausted' || code === 'invalid-argument') {
    return 'Datos demasiado grandes o inválidos para Firestore';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'No se pudo guardar en Firebase';
}

function hasDataUrls(value: unknown): boolean {
  if (typeof value === 'string') return value.startsWith('data:');
  if (Array.isArray(value)) return value.some(hasDataUrls);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasDataUrls);
  }
  return false;
}

/** Comprueba que un documento individual no supere 1 MiB. */
export function assertEntityUnderFirestoreLimit(data: unknown, label: string): void {
  const bytes = estimateBytes(data);
  if (bytes > FIRESTORE_DOC_LIMIT) {
    throw new Error(
      `El documento "${label}" (${Math.round(bytes / 1024)} KB) supera el límite de Firestore (1 MB). Reduce imágenes embebidas o exporta un JSON de respaldo.`
    );
  }
}

/** Prepara el slice de biblioteca: sanitiza y sube data URLs a Storage (sin límite global). */
export async function prepareStorySliceForFirestore(
  uid: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  let sanitized = deepSanitizeForFirestore(payload) as Record<string, unknown>;

  if (hasDataUrls(sanitized)) {
    sanitized = await inlineDataUrls(uid, sanitized);
    sanitized = deepSanitizeForFirestore(sanitized) as Record<string, unknown>;
  }

  return sanitized;
}

/** @deprecated Usar prepareStorySliceForFirestore + guardado en subcolecciones. */
export async function prepareStoryBundleForFirestore(
  uid: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const sanitized = await prepareStorySliceForFirestore(uid, payload);
  const bytes = estimateBytes(sanitized);
  if (bytes > FIRESTORE_DOC_LIMIT) {
    throw new Error(
      `La biblioteca (${Math.round(bytes / 1024)} KB) supera el límite de Firestore (1 MB). Exporta un JSON de respaldo.`
    );
  }
  return sanitized;
}

export { worldStorageFolder };
