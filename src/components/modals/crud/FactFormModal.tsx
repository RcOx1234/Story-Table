import { useState, useEffect, useMemo } from 'react';
import { BaseModal } from './BaseModal';
import { useAppStore } from '@/store';
import type { WorldFact, WorldFactType } from '@/types';
import { EntityMultiPicker } from '@/components/common/EntityMultiPicker';
import { MultiImageInputField } from '@/components/common/MultiImageInputField';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';

const FACT_TYPES: { value: WorldFactType; label: string }[] = [
  { value: 'battle', label: 'Batalla' },
  { value: 'treaty', label: 'Tratado' },
  { value: 'birth', label: 'Nacimiento' },
  { value: 'death', label: 'Muerte' },
  { value: 'discovery', label: 'Descubrimiento' },
  { value: 'coronation', label: 'Coronación' },
  { value: 'betrayal', label: 'Traición' },
  { value: 'catastrophe', label: 'Catástrofe' },
  { value: 'other', label: 'Otro' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: WorldFact | null;
  onSubmit: (data: Omit<WorldFact, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

function empty(worldId: string): Omit<WorldFact, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    title: '',
    description: '',
    consequence: '',
    factType: 'other',
    timelineId: undefined,
    relatedCharacterIds: [],
    relatedPlaceIds: [],
    images: [],
    dateLabel: '',
    isFavorite: false,
    isDeleted: false,
    tags: [],
  };
}

export function FactFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const characters = useAppStore((s) => s.getCharactersByWorld(worldId));
  const places = useAppStore((s) => s.getPlacesByWorld(worldId));
  const timelines = useAppStore((s) => s.getTimelinesByWorld(worldId));
  const [form, setForm] = useState<Omit<WorldFact, 'id' | 'createdAt' | 'updatedAt'>>(() => empty(worldId));
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

  const patch = (p: Partial<Omit<WorldFact, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.title.trim()) {
      setErr('El título es obligatorio');
      return;
    }
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({
      ...form,
      title: form.title.trim(),
      tags,
      timelineId: form.timelineId || undefined,
      dateLabel: form.dateLabel?.trim() || undefined,
    });
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar hecho' : 'Nuevo hecho histórico'}
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
            value={form.factType}
            onChange={(e) => patch({ factType: e.target.value as WorldFactType })}
          >
            {FACT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripción</label>
          <StoryRichTextField worldId={worldId} value={form.description} onChange={(v) => patch({ description: v })} minHeight="5rem" />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Consecuencia</label>
          <StoryRichTextField worldId={worldId} value={form.consequence} onChange={(v) => patch({ consequence: v })} minHeight="4rem" />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Línea temporal (opcional)</label>
          <select
            className="story-input w-full text-sm"
            value={form.timelineId ?? ''}
            onChange={(e) => patch({ timelineId: e.target.value || undefined })}
          >
            <option value="">Ninguna</option>
            {timelines.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Etiqueta de fecha</label>
          <input
            className="story-input w-full"
            value={form.dateLabel ?? ''}
            onChange={(e) => patch({ dateLabel: e.target.value })}
            placeholder="Ej. Año 302 de la Era Dorada"
          />
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
