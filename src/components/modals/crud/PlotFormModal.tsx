import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { useAppStore } from '@/store';
import type { Plot, PlotType } from '@/types';

const PLOT_TYPES: { value: PlotType; label: string }[] = [
  { value: 'main', label: 'Principal' },
  { value: 'secondary', label: 'Secundaria' },
  { value: 'character_arc', label: 'Arco de personaje' },
  { value: 'org_arc', label: 'Arco de organización' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: Plot | null;
  onSubmit: (data: Omit<Plot, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

function empty(worldId: string): Omit<Plot, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    title: '',
    synopsis: '',
    plotType: 'main',
    characters: [],
    relatedPlots: [],
    relatedScenes: [],
    twists: [],
    status: 'borrador',
    isFavorite: false,
    isDeleted: false,
    tags: [],
  };
}

export function PlotFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const characters = useAppStore((s) => s.getCharactersByWorld(worldId));
  const scenes = useAppStore((s) => s.getScenesByWorld(worldId));
  const [form, setForm] = useState<Omit<Plot, 'id' | 'createdAt' | 'updatedAt'>>(() => empty(worldId));
  const [tagsRaw, setTagsRaw] = useState('');
  const [twistsRaw, setTwistsRaw] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...empty(worldId), ...initial, worldId } : empty(worldId));
    setTagsRaw((initial?.tags ?? []).join(', '));
    setTwistsRaw((initial?.twists ?? []).join('\n'));
    setErr('');
  }, [open, initial, worldId]);

  const patch = (p: Partial<Omit<Plot, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const toggle = (field: 'characters' | 'relatedScenes', id: string) => {
    setForm((f) => {
      const arr = f[field] ?? [];
      const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
      return { ...f, [field]: next };
    });
  };

  const save = () => {
    if (!form.title.trim()) {
      setErr('El título es obligatorio');
      return;
    }
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const twists = twistsRaw
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({ ...form, title: form.title.trim(), tags, twists });
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar trama' : 'Nueva trama'}
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
            value={form.plotType ?? 'main'}
            onChange={(e) => patch({ plotType: e.target.value as PlotType })}
          >
            {PLOT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Sinopsis</label>
          <textarea className="story-input h-24 w-full resize-none" value={form.synopsis} onChange={(e) => patch({ synopsis: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Personajes</label>
          <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded-lg border border-[#2A3045] bg-[#111318] p-2">
            {characters.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-1 text-xs text-[#E8E9EB]">
                <input type="checkbox" checked={form.characters.includes(c.id)} onChange={() => toggle('characters', c.id)} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Escenas relacionadas</label>
          <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded-lg border border-[#2A3045] bg-[#111318] p-2">
            {scenes.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-1 text-xs text-[#E8E9EB]">
                <input type="checkbox" checked={(form.relatedScenes ?? []).includes(s.id)} onChange={() => toggle('relatedScenes', s.id)} />
                {s.title}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Giros / twists (una por línea)</label>
          <textarea className="story-input h-24 w-full resize-none" value={twistsRaw} onChange={(e) => setTwistsRaw(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Estado</label>
          <input className="story-input w-full" value={form.status ?? ''} onChange={(e) => patch({ status: e.target.value })} placeholder="ej. en desarrollo" />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tags (coma)</label>
          <input className="story-input w-full" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
        </div>
      </div>
    </BaseModal>
  );
}
