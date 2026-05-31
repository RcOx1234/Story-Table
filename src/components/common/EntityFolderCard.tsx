import { Folder } from 'lucide-react';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import { DEFAULT_FOLDER_COLOR } from '@/lib/folderSectionBridge';
import type { EntityFolder } from '@/types';

type Props = {
  folder: EntityFolder;
  itemCount: number;
  childFolderCount: number;
  itemLabel: string;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onManageItems?: () => void;
};

export function EntityFolderCard({
  folder,
  itemCount,
  childFolderCount,
  itemLabel,
  onOpen,
  onRename,
  onDelete,
  onManageItems,
}: Props) {
  const color = folder.color ?? DEFAULT_FOLDER_COLOR;
  const sub =
    childFolderCount > 0
      ? `${itemCount} ${itemLabel} · ${childFolderCount} carpeta${childFolderCount === 1 ? '' : 's'}`
      : `${itemCount} ${itemLabel}`;

  return (
    <div
      role="button"
      tabIndex={0}
      data-entity-folder-card
      data-entity-folder-id={folder.id}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      onClick={onOpen}
      className="story-card group relative flex w-full max-w-[260px] cursor-pointer items-center gap-3 px-3 py-2.5 transition-all hover:border-[#3A4460]"
    >
      <div
        className="absolute right-1.5 top-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <EntityCardMenu
          onEdit={onRename}
          editLabel="Renombrar"
          onDelete={onDelete}
          onManage={onManageItems}
        />
      </div>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}18` }}
      >
        <Folder size={18} style={{ color }} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1 pr-6">
        <h3 className="truncate text-sm font-semibold text-[#E8E9EB]">{folder.name}</h3>
        <p className="mt-0.5 truncate text-[10px] text-[#5A6078]">{sub}</p>
      </div>
    </div>
  );
}
