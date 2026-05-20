import { useEffect, useState } from 'react';
import { BaseModal } from './BaseModal';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';
import { ImageInputField } from '@/components/common/ImageInputField';
import { StorySelect } from '@/components/common/StorySelect';
import { useAppStore } from '@/store';
import type { FantasticElement, FantasticElementCategory } from '@/types';
import { FANTASTIC_CATEGORY_OPTIONS } from '@/lib/fantasticElementLabels';

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: FantasticElement | null;
  onSubmit: (data: Omit<FantasticElement, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

function empty(worldId: string): Omit<FantasticElement, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    name: '',
    category: 'power',
    description: '',
    isFavorite: false,
    isDeleted: false,
    tags: [],
  };
}

export function FantasticElementFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const characters = useAppStore((s) => s.getCharactersByWorld(worldId));
  const [form, setForm] = useState(empty(worldId));
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...empty(worldId), ...initial, worldId } : empty(worldId));
    setErr('');
  }, [open, initial?.id, worldId]);

  const patch = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));
  const cat = form.category;

  const save = () => {
    if (!form.name.trim()) {
      setErr('El nombre es obligatorio');
      return;
    }
    onSubmit({ ...form, name: form.name.trim() });
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar elemento' : 'Nuevo elemento fantástico'}
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
      {err && <p className="mb-3 text-sm text-[#D61E2B]">{err}</p>}
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Nombre *</label>
            <input className="story-input w-full" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tipo *</label>
            <select
              className="story-input w-full text-sm"
              value={form.category}
              onChange={(e) => patch({ category: e.target.value as FantasticElementCategory })}
            >
              {FANTASTIC_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripción</label>
          <StoryRichTextField worldId={worldId} value={form.description} onChange={(v) => patch({ description: v })} minHeight="8rem" />
        </div>
        <ImageInputField label="Imagen (opcional)" value={form.imageUrl ?? ''} onChange={(v) => patch({ imageUrl: v })} />
        {(cat === 'power' || cat === 'ability' || cat === 'spell' || cat === 'technique') && (
          <div className="grid gap-3 rounded-xl border border-[#2A3045]/80 bg-[#111318] p-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Potencia / nivel</label>
              <input className="story-input w-full" value={form.potency ?? ''} onChange={(e) => patch({ potency: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Afinidad elemental</label>
              <input className="story-input w-full" value={form.elementAffinity ?? ''} onChange={(e) => patch({ elementAffinity: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Alcance</label>
              <input className="story-input w-full" value={form.range ?? ''} onChange={(e) => patch({ range: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Duración</label>
              <input className="story-input w-full" value={form.duration ?? ''} onChange={(e) => patch({ duration: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Coste / precio</label>
              <input className="story-input w-full" value={form.cost ?? ''} onChange={(e) => patch({ cost: e.target.value })} />
            </div>
            {(cat === 'spell' || cat === 'technique') && (
              <>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs uppercase text-[#5A6078]">
                    {cat === 'spell' ? 'Invocación / gestos' : 'Pasos de la técnica'}
                  </label>
                  <StoryRichTextField worldId={worldId} value={form.incantation ?? ''} onChange={(v) => patch({ incantation: v })} minHeight="4rem" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs uppercase text-[#5A6078]">Requisitos</label>
                  <StoryRichTextField worldId={worldId} value={form.requirements ?? ''} onChange={(v) => patch({ requirements: v })} minHeight="3.5rem" />
                </div>
              </>
            )}
          </div>
        )}
        {cat === 'animal' && (
          <div className="grid gap-3 rounded-xl border border-[#2A3045]/80 bg-[#111318] p-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Especie</label>
              <input className="story-input w-full" value={form.species ?? ''} onChange={(e) => patch({ species: e.target.value })} placeholder="Dragón, lobo sombrío…" />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Hábitat</label>
              <input className="story-input w-full" value={form.habitat ?? ''} onChange={(e) => patch({ habitat: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Temperamento</label>
              <input className="story-input w-full" value={form.temperament ?? ''} onChange={(e) => patch({ temperament: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-[#8B91A7] sm:col-span-2">
              <input type="checkbox" checked={form.isFictional ?? true} onChange={(e) => patch({ isFictional: e.target.checked })} className="accent-[#D61E2B]" />
              Criatura ficticia / fantástica
            </label>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Vinculado a personajes</label>
          <StorySelect
            value=""
            onChange={(id) => {
              if (!id) return;
              const ids = form.linkedCharacterIds ?? [];
              if (ids.includes(id)) return;
              patch({ linkedCharacterIds: [...ids, id] });
            }}
            options={characters.map((c) => ({ value: c.id, label: c.name, imageUrl: c.images[0] }))}
            placeholder="Añadir personaje…"
          />
          {(form.linkedCharacterIds ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {form.linkedCharacterIds!.map((id) => {
                const c = characters.find((x) => x.id === id);
                return (
                  <button
                    key={id}
                    type="button"
                    className="rounded-full bg-[#1E2230] px-2 py-0.5 text-xs text-[#8B91A7] hover:text-[#D61E2B]"
                    onClick={() => patch({ linkedCharacterIds: form.linkedCharacterIds!.filter((x) => x !== id) })}
                  >
                    {c?.name ?? id} ×
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
