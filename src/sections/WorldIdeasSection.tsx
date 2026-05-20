import { useState } from 'react';
import { useWorldEditFromUrl } from '@/hooks/useWorldEditFromUrl';
import { useSectionCardMenuDeps, entityCardMenuProps } from '@/hooks/useEntityCardMenu';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Lightbulb, Heart, Pencil, UserCircle } from 'lucide-react';
import { IdeaFormModal } from '@/components/modals/crud/IdeaFormModal';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import type { Idea } from '@/types';
import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';
import { storyEntityDataAttrs } from '@/lib/storyEntityContext';
import { toast } from 'sonner';
import { AudioPlayer } from '@/components/common/AudioPlayer';

interface Props {
  worldId: string;
}

const typeLabels: Record<string, { label: string; color: string }> = {
  scene: { label: 'Escena', color: '#22C55E' },
  character: { label: 'Personaje', color: '#3B82F6' },
  plot: { label: 'Trama', color: '#D61E2B' },
  world: { label: 'Mundo', color: '#8B5CF6' },
  dialogue: { label: 'Diálogo', color: '#EAB308' },
  lore: { label: 'Lore', color: '#EC4899' },
  other: { label: 'Otro', color: '#5A6078' },
};

export function WorldIdeasSection({ worldId }: Props) {
  const cardMenu = useSectionCardMenuDeps();
  const ideas = useAppStore((s) => s.ideas.filter((i) => i.worldId === worldId && !i.isDeleted));
  const addIdea = useAppStore((s) => s.addIdea);
  const deleteIdea = useAppStore((s) => s.deleteIdea);
  const updateIdea = useAppStore((s) => s.updateIdea);
  const toggleFav = useAppStore((s) => s.toggleFavoriteIdea);
  const getCharactersByWorld = useAppStore((s) => s.getCharactersByWorld);
  const [filter, setFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<Idea | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editFromDetail, setEditFromDetail] = useState<Idea | null>(null);

  const filtered = ideas.filter((i) => !filter || i.type === filter);

  const onSubmit = (data: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>) => {
    addIdea(data);
    toast.success('Idea guardada');
  };

  const openEdit = (idea: Idea) => {
    setEditFromDetail(idea);
    setFormOpen(true);
  };

  useWorldEditFromUrl(openEdit, (id) => ideas.find((i) => i.id === id));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter('')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${!filter ? 'bg-[#D61E2B] text-white' : 'bg-[#1E2230] text-[#8B91A7]'}`}
          >
            Todas
          </button>
          {Object.entries(typeLabels).map(([key, { label }]) => (
            <button
              type="button"
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${filter === key ? 'bg-[#D61E2B] text-white' : 'bg-[#1E2230] text-[#8B91A7]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setFormOpen(true)} className="story-btn-primary ml-auto text-sm">
          <Plus size={16} /> Nueva Idea
        </button>
      </div>
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Lightbulb size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="mb-4 text-[#5A6078]">No hay ideas en este mundo</p>
          <button type="button" onClick={() => setFormOpen(true)} className="story-btn-primary text-sm">
            <Plus size={16} /> Capturar Idea
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((idea, i) => (
            <motion.div
              key={idea.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setDetail(idea)}
              onClick={() => setDetail(idea)}
              className="story-card group relative flex cursor-pointer items-start gap-4 p-4 transition-all hover:border-[#D61E2B]/30"
              {...storyEntityDataAttrs('idea', idea.id, worldId, idea.description.slice(0, 48) || 'Idea')}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFav(idea.id);
                }}
                className="mt-0.5 flex-shrink-0 rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
              >
                <Heart size={14} className={idea.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="mb-2 line-clamp-3 text-sm">
                  <StoryRichTextDisplay text={idea.description} worldId={worldId} className="text-[#E8E9EB]" />
                </div>
                {idea.audioUrl && <AudioPlayer src={idea.audioUrl} compact className="mb-2 max-w-xs" />}
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                    style={{
                      backgroundColor: `${typeLabels[idea.type]?.color}15`,
                      color: typeLabels[idea.type]?.color,
                    }}
                  >
                    {typeLabels[idea.type]?.label}
                  </span>
                  <span className="text-[10px] text-[#5A6078]">{new Date(idea.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <EntityCardMenu
                className="flex-shrink-0 opacity-70 group-hover:opacity-100"
                {...entityCardMenuProps(worldId, 'idea', idea.id, idea.description.slice(0, 48) || 'Idea', {
                  ...cardMenu,
                  onViewDetails: () => setDetail(idea),
                })}
                onDelete={() => setDeleteId(idea.id)}
              />
            </motion.div>
          ))}
        </div>
      )}
      <IdeaFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditFromDetail(null);
        }}
        worldId={worldId}
        initial={editFromDetail}
        onSubmit={(data) => {
          if (editFromDetail) {
            updateIdea(editFromDetail.id, data);
            toast.success('Idea actualizada');
            setEditFromDetail(null);
          } else {
            onSubmit(data);
          }
        }}
      />

      <BaseModal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detalle de la idea"
        description={detail ? new Date(detail.createdAt).toLocaleString() : undefined}
        maxWidthClass="max-w-lg"
        footer={
          <>
            <button type="button" className="story-btn-secondary text-sm" onClick={() => setDetail(null)}>
              Cerrar
            </button>
            <button
              type="button"
              className="story-btn-primary text-sm"
              onClick={() => {
                if (!detail) return;
                setEditFromDetail(detail);
                setDetail(null);
                setFormOpen(true);
              }}
            >
              <Pencil size={14} /> Editar
            </button>
          </>
        }
      >
        {detail && (
          <div className="space-y-4">
            {detail.imageUrl && (
              <img
                src={detail.imageUrl}
                alt=""
                className="max-h-64 w-full rounded-xl border border-[#2A3045] object-contain"
              />
            )}
            {detail.audioUrl && <AudioPlayer src={detail.audioUrl} />}
            <StoryRichTextDisplay text={detail.description} worldId={worldId} className="text-[#E8E9EB]" />
            <div className="flex flex-wrap gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                style={{
                  backgroundColor: `${typeLabels[detail.type]?.color}20`,
                  color: typeLabels[detail.type]?.color,
                }}
              >
                {typeLabels[detail.type]?.label}
              </span>
              {detail.tags?.map((t) => (
                <span key={t} className="rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] text-[#8B91A7]">
                  {t}
                </span>
              ))}
            </div>
            {getCharactersByWorld(worldId).length > 0 && (
              <div>
                <label className="mb-1 flex items-center gap-2 text-xs text-[#5A6078]">
                  <UserCircle size={12} className="text-[#3B82F6]" /> Personaje vinculado
                </label>
                <select
                  className="story-input w-full text-sm"
                  value={detail.linkedCharacterId ?? ''}
                  onChange={(e) => {
                    updateIdea(detail.id, { linkedCharacterId: e.target.value || null });
                    setDetail({ ...detail, linkedCharacterId: e.target.value || null });
                    toast.success('Personaje vinculado');
                  }}
                >
                  <option value="">Sin personaje</option>
                  {getCharactersByWorld(worldId)
                    .filter((c) => !c.isDeleted)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        )}
      </BaseModal>

      <ConfirmDeleteModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        message="Esta idea irá a la papelera."
        onConfirm={() => {
          if (deleteId) {
            deleteIdea(deleteId);
            toast.success('Idea enviada a la papelera');
          }
        }}
      />
    </div>
  );
}
