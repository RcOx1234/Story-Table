import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { folderParamKey } from '@/lib/storyNavigation';
import { useAppStore } from '@/store';
import type { EntityFolder, EntityFolderScope } from '@/types';
import {
  ENTITY_FOLDER_ITEM_LABELS,
  ENTITY_FOLDER_SCOPE_LABELS,
  countChildFolders,
  countFolderItems,
  getFolderBreadcrumb,
  getFoldersInParent,
} from '@/lib/entityFolders';
import { EntityFolderCard } from '@/components/common/EntityFolderCard';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { FOLDER_ICON_COLORS } from '@/lib/folderSectionBridge';
import { toast } from 'sonner';

type Props<T extends { id: string }> = {
  worldId: string;
  scope: EntityFolderScope;
  items: T[];
  filteredItems: T[];
  toolbar: ReactNode;
  gridClassName?: string;
  emptyIcon?: ReactNode;
  emptyMessage: string;
  onAddItem: () => void;
  renderItem: (item: T, index: number) => ReactNode;
  getItemLabel?: (item: T) => string;
};

export function EntityFoldersSection<T extends { id: string }>({
  worldId,
  scope,
  items,
  filteredItems,
  toolbar,
  gridClassName = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  emptyIcon,
  emptyMessage,
  onAddItem,
  renderItem,
  getItemLabel,
}: Props<T>) {
  const allFolders = useAppStore((s) => s.entityFolders);
  const addEntityFolder = useAppStore((s) => s.addEntityFolder);
  const updateEntityFolder = useAppStore((s) => s.updateEntityFolder);
  const deleteEntityFolder = useAppStore((s) => s.deleteEntityFolder);
  const addItemToFolder = useAppStore((s) => s.addItemToFolder);
  const removeItemFromFolder = useAppStore((s) => s.removeItemFromFolder);
  const setFolderSectionBridge = useAppStore((s) => s.setFolderSectionBridge);

  const [searchParams, setSearchParams] = useSearchParams();
  const folderKey = folderParamKey(scope);
  const [openFolderId, setOpenFolderId] = useState<string | null>(() => searchParams.get(folderKey));
  const [createNameOpen, setCreateNameOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameTarget, setRenameTarget] = useState<EntityFolder | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [manageFolder, setManageFolder] = useState<EntityFolder | null>(null);
  const [manageSearch, setManageSearch] = useState('');
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

  const scopeFolders = useMemo(
    () => allFolders.filter((f) => f.worldId === worldId && f.scope === scope),
    [allFolders, worldId, scope]
  );

  const validIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const sectionLabel = ENTITY_FOLDER_SCOPE_LABELS[scope];
  const itemLabels = ENTITY_FOLDER_ITEM_LABELS[scope];

  const openFolder = openFolderId ? scopeFolders.find((f) => f.id === openFolderId) : null;
  const childFolders = getFoldersInParent(scopeFolders, worldId, scope, openFolderId);
  const breadcrumb = openFolderId ? getFolderBreadcrumb(scopeFolders, openFolderId) : [];

  const displayedItems = useMemo(() => {
    if (!openFolder) return filteredItems;
    const ids = new Set(openFolder.itemIds);
    return filteredItems.filter((i) => ids.has(i.id));
  }, [filteredItems, openFolder]);

  const promptCreateFolder = useCallback(
    (parentId: string | null = openFolderId) => {
      setCreateParentId(parentId);
      setNewFolderName('');
      setCreateNameOpen(true);
    },
    [openFolderId]
  );

  const promptRenameFolder = useCallback(
    (folderId: string) => {
      const folder = scopeFolders.find((f) => f.id === folderId);
      if (!folder) return;
      setRenameTarget(folder);
      setRenameValue(folder.name);
    },
    [scopeFolders]
  );

  const promptManageFolder = useCallback(
    (folderId: string) => {
      const folder = scopeFolders.find((f) => f.id === folderId);
      if (folder) {
        setManageSearch('');
        setManageFolder(folder);
      }
    },
    [scopeFolders]
  );

  const promptDeleteFolder = useCallback((folderId: string) => {
    setDeleteFolderId(folderId);
  }, []);

  const goToFolder = useCallback(
    (folderId: string | null, replace = false) => {
      setOpenFolderId(folderId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (folderId) next.set(folderKey, folderId);
          else next.delete(folderKey);
          return next;
        },
        { replace }
      );
    },
    [folderKey, setSearchParams]
  );

  const openFolderById = useCallback((folderId: string) => goToFolder(folderId), [goToFolder]);

  useEffect(() => {
    const fromUrl = searchParams.get(folderKey);
    setOpenFolderId((current) => (current === fromUrl ? current : fromUrl));
  }, [searchParams, folderKey]);

  useEffect(() => {
    setFolderSectionBridge({
      worldId,
      scope,
      openFolderId,
      promptCreateFolder,
      promptRenameFolder,
      promptManageFolder,
      promptDeleteFolder,
      openFolder: openFolderById,
    });
    return () => setFolderSectionBridge(null);
  }, [
    worldId,
    scope,
    openFolderId,
    promptCreateFolder,
    promptRenameFolder,
    promptManageFolder,
    promptDeleteFolder,
    openFolderById,
    setFolderSectionBridge,
  ]);

  const confirmCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    addEntityFolder({
      worldId,
      scope,
      name,
      parentFolderId: createParentId,
      itemIds: [],
    });
    setCreateNameOpen(false);
    toast.success('Carpeta creada');
  };

  const saveRename = () => {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (!name) return;
    updateEntityFolder(renameTarget.id, { name });
    setRenameTarget(null);
    toast.success('Carpeta renombrada');
  };

  const manageItemsFiltered = useMemo(() => {
    if (!manageFolder) return [];
    const q = manageSearch.trim().toLowerCase();
    return items.filter((item) => {
      const label =
        getItemLabel?.(item) ??
        ('name' in item ? String((item as { name: string }).name) : item.id.slice(0, 8));
      return !q || label.toLowerCase().includes(q);
    });
  }, [items, manageFolder, manageSearch, getItemLabel]);

  const isEmpty = displayedItems.length === 0 && childFolders.length === 0;

  return (
    <div data-folder-section>
      {openFolder && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#2A3045] bg-[#111318] px-4 py-3"
        >
          <button
            type="button"
            onClick={() => goToFolder(breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2]!.id : null)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#8B91A7] hover:bg-[#1E2230] hover:text-[#E8E9EB]"
            title="Carpeta anterior"
          >
            <ArrowLeft size={14} />
            Atrás
          </button>
          <button
            type="button"
            onClick={() => goToFolder(null)}
            className={`text-xs transition-colors ${
              !openFolderId ? 'font-semibold text-[#E8E9EB]' : 'text-[#8B91A7] hover:text-[#E8E9EB]'
            }`}
          >
            {sectionLabel}
          </button>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-2">
              <ChevronRight size={12} className="text-[#5A6078]" />
              {i === breadcrumb.length - 1 ? (
                <span className="font-semibold text-[#E8E9EB]">{crumb.name}</span>
              ) : (
                <button
                  type="button"
                  className="text-xs text-[#8B91A7] hover:text-[#E8E9EB]"
                  onClick={() => goToFolder(crumb.id)}
                >
                  {crumb.name}
                </button>
              )}
            </span>
          ))}
        </motion.div>
      )}

      {toolbar}

      <AnimatePresence mode="wait">
        <motion.div
          key={openFolderId ?? 'root'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {isEmpty ? (
            <div className="py-16 text-center">
              {emptyIcon}
              <p className="mb-4 text-[#5A6078]">{openFolder ? 'Esta carpeta está vacía' : emptyMessage}</p>
              <button type="button" onClick={onAddItem} className="story-btn-primary text-sm">
                <Plus size={16} /> Agregar
              </button>
            </div>
          ) : (
            <>
              {childFolders.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {childFolders.map((folder) => (
                    <EntityFolderCard
                      key={folder.id}
                      folder={folder}
                      itemCount={countFolderItems(folder, validIds)}
                      childFolderCount={countChildFolders(scopeFolders, folder.id)}
                      itemLabel={itemLabels.many}
                      onOpen={() => goToFolder(folder.id)}
                      onRename={() => promptRenameFolder(folder.id)}
                      onDelete={() => promptDeleteFolder(folder.id)}
                      onManageItems={() => promptManageFolder(folder.id)}
                    />
                  ))}
                </div>
              )}
              {displayedItems.length > 0 && (
                <div className={gridClassName}>
                  {displayedItems.map((item, i) => renderItem(item, i))}
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <BaseModal
        open={createNameOpen}
        onClose={() => setCreateNameOpen(false)}
        title="Nueva carpeta"
        maxWidthClass="max-w-sm"
        footer={
          <>
            <button type="button" className="story-btn-secondary text-sm" onClick={() => setCreateNameOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="story-btn-primary text-sm" onClick={confirmCreateFolder}>
              Crear
            </button>
          </>
        }
      >
        <input
          className="story-input w-full"
          placeholder="Nombre de la carpeta"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && confirmCreateFolder()}
        />
      </BaseModal>

      <BaseModal
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title="Renombrar carpeta"
        maxWidthClass="max-w-sm"
        footer={
          <>
            <button type="button" className="story-btn-secondary text-sm" onClick={() => setRenameTarget(null)}>
              Cancelar
            </button>
            <button type="button" className="story-btn-primary text-sm" onClick={saveRename}>
              Guardar
            </button>
          </>
        }
      >
        <input
          className="story-input w-full"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && saveRename()}
        />
      </BaseModal>

      <BaseModal
        open={!!manageFolder}
        onClose={() => {
          setManageFolder(null);
          setManageSearch('');
        }}
        title={manageFolder ? `Gestionar «${manageFolder.name}»` : ''}
        maxWidthClass="max-w-md"
        footer={
          <button
            type="button"
            className="story-btn-primary text-sm"
            onClick={() => {
              setManageFolder(null);
              setManageSearch('');
            }}
          >
            Listo
          </button>
        }
      >
        {manageFolder && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#5A6078]">Color del icono</p>
              <div className="flex flex-wrap gap-2">
                {FOLDER_ICON_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    className="h-8 w-8 rounded-lg border-2 transition-transform hover:scale-105"
                    style={{
                      backgroundColor: color,
                      borderColor: (manageFolder.color ?? FOLDER_ICON_COLORS[0]) === color ? '#E8E9EB' : 'transparent',
                    }}
                    onClick={() => {
                      updateEntityFolder(manageFolder.id, { color });
                      setManageFolder({ ...manageFolder, color });
                      toast.success('Color actualizado');
                    }}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#5A6078]">
                {itemLabels.many.charAt(0).toUpperCase() + itemLabels.many.slice(1)} en la carpeta
              </p>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
                <input
                  className="story-input w-full pl-9 text-sm"
                  placeholder={`Buscar ${itemLabels.many}…`}
                  value={manageSearch}
                  onChange={(e) => setManageSearch(e.target.value)}
                />
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto scrollbar-thin">
                {manageItemsFiltered.length === 0 ? (
                  <p className="py-4 text-center text-xs text-[#5A6078]">Sin resultados</p>
                ) : (
                  manageItemsFiltered.map((item) => {
                    const inFolder = manageFolder.itemIds.includes(item.id);
                    const label =
                      getItemLabel?.(item) ??
                      ('name' in item ? String((item as { name: string }).name) : item.id.slice(0, 8));
                    return (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-[#E8E9EB] hover:bg-[#1E2230]"
                      >
                        <input
                          type="checkbox"
                          className="story-checkbox shrink-0"
                          checked={inFolder}
                          onChange={() => {
                            if (inFolder) removeItemFromFolder(manageFolder.id, item.id);
                            else addItemToFolder(manageFolder.id, item.id);
                            setManageFolder({
                              ...manageFolder,
                              itemIds: inFolder
                                ? manageFolder.itemIds.filter((id) => id !== item.id)
                                : [...manageFolder.itemIds, item.id],
                            });
                          }}
                        />
                        <span className="min-w-0 truncate">{label}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </BaseModal>

      <ConfirmDeleteModal
        open={!!deleteFolderId}
        onClose={() => setDeleteFolderId(null)}
        message="Se eliminará la carpeta y sus subcarpetas. Los elementos no se borran."
        onConfirm={() => {
          if (!deleteFolderId) return;
          deleteEntityFolder(deleteFolderId);
          if (openFolderId === deleteFolderId) goToFolder(null, true);
          setDeleteFolderId(null);
          toast.success('Carpeta eliminada');
        }}
      />
    </div>
  );
}
