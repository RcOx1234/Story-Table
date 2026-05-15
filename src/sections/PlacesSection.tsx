import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Search, MapPin, Heart } from 'lucide-react';
import type { Place } from '@/types';
import { PlaceFormModal } from '@/components/modals/crud/PlaceFormModal';
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
  const navigate = useNavigate();
  const places = useAppStore((s) => s.getPlacesByWorld(worldId));
  const addPlace = useAppStore((s) => s.addPlace);
  const updatePlace = useAppStore((s) => s.updatePlace);
  const toggleFav = useAppStore((s) => s.toggleFavoritePlace);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Place | null>(null);

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
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/world/${worldId}/place/${place.id}`)}
              onClick={() => navigate(`/world/${worldId}/place/${place.id}`)}
              className="story-card group relative cursor-pointer p-5"
            >
              <button
                type="button"
                aria-label="Favorito"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFav(place.id);
                }}
                className="absolute right-3 top-3 rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
              >
                <Heart size={14} className={place.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
              </button>
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
    </div>
  );
}
