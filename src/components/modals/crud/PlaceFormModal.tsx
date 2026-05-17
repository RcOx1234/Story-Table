import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { ImageInputField } from '@/components/common/ImageInputField';
import type { Place } from '@/types';
import { useAppStore } from '@/store';

const TYPES: { value: Place['type']; label: string }[] = [
  { value: 'city', label: 'Ciudad' },
  { value: 'town', label: 'Pueblo' },
  { value: 'kingdom', label: 'Reino' },
  { value: 'forest', label: 'Bosque' },
  { value: 'mountain', label: 'Montaña' },
  { value: 'lake', label: 'Lago' },
  { value: 'castle', label: 'Castillo' },
  { value: 'temple', label: 'Templo' },
  { value: 'dungeon', label: 'Mazmorra' },
  { value: 'other', label: 'Otro' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: Place | null;
  onSubmit: (data: Omit<Place, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

function empty(worldId: string): Omit<Place, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    name: '',
    type: 'other',
    description: '',
    mapUrl: '',
    customs: '',
    symbols: '',
    population: '',
    isFavorite: false,
    isDeleted: false,
    tags: [],
  };
}

export function PlaceFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const places = useAppStore((s) => s.getPlacesByWorld(worldId));
  const collections = useAppStore((s) => s.getPlaceCollectionsByWorld(worldId));
  const parentOptions = places.filter((pl) => pl.id !== initial?.id);
  const [form, setForm] = useState<Omit<Place, 'id' | 'createdAt' | 'updatedAt'>>(() => empty(worldId));
  const [tagsRaw, setTagsRaw] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...empty(worldId), ...initial, worldId } : empty(worldId));
    setTagsRaw((initial?.tags ?? []).join(', '));
    setErr('');
  }, [open, worldId, initial?.id, initial?.updatedAt]);

  const patch = (p: Partial<Omit<Place, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.name.trim()) {
      setErr('El nombre es obligatorio');
      return;
    }
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({ ...form, name: form.name.trim(), tags });
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar lugar' : 'Nuevo lugar'}
      maxWidthClass="max-w-2xl"
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
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Nombre *</label>
          <input className="story-input w-full" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tipo</label>
          <select className="story-input w-full text-sm" value={form.type} onChange={(e) => patch({ type: e.target.value as Place['type'] })}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {(['description', 'customs', 'symbols', 'population'] as const).map((key) => (
          <div key={key}>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">
              {key === 'description' ? 'Descripción' : key === 'customs' ? 'Costumbres' : key === 'symbols' ? 'Símbolos' : 'Población / habitantes'}
            </label>
            <textarea
              className="story-input h-20 w-full resize-none"
              value={(form[key] as string) ?? ''}
              onChange={(e) => patch({ [key]: e.target.value } as Partial<Place>)}
            />
          </div>
        ))}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Lugar padre</label>
            <select
              className="story-input w-full text-sm"
              value={form.parentPlaceId ?? ''}
              onChange={(e) => patch({ parentPlaceId: e.target.value || undefined })}
            >
              <option value="">— Ninguno —</option>
              {parentOptions.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Colección</label>
            <select
              className="story-input w-full text-sm"
              value={form.collectionId ?? ''}
              onChange={(e) => patch({ collectionId: e.target.value || undefined })}
            >
              <option value="">— Sin colección —</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ImageInputField label="Imagen / mapa" value={form.mapUrl} onChange={(v) => patch({ mapUrl: v })} />
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tags (coma)</label>
          <input className="story-input w-full" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
        </div>
      </div>
    </BaseModal>
  );
}
