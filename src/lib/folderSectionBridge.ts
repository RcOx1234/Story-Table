import type { EntityFolderScope } from '@/types';

export const FOLDER_ICON_COLORS = [
  '#3B82F6',
  '#8B5CF6',
  '#D61E2B',
  '#22C55E',
  '#EAB308',
  '#F97316',
  '#EC4899',
  '#06B6D4',
] as const;

export const DEFAULT_FOLDER_COLOR = FOLDER_ICON_COLORS[0];

export type FolderSectionBridge = {
  worldId: string;
  scope: EntityFolderScope;
  openFolderId: string | null;
  promptCreateFolder: (parentId?: string | null) => void;
  promptRenameFolder: (folderId: string) => void;
  promptManageFolder: (folderId: string) => void;
  promptDeleteFolder: (folderId: string) => void;
  openFolder: (folderId: string) => void;
};
