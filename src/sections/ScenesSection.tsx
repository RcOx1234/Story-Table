import { useState } from 'react';
import { useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Search, Heart, Flame, Users, MapPin } from 'lucide-react';
import type { Scene } from '@/types';
import { SceneFormModal } from '@/components/modals/crud/SceneFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import { toast } from 'sonner';

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: '#EAB308' },
  confirmed: { label: 'Confirmado', color: '#22C55E' },
  revision: { label: 'En Revisión', color: '#3B82F6' },
  discarded: { label: 'Descartado', color: '#6B7280' },
  important: { label: 'Importante', color: '#D61E2B' },
  secret: { label: 'Secreto', color: '#8B5CF6' },
  canon: { label: 'Canon', color: '#22C55E' },
  noncanon: { label: 'No Canon', color: '#6B7280' },
};

interface Props {
  worldId: string;
}

export function ScenesSection({ worldId }: Props) {
  const navigateWithReturn = useNavigateWithReturn();
  const scenes = useAppStore((s) => s.getScenesByWorld(worldId));
  const addScene = useAppStore((s) => s.addScene);
  const updateScene = useAppStore((s) => s.updateScene);
  const deleteScene = useAppStore((s) => s.deleteScene);
  const toggleFavorite = useAppStore((s) => s.toggleFavoriteScene);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Scene | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = scenes.filter((s) => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const onSubmit = (data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editing) {
      updateScene(editing.id, data);
      toast.success('Escena actualizada');
    } else {
      addScene(data);
      toast.success('Escena guardada');
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
            placeholder="Buscar escenas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="story-input w-full pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="story-input text-sm">
            <option value="">Todos los estados</option>
            {Object.entries(statusLabels).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
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
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-4 text-[#5A6078]">No hay escenas aún</p>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="story-btn-primary text-sm"
          >
            <Plus size={16} /> Crear Escena
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((scene, i) => (
            <motion.div
              key={scene.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigateWithReturn(`/world/${worldId}/scene/${scene.id}`)}
              className="group story-card cursor-pointer p-5 transition-all hover:bg-[#1A1E28]"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="font-semibold text-[#E8E9EB]">{scene.title}</h3>
                    <span
                      className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                      style={{
                        backgroundColor: `${statusLabels[scene.status]?.color}15`,
                        color: statusLabels[scene.status]?.color,
                      }}
                    >
                      {statusLabels[scene.status]?.label}
                    </span>
                  </div>
                  {scene.description && <p className="mb-3 line-clamp-2 text-sm text-[#8B91A7]">{scene.description}</p>}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#5A6078]">
                    {scene.placeName && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {scene.placeName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {scene.characters.length} personajes
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame size={12} className={scene.emotionalIntensity >= 4 ? 'text-[#D61E2B]' : ''} />
                      {scene.mood ? `${scene.mood} · ` : ''}
                      {scene.emotionalIntensity}/5
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex flex-shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(scene.id);
                    }}
                    className="rounded-lg p-2 transition-all hover:bg-[#1E2230]"
                  >
                    <Heart size={16} className={scene.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
                  </button>
                  <EntityCardMenu
                    onEdit={() => {
                      setEditing(scene);
                      setFormOpen(true);
                    }}
                    onDelete={() => setDeleteId(scene.id)}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <SceneFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        worldId={worldId}
        initial={editing}
        onSubmit={onSubmit}
      />

      <ConfirmDeleteModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        message="Esta escena irá a la papelera."
        onConfirm={() => {
          if (deleteId) {
            deleteScene(deleteId);
            toast.success('Escena enviada a la papelera');
          }
        }}
      />
    </div>
  );
}
