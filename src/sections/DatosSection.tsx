import { useState } from 'react';
import { useWorldEditFromUrl } from '@/hooks/useWorldEditFromUrl';
import { useSectionCardMenuDeps, entityCardMenuProps } from '@/hooks/useEntityCardMenu';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Search, Heart, BookOpen } from 'lucide-react';
import type { WorldDatum, WorldDatumType } from '@/types';
import { DatumFormModal } from '@/components/modals/crud/DatumFormModal';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import { toast } from 'sonner';
import { storyEntityDataAttrs } from '@/lib/storyEntityContext';
import { RichTextSnippet } from '@/components/common/RichTextSnippet';
import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';

const datumTypeLabels: Record<WorldDatumType, string> = {
  geography: 'Geografía',
  culture: 'Cultura',
  religion: 'Religión',
  magic: 'Magia',
  politics: 'Política',
  economy: 'Economía',
  biology: 'Biología',
  technology: 'Tecnología',
  other: 'Otro',
};

interface Props {
  worldId: string;
}

export function DatosSection({ worldId }: Props) {
  const cardMenu = useSectionCardMenuDeps();
  const data = useAppStore((s) => s.getWorldDataByWorld(worldId));
  const addWorldDatum = useAppStore((s) => s.addWorldDatum);
  const updateWorldDatum = useAppStore((s) => s.updateWorldDatum);
  const deleteWorldDatum = useAppStore((s) => s.deleteWorldDatum);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WorldDatum | null>(null);
  const [viewing, setViewing] = useState<WorldDatum | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = data.filter(
    (d) =>
      !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.content.toLowerCase().includes(search.toLowerCase())
  );

  const onSubmit = (payload: Omit<WorldDatum, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editing) {
      updateWorldDatum(editing.id, payload);
      toast.success('Dato actualizado');
    } else {
      addWorldDatum(payload);
      toast.success('Dato guardado');
    }
    setEditing(null);
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (datum: WorldDatum) => {
    setEditing(datum);
    setFormOpen(true);
  };

  useWorldEditFromUrl(openEdit, (id) => data.find((d) => d.id === id));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
          <input
            type="text"
            placeholder="Buscar datos del mundo..."
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
          <BookOpen size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="mb-4 text-[#5A6078]">No hay datos del mundo</p>
          <button type="button" onClick={openNew} className="story-btn-primary text-sm">
            <Plus size={16} /> Añadir dato
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((datum, i) => (
            <motion.div
              key={datum.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setViewing(datum)}
              onClick={() => setViewing(datum)}
              className="story-card group relative cursor-pointer p-5"
              {...storyEntityDataAttrs('datum', datum.id, worldId, datum.title)}
            >
              <div className="absolute right-3 top-3 flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Favorito"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateWorldDatum(datum.id, { isFavorite: !datum.isFavorite });
                  }}
                  className="rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
                >
                  <Heart size={14} className={datum.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
                </button>
                <EntityCardMenu
                  {...entityCardMenuProps(worldId, 'datum', datum.id, datum.title, {
                    ...cardMenu,
                    onViewDetails: () => setViewing(datum),
                  })}
                  onDelete={() => setDeleteId(datum.id)}
                />
              </div>
              {datum.images[0] && (
                <div className="mb-3 h-24 overflow-hidden rounded-lg">
                  <img src={datum.images[0]} alt="" className="h-full w-full object-cover opacity-90" />
                </div>
              )}
              <div className="mb-2 flex items-center gap-2">
                <BookOpen size={14} className="text-[#3B82F6]" />
                <span className="rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#5A6078]">
                  {datumTypeLabels[datum.datumType]}
                </span>
              </div>
              <h3 className="mb-2 font-semibold text-[#E8E9EB]">{datum.title}</h3>
              {datum.content && <RichTextSnippet text={datum.content} worldId={worldId} lines={3} className="text-sm" />}
              <div className="mt-3 border-t border-[#1E2230] pt-3 text-xs text-[#5A6078]">
                {datum.relatedCharacterIds.length} personajes · {datum.relatedPlaceIds.length} lugares
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <DatumFormModal
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
        description={viewing ? datumTypeLabels[viewing.datumType] : undefined}
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
            Editar dato
          </button>
        }
      >
        {viewing && (
          <div className="space-y-4 text-sm leading-relaxed text-[#8B91A7]">
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
            {viewing.content ? (
              <StoryRichTextDisplay text={viewing.content} worldId={worldId} className="text-[#E8E9EB]" />
            ) : (
              <p>—</p>
            )}
          </div>
        )}
      </BaseModal>

      <ConfirmDeleteModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        message="Este dato irá a la papelera."
        onConfirm={() => {
          if (deleteId) {
            deleteWorldDatum(deleteId);
            toast.success('Dato enviado a la papelera');
          }
        }}
      />
    </div>
  );
}
