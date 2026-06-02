import { useMemo, useState } from 'react';
import { useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import { useSectionCardMenuDeps, entityCardMenuProps } from '@/hooks/useEntityCardMenu';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Globe, Plus, Heart, MapPin, FolderPlus, ArrowLeft, Pencil } from 'lucide-react';
import { MapFormModal } from '@/components/modals/crud/MapFormModal';
import { MapCollectionFormModal } from '@/components/modals/crud/MapCollectionFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { CollectionCard } from '@/components/common/CollectionCard';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import type { MapData, MapCollection } from '@/types';
import { toast } from 'sonner';
import { storyEntityDataAttrs } from '@/lib/storyEntityContext';
import { purgeMapStorage } from '@/lib/trashStorage';
import { isFirebaseConfigured } from '@/lib/firebase';

type Props = { worldId: string };

export function WorldMapsSection({ worldId }: Props) {
  const navigateWithReturn = useNavigateWithReturn();
  const cardMenu = useSectionCardMenuDeps();
  const maps = useAppStore((s) => s.getMapsByWorld(worldId));
  const collections = useAppStore((s) => s.getMapCollectionsByWorld(worldId));
  const addMap = useAppStore((s) => s.addMap);
  const deleteMap = useAppStore((s) => s.deleteMap);
  const addMapCollection = useAppStore((s) => s.addMapCollection);
  const updateMapCollection = useAppStore((s) => s.updateMapCollection);
  const deleteMapCollection = useAppStore((s) => s.deleteMapCollection);
  const toggleFavoriteMap = useAppStore((s) => s.toggleFavoriteMap);
  const getWorldById = useAppStore((s) => s.getWorldById);
  const user = useAppStore((s) => s.user);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MapData | null>(null);
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null);
  const [collectionFormOpen, setCollectionFormOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<MapCollection | null>(null);
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(null);

  const mapIdsInCollections = useMemo(() => {
    const ids = new Set<string>();
    for (const col of collections) {
      for (const id of col.mapIds) ids.add(id);
    }
    return ids;
  }, [collections]);

  const isInAnyCollection = (m: MapData) => mapIdsInCollections.has(m.id);

  const openCollection = openCollectionId ? collections.find((c) => c.id === openCollectionId) : null;

  const mapsInCollection = (col: MapCollection) => maps.filter((m) => col.mapIds.includes(m.id));

  const rootMaps = maps.filter((m) => !isInAnyCollection(m));
  const folderMaps = openCollection ? mapsInCollection(openCollection) : [];

  const onCreate = (data: Omit<MapData, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newId = addMap(data);
    toast.success('Mapa creado');
    navigateWithReturn(`/world/${worldId}/map/${newId}`);
  };

  const onCollectionSubmit = (data: Omit<MapCollection, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingCollection) {
      updateMapCollection(editingCollection.id, data);
      toast.success('Colección actualizada');
    } else {
      addMapCollection(data);
      toast.success('Colección creada');
    }
    setEditingCollection(null);
  };

  const handleDeleteMap = async () => {
    if (!deleteTarget) return;
    const world = getWorldById(worldId);
    if (user?.id && world && isFirebaseConfigured()) {
      try {
        await purgeMapStorage(user.id, deleteTarget, world);
      } catch {
        /* continuar */
      }
    }
    deleteMap(deleteTarget.id);
    toast.success('Mapa eliminado');
    setDeleteTarget(null);
  };

  const renderMapCard = (m: MapData, i: number) => (
    <motion.div
      key={m.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigateWithReturn(`/world/${worldId}/map/${m.id}`)}
      onClick={() => navigateWithReturn(`/world/${worldId}/map/${m.id}`)}
      className="story-card group relative cursor-pointer overflow-hidden"
      {...storyEntityDataAttrs('map', m.id, worldId, m.name)}
    >
      <div className="relative aspect-video bg-[#111318]">
        {m.imageUrl ? (
          <img src={m.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center transition-colors group-hover:bg-[#1a1f2a]">
            <MapPin className="text-[#3A4460]" size={40} />
          </div>
        )}
        <motion.div className="absolute right-2 top-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label="Favorito"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavoriteMap(m.id);
            }}
            className="rounded-lg bg-black/50 p-2 backdrop-blur-sm"
          >
            <Heart size={14} className={m.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-white'} />
          </button>
          <EntityCardMenu
            editLabel="Editar mapa"
            {...entityCardMenuProps(worldId, 'map', m.id, m.name, {
              ...cardMenu,
              onViewDetails: () => navigateWithReturn(`/world/${worldId}/map/${m.id}`),
            })}
            onDelete={() => setDeleteTarget(m)}
          />
        </motion.div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-[#E8E9EB]">{m.name}</h3>
        {m.description && <p className="mt-1 line-clamp-2 text-xs text-[#5A6078]">{m.description}</p>}
        <p className="mt-2 text-xs text-[#5A6078]">{m.markers.length} marcadores</p>
      </div>
    </motion.div>
  );

  const displayedMaps = openCollection ? folderMaps : rootMaps;

  const modals = (
    <>
      <MapFormModal open={modalOpen} onClose={() => setModalOpen(false)} worldId={worldId} onSubmit={onCreate} />
      <MapCollectionFormModal
        open={collectionFormOpen}
        onClose={() => {
          setCollectionFormOpen(false);
          setEditingCollection(null);
        }}
        worldId={worldId}
        initial={editingCollection}
        onSubmit={onCollectionSubmit}
      />
      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar mapa"
        message={deleteTarget ? `¿Eliminar "${deleteTarget.name}" permanentemente?` : ''}
        confirmLabel="Eliminar"
        onConfirm={() => void handleDeleteMap()}
      />
      <ConfirmDeleteModal
        open={!!deleteCollectionId}
        onClose={() => setDeleteCollectionId(null)}
        message="¿Eliminar esta colección?"
        onConfirm={() => {
          if (deleteCollectionId) {
            deleteMapCollection(deleteCollectionId);
            toast.success('Colección eliminada');
          }
        }}
      />
    </>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {openCollection ? (
        <div className="mb-8">
          <button
            type="button"
            onClick={() => setOpenCollectionId(null)}
            className="mb-4 flex items-center gap-2 text-sm text-[#8B91A7] transition-colors hover:text-[#E8E9EB]"
          >
            <ArrowLeft size={16} /> Volver a mapas
          </button>
          <div className="story-card overflow-hidden p-0">
            {openCollection.imageUrl ? (
              <img src={openCollection.imageUrl} alt="" className="max-h-40 w-full object-cover" />
            ) : (
              <div className="flex h-28 items-center justify-center bg-[#111318]">
                <FolderPlus size={32} className="text-[#3A4460]" />
              </div>
            )}
            <div className="p-5">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                <motion.div>
                  <p className="mb-1 font-mono text-xs uppercase tracking-wider text-[#5A6078]">Colección</p>
                  <h2 className="text-xl font-bold text-[#E8E9EB]">{openCollection.name}</h2>
                </motion.div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCollection(openCollection);
                    setCollectionFormOpen(true);
                  }}
                  className="story-btn-secondary flex items-center gap-1.5 text-xs"
                >
                  <Pencil size={14} /> Editar
                </button>
              </div>
              {openCollection.description && (
                <p className="text-sm leading-relaxed text-[#8B91A7]">{openCollection.description}</p>
              )}
              <p className="mt-3 text-xs text-[#5A6078]">
                {mapsInCollection(openCollection).length} mapa
                {mapsInCollection(openCollection).length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-mono uppercase tracking-wider text-[#5A6078]">Colecciones</h3>
            <button
              type="button"
              onClick={() => {
                setEditingCollection(null);
                setCollectionFormOpen(true);
              }}
              className="story-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <FolderPlus size={14} /> Colección
            </button>
          </div>
          {collections.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#2A3045] py-6 text-center text-sm text-[#5A6078]">
              Agrupa mapas por regiones o campañas
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {collections.map((col, i) => (
                <CollectionCard
                  key={col.id}
                  name={col.name}
                  imageUrl={col.imageUrl}
                  subtitle={`${mapsInCollection(col).length} mapas`}
                  index={i}
                  entityDataAttrs={storyEntityDataAttrs('mapCollection', col.id, worldId, col.name)}
                  onOpen={() => setOpenCollectionId(col.id)}
                  onEdit={() => {
                    setEditingCollection(col);
                    setCollectionFormOpen(true);
                  }}
                  onDelete={() => setDeleteCollectionId(col.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {maps.length === 0 ? (
        <div className="py-16 text-center">
          <Globe size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <h3 className="mb-2 text-lg text-[#E8E9EB]">Aún no hay mapas</h3>
          <p className="mb-4 text-sm text-[#5A6078]">Crea un mapa interactivo con imagen base y marcadores.</p>
          <button type="button" onClick={() => setModalOpen(true)} className="story-btn-primary text-sm">
            <Plus size={16} /> Crear mapa
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-[#5A6078]">
              {displayedMaps.length} mapa{displayedMaps.length !== 1 ? 's' : ''}
              {openCollection ? '' : rootMaps.length < maps.length ? ` (${maps.length - rootMaps.length} en colecciones)` : ''}
            </p>
            <button type="button" onClick={() => setModalOpen(true)} className="story-btn-primary text-sm">
              <Plus size={16} /> Nuevo mapa
            </button>
          </div>
          {displayedMaps.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#5A6078]">
              {openCollection ? 'No hay mapas en esta colección' : 'Todos los mapas están dentro de colecciones'}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayedMaps.map((m, i) => renderMapCard(m, i))}
            </div>
          )}
        </>
      )}

      {modals}
    </motion.div>
  );
}
