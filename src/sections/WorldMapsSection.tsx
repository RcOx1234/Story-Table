import { useState } from 'react';
import { useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Globe, Plus, Heart, MapPin, Trash2 } from 'lucide-react';
import { MapFormModal } from '@/components/modals/crud/MapFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import type { MapData } from '@/types';
import { toast } from 'sonner';
import { purgeMapStorage } from '@/lib/trashStorage';
import { isFirebaseConfigured } from '@/lib/firebase';

type Props = { worldId: string };

export function WorldMapsSection({ worldId }: Props) {
  const navigateWithReturn = useNavigateWithReturn();
  const maps = useAppStore((s) => s.getMapsByWorld(worldId));
  const addMap = useAppStore((s) => s.addMap);
  const deleteMap = useAppStore((s) => s.deleteMap);
  const toggleFavoriteMap = useAppStore((s) => s.toggleFavoriteMap);
  const getWorldById = useAppStore((s) => s.getWorldById);
  const user = useAppStore((s) => s.user);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MapData | null>(null);

  const onCreate = (data: Omit<MapData, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newId = addMap(data);
    toast.success('Mapa creado');
    navigateWithReturn(`/world/${worldId}/map/${newId}`);
  };

  const handleDeleteMap = async () => {
    if (!deleteTarget) return;
    const world = getWorldById(worldId);
    if (user?.id && world && isFirebaseConfigured()) {
      try {
        await purgeMapStorage(user.id, deleteTarget, world);
      } catch {
        /* continuar con borrado local */
      }
    }
    deleteMap(deleteTarget.id);
    toast.success('Mapa eliminado');
    setDeleteTarget(null);
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
        <p className="text-sm text-[#5A6078]">
          {maps.length} mapa{maps.length !== 1 ? 's' : ''}
        </p>
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
            onKeyDown={(e) => e.key === 'Enter' && navigateWithReturn(`/world/${worldId}/map/${m.id}`)}
            onClick={() => navigateWithReturn(`/world/${worldId}/map/${m.id}`)}
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
              <button
                type="button"
                aria-label="Eliminar mapa"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(m);
                }}
                className="absolute left-2 top-2 rounded-lg bg-black/50 p-2 text-[#D61E2B] backdrop-blur-sm transition-colors hover:bg-[#D61E2B]/80 hover:text-white"
              >
                <Trash2 size={14} />
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
      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar mapa"
        message={deleteTarget ? `¿Eliminar "${deleteTarget.name}" permanentemente?` : ''}
        confirmLabel="Eliminar"
        onConfirm={() => void handleDeleteMap()}
      />
    </>
  );
}
