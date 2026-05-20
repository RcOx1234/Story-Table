import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Castle } from 'lucide-react';
import { toast } from 'sonner';
import { BaseModal } from './BaseModal';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';
import { useAppStore } from '@/store';
import type { House, NobleRank } from '@/types';
import { ImageInputField } from '@/components/common/ImageInputField';

const NOBLE_RANKS: { value: NobleRank; label: string }[] = [
  { value: 'emperor', label: 'Emperador' },
  { value: 'king', label: 'Rey' },
  { value: 'duke', label: 'Duque' },
  { value: 'marquis', label: 'Marqu?s' },
  { value: 'count', label: 'Conde' },
  { value: 'baron', label: 'Barùn' },
  { value: 'knight', label: 'Caballero' },
  { value: 'commoner', label: 'Plebeyo' },
  { value: 'other', label: 'Otro' },
];

type HouseFormData = Omit<House, 'id' | 'createdAt' | 'updatedAt'>;

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: House | null;
  onSubmit: (data: HouseFormData) => void;
};

function empty(worldId: string): HouseFormData {
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
    familyPeople: [],
    familyRelations: [],
    familyUnits: [],
    isFavorite: false,
    isDeleted: false,
    tags: [],
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-[#5A6078]">{label}</label>
      {children}
    </div>
  );
}

export function HouseFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const allHouses = useAppStore((s) => s.getHousesByWorld(worldId));
  const parentOptions = useMemo(() => allHouses.filter((h) => h.id !== initial?.id), [allHouses, initial?.id]);

  const [form, setForm] = useState(() => empty(worldId));
  const [tagsRaw, setTagsRaw] = useState('');

  useEffect(() => {
    if (!open) return;
    const base = initial ? { ...empty(worldId), ...initial, worldId } : empty(worldId);
    setForm(base);
    setTagsRaw((initial?.tags ?? []).join(', '));
  }, [open, worldId, initial?.id, initial?.updatedAt]);

  const patch = (p: Partial<HouseFormData>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
    onSubmit({
      ...form,
      name: form.name.trim(),
      motto: form.motto.trim(),
      tags,
      parentHouseId: form.parentHouseId || undefined,
      influenceLevel: Math.min(10, Math.max(1, form.influenceLevel)),
      members: initial?.members ?? form.members ?? [],
    });
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar casa' : 'Nueva casa'}
      description="Datos de la casa noble. Los miembros se gestionan desde la ficha de la casa."
      maxWidthClass="max-w-xl"
      footer={
        <div className="flex w-full justify-end gap-2">
          <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="story-btn-primary text-sm" onClick={save}>
            Guardar
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#2A3045] bg-[#111318]">
            {form.imageUrl ? (
              <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Castle size={32} className="text-[#5A6078]" />
            )}
          </div>
          <div className="w-full flex-1">
            <ImageInputField label="Escudo" value={form.imageUrl} onChange={(url) => patch({ imageUrl: url })} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre *">
            <input
              className="story-input w-full"
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Casa Thunderbolt"
            />
          </Field>
          <Field label="Lema">
            <input className="story-input w-full italic" value={form.motto} onChange={(e) => patch({ motto: e.target.value })} />
          </Field>
        </div>

        <Field label="Descripcion?n">
          <StoryRichTextField worldId={worldId} value={form.description} onChange={(v) => patch({ description: v })} minHeight="5rem" />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Rango">
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
          </Field>
          <Field label={`Influencia (${form.influenceLevel}/10)`}>
            <input
              type="range"
              min={1}
              max={10}
              className="mt-2 w-full accent-[#D61E2B]"
              value={form.influenceLevel}
              onChange={(e) => patch({ influenceLevel: Number(e.target.value) })}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Territorio">
            <input className="story-input w-full" value={form.territory} onChange={(e) => patch({ territory: e.target.value })} />
          </Field>
          <Field label="Casa superior">
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
          </Field>
        </div>

        <Field label="Linaje">
          <StoryRichTextField worldId={worldId} value={form.lineage} onChange={(v) => patch({ lineage: v })} minHeight="4rem" />
        </Field>

        <Field label="S?mbolos">
          <StoryRichTextField worldId={worldId} value={form.symbols} onChange={(v) => patch({ symbols: v })} minHeight="4rem" />
        </Field>

        <Field label="Etiquetas (separadas por coma)">
          <input className="story-input w-full" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="noble, antigua" />
        </Field>

        <label className="flex items-center gap-2 text-sm text-[#E8E9EB]">
          <input type="checkbox" checked={form.isFavorite} onChange={(e) => patch({ isFavorite: e.target.checked })} className="accent-[#D61E2B]" />
          Marcar como favorita
        </label>
      </div>
    </BaseModal>
  );
}
