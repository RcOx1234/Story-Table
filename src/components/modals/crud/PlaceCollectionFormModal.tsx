import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BaseModal } from './BaseModal';
import { ImageInputField } from '@/components/common/ImageInputField';
import { EntityMultiPicker } from '@/components/common/EntityMultiPicker';
import { WorldTagInput } from '@/components/common/WorldTagInput';
import { useAppStore } from '@/store';
import { PLACE_COLLECTION_TYPE_OPTIONS } from '@/lib/collectionTypes';
import type { PlaceCollection, PlaceCollectionType } from '@/types';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: PlaceCollection | null;
  onSubmit: (data: Omit<PlaceCollection, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

function empty(worldId: string): Omit<PlaceCollection, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    name: '',
    description: '',
    imageUrl: '',
    placeIds: [],
    collectionType: 'kingdom',
    relatedCharacterIds: [],
    relatedHouseIds: [],
    relatedOrganizationIds: [],
    notes: '',
    tagIds: [],
    isDeleted: false,
  };
}

export function PlaceCollectionFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const places = useAppStore((s) => s.getPlacesByWorld(worldId));
  const characters = useAppStore((s) => s.getCharactersByWorld(worldId));
  const houses = useAppStore((s) => s.getHousesByWorld(worldId));
  const organizations = useAppStore((s) => s.getOrganizationsByWorld(worldId));
  const [form, setForm] = useState<Omit<PlaceCollection, 'id' | 'createdAt' | 'updatedAt'>>(() => empty(worldId));
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    const base = initial ? { ...empty(worldId), ...initial, worldId } : empty(worldId);
    setForm(base);
    setTagIds(initial?.tagIds ?? []);
    setErr('');
  }, [open, worldId, initial?.id, initial?.updatedAt]);

  const patch = (p: Partial<Omit<PlaceCollection, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const placeItems = useMemo(
    () => places.map((p) => ({ id: p.id, label: p.name, sublabel: p.type, imageUrl: p.mapUrl || undefined })),
    [places]
  );

  const save = () => {
    if (!form.name.trim()) {
      setErr('El nombre es obligatorio');
      return;
    }
    onSubmit({ ...form, name: form.name.trim(), tagIds });
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar colección' : 'Nueva colección de lugares'}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="story-btn-primary text-sm" onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      {err && <p className="mb-3 text-sm text-[#D61E2B]">{err}</p>}
      <motion.div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Nombre *</label>
          <input className="story-input w-full" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <motion.div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tipo</label>
            <select
              className="story-input w-full text-sm"
              value={form.collectionType ?? 'kingdom'}
              onChange={(e) => patch({ collectionType: e.target.value as PlaceCollectionType })}
            >
              {PLACE_COLLECTION_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {form.collectionType === 'custom' && (
            <div>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tipo personalizado</label>
              <input
                className="story-input w-full text-sm"
                value={form.customCollectionType ?? ''}
                onChange={(e) => patch({ customCollectionType: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Color</label>
            <input
              type="color"
              className="h-10 w-full cursor-pointer rounded border border-[#2A3045] bg-transparent"
              value={form.color ?? '#D61E2B'}
              onChange={(e) => patch({ color: e.target.value })}
            />
          </div>
        </motion.div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripción</label>
          <StoryRichTextField worldId={worldId} value={form.description} onChange={(v) => patch({ description: v })} minHeight="4rem" />
        </div>
        <motion.div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Notas</label>
          <StoryRichTextField worldId={worldId} value={form.notes ?? ''} onChange={(v) => patch({ notes: v })} minHeight="3.5rem" />
        </motion.div>
        <ImageInputField label="Imagen de portada" value={form.imageUrl} onChange={(v) => patch({ imageUrl: v })} />
        <EntityMultiPicker
          label="Lugares en la colección"
          items={placeItems}
          value={form.placeIds}
          onChange={(ids) => patch({ placeIds: ids })}
          placeholder="Añadir lugares…"
          emptyMessage="No hay lugares en este mundo"
        />
        <EntityMultiPicker
          label="Personajes relacionados"
          items={characters.map((c) => ({ id: c.id, label: c.name }))}
          value={form.relatedCharacterIds ?? []}
          onChange={(ids) => patch({ relatedCharacterIds: ids })}
          placeholder="Personajes…"
        />
        <EntityMultiPicker
          label="Casas relacionadas"
          items={houses.map((h) => ({ id: h.id, label: h.name }))}
          value={form.relatedHouseIds ?? []}
          onChange={(ids) => patch({ relatedHouseIds: ids })}
          placeholder="Casas…"
        />
        <EntityMultiPicker
          label="Organizaciones"
          items={organizations.map((o) => ({ id: o.id, label: o.name }))}
          value={form.relatedOrganizationIds ?? []}
          onChange={(ids) => patch({ relatedOrganizationIds: ids })}
          placeholder="Organizaciones…"
        />
        <WorldTagInput worldId={worldId} tagIds={tagIds} onChange={setTagIds} />
      </motion.div>
    </BaseModal>
  );
}
