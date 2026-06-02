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

export function collectDescendantFolderIds(
  folders: EntityFolder[],
  folderId: string
): Set<string> {
  const ids = new Set<string>([folderId]);
  let added = true;
  while (added) {
    added = false;
    for (const f of folders) {
      if (f.parentFolderId && ids.has(f.parentFolderId) && !ids.has(f.id)) {
        ids.add(f.id);
        added = true;
      }
    }
  }
  return ids;
}

export type FolderPickerEntry = {
  id: string | null;
  label: string;
  depth: number;
};

/** Lista carpetas con indentación para menús (raíz opcional). */
export function buildFolderPickerList(
  folders: EntityFolder[],
  options?: { excludeIds?: Set<string>; includeRoot?: boolean; rootLabel?: string }
): FolderPickerEntry[] {
  const exclude = options?.excludeIds ?? new Set<string>();
  const entries: FolderPickerEntry[] = [];
  if (options?.includeRoot) {
    entries.push({ id: null, label: options.rootLabel ?? 'Raíz de la sección', depth: 0 });
  }

  const walk = (parentId: string | null, depth: number) => {
    const children = folders
      .filter((f) => (f.parentFolderId ?? null) === parentId && !exclude.has(f.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    for (const f of children) {
      entries.push({ id: f.id, label: f.name, depth });
      walk(f.id, depth + 1);
    }
  };
  walk(null, 0);
  return entries;
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
