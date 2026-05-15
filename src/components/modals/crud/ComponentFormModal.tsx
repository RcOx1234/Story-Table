import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { useAppStore } from '@/store';
import type { Component } from '@/types';

const TYPES: { value: Component['type']; label: string }[] = [
  { value: 'object', label: 'Objeto' },
  { value: 'letter', label: 'Carta' },
  { value: 'relic', label: 'Reliquia' },
  { value: 'weapon', label: 'Arma' },
  { value: 'artifact', label: 'Artefacto' },
  { value: 'other', label: 'Otro' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: Component | null;
  onSubmit: (data: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

function empty(worldId: string): Omit<Component, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    name: '',
    description: '',
    history: '',
    target: '',
    effect: '',
    scenes: [],
    type: 'object',
    isFavorite: false,
    isDeleted: false,
    tags: [],
  };
}

export function ComponentFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const sceneList = useAppStore((s) => s.getScenesByWorld(worldId));
  const [form, setForm] = useState<Omit<Component, 'id' | 'createdAt' | 'updatedAt'>>(() => empty(worldId));
  const [tagsRaw, setTagsRaw] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...empty(worldId), ...initial, worldId } : empty(worldId));
    setTagsRaw((initial?.tags ?? []).join(', '));
    setErr('');
  }, [open, initial, worldId]);

  const patch = (p: Partial<Omit<Component, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const toggleScene = (id: string) => {
    setForm((f) => ({
      ...f,
      scenes: f.scenes.includes(id) ? f.scenes.filter((x) => x !== id) : [...f.scenes, id],
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
      title={initial ? 'Editar componente' : 'Nuevo componente'}
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
          <select className="story-input w-full text-sm" value={form.type} onChange={(e) => patch({ type: e.target.value as Component['type'] })}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripción</label>
          <textarea className="story-input h-20 w-full resize-none" value={form.description} onChange={(e) => patch({ description: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Historia / origen</label>
          <textarea className="story-input h-20 w-full resize-none" value={form.history} onChange={(e) => patch({ history: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Dirigido a / propietario</label>
          <input className="story-input w-full" value={form.target} onChange={(e) => patch({ target: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Poderes o efecto</label>
          <textarea className="story-input h-16 w-full resize-none" value={form.effect ?? ''} onChange={(e) => patch({ effect: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Escenas donde aparece</label>
          <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded-lg border border-[#2A3045] bg-[#111318] p-2">
            {sceneList.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-1 text-xs text-[#E8E9EB]">
                <input type="checkbox" checked={form.scenes.includes(s.id)} onChange={() => toggleScene(s.id)} />
                {s.title}
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
