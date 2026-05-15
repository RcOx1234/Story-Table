import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Globe, Plus, Heart, MapPin } from 'lucide-react';
import { MapFormModal } from '@/components/modals/crud/MapFormModal';
import type { MapData } from '@/types';
import { toast } from 'sonner';

type Props = { worldId: string };

export function WorldMapsSection({ worldId }: Props) {
  const navigate = useNavigate();
  const maps = useAppStore((s) => s.getMapsByWorld(worldId));
  const addMap = useAppStore((s) => s.addMap);
  const toggleFavoriteMap = useAppStore((s) => s.toggleFavoriteMap);
  const [modalOpen, setModalOpen] = useState(false);

  const onCreate = (data: Omit<MapData, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newId = addMap(data);
    toast.success('Mapa creado');
    navigate(`/world/${worldId}/map/${newId}`);
  };

  if (maps.length === 0) {
    return (
      <>
        <div className="py-16 text-center">
          <Globe size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <h3 className="mb-2 text-lg text-[#E8E9EB]">Aún no hay mapas</h3>
          <p className="mb-4 text-sm text-[#5A6078]">Crea un mapa interactivo con imagen base y marcadores.</p>
          <button type="button" onClick={() => setModalOpen(true)} className="story-btn-primary text-sm">
            <Plus size={16} /> Crear mapa
          </button>
        </div>
        <MapFormModal open={modalOpen} onClose={() => setModalOpen(false)} worldId={worldId} onSubmit={onCreate} />
      </>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-[#5A6078]">{maps.length} mapa{maps.length !== 1 ? 's' : ''}</p>
        <button type="button" onClick={() => setModalOpen(true)} className="story-btn-primary text-sm">
          <Plus size={16} /> Nuevo mapa
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {maps.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/world/${worldId}/map/${m.id}`)}
            onClick={() => navigate(`/world/${worldId}/map/${m.id}`)}
            className="story-card cursor-pointer overflow-hidden"
          >
            <div className="relative aspect-video bg-[#111318]">
              {m.imageUrl ? (
                <img src={m.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <MapPin className="text-[#3A4460]" size={40} />
                </div>
              )}
              <button
                type="button"
                aria-label="Favorito"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavoriteMap(m.id);
                }}
                className="absolute right-2 top-2 rounded-lg bg-black/50 p-2 backdrop-blur-sm"
              >
                <Heart size={14} className={m.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-white'} />
              </button>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-[#E8E9EB]">{m.name}</h3>
              {m.description && <p className="mt-1 line-clamp-2 text-xs text-[#5A6078]">{m.description}</p>}
              <p className="mt-2 text-xs text-[#5A6078]">{m.markers.length} marcadores</p>
            </div>
          </motion.div>
        ))}
      </div>
      <MapFormModal open={modalOpen} onClose={() => setModalOpen(false)} worldId={worldId} onSubmit={onCreate} />
    </>
  );
}
