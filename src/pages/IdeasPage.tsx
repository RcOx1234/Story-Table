import { useState } from 'react';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Lightbulb, Heart, Tag, ArrowLeft, Trash2, UserCircle, Pencil } from 'lucide-react';
import { useNavigationReturn } from '@/hooks/useNavigationReturn';
import { AudioPlayer } from '@/components/common/AudioPlayer';
import { IdeaFormModal } from '@/components/modals/crud/IdeaFormModal';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import type { Idea } from '@/types';
import { toast } from 'sonner';
import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';

const typeLabels: Record<string, { label: string; color: string }> = {
  scene: { label: 'Escena', color: '#22C55E' },
  character: { label: 'Personaje', color: '#3B82F6' },
  plot: { label: 'Trama', color: '#D61E2B' },
  world: { label: 'Mundo', color: '#8B5CF6' },
  dialogue: { label: 'Diálogo', color: '#EAB308' },
  lore: { label: 'Lore', color: '#EC4899' },
  other: { label: 'Otro', color: '#5A6078' },
};

export function IdeasPage() {
  const goBack = useNavigationReturn('/');
  const ideas = useAppStore((s) => s.ideas.filter((i) => !i.isDeleted));
  const addIdea = useAppStore((s) => s.addIdea);
  const updateIdea = useAppStore((s) => s.updateIdea);
  const toggleFav = useAppStore((s) => s.toggleFavoriteIdea);
  const deleteIdea = useAppStore((s) => s.deleteIdea);
  const worlds = useAppStore((s) => s.worlds.filter((w) => !w.isDeleted));
  const getCharactersByWorld = useAppStore((s) => s.getCharactersByWorld);

  const [filter, setFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [previewIdea, setPreviewIdea] = useState<Idea | null>(null);

  const filtered = ideas.filter((i) => !filter || i.type === filter);

  const onCreateSubmit = (data: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>) => {
    addIdea(data);
    toast.success('Idea guardada');
  };

  const previewWorldChars = previewIdea?.worldId ? getCharactersByWorld(previewIdea.worldId).filter((c) => !c.isDeleted) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-4">
        <button type="button" onClick={goBack} className="rounded-lg p-2 transition-all hover:bg-[#1E2230]">
          <ArrowLeft size={20} className="text-[#8B91A7]" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
            Bandeja de Ideas
          </h1>
          <p className="text-sm text-[#5A6078]">{ideas.length} ideas capturadas</p>
        </div>
      </div>

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
        <button
          type="button"
          onClick={() => {
            setEditingIdea(null);
            setFormOpen(true);
          }}
          className="story-btn-primary ml-auto text-sm"
        >
          <Plus size={16} /> Nueva Idea
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Lightbulb size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="mb-4 text-[#5A6078]">Tu bandeja de ideas está vacía</p>
          <button
            type="button"
            onClick={() => {
              setEditingIdea(null);
              setFormOpen(true);
            }}
            className="story-btn-primary text-sm"
          >
            <Plus size={16} /> Capturar Primera Idea
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((idea, i) => {
            const world = worlds.find((w) => w.id === idea.worldId);
            const linked = idea.worldId ? getCharactersByWorld(idea.worldId).find((c) => c.id === idea.linkedCharacterId) : undefined;
            return (
              <motion.div
                key={idea.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="story-card group flex items-stretch gap-3 p-4"
              >
                {idea.imageUrl ? (
                  <img
                    src={idea.imageUrl}
                    alt=""
                    className="h-16 w-16 flex-shrink-0 rounded-lg border border-[#2A3045] object-cover"
                  />
                ) : (
                  <motion.div
                    aria-hidden
                    className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-[#2A3045] bg-[#111318]"
                  >
                    <Lightbulb size={20} className="text-[#3A4460]" />
                  </motion.div>
                )}
                <button
                  type="button"
                  onClick={() => toggleFav(idea.id)}
                  className="flex-shrink-0 self-start rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
                >
                  <Heart size={14} className={idea.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
                </button>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setPreviewIdea(idea)}
                >
                  <div className="mb-2 line-clamp-3 text-sm">
                    <StoryRichTextDisplay
                      text={idea.description}
                      worldId={idea.worldId ?? undefined}
                      className="text-[#E8E9EB]"
                    />
                  </div>
                  {idea.audioUrl && <AudioPlayer src={idea.audioUrl} compact className="mb-2 max-w-xs" />}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                      style={{
                        backgroundColor: `${typeLabels[idea.type]?.color}15`,
                        color: typeLabels[idea.type]?.color,
                      }}
                    >
                      {typeLabels[idea.type]?.label}
                    </span>
                    {world && (
                      <span className="flex items-center gap-1 text-[10px] text-[#5A6078]">
                        <Tag size={8} /> {world.name}
                      </span>
                    )}
                    {linked && (
                      <span className="flex items-center gap-1 text-[10px] text-[#3B82F6]">
                        <UserCircle size={10} /> {linked.name}
                      </span>
                    )}
                    <span className="text-[10px] text-[#5A6078]">{new Date(idea.createdAt).toLocaleDateString()}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteIdea(idea.id);
                    toast.success('Idea enviada a la papelera');
                  }}
                  className="flex-shrink-0 self-start rounded-lg p-1.5 text-[#5A6078] opacity-0 transition-all hover:bg-[#D61E2B]/10 hover:text-[#D61E2B] group-hover:opacity-100"
                  aria-label="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      <IdeaFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingIdea(null);
        }}
        worldId={null}
        initial={editingIdea}
        onSubmit={(data) => {
          if (editingIdea) {
            updateIdea(editingIdea.id, data);
            toast.success('Idea actualizada');
          } else {
            onCreateSubmit(data);
          }
        }}
      />

      <BaseModal
        open={!!previewIdea}
        onClose={() => setPreviewIdea(null)}
        title="Detalle de la idea"
        description={previewIdea ? new Date(previewIdea.createdAt).toLocaleString() : undefined}
        footer={
          <>
            <button type="button" className="story-btn-secondary text-sm" onClick={() => setPreviewIdea(null)}>
              Cerrar
            </button>
            <button
              type="button"
              className="story-btn-primary text-sm"
              onClick={() => {
                if (!previewIdea) return;
                setEditingIdea(previewIdea);
                setPreviewIdea(null);
                setFormOpen(true);
              }}
            >
              <Pencil size={14} /> Editar
            </button>
          </>
        }
      >
        {previewIdea && (
          <div className="space-y-4">
            {previewIdea.imageUrl && (
              <img
                src={previewIdea.imageUrl}
                alt=""
                className="max-h-64 w-full rounded-xl border border-[#2A3045] object-contain"
              />
            )}
            {previewIdea.audioUrl && <AudioPlayer src={previewIdea.audioUrl} />}
            <StoryRichTextDisplay
              text={previewIdea.description}
              worldId={previewIdea.worldId ?? undefined}
              className="text-[#E8E9EB]"
            />
            <div className="flex flex-wrap gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                style={{
                  backgroundColor: `${typeLabels[previewIdea.type]?.color}20`,
                  color: typeLabels[previewIdea.type]?.color,
                }}
              >
                {typeLabels[previewIdea.type]?.label}
              </span>
              {previewIdea.tags?.map((t) => (
                <span key={t} className="rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] text-[#8B91A7]">
                  {t}
                </span>
              ))}
            </div>

            {previewIdea.worldId && previewWorldChars.length > 0 && (
              <div>
                <label className="mb-1 flex items-center gap-2 text-xs text-[#5A6078]">
                  <UserCircle size={12} className="text-[#3B82F6]" /> Personaje que interactúa
                </label>
                <select
                  className="story-input w-full text-sm"
                  value={previewIdea.linkedCharacterId ?? ''}
                  onChange={(e) => {
                    updateIdea(previewIdea.id, { linkedCharacterId: e.target.value || null });
                    setPreviewIdea({
                      ...previewIdea,
                      linkedCharacterId: e.target.value || null,
                    });
                    toast.success('Personaje vinculado');
                  }}
                >
                  <option value="">Sin personaje</option>
                  {previewWorldChars.map((c) => (
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
    </motion.div>
  );
}
