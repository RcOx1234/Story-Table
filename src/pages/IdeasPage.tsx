import { useState } from 'react';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Lightbulb, Heart, Tag, ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IdeaFormModal } from '@/components/modals/crud/IdeaFormModal';
import type { Idea } from '@/types';
import { toast } from 'sonner';

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
  const navigate = useNavigate();
  const ideas = useAppStore((s) => s.ideas.filter((i) => !i.isDeleted));
  const addIdea = useAppStore((s) => s.addIdea);
  const toggleFav = useAppStore((s) => s.toggleFavoriteIdea);
  const deleteIdea = useAppStore((s) => s.deleteIdea);
  const worlds = useAppStore((s) => s.worlds.filter((w) => !w.isDeleted));
  const [filter, setFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const filtered = ideas.filter((i) => !filter || i.type === filter);

  const onSubmit = (data: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>) => {
    addIdea(data);
    toast.success('Idea guardada');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-4">
        <button type="button" onClick={() => navigate('/')} className="rounded-lg p-2 transition-all hover:bg-[#1E2230]">
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
        <button type="button" onClick={() => setFormOpen(true)} className="story-btn-primary ml-auto text-sm">
          <Plus size={16} /> Nueva Idea
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Lightbulb size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="mb-4 text-[#5A6078]">Tu bandeja de ideas está vacía</p>
          <button type="button" onClick={() => setFormOpen(true)} className="story-btn-primary text-sm">
            <Plus size={16} /> Capturar Primera Idea
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((idea, i) => {
            const world = worlds.find((w) => w.id === idea.worldId);
            return (
              <motion.div
                key={idea.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="story-card group flex items-start gap-4 p-4"
              >
                <button
                  type="button"
                  onClick={() => toggleFav(idea.id)}
                  className="flex-shrink-0 rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
                >
                  <Heart size={14} className={idea.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-sm text-[#E8E9EB]">{idea.description}</p>
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
                    <span className="text-[10px] text-[#5A6078]">{new Date(idea.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    deleteIdea(idea.id);
                    toast.success('Idea enviada a la papelera');
                  }}
                  className="rounded-lg p-1.5 text-[#5A6078] opacity-0 transition-all hover:bg-[#D61E2B]/10 hover:text-[#D61E2B] group-hover:opacity-100"
                  aria-label="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      <IdeaFormModal open={formOpen} onClose={() => setFormOpen(false)} worldId={null} onSubmit={onSubmit} />
    </motion.div>
  );
}
