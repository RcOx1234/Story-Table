import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { useAppStore } from '@/store';
import type { Organization } from '@/types';

const TYPES: { value: Organization['type']; label: string }[] = [
  { value: 'house', label: 'Casa' },
  { value: 'brotherhood', label: 'Hermandad' },
  { value: 'guild', label: 'Gremio' },
  { value: 'clan', label: 'Clan' },
  { value: 'company', label: 'Compañía' },
  { value: 'order', label: 'Orden' },
  { value: 'other', label: 'Otro' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: Organization | null;
  onSubmit: (data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

function empty(worldId: string): Omit<Organization, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    name: '',
    members: [],
    goals: '',
    symbols: '',
    hierarchy: '',
    history: '',
    type: 'other',
    isFavorite: false,
    isDeleted: false,
    tags: [],
  };
}

export function OrganizationFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const characters = useAppStore((s) => s.getCharactersByWorld(worldId));
  const [form, setForm] = useState<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>>(() => empty(worldId));
  const [tagsRaw, setTagsRaw] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...empty(worldId), ...initial, worldId } : empty(worldId));
    setTagsRaw((initial?.tags ?? []).join(', '));
    setErr('');
  }, [open, initial, worldId]);

  const patch = (p: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const toggleMember = (id: string) => {
    setForm((f) => ({
      ...f,
      members: f.members.includes(id) ? f.members.filter((m) => m !== id) : [...f.members, id],
    }));
  };

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
      title={initial ? 'Editar organización' : 'Nueva organización'}
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
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tipo</label>
          <select className="story-input w-full text-sm" value={form.type} onChange={(e) => patch({ type: e.target.value as Organization['type'] })}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {(['goals', 'symbols', 'hierarchy', 'history'] as const).map((key) => (
          <div key={key}>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">
              {key === 'goals' ? 'Objetivos' : key === 'symbols' ? 'Símbolos' : key === 'hierarchy' ? 'Jerarquía' : 'Historia'}
            </label>
            <textarea
              className="story-input h-20 w-full resize-none"
              value={(form[key] as string) ?? ''}
              onChange={(e) => patch({ [key]: e.target.value } as Partial<Organization>)}
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Miembros</label>
          <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-lg border border-[#2A3045] bg-[#111318] p-2">
            {characters.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-1 text-xs text-[#E8E9EB]">
                <input type="checkbox" checked={form.members.includes(c.id)} onChange={() => toggleMember(c.id)} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tags (coma)</label>
          <input className="story-input w-full" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
        </div>
      </div>
    </BaseModal>
  );
}
