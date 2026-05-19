import { useMemo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2 } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { useAppStore } from '@/store';
import { collectionTypeLabel } from '@/lib/collectionTypes';
import { tagChipStyle } from '@/lib/worldTags';
import { EntityReference } from '@/components/common/EntityReference';
import type { PlaceCollection } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
  collection: PlaceCollection | null;
  onEdit: () => void;
  onDelete?: () => void;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.div className="mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h4 className="mb-2 text-xs font-mono uppercase tracking-wider text-[#D61E2B]">{title}</h4>
      {children}
    </motion.div>
  );
}

export function PlaceCollectionDetailModal({ open, onClose, collection, onEdit, onDelete }: Props) {
  const places = useAppStore((s) => (collection ? s.getPlacesByWorld(collection.worldId) : []));
  const characters = useAppStore((s) => (collection ? s.getCharactersByWorld(collection.worldId) : []));
  const houses = useAppStore((s) => (collection ? s.getHousesByWorld(collection.worldId) : []));
  const organizations = useAppStore((s) => (collection ? s.getOrganizationsByWorld(collection.worldId) : []));
  const worldTags = useAppStore((s) => (collection ? s.getWorldTagsByWorld(collection.worldId) : []));

  const relatedPlaces = useMemo(() => {
    if (!collection) return [];
    return places.filter((p) => collection.placeIds.includes(p.id) || p.collectionId === collection.id);
  }, [collection, places]);

  const tags = useMemo(() => {
    if (!collection?.tagIds?.length) return [];
    return collection.tagIds.map((id) => worldTags.find((t) => t.id === id)).filter(Boolean);
  }, [collection, worldTags]);

  if (!collection) return null;

  const typeLabel = collectionTypeLabel(collection.collectionType, collection.customCollectionType);

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={collection.name}
      description={typeLabel}
      maxWidthClass="max-w-xl"
      footer={
        <div className="flex w-full flex-wrap justify-between gap-2">
          <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
            Cerrar
          </button>
          <motion.div className="flex gap-2">
            <button type="button" className="story-btn-secondary flex items-center gap-1.5 text-sm" onClick={onEdit}>
              <Edit2 size={14} /> Editar
            </button>
            {onDelete && (
              <button
                type="button"
                className="story-btn-secondary flex items-center gap-1.5 text-sm text-[#D61E2B]"
                onClick={onDelete}
              >
                <Trash2 size={14} /> Eliminar
              </button>
            )}
          </motion.div>
        </div>
      }
    >
      {collection.imageUrl && (
        <img src={collection.imageUrl} alt="" className="mb-4 h-36 w-full rounded-xl object-cover" />
      )}
      {collection.color && (
        <span className="mb-3 inline-block h-2 w-12 rounded-full" style={{ backgroundColor: collection.color }} />
      )}
      {collection.description && <p className="mb-4 text-sm leading-relaxed text-[#8B91A7]">{collection.description}</p>}
      {collection.notes && (
        <motion.div className="mb-4 rounded-lg border border-[#2A3045] bg-[#111318] p-3 text-sm text-[#8B91A7]">
          {collection.notes}
        </motion.div>
      )}
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          {tags.map((t) =>
            t ? (
              <span key={t.id} className="rounded-full border px-2 py-0.5 text-[10px]" style={tagChipStyle(t.color)}>
                {t.name}
              </span>
            ) : null
          )}
        </div>
      )}
      <Section title={`Lugares (${relatedPlaces.length})`}>
        {relatedPlaces.length === 0 ? (
          <p className="text-sm text-[#5A6078]">Sin lugares vinculados.</p>
        ) : (
          <ul className="space-y-1">
            {relatedPlaces.map((p) => (
              <li key={p.id}>
                <EntityReference type="place" id={p.id} worldId={collection.worldId} label={p.name} />
              </li>
            ))}
          </ul>
        )}
      </Section>
      {(collection.relatedCharacterIds?.length ?? 0) > 0 && (
        <Section title="Personajes relacionados">
          <ul className="flex flex-wrap gap-2">
            {collection.relatedCharacterIds!.map((id) => {
              const ch = characters.find((c) => c.id === id);
              return ch ? (
                <EntityReference key={id} type="character" id={id} worldId={collection.worldId} label={ch.name} />
              ) : null;
            })}
          </ul>
        </Section>
      )}
      {(collection.relatedHouseIds?.length ?? 0) > 0 && (
        <Section title="Casas relacionadas">
          <ul className="flex flex-wrap gap-2">
            {collection.relatedHouseIds!.map((id) => {
              const h = houses.find((x) => x.id === id);
              return h ? (
                <span key={id} className="rounded-full bg-[#1E2230] px-2 py-0.5 text-xs text-[#8B91A7]">
                  {h.name}
                </span>
              ) : null;
            })}
          </ul>
        </Section>
      )}
      {(collection.relatedOrganizationIds?.length ?? 0) > 0 && (
        <Section title="Organizaciones">
          <ul className="flex flex-wrap gap-2">
            {collection.relatedOrganizationIds!.map((id) => {
              const o = organizations.find((x) => x.id === id);
              return o ? (
                <span key={id} className="rounded-full bg-[#1E2230] px-2 py-0.5 text-xs text-[#8B91A7]">
                  {o.name}
                </span>
              ) : null;
            })}
          </ul>
        </Section>
      )}
    </BaseModal>
  );
}
