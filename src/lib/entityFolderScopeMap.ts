import type { EntityFolderScope } from '@/types';
import type { StoryEntityType } from '@/lib/storyEntityContext';

/** Tipos de entidad que admiten carpetas en su sección. */
export const ENTITY_FOLDER_SCOPES: Partial<Record<StoryEntityType, EntityFolderScope>> = {
  character: 'character',
  scene: 'scene',
  component: 'component',
  organization: 'organization',
  fact: 'worldFact',
  datum: 'worldDatum',
  fantastic: 'fantasticElement',
};

export function entityTypeSupportsFolders(type: StoryEntityType): type is keyof typeof ENTITY_FOLDER_SCOPES {
  return type in ENTITY_FOLDER_SCOPES;
}

export function folderScopeForEntity(type: StoryEntityType): EntityFolderScope | null {
  return ENTITY_FOLDER_SCOPES[type] ?? null;
}

/** Comprueba si `candidateParentId` es la carpeta misma o un descendiente (evita ciclos). */
export function isFolderDescendant(
  folders: { id: string; parentFolderId: string | null }[],
  folderId: string,
  candidateParentId: string | null
): boolean {
  if (!candidateParentId) return false;
  if (candidateParentId === folderId) return true;
  let current = folders.find((f) => f.id === candidateParentId);
  while (current) {
    if (current.id === folderId) return true;
    current = current.parentFolderId
      ? folders.find((f) => f.id === current!.parentFolderId)
      : undefined;
  }
  return false;
}
