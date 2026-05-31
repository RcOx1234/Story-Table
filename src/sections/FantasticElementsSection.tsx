import { useMemo, useState } from 'react';
import { useWorldEditFromUrl } from '@/hooks/useWorldEditFromUrl';
import { useSectionCardMenuDeps, entityCardMenuProps } from '@/hooks/useEntityCardMenu';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Heart, Search } from 'lucide-react';
import { FantasticCategoryIcon } from '@/lib/fantasticCategoryIcon';
import { useAppStore } from '@/store';
import type { FantasticElement, FantasticElementCategory } from '@/types';
import { FANTASTIC_CATEGORY_LABELS } from '@/lib/fantasticElementLabels';
import { FantasticElementFormModal } from '@/components/modals/crud/FantasticElementFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { EntityFoldersSection } from '@/components/common/EntityFoldersSection';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';
import { toast } from 'sonner';
import { storyEntityDataAttrs } from '@/lib/storyEntityContext';
import { RichTextSnippet } from '@/components/common/RichTextSnippet';

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

function fantasticMetaLines(el: FantasticElement): string[] {
  const lines: string[] = [];
  if (el.potency) lines.push(el.potency);
  if (el.elementAffinity) lines.push(el.elementAffinity);
  if (el.category === 'animal') {
    if (el.species) lines.push(el.species);
    if (el.habitat) lines.push(el.habitat);
  } else if (el.category === 'spell' || el.category === 'technique') {
    if (el.range) lines.push(`Alcance: ${el.range}`);
    if (el.cost) lines.push(`Coste: ${el.cost}`);
  } else {
    if (el.range) lines.push(el.range);
    if (el.requirements) lines.push(el.requirements);
  }
  if (el.linkedCharacterIds?.length) {
    lines.push(`${el.linkedCharacterIds.length} personaje(s)`);
  }
  if (el.tags.length) lines.push(el.tags.slice(0, 3).join(' · '));
  return lines;
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

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const categoryBar = (
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
  );

  const renderElement = (el: FantasticElement, i: number) => {
    const meta = fantasticMetaLines(el);
    return (
      <motion.article
        key={el.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.03 }}
        className="story-card group relative cursor-pointer overflow-hidden p-0"
        onClick={() => setDetail(el)}
        {...storyEntityDataAttrs('fantastic', el.id, worldId, el.name)}
      >
        <div
          className="absolute left-0 top-0 z-[1] h-full w-1"
          style={{ backgroundColor: CATEGORY_COLORS[el.category] }}
        />
        <div className="relative flex gap-2.5 p-2.5 pl-3">
          <div className="absolute right-1.5 top-1.5 z-[2] flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="rounded-lg p-1" onClick={() => toggleFav(el.id)} aria-label="Favorito">
              <Heart size={13} className={el.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
            </button>
            <EntityCardMenu
              {...entityCardMenuProps(worldId, 'fantastic', el.id, el.name, {
                ...cardMenu,
                onViewDetails: () => setDetail(el),
              })}
              onDelete={() => setDeleteId(el.id)}
            />
          </div>
          {el.imageUrl ? (
            <img src={el.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-[#2A3045] object-cover" />
          ) : (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#2A3045] bg-[#1E2230]"
              style={{ boxShadow: `inset 0 0 12px ${CATEGORY_COLORS[el.category]}18` }}
            >
              <FantasticCategoryIcon category={el.category} size={18} color={CATEGORY_COLORS[el.category]} />
            </div>
          )}
          <div className="min-w-0 flex-1 pr-5">
            <span
              className="mb-0.5 inline-block rounded px-1.5 py-px text-[9px] font-medium uppercase tracking-wider"
              style={{
                color: CATEGORY_COLORS[el.category],
                backgroundColor: `${CATEGORY_COLORS[el.category]}18`,
              }}
            >
              {FANTASTIC_CATEGORY_LABELS[el.category]}
            </span>
            <h3 className="truncate text-sm font-semibold text-[#E8E9EB]">{el.name}</h3>
            {meta.length > 0 && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-[#8B91A7]">{meta.join(' · ')}</p>
            )}
            {el.description?.trim() && (
              <RichTextSnippet text={el.description} worldId={worldId} lines={2} className="mt-1 text-[11px]" />
            )}
          </div>
        </div>
      </motion.article>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <EntityFoldersSection
        worldId={worldId}
        scope="fantasticElement"
        items={items}
        filteredItems={filtered}
        getItemLabel={(el) => el.name}
        emptyIcon={<Sparkles size={40} className="mx-auto mb-3 text-[#2A3045]" />}
        emptyMessage="Aún no hay elementos fantásticos con estos filtros"
        onAddItem={openNew}
        gridClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        toolbar={
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
                <input
                  className="story-input w-full pl-9"
                  placeholder="Buscar poderes, hechizos, criaturas…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="button" className="story-btn-primary shrink-0 text-sm" onClick={openNew}>
                <Plus size={16} /> Agregar
              </button>
            </div>
            {categoryBar}
          </>
        }
        renderItem={renderElement}
      />
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
            className="story-card max-h-[85vh] w-full max-w-lg overflow-y-auto p-5 scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start gap-3">
              {detail.imageUrl ? (
                <img
                  src={detail.imageUrl}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-xl border border-[#2A3045] object-cover"
                />
              ) : (
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[#2A3045] bg-[#1E2230]"
                  style={{ boxShadow: `inset 0 0 16px ${CATEGORY_COLORS[detail.category]}22` }}
                >
                  <FantasticCategoryIcon category={detail.category} size={28} color={CATEGORY_COLORS[detail.category]} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-mono uppercase" style={{ color: CATEGORY_COLORS[detail.category] }}>
                  {FANTASTIC_CATEGORY_LABELS[detail.category]}
                </p>
                <h2 className="text-lg font-bold text-[#E8E9EB]">{detail.name}</h2>
                {fantasticMetaLines(detail).length > 0 && (
                  <p className="mt-0.5 text-xs text-[#8B91A7]">{fantasticMetaLines(detail).join(' · ')}</p>
                )}
              </div>
              <button type="button" className="story-btn-secondary shrink-0 text-xs" onClick={() => setDetail(null)}>
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
