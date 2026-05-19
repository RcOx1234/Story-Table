import { useState } from 'react';
import { useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, MapPin, Heart, FolderPlus, ArrowLeft, ChevronRight } from 'lucide-react';
import { StorySelect } from '@/components/common/StorySelect';
import type { Place, PlaceCollection } from '@/types';
import { PlaceFormModal } from '@/components/modals/crud/PlaceFormModal';
import { PlaceCollectionFormModal } from '@/components/modals/crud/PlaceCollectionFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import { CollectionCard } from '@/components/common/CollectionCard';
import { PlaceCollectionDetailModal } from '@/components/modals/crud/PlaceCollectionDetailModal';
import { collectionTypeLabel } from '@/lib/collectionTypes';
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
  const [collectionFilter, setCollectionFilter] = useState('');
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null);
  const [detailCollection, setDetailCollection] = useState<PlaceCollection | null>(null);
  const [collectionFormOpen, setCollectionFormOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<PlaceCollection | null>(null);
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(null);

  const placesInCollection = (col: PlaceCollection) =>
    places.filter((pl) => col.placeIds.includes(pl.id) || pl.collectionId === col.id);

  const matchesSearch = (p: Place) => !search || p.name.toLowerCase().includes(search.toLowerCase());

  const placeInCollection = (p: Place, col: PlaceCollection) =>
    col.placeIds.includes(p.id) || p.collectionId === col.id;

  const openCollection = openCollectionId ? collections.find((c) => c.id === openCollectionId) : null;

  const matchesCollection = (p: Place) => {
    if (openCollection) return placeInCollection(p, openCollection);
    if (!collectionFilter) return true;
    const col = collections.find((c) => c.id === collectionFilter);
    if (!col) return true;
    return placeInCollection(p, col);
  };

  const displayedPlaces = places.filter((p) => matchesSearch(p) && matchesCollection(p));
  const collectionPlaces = openCollection ? places.filter((p) => placeInCollection(p, openCollection)) : [];

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

  const modals = (
    <>
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
      <PlaceCollectionDetailModal
        open={!!detailCollection}
        onClose={() => setDetailCollection(null)}
        collection={detailCollection}
        onEdit={() => {
          if (detailCollection) {
            setEditingCollection(detailCollection);
            setCollectionFormOpen(true);
            setDetailCollection(null);
          }
        }}
        onDelete={() => {
          if (detailCollection) setDeleteCollectionId(detailCollection.id);
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
            if (openCollectionId === deleteCollectionId) setOpenCollectionId(null);
          }
        }}
      />
    </>
  );

  if (openCollection) {
    const folderPlaces = collectionPlaces.filter(matchesSearch);
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`collection-${openCollection.id}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#2A3045] bg-[#111318] px-4 py-3">
          <button
            type="button"
            onClick={() => setOpenCollectionId(null)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[#8B91A7] hover:bg-[#1E2230] hover:text-[#E8E9EB]"
          >
            <ArrowLeft size={14} /> Lugares
          </button>
          <ChevronRight size={12} className="text-[#5A6078]" />
          <span className="font-semibold text-[#E8E9EB]">{openCollection.name}</span>
          <span className="text-xs text-[#5A6078]">
            {collectionTypeLabel(openCollection.collectionType, openCollection.customCollectionType)} ·{' '}
            {folderPlaces.length} lugares
          </span>
          <button
            type="button"
            className="story-btn-secondary ml-auto text-xs"
            onClick={() => setDetailCollection(openCollection)}
          >
            Ver detalles
          </button>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
            <input
              type="text"
              placeholder="Buscar en esta colección..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="story-input w-full pl-10"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="story-btn-primary text-sm"
          >
            <Plus size={16} /> Agregar lugar
          </button>
        </div>

        {folderPlaces.length === 0 ? (
          <motion.div className="py-16 text-center">
            <MapPin size={48} className="mx-auto mb-4 text-[#2A3045]" />
            <p className="mb-4 text-[#5A6078]">Esta colección no tiene lugares</p>
            <button type="button" onClick={() => setFormOpen(true)} className="story-btn-primary text-sm">
              <Plus size={16} /> Añadir lugar
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {folderPlaces.map((place, i) => renderPlaceCard(place, i))}
          </div>
        )}
        {modals}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="places-root"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
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
                subtitle={`${collectionTypeLabel(col.collectionType, col.customCollectionType)} · ${placesInCollection(col).length} lugares`}
                index={i}
                isActive={openCollectionId === col.id}
                onOpen={() => setOpenCollectionId(col.id)}
                onViewDetails={() => setDetailCollection(col)}
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
            placeholder="Buscar lugares..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="story-input w-full pl-10"
          />
        </motion.div>
        {collections.length > 0 && (
          <StorySelect
            value={collectionFilter}
            onChange={setCollectionFilter}
            options={[
              { value: '', label: 'Todos los lugares' },
              ...collections.map((col) => ({
                value: col.id,
                label: col.name,
                sublabel: collectionTypeLabel(col.collectionType, col.customCollectionType),
              })),
            ]}
            placeholder="Filtrar por colección"
            className="min-w-[180px] w-auto"
            aria-label="Filtrar por colección"
          />
        )}
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

      {displayedPlaces.length === 0 ? (
        <div className="py-16 text-center">
          <MapPin size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="mb-4 text-[#5A6078]">
            {openCollectionId || collectionFilter ? 'No hay lugares en esta vista' : 'No hay lugares'}
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
          {displayedPlaces.map((place, i) => renderPlaceCard(place, i))}
        </div>

      )}
      {modals}
      </motion.div>
    </AnimatePresence>
  );
}
