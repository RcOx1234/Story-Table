import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Folder, FolderOpen, Search } from 'lucide-react';
import { buildFolderPickerList, type FolderPickerEntry } from '@/lib/entityFolders';
import { DEFAULT_FOLDER_COLOR } from '@/lib/folderSectionBridge';
import type { EntityFolder } from '@/types';
import { MENU_ANIM, MENU_PANEL, MENU_SCROLL } from '@/lib/menuStyles';

type Props = {
  open: boolean;
  visible: boolean;
  left: number;
  top: number;
  width?: number;
  title: string;
  folders: EntityFolder[];
  excludeIds?: Set<string>;
  includeRoot?: boolean;
  rootLabel?: string;
  onPick: (folderId: string | null) => void;
  menuRef?: React.RefObject<HTMLDivElement | null>;
};

function EntryButton({
  entry,
  folder,
  onPick,
}: {
  entry: FolderPickerEntry;
  folder?: EntityFolder;
  onPick: (folderId: string | null) => void;
}) {
  const color = folder?.color ?? DEFAULT_FOLDER_COLOR;
  const isRoot = entry.id === null;

  return (
    <button
      type="button"
      className="flex w-full items-center gap-2.5 rounded-lg py-2 pr-3 text-left text-sm text-[#E8E9EB] transition-colors hover:bg-[#1E2230]"
      style={{ paddingLeft: 10 + entry.depth * 16 }}
      onClick={() => onPick(entry.id)}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: isRoot ? '#252A3C' : `${color}18` }}
      >
        {isRoot ? (
          <FolderOpen size={16} className="text-[#8B91A7]" strokeWidth={1.75} />
        ) : (
          <Folder size={16} style={{ color }} strokeWidth={1.75} />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{entry.label}</span>
    </button>
  );
}

export function EntityFolderPickerFlyout({
  open,
  visible,
  left,
  top,
  width = 248,
  title,
  folders,
  excludeIds,
  includeRoot,
  rootLabel,
  onPick,
  menuRef,
}: Props) {
  const [search, setSearch] = useState('');

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const entries = useMemo(
    () => buildFolderPickerList(folders, { excludeIds, includeRoot, rootLabel }),
    [folders, excludeIds, includeRoot, rootLabel]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.label.toLowerCase().includes(q));
  }, [entries, search]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      data-story-app-submenu="folder-picker"
      data-open={visible}
      className={`fixed z-[242] flex max-h-[min(340px,65vh)] flex-col ${MENU_PANEL} ${MENU_ANIM}`}
      style={{ left, top, width }}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <p className="shrink-0 border-b border-[#2A3045]/80 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-[#D61E2B]">
        {title}
      </p>
      <div className="relative shrink-0 border-b border-[#2A3045]/80 p-2">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6078]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar carpeta…"
          className="w-full rounded-lg border-0 bg-[#0B0D10]/60 py-2 pl-9 pr-3 text-sm text-[#E8E9EB] placeholder:text-[#5A6078] focus:outline-none focus:ring-1 focus:ring-[#D61E2B]/40"
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>
      <div className={`min-h-0 flex-1 overflow-y-auto p-1.5 ${MENU_SCROLL}`}>
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-[#5A6078]">Sin carpetas</p>
        ) : (
          filtered.map((entry) => (
            <EntryButton
              key={entry.id ?? '__root__'}
              entry={entry}
              folder={entry.id ? folderById.get(entry.id) : undefined}
              onPick={onPick}
            />
          ))
        )}
      </div>
    </div>,
    document.body
  );
}
