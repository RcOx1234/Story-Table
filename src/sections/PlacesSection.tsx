import { useMemo, useState } from 'react';
import { useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Search, MapPin, Heart, FolderPlus, ArrowLeft, Pencil } from 'lucide-react';
import type { Place, PlaceCollection } from '@/types';
import { PlaceFormModal } from '@/components/modals/crud/PlaceFormModal';
import { PlaceCollectionFormModal } from '@/components/modals/crud/PlaceCollectionFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import { CollectionCard } from '@/components/common/CollectionCard';
import { toast } from 'sonner';

const typeLabels: Record<string, string> = {
  city: 'Ciudad',
  town: 'Pueblo',
  kingdom: 'Reino',
  forest: 'Bosque',
  mountain: 'Montaña',
  lake: 'Lago',
  dungeon: 'Mazmorra',
  castle: 'Castillo',
  temple: 'Templo',
  other: 'Otro',
};

interface Props {
  worldId: string;
}

export function PlacesSection({ worldId }: Props) {
  const navigateWithReturn = useNavigateWithReturn();
  const places = useAppStore((s) => s.getPlacesByWorld(worldId));
  const collections = useAppStore((s) => s.getPlaceCollectionsByWorld(worldId));
  const addPlace = useAppStore((s) => s.addPlace);
  const updatePlace = useAppStore((s) => s.updatePlace);
  const deletePlace = useAppStore((s) => s.deletePlace);
  const addPlaceCollection = useAppStore((s) => s.addPlaceCollection);
  const updatePlaceCollection = useAppStore((s) => s.updatePlaceCollection);
  const deletePlaceCollection = useAppStore((s) => s.deletePlaceCollection);
  const toggleFav = useAppStore((s) => s.toggleFavoritePlace);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Place | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null);
  const [collectionFormOpen, setCollectionFormOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<PlaceCollection | null>(null);
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(null);

  const placeIdsInCollections = useMemo(() => {
    const ids = new Set<string>();
    for (const col of collections) {
      for (const id of col.placeIds) ids.add(id);
    }
    for (const p of places) {
      if (p.collectionId) ids.add(p.id);
    }
    return ids;
  }, [collections, places]);

  const isInAnyCollection = (p: Place) => placeIdsInCollections.has(p.id);

  const openCollection = openCollectionId ? collections.find((c) => c.id === openCollectionId) : null;

  const placesInCollection = (col: PlaceCollection) =>
    places.filter((pl) => col.placeIds.includes(pl.id) || pl.collectionId === col.id);

  const matchesSearch = (p: Place) => !search || p.name.toLowerCase().includes(search.toLowerCase());

  const rootPlaces = places.filter((p) => !isInAnyCollection(p) && matchesSearch(p));
  const folderPlaces = openCollection ? placesInCollection(openCollection).filter(matchesSearch) : [];

  const onSubmit = (data: Omit<Place, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editing) {
      updatePlace(editing.id, data);
      toast.success('Lugar actualizado');
    } else {
      addPlace(data);
      toast.success('Lugar guardado');
    }
    setEditing(null);
  };

  const onCollectionSubmit = (data: Omit<PlaceCollection, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingCollection) {
      updatePlaceCollection(editingCollection.id, data);
      toast.success('Colección actualizada');
    } else {
      addPlaceCollection(data);
      toast.success('Colección creada');
    }
    setEditingCollection(null);
  };

  const renderPlaceCard = (place: Place, i: number) => (
    <motion.div
      key={place.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigateWithReturn(`/world/${worldId}/place/${place.id}`)}
      onClick={() => navigateWithReturn(`/world/${worldId}/place/${place.id}`)}
      className="story-card group relative cursor-pointer overflow-hidden p-0"
    >
      <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label="Favorito"
          onClick={(e) => {
            e.stopPropagation();
            toggleFav(place.id);
          }}
          className="rounded-lg bg-[#0B0D10]/80 p-1.5 backdrop-blur-sm transition-all hover:bg-[#1E2230]"
        >
          <Heart size={14} className={place.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
        </button>
        <EntityCardMenu
          onEdit={() => {
            setEditing(place);
            setFormOpen(true);
          }}
          onDelete={() => setDeleteId(place.id)}
        />
      </div>
      {place.mapUrl ? (
        <div className="aspect-video bg-[#0B0D10]">
          <img src={place.mapUrl} alt={place.name} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center bg-[#111318] transition-colors group-hover:bg-[#1a1f2a]">
          <MapPin size={32} className="text-[#3A4460]" />
        </div>
      )}
      <div className="p-4">
        <span className="mb-2 inline-block rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#5A6078]">
          {typeLabels[place.type]}
        </span>
        <h3 className="mb-1 font-semibold text-[#E8E9EB]">{place.name}</h3>
        {place.description && <p className="line-clamp-2 text-xs text-[#8B91A7]">{place.description}</p>}
      </div>
    </motion.div>
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
            <ArrowLeft size={16} /> Volver a lugares
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
                <div>
                  <p className="mb-1 font-mono text-xs uppercase tracking-wider text-[#5A6078]">Colección</p>
                  <h2 className="text-xl font-bold text-[#E8E9EB]">{openCollection.name}</h2>
                </div>
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
                {placesInCollection(openCollection).length} lugar
                {placesInCollection(openCollection).length !== 1 ? 'es' : ''}
              </p>
            </div>
          </div>
        </div>
      ) : (
      <div className="mb-8">
        <motion.div
          className="mb-3 flex items-center justify-between"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h3 className="text-sm font-mono uppercase tracking-wider text-[#5A6078]">Colecciones</h3>
          <button
            type="button"
            onClick={() => {
              setEditingCollection(null);
              setCollectionFormOpen(true);
            }}
            className="story-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
            title="Crear colección"
          >
            <FolderPlus size={14} /> Colección
          </button>
        </motion.div>
        {collections.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#2A3045] py-6 text-center text-sm text-[#5A6078]">
            Agrupa lugares en colecciones (regiones, reinos, etc.)
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {collections.map((col, i) => (
              <CollectionCard
                key={col.id}
                name={col.name}
                imageUrl={col.imageUrl}
                subtitle={`${placesInCollection(col).length} lugares`}
                index={i}
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

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <motion.div
          className="relative flex-1"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
          <input
            type="text"
            placeholder={openCollection ? 'Buscar en la colección...' : 'Buscar lugares...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="story-input w-full pl-10"
          />
        </motion.div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="story-btn-primary text-sm"
        >
          <Plus size={16} /> Agregar
        </button>
      </div>

      {(openCollection ? folderPlaces : rootPlaces).length === 0 ? (
        <div className="py-16 text-center">
          <MapPin size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="mb-4 text-[#5A6078]">
            {openCollection ? 'No hay lugares en esta colección' : 'No hay lugares sueltos'}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="story-btn-primary text-sm"
          >
            <Plus size={16} /> Crear Lugar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(openCollection ? folderPlaces : rootPlaces).map((place, i) => renderPlaceCard(place, i))}
        </div>
      )}

      <PlaceFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        worldId={worldId}
        initial={editing}
        onSubmit={onSubmit}
      />

      <PlaceCollectionFormModal
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
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        message="Este lugar irá a la papelera."
        onConfirm={() => {
          if (deleteId) {
            deletePlace(deleteId);
            toast.success('Lugar enviado a la papelera');
          }
        }}
      />

      <ConfirmDeleteModal
        open={!!deleteCollectionId}
        onClose={() => setDeleteCollectionId(null)}
        message="¿Eliminar esta colección? Los lugares no se borran."
        onConfirm={() => {
          if (deleteCollectionId) {
            deletePlaceCollection(deleteCollectionId);
            toast.success('Colección eliminada');
          }
        }}
      />
    </motion.div>
  );
}
