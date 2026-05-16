import { deleteStoragePrefix, deleteStorageUrls } from '@/services/storageService';
import { pathInWorld, storageSlug, worldStorageFolder } from '@/lib/storagePaths';
import type { AppState } from '@/store';
import type { Character, Idea, MapData, Place, Scene, World } from '@/types';

export type TrashEntityType =
  | 'world'
  | 'character'
  | 'scene'
  | 'place'
  | 'plot'
  | 'component'
  | 'organization'
  | 'idea';

function pushUrl(urls: Set<string>, value?: string | null) {
  if (!value || value.startsWith('data:') || value.startsWith('/')) return;
  if (value.includes('firebasestorage.googleapis.com') || value.includes('storage.googleapis.com')) {
    urls.add(value);
  }
}

function collectFromScene(scene: Scene, urls: Set<string>) {
  scene.images?.forEach((u) => pushUrl(urls, u));
  pushUrl(urls, scene.video);
  pushUrl(urls, scene.audio);
  pushUrl(urls, scene.music);
}

export function collectStorageUrls(
  state: Pick<
    AppState,
    'worlds' | 'characters' | 'scenes' | 'places' | 'maps' | 'plots' | 'components' | 'organizations' | 'ideas'
  >,
  type: TrashEntityType,
  id: string
): string[] {
  const urls = new Set<string>();

  switch (type) {
    case 'world': {
      const w = state.worlds.find((x) => x.id === id);
      if (w) pushUrl(urls, w.imageUrl);
      state.characters.filter((c) => c.worldId === id).forEach((c) => c.images.forEach((u) => pushUrl(urls, u)));
      state.scenes.filter((s) => s.worldId === id).forEach((s) => collectFromScene(s, urls));
      state.places.filter((p) => p.worldId === id).forEach((p) => pushUrl(urls, p.mapUrl));
      state.maps.filter((m) => m.worldId === id).forEach((m) => pushUrl(urls, m.imageUrl));
      state.ideas.filter((i) => i.worldId === id).forEach((i) => {
        pushUrl(urls, i.imageUrl);
        pushUrl(urls, i.audioUrl);
      });
      state.components.filter((c) => c.worldId === id).forEach((c) => pushUrl(urls, c.imageUrl));
      break;
    }
    case 'character': {
      const c = state.characters.find((x) => x.id === id);
      c?.images.forEach((u) => pushUrl(urls, u));
      break;
    }
    case 'scene': {
      const s = state.scenes.find((x) => x.id === id);
      if (s) collectFromScene(s, urls);
      break;
    }
    case 'place': {
      const p = state.places.find((x) => x.id === id);
      if (p) pushUrl(urls, p.mapUrl);
      break;
    }
    case 'idea': {
      const i = state.ideas.find((x) => x.id === id);
      if (i) {
        pushUrl(urls, i.imageUrl);
        pushUrl(urls, i.audioUrl);
      }
      break;
    }
    case 'plot':
    case 'organization':
      break;
    case 'component': {
      const c = state.components.find((x) => x.id === id);
      if (c) pushUrl(urls, c.imageUrl);
      break;
    }
  }

  return [...urls];
}

export async function purgeStorageUrls(uid: string | null | undefined, urls: string[]): Promise<void> {
  if (!uid || urls.length === 0) return;
  await deleteStorageUrls(uid, urls);
}

/** Borra toda la carpeta del mundo en Storage y archivos sueltos (rutas antiguas). */
export async function purgeWorldStorage(
  uid: string,
  world: World,
  state: Pick<
    AppState,
    'worlds' | 'characters' | 'scenes' | 'places' | 'maps' | 'plots' | 'components' | 'organizations' | 'ideas'
  >
): Promise<void> {
  await deleteStoragePrefix(uid, worldStorageFolder(world.name, world.id));
  const legacyUrls = collectStorageUrls(state, 'world', world.id);
  await deleteStorageUrls(uid, legacyUrls);
}

/** Borra la carpeta del mapa y su imagen (incluye rutas antiguas fuera del mundo). */
export async function purgeMapStorage(uid: string, map: MapData, world: World): Promise<void> {
  const mapFolder = storageSlug(map.name, map.id);
  await deleteStoragePrefix(uid, pathInWorld(world.name, world.id, 'mapas', mapFolder));
  if (map.imageUrl) {
    await deleteStorageUrls(uid, [map.imageUrl]);
  }
}

export function collectAllTrashStorageUrls(
  state: Pick<
    AppState,
    'worlds' | 'characters' | 'scenes' | 'places' | 'maps' | 'plots' | 'components' | 'organizations' | 'ideas'
  >
): string[] {
  const urls = new Set<string>();
  const deleted = {
    worlds: state.worlds.filter((w) => w.isDeleted),
    characters: state.characters.filter((c) => c.isDeleted),
    scenes: state.scenes.filter((s) => s.isDeleted),
    places: state.places.filter((p) => p.isDeleted),
    ideas: state.ideas.filter((i) => i.isDeleted),
  };

  deleted.worlds.forEach((w: World) => pushUrl(urls, w.imageUrl));
  deleted.characters.forEach((c: Character) => c.images.forEach((u) => pushUrl(urls, u)));
  deleted.scenes.forEach((s: Scene) => collectFromScene(s, urls));
  deleted.places.forEach((p: Place) => pushUrl(urls, p.mapUrl));
  deleted.ideas.forEach((i: Idea) => {
    pushUrl(urls, i.imageUrl);
    pushUrl(urls, i.audioUrl);
  });

  return [...urls];
}
