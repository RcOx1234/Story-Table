import { useState, useEffect, useMemo } from 'react';
import { BaseModal } from './BaseModal';
import { useAppStore } from '@/store';
import type { WorldDatum, WorldDatumType } from '@/types';
import { EntityMultiPicker } from '@/components/common/EntityMultiPicker';
import { MultiImageInputField } from '@/components/common/MultiImageInputField';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';

const DATUM_TYPES: { value: WorldDatumType; label: string }[] = [
  { value: 'geography', label: 'Geografía' },
  { value: 'culture', label: 'Cultura' },
  { value: 'religion', label: 'Religión' },
  { value: 'magic', label: 'Magia' },
  { value: 'politics', label: 'Política' },
  { value: 'economy', label: 'Economía' },
  { value: 'biology', label: 'Biología' },
  { value: 'technology', label: 'Tecnología' },
  { value: 'other', label: 'Otro' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: WorldDatum | null;
  onSubmit: (data: Omit<WorldDatum, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

function empty(worldId: string): Omit<WorldDatum, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    title: '',
    content: '',
    datumType: 'other',
    images: [],
    relatedCharacterIds: [],
    relatedPlaceIds: [],
    isFavorite: false,
    isDeleted: false,
    tags: [],
  };
}

export function DatumFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const characters = useAppStore((s) => s.getCharactersByWorld(worldId));
  const places = useAppStore((s) => s.getPlacesByWorld(worldId));
  const [form, setForm] = useState<Omit<WorldDatum, 'id' | 'createdAt' | 'updatedAt'>>(() => empty(worldId));
  const [tagsRaw, setTagsRaw] = useState('');
  const [err, setErr] = useState('');

  const characterItems = useMemo(
    () =>
      characters.map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: c.alias || undefined,
        imageUrl: c.images[0],
      })),
    [characters]
  );

  const placeItems = useMemo(() => places.map((p) => ({ id: p.id, label: p.name })), [places]);

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...empty(worldId), ...initial, worldId } : empty(worldId));
    setTagsRaw((initial?.tags ?? []).join(', '));
    setErr('');
  }, [open, worldId, initial?.id, initial?.updatedAt]);

  const patch = (p: Partial<Omit<WorldDatum, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.title.trim()) {
      setErr('El título es obligatorio');
      return;
    }
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({ ...form, title: form.title.trim(), tags });
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar dato' : 'Nuevo dato del mundo'}
      maxWidthClass="max-w-3xl"
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
      {err && <p className="mb-2 text-sm text-[#D61E2B]">{err}</p>}
      <div className="max-h-[60vh] space-y-3 overflow-y-auto">
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Título *</label>
          <input className="story-input w-full" value={form.title} onChange={(e) => patch({ title: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tipo</label>
          <select
            className="story-input w-full text-sm"
            value={form.datumType}
            onChange={(e) => patch({ datumType: e.target.value as WorldDatumType })}
          >
            {DATUM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Contenido</label>
          <StoryRichTextField worldId={worldId} value={form.content} onChange={(v) => patch({ content: v })} minHeight="7rem" />
        </div>
        <EntityMultiPicker
          label="Personajes relacionados"
          items={characterItems}
          value={form.relatedCharacterIds}
          onChange={(ids) => patch({ relatedCharacterIds: ids })}
          emptyMessage="No hay personajes en este mundo"
        />
        <EntityMultiPicker
          label="Lugares relacionados"
          items={placeItems}
          value={form.relatedPlaceIds}
          onChange={(ids) => patch({ relatedPlaceIds: ids })}
          emptyMessage="No hay lugares en este mundo"
        />
        <MultiImageInputField label="Imágenes" value={form.images} onChange={(urls) => patch({ images: urls })} />
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tags (coma)</label>
          <input className="story-input w-full" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
        </div>
      </div>
    </BaseModal>
  );
}
