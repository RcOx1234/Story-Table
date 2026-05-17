import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BaseModal } from './BaseModal';
import { useAppStore } from '@/store';
import type { House, NobleRank } from '@/types';
import { ImageInputField } from '@/components/common/ImageInputField';
import { HouseMembersEditor } from '@/components/houses/HouseMembersEditor';

const NOBLE_RANKS: { value: NobleRank; label: string }[] = [
  { value: 'emperor', label: 'Emperador' },
  { value: 'king', label: 'Rey' },
  { value: 'duke', label: 'Duque' },
  { value: 'marquis', label: 'Marqu?s' },
  { value: 'count', label: 'Conde' },
  { value: 'baron', label: 'Bar?n' },
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
    members: [],
    isFavorite: false,
    isDeleted: false,
    tags: [],
  };
}

export function HouseFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const allHouses = useAppStore((s) => s.getHousesByWorld(worldId));
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const parentOptions = useMemo(() => allHouses.filter((h) => h.id !== initial?.id), [allHouses, initial?.id]);
  const [form, setForm] = useState<Omit<House, 'id' | 'createdAt' | 'updatedAt'>>(() => empty(worldId));
  const [tagsRaw, setTagsRaw] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...empty(worldId), ...initial, worldId, members: initial.members ?? [] } : empty(worldId));
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
    const payload = {
      ...form,
      name: form.name.trim(),
      motto: form.motto.trim(),
      tags,
      parentHouseId: form.parentHouseId || undefined,
      influenceLevel: Math.min(10, Math.max(1, form.influenceLevel)),
      members: form.members ?? [],
    };
    const houseIdForLink = initial?.id;
    if (houseIdForLink) {
      for (const m of payload.members) {
        updateCharacter(m.characterId, { houseId: houseIdForLink, house: payload.name });
      }
    }
    onSubmit(payload);
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar casa' : 'Nueva casa noble'}
      maxWidthClass="max-w-4xl"
      footer={
        <>
          <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="story-btn-primary text-sm" onClick={save}>
            Guardar casa
          </button>
        </>
      }
    >
      {err && <p className="mb-3 text-sm text-[#D61E2B]">{err}</p>}
      <motion.div
        className="grid max-h-[70vh] gap-6 overflow-y-auto pr-1 lg:grid-cols-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-[#5A6078]">Identidad</p>
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Nombre *</label>
            <input className="story-input w-full" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Lema</label>
            <input
              className="story-input w-full italic"
              value={form.motto}
              onChange={(e) => patch({ motto: e.target.value })}
              placeholder="Ej. Fuego y sangre"
            />
          </motion.div>
          <ImageInputField label="Escudo / imagen" value={form.imageUrl} onChange={(url) => patch({ imageUrl: url })} />
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripci?n</label>
            <textarea
              className="story-input h-24 w-full resize-none"
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Territorio</label>
            <input className="story-input w-full" value={form.territory ?? ''} onChange={(e) => patch({ territory: e.target.value })} />
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-wider text-[#5A6078]">Poder y linaje</p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
            <label className="mb-2 block text-xs uppercase text-[#5A6078]">Rango noble</label>
            <div className="flex flex-wrap gap-1.5">
              {NOBLE_RANKS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => patch({ nobleRank: r.value })}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    form.nobleRank === r.value
                      ? 'bg-[#EAB308]/20 text-[#EAB308] ring-1 ring-[#EAB308]/40'
                      : 'bg-[#1E2230] text-[#8B91A7] hover:text-[#E8E9EB]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </motion.div>
          <div>
            <label className="mb-1 flex justify-between text-xs uppercase text-[#5A6078]">
              <span>Influencia</span>
              <span className="font-mono text-[#E8E9EB]">{form.influenceLevel}/10</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              className="w-full accent-[#D61E2B]"
              value={form.influenceLevel}
              onChange={(e) => patch({ influenceLevel: Number(e.target.value) })}
            />
          </div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Casa superior (vasallaje)</label>
            <select
              className="story-input w-full text-sm"
              value={form.parentHouseId ?? ''}
              onChange={(e) => patch({ parentHouseId: e.target.value || undefined })}
            >
              <option value="">Independiente</option>
              {parentOptions.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </motion.div>
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Linaje</label>
            <textarea className="story-input h-20 w-full resize-none" value={form.lineage} onChange={(e) => patch({ lineage: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Símbolos</label>
            <textarea className="story-input h-20 w-full resize-none" value={form.symbols} onChange={(e) => patch({ symbols: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tags</label>
            <input className="story-input w-full" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="noble, antigua?" />
          </div>
        </div>

        <div className="lg:col-span-2">
          <HouseMembersEditor
            worldId={worldId}
            houseName={form.name}
            members={form.members ?? []}
            onChange={(members) => patch({ members })}
          />
        </div>
      </motion.div>
    </BaseModal>
  );
}
