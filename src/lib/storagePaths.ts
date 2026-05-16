/** Segmento legible para rutas de Storage: `castillo-leon-a1b2c3d4` */
export function storageSlug(name: string, id: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const shortId = id.replace(/-/g, '').slice(0, 8);
  return slug ? `${slug}-${shortId}` : shortId || 'item';
}

/** Carpeta raíz de un mundo en Storage: `mundos/aethelon-a1b2c3d4` */
export function worldStorageFolder(worldName: string, worldId: string): string {
  return `mundos/${storageSlug(worldName, worldId)}`;
}

/** Ruta de un recurso dentro del mundo */
export function pathInWorld(
  worldName: string,
  worldId: string,
  ...segments: string[]
): string {
  return [worldStorageFolder(worldName, worldId), ...segments].join('/');
}
