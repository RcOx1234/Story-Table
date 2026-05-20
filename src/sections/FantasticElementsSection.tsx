import { useMemo, useState } from 'react';
import { useWorldEditFromUrl } from '@/hooks/useWorldEditFromUrl';
import { useSectionCardMenuDeps, entityCardMenuProps } from '@/hooks/useEntityCardMenu';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Heart, Search } from 'lucide-react';
import { useAppStore } from '@/store';
import type { FantasticElement, FantasticElementCategory } from '@/types';
import { FANTASTIC_CATEGORY_LABELS } from '@/lib/fantasticElementLabels';
import { FantasticElementFormModal } from '@/components/modals/crud/FantasticElementFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';
import { toast } from 'sonner';
import { storyEntityDataAttrs } from '@/lib/storyEntityContext';

const CATEGORY_COLORS: Record<FantasticElementCategory, string> = {
  power: '#8B5CF6',
  ability: '#3B82F6',
  spell: '#D61E2B',
  technique: '#EAB308',
  animal: '#22C55E',
};

interface Props {
  worldId: string;
}

export function FantasticElementsSection({ worldId }: Props) {
  const cardMenu = useSectionCardMenuDeps();
  const items = useAppStore((s) => s.getFantasticElementsByWorld(worldId));
  const add = useAppStore((s) => s.addFantasticElement);
  const update = useAppStore((s) => s.updateFantasticElement);
  const remove = useAppStore((s) => s.deleteFantasticElement);
  const toggleFav = useAppStore((s) => s.toggleFavoriteFantasticElement);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<FantasticElementCategory | ''>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FantasticElement | null>(null);
  const [detail, setDetail] = useState<FantasticElement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      items.filter(
        (x) =>
          (!catFilter || x.category === catFilter) &&
          (!search || x.name.toLowerCase().includes(search.toLowerCase()))
      ),
    [items, search, catFilter]
  );

  const onSubmit = (data: Omit<FantasticElement, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editing) {
      update(editing.id, data);
      toast.success('Elemento actualizado');
    } else {
      add(data);
      toast.success('Elemento guardado');
    }
    setEditing(null);
  };

  const openEdit = (el: FantasticElement) => {
    setEditing(el);
    setFormOpen(true);
  };

  useWorldEditFromUrl(openEdit, (id) => items.find((x) => x.id === id));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
          <input
            className="story-input w-full pl-9"
            placeholder="Buscar poderes, hechizos, criaturas…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="story-btn-primary shrink-0 text-sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus size={16} /> Agregar
        </button>
      </div>
      <motion.div
        layout
        className="mb-4 flex flex-wrap gap-2"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        {(['', ...(Object.keys(FANTASTIC_CATEGORY_LABELS) as FantasticElementCategory[])] as const).map(
          (k, i) => {
            const isAll = k === '';
            const active = isAll ? !catFilter : catFilter === k;
            const label = isAll ? 'Todos' : FANTASTIC_CATEGORY_LABELS[k];
            return (
              <motion.button
                key={k || 'all'}
                type="button"
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                onClick={() => setCatFilter(isAll ? '' : k)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  active ? 'text-white' : 'bg-[#1E2230] text-[#8B91A7] hover:text-[#E8E9EB]'
                }`}
                style={
                  active && !isAll
                    ? { backgroundColor: CATEGORY_COLORS[k] }
                    : active && isAll
                      ? { backgroundColor: '#D61E2B' }
                      : undefined
                }
              >
                {label}
              </motion.button>
            );
          }
        )}
      </motion.div>
      <AnimatePresence mode="wait">
      {filtered.length === 0 ? (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="py-16 text-center"
        >
          <Sparkles size={40} className="mx-auto mb-3 text-[#2A3045]" />
          <p className="text-[#5A6078]">Aún no hay elementos fantásticos</p>
        </motion.div>
      ) : (
        <motion.div
          key={catFilter || 'all'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((el, i) => (
            <motion.article
              key={el.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="story-card group relative cursor-pointer overflow-hidden p-4"
              onClick={() => setDetail(el)}
              {...storyEntityDataAttrs('fantastic', el.id, worldId, el.name)}
            >
              <div
                className="absolute left-0 top-0 h-full w-1"
                style={{ backgroundColor: CATEGORY_COLORS[el.category] }}
              />
              <div className="absolute right-2 top-2 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="rounded-lg p-1.5" onClick={() => toggleFav(el.id)} aria-label="Favorito">
                  <Heart size={14} className={el.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
                </button>
                <EntityCardMenu
                  {...entityCardMenuProps(worldId, 'fantastic', el.id, el.name, {
                    ...cardMenu,
                    onViewDetails: () => setDetail(el),
                  })}
                  onDelete={() => setDeleteId(el.id)}
                />
              </div>
              <div className="flex gap-3 pl-2">
                {el.imageUrl ? (
                  <img src={el.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#1E2230]">
                    <Sparkles size={20} style={{ color: CATEGORY_COLORS[el.category] }} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-[#E8E9EB]">{el.name}</h3>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: CATEGORY_COLORS[el.category] }}>
                    {FANTASTIC_CATEGORY_LABELS[el.category]}
                  </p>
                  {el.potency && <p className="mt-1 text-xs text-[#5A6078]">{el.potency}</p>}
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      )}
      </AnimatePresence>
      <AnimatePresence>
      {detail && (
        <motion.div
          key={detail.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetail(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="story-card max-h-[85vh] w-full max-w-lg overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono uppercase" style={{ color: CATEGORY_COLORS[detail.category] }}>
                  {FANTASTIC_CATEGORY_LABELS[detail.category]}
                </p>
                <h2 className="text-xl font-bold text-[#E8E9EB]">{detail.name}</h2>
              </div>
              <button type="button" className="story-btn-secondary text-xs" onClick={() => setDetail(null)}>
                Cerrar
              </button>
            </div>
            <StoryRichTextDisplay text={detail.description} worldId={worldId} />
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
      <FantasticElementFormModal open={formOpen} onClose={() => setFormOpen(false)} worldId={worldId} initial={editing} onSubmit={onSubmit} />
      <ConfirmDeleteModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        message="¿Eliminar este elemento fantástico?"
        onConfirm={() => {
          if (deleteId) remove(deleteId);
          toast.success('Eliminado');
        }}
      />
    </motion.div>
  );
}
