import { useState, useEffect, useMemo } from 'react';
import { BaseModal } from './BaseModal';
import { useAppStore } from '@/store';
import type { House, NobleRank } from '@/types';
import { ImageInputField } from '@/components/common/ImageInputField';

const NOBLE_RANKS: { value: NobleRank; label: string }[] = [
  { value: 'emperor', label: 'Emperador' },
  { value: 'king', label: 'Rey' },
  { value: 'duke', label: 'Duque' },
  { value: 'marquis', label: 'Marqués' },
  { value: 'count', label: 'Conde' },
  { value: 'baron', label: 'Barón' },
  { value: 'knight', label: 'Caballero' },
  { value: 'commoner', label: 'Plebeyo' },
  { value: 'other', label: 'Otro' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: House | null;
  onSubmit: (data: Omit<House, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

function empty(worldId: string): Omit<House, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    name: '',
    motto: '',
    description: '',
    imageUrl: '',
    nobleRank: 'baron',
    influenceLevel: 5,
    parentHouseId: undefined,
    lineage: '',
    symbols: '',
    territory: '',
    isFavorite: false,
    isDeleted: false,
    tags: [],
  };
}

export function HouseFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const allHouses = useAppStore((s) => s.getHousesByWorld(worldId));
  const parentOptions = useMemo(
    () => allHouses.filter((h) => h.id !== initial?.id),
    [allHouses, initial?.id]
  );
  const [form, setForm] = useState<Omit<House, 'id' | 'createdAt' | 'updatedAt'>>(() => empty(worldId));
  const [tagsRaw, setTagsRaw] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...empty(worldId), ...initial, worldId } : empty(worldId));
    setTagsRaw((initial?.tags ?? []).join(', '));
    setErr('');
  }, [open, worldId, initial?.id, initial?.updatedAt]);

  const patch = (p: Partial<Omit<House, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.name.trim()) {
      setErr('El nombre es obligatorio');
      return;
    }
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const parentHouseId = form.parentHouseId || undefined;
    onSubmit({
      ...form,
      name: form.name.trim(),
      motto: form.motto.trim(),
      tags,
      parentHouseId,
      influenceLevel: Math.min(10, Math.max(1, form.influenceLevel)),
    });
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar casa' : 'Nueva casa'}
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
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Nombre *</label>
          <input className="story-input w-full" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Lema</label>
          <input
            className="story-input w-full"
            value={form.motto}
            onChange={(e) => patch({ motto: e.target.value })}
            placeholder="Ej. Fuego y sangre"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripción</label>
          <textarea
            className="story-input h-24 w-full resize-none"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </div>
        <ImageInputField label="Escudo / imagen" value={form.imageUrl} onChange={(url) => patch({ imageUrl: url })} />
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Rango noble</label>
          <select
            className="story-input w-full text-sm"
            value={form.nobleRank}
            onChange={(e) => patch({ nobleRank: e.target.value as NobleRank })}
          >
            {NOBLE_RANKS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 flex items-center justify-between text-xs uppercase text-[#5A6078]">
            <span>Nivel de influencia</span>
            <span className="font-mono text-[#E8E9EB]">{form.influenceLevel}/10</span>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            className="w-full accent-[#D61E2B]"
            value={form.influenceLevel}
            onChange={(e) => patch({ influenceLevel: Number(e.target.value) })}
          />
          <input
            type="number"
            min={1}
            max={10}
            className="story-input mt-2 w-24 text-sm"
            value={form.influenceLevel}
            onChange={(e) => patch({ influenceLevel: Number(e.target.value) || 1 })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Casa superior</label>
          <select
            className="story-input w-full text-sm"
            value={form.parentHouseId ?? ''}
            onChange={(e) => patch({ parentHouseId: e.target.value || undefined })}
          >
            <option value="">Ninguna</option>
            {parentOptions.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Linaje</label>
          <textarea
            className="story-input h-20 w-full resize-none"
            value={form.lineage}
            onChange={(e) => patch({ lineage: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Símbolos</label>
          <textarea
            className="story-input h-20 w-full resize-none"
            value={form.symbols}
            onChange={(e) => patch({ symbols: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Territorio</label>
          <input className="story-input w-full" value={form.territory ?? ''} onChange={(e) => patch({ territory: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tags (coma)</label>
          <input className="story-input w-full" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
        </div>
      </div>
    </BaseModal>
  );
}
