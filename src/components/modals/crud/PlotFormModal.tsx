import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';
import { useAppStore } from '@/store';
import type { Plot, PlotType } from '@/types';
import { EntityMultiPicker } from '@/components/common/EntityMultiPicker';
import { MultiImageInputField } from '@/components/common/MultiImageInputField';

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
    images: [],
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
    setForm(
      initial ? { ...empty(worldId), ...initial, worldId, images: initial.images ?? [] } : empty(worldId)
    );
    setTagsRaw((initial?.tags ?? []).join(', '));
    setTwistsRaw((initial?.twists ?? []).join('\n'));
    setErr('');
  }, [open, initial, worldId]);

  const patch = (p: Partial<Omit<Plot, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

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
    onSubmit({ ...form, title: form.title.trim(), tags, twists, images: form.images ?? [] });
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
          <StoryRichTextField worldId={worldId} value={form.synopsis} onChange={(v) => patch({ synopsis: v })} minHeight="6rem" />
        </div>
        <EntityMultiPicker
          label="Personajes"
          items={characters.map((c) => ({
            id: c.id,
            label: c.name,
            sublabel: c.alias || undefined,
            imageUrl: c.images[0],
          }))}
          value={form.characters}
          onChange={(ids) => patch({ characters: ids })}
          placeholder="Elegir personajes…"
        />
        <EntityMultiPicker
          label="Escenas relacionadas"
          items={scenes.map((s) => ({ id: s.id, label: s.title, sublabel: s.description }))}
          value={form.relatedScenes ?? []}
          onChange={(ids) => patch({ relatedScenes: ids })}
          placeholder="Elegir escenas…"
        />
        <MultiImageInputField label="Imágenes de la trama" value={form.images ?? []} onChange={(images) => patch({ images })} />
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Giros / twists (una por línea)</label>
          <StoryRichTextField worldId={worldId} value={twistsRaw} onChange={setTwistsRaw} minHeight="5rem" />
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
