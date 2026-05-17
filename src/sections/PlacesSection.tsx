import { useState } from 'react';
import { useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Search, MapPin, Heart, FolderOpen } from 'lucide-react';
import type { Place, PlaceCollection } from '@/types';
import { PlaceFormModal } from '@/components/modals/crud/PlaceFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
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
  const toggleFav = useAppStore((s) => s.toggleFavoritePlace);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Place | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [collectionDetail, setCollectionDetail] = useState<PlaceCollection | null>(null);

  const filtered = places.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));

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

  return (
    <div>

      {collections.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-mono uppercase tracking-wider text-[#5A6078]">Colecciones</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {collections.map((col, i) => (
              <motion.button
                key={col.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setCollectionDetail(col)}
                className="story-card overflow-hidden p-0 text-left transition-all hover:border-[#D61E2B]/40"
              >
                <div className="aspect-video bg-[#0B0D10]">
                  {col.imageUrl ? (
                    <img src={col.imageUrl} alt={col.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <FolderOpen size={28} className="text-[#3A4460]" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-[#E8E9EB]">{col.name}</p>
                  <p className="text-[10px] text-[#5A6078]">{col.placeIds.length} lugares</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
          <input
            type="text"
            placeholder="Buscar lugares..."
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
          <Plus size={16} /> Agregar
        </button>
      </div>
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <MapPin size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="mb-4 text-[#5A6078]">No hay lugares</p>
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
          {filtered.map((place, i) => (
            <motion.div
              key={place.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigateWithReturn(`/world/${worldId}/place/${place.id}`)}
              onClick={() => navigateWithReturn(`/world/${worldId}/place/${place.id}`)}
              className="story-card group relative cursor-pointer p-5"
            >
              <div className="absolute right-3 top-3 flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Favorito"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFav(place.id);
                  }}
                  className="rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
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
              {place.mapUrl && (
                <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-[#0B0D10]">
                  <img src={place.mapUrl} alt={place.name} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#5A6078]">
                  {typeLabels[place.type]}
                </span>
              </div>
              <h3 className="mb-1 font-semibold text-[#E8E9EB]">{place.name}</h3>
              {place.description && <p className="line-clamp-3 text-xs text-[#8B91A7]">{place.description}</p>}
            </motion.div>
          ))}
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

      
      <BaseModal
        open={!!collectionDetail}
        onClose={() => setCollectionDetail(null)}
        title={collectionDetail?.name ?? 'Colección'}
        maxWidthClass="max-w-2xl"
        footer={
          <button type="button" className="story-btn-secondary text-sm" onClick={() => setCollectionDetail(null)}>
            Cerrar
          </button>
        }
      >
        {collectionDetail && (
          <div className="space-y-4">
            {collectionDetail.imageUrl && (
              <img
                src={collectionDetail.imageUrl}
                alt=""
                className="max-h-48 w-full rounded-xl border border-[#2A3045] object-cover"
              />
            )}
            {collectionDetail.description && (
              <p className="text-sm text-[#8B91A7]">{collectionDetail.description}</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {places
                .filter(
                  (pl) =>
                    collectionDetail.placeIds.includes(pl.id) || pl.collectionId === collectionDetail.id
                )
                .map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => {
                      setCollectionDetail(null);
                      navigateWithReturn(`/world/${worldId}/place/${pl.id}`);
                    }}
                    className="story-card flex items-center gap-3 p-3 text-left hover:border-[#D61E2B]/40"
                  >
                    {pl.mapUrl ? (
                      <img src={pl.mapUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1E2230]">
                        <MapPin size={16} className="text-[#5A6078]" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-[#E8E9EB]">{pl.name}</span>
                  </button>
                ))}
            </div>
            {places.filter(
              (pl) =>
                collectionDetail.placeIds.includes(pl.id) || pl.collectionId === collectionDetail.id
            ).length === 0 && (
              <p className="text-sm text-[#5A6078]">No hay lugares en esta colección.</p>
            )}
          </div>
        )}
      </BaseModal>

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
    </div>
  );
}
