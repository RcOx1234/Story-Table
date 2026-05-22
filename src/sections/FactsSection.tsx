import { useState } from 'react';
import { useWorldEditFromUrl } from '@/hooks/useWorldEditFromUrl';
import { useSectionCardMenuDeps, entityCardMenuProps } from '@/hooks/useEntityCardMenu';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Search, Heart, ScrollText, Calendar } from 'lucide-react';
import type { WorldFact, WorldFactType } from '@/types';
import { FactFormModal } from '@/components/modals/crud/FactFormModal';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import { toast } from 'sonner';
import { storyEntityDataAttrs } from '@/lib/storyEntityContext';
import { RichTextSnippet } from '@/components/common/RichTextSnippet';
import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';

const factTypeLabels: Record<WorldFactType, string> = {
  battle: 'Batalla',
  treaty: 'Tratado',
  birth: 'Nacimiento',
  death: 'Muerte',
  discovery: 'Descubrimiento',
  coronation: 'Coronación',
  betrayal: 'Traición',
  catastrophe: 'Catástrofe',
  other: 'Otro',
};

interface Props {
  worldId: string;
}

export function FactsSection({ worldId }: Props) {
  const cardMenu = useSectionCardMenuDeps();
  const facts = useAppStore((s) => s.getWorldFactsByWorld(worldId));
  const addWorldFact = useAppStore((s) => s.addWorldFact);
  const updateWorldFact = useAppStore((s) => s.updateWorldFact);
  const deleteWorldFact = useAppStore((s) => s.deleteWorldFact);
  const timelines = useAppStore((s) => s.getTimelinesByWorld(worldId));
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorldFact | null>(null);
  const [viewing, setViewing] = useState<WorldFact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = facts.filter(
    (f) =>
      !search ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase())
  );

  const timelineName = (id?: string) => timelines.find((t) => t.id === id)?.name;

  const onSubmit = (data: Omit<WorldFact, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editing) {
      updateWorldFact(editing.id, data);
      toast.success('Hecho actualizado');
    } else {
      addWorldFact(data);
      toast.success('Hecho guardado');
    }
    setEditing(null);
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (fact: WorldFact) => {
    setEditing(fact);
    setFormOpen(true);
  };

  useWorldEditFromUrl(openEdit, (id) => facts.find((f) => f.id === id));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
          <input
            type="text"
            placeholder="Buscar hechos históricos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="story-input w-full pl-10"
          />
        </div>
        <button type="button" onClick={openNew} className="story-btn-primary text-sm">
          <Plus size={16} /> Agregar
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <ScrollText size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="mb-4 text-[#5A6078]">No hay hechos históricos</p>
          <button type="button" onClick={openNew} className="story-btn-primary text-sm">
            <Plus size={16} /> Registrar hecho
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((fact, i) => (
            <motion.div
              key={fact.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setViewing(fact)}
              onClick={() => setViewing(fact)}
              className="story-card group relative cursor-pointer overflow-hidden p-3.5"
              {...storyEntityDataAttrs('fact', fact.id, worldId, fact.title)}
            >
              <div className="absolute right-3 top-3 flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Favorito"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateWorldFact(fact.id, { isFavorite: !fact.isFavorite });
                  }}
                  className="rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
                >
                  <Heart size={14} className={fact.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
                </button>
                <EntityCardMenu
                  {...entityCardMenuProps(worldId, 'fact', fact.id, fact.title, {
                    ...cardMenu,
                    onViewDetails: () => setViewing(fact),
                  })}
                  onDelete={() => setDeleteId(fact.id)}
                />
              </div>
              {fact.images[0] && (
                <div className="mb-2 -mx-3.5 -mt-3.5 h-20 overflow-hidden rounded-t-xl">
                  <img src={fact.images[0]} alt="" className="h-full w-full object-cover opacity-80" />
                </div>
              )}
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <ScrollText size={14} className="text-[#EAB308]" />
                <span className="rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#5A6078]">
                  {factTypeLabels[fact.factType]}
                </span>
                {fact.dateLabel && (
                  <span className="flex items-center gap-1 text-[10px] text-[#5A6078]">
                    <Calendar size={10} /> {fact.dateLabel}
                  </span>
                )}
              </div>
              <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-[#E8E9EB]">{fact.title}</h3>
              {fact.description && <RichTextSnippet text={fact.description} worldId={worldId} lines={2} className="text-xs" />}
              <div className="mt-2 border-t border-[#1E2230] pt-2 text-[10px] text-[#5A6078]">
                {fact.relatedCharacterIds.length} personajes · {fact.relatedPlaceIds.length} lugares
                {timelineName(fact.timelineId) && ` · ${timelineName(fact.timelineId)}`}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <FactFormModal
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
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.title ?? ''}
        description={viewing ? factTypeLabels[viewing.factType] : undefined}
        maxWidthClass="max-w-xl"
        footer={
          <button
            type="button"
            className="story-btn-primary text-sm"
            onClick={() => {
              if (!viewing) return;
              setEditing(viewing);
              setViewing(null);
              setFormOpen(true);
            }}
          >
            Editar hecho
          </button>
        }
      >
        {viewing && (
          <div className="space-y-4 text-sm text-[#8B91A7]">
            {viewing.images.length > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {viewing.images.map((url, i) => (
                  <img
                    key={`${url}-${i}`}
                    src={url}
                    alt=""
                    className="max-h-56 w-full rounded-xl border border-[#2A3045] object-cover"
                  />
                ))}
              </div>
            )}
            {viewing.dateLabel && (
              <p>
                <span className="text-[#5A6078]">Fecha:</span> {viewing.dateLabel}
              </p>
            )}
            {viewing.description && (
              <div>
                <h4 className="mb-1 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Descripción</h4>
                <StoryRichTextDisplay text={viewing.description} worldId={worldId} className="text-[#E8E9EB]" />
              </div>
            )}
            {viewing.consequence && (
              <div>
                <h4 className="mb-1 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Consecuencia</h4>
                <StoryRichTextDisplay text={viewing.consequence} worldId={worldId} />
              </div>
            )}
          </div>
        )}
      </BaseModal>

      <ConfirmDeleteModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        message="Este hecho irá a la papelera."
        onConfirm={() => {
          if (deleteId) {
            deleteWorldFact(deleteId);
            toast.success('Hecho enviado a la papelera');
          }
        }}
      />
    </div>
  );
}
