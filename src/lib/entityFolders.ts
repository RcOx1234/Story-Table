import type { EntityFolder, EntityFolderScope } from '@/types';

export const ENTITY_FOLDER_SCOPE_LABELS: Record<EntityFolderScope, string> = {
  character: 'Personajes',
  scene: 'Escenas',
  component: 'Componentes',
  organization: 'Organizaciones',
  worldFact: 'Hechos',
  worldDatum: 'Datos',
  fantasticElement: 'Fantásticos',
};

export const ENTITY_FOLDER_ITEM_LABELS: Record<EntityFolderScope, { one: string; many: string }> = {
  character: { one: 'personaje', many: 'personajes' },
  scene: { one: 'escena', many: 'escenas' },
  component: { one: 'componente', many: 'componentes' },
  organization: { one: 'organización', many: 'organizaciones' },
  worldFact: { one: 'hecho', many: 'hechos' },
  worldDatum: { one: 'dato', many: 'datos' },
  fantasticElement: { one: 'elemento', many: 'elementos' },
};

export function getFoldersInParent(
  folders: EntityFolder[],
  worldId: string,
  scope: EntityFolderScope,
  parentFolderId: string | null
): EntityFolder[] {
  return folders.filter(
    (f) => f.worldId === worldId && f.scope === scope && (f.parentFolderId ?? null) === parentFolderId
  );
}

export function getFolderBreadcrumb(folders: EntityFolder[], folderId: string): EntityFolder[] {
  const path: EntityFolder[] = [];
  let current = folders.find((f) => f.id === folderId);
  while (current) {
    path.unshift(current);
    current = current.parentFolderId ? folders.find((f) => f.id === current!.parentFolderId) : undefined;
  }
  return path;
}

export function countFolderItems(folder: EntityFolder, validIds: Set<string>): number {
  return folder.itemIds.filter((id) => validIds.has(id)).length;
}

export function countChildFolders(folders: EntityFolder[], folderId: string): number {
  return folders.filter((f) => f.parentFolderId === folderId).length;
}

/** Migra carpetas antiguas de personajes al modelo unificado. */
export function migrateLegacyCharacterFolders(
  legacy: Array<{
    id: string;
    worldId: string;
    name: string;
    characterIds?: string[];
    itemIds?: string[];
    createdAt: string;
    updatedAt: string;
  }>
): EntityFolder[] {
  return legacy.map((f) => ({
    id: f.id,
    worldId: f.worldId,
    scope: 'character' as const,
    name: f.name,
    parentFolderId: null,
    itemIds: f.itemIds ?? f.characterIds ?? [],
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }));
}
