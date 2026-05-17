import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { ImageInputField } from '@/components/common/ImageInputField';
import { useAppStore, useStore } from '@/store';
import type { Character, CharacterRole, Relationship } from '@/types';
import { RELATIONSHIP_TYPE_OPTIONS } from '@/lib/relationshipTypes';

const ROLES: { value: CharacterRole; label: string }[] = [
  { value: 'protagonist', label: 'Protagonista' },
  { value: 'antagonist', label: 'Antagonista' },
  { value: 'secondary', label: 'Secundario' },
  { value: 'supporting', label: 'Apoyo' },
  { value: 'extra', label: 'Extra' },
  { value: 'king', label: 'Rey' },
  { value: 'queen', label: 'Reina' },
  { value: 'assassin', label: 'Asesino' },
  { value: 'prince', label: 'Príncipe' },
  { value: 'princess', label: 'Princesa' },
  { value: 'other', label: 'Otro' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: Character | null;
  onSubmit: (data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

function emptyCharacter(worldId: string): Omit<Character, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    name: '',
    alias: '',
    role: 'secondary',
    house: '',
    age: 0,
    ageByTimeline: {},
    appearance: '',
    personality: '',
    backstory: '',
    goals: '',
    fears: '',
    powers: '',
    traumas: '',
    breakingPoint: '',
    relationships: [],
    images: [],
    quotes: [],
    arc: '',
    status: 'alive',
    isFavorite: false,
    isDeleted: false,
    tags: [],
  };
}

export function CharacterFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const timelines = useAppStore((s) => s.getTimelinesByWorld(worldId));
  const houses = useAppStore((s) => s.getHousesByWorld(worldId));
  const worldCharacters = useAppStore((s) => s.getCharactersByWorld(worldId));
  const [form, setForm] = useState<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>>(() => emptyCharacter(worldId));
  const [mainImage, setMainImage] = useState('');
  const [quotesRaw, setQuotesRaw] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [ageTimelineDraft, setAgeTimelineDraft] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [relCharId, setRelCharId] = useState('');
  const [relType, setRelType] = useState('');
  const [relDesc, setRelDesc] = useState('');

  useEffect(() => {
    if (!open) return;
    const timelinesSnap = useStore.getState().getTimelinesByWorld(worldId);
    const base = initial ? { ...emptyCharacter(worldId), ...initial, worldId } : emptyCharacter(worldId);
    setForm(base);
    setMainImage(initial?.images[0] ?? '');
    setQuotesRaw((initial?.quotes ?? []).join('\n'));
    setTagsRaw((initial?.tags ?? []).join(', '));
    const draft: Record<string, string> = {};
    for (const tl of timelinesSnap) {
      draft[tl.id] = String(base.ageByTimeline[tl.id] ?? '');
    }
    setAgeTimelineDraft(draft);
    setErr('');
  }, [open, worldId, initial?.id, initial?.updatedAt]);

  const patch = (p: Partial<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.name.trim()) {
      setErr('El nombre es obligatorio');
      return;
    }
    const ageByTimeline: Record<string, number> = {};
    for (const tl of timelines) {
      const v = ageTimelineDraft[tl.id]?.trim();
      if (v !== undefined && v !== '') ageByTimeline[tl.id] = Number(v) || 0;
    }
    const quotes = quotesRaw
      .split('\n')
      .map((q) => q.trim())
      .filter(Boolean);
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const images = mainImage.trim() ? [mainImage.trim()] : [];
    onSubmit({
      ...form,
      name: form.name.trim(),
      ageByTimeline,
      quotes,
      tags,
      images: images.length ? images : form.images,
    });
    setErr('');
    onClose();
  };

  const hasPreview = Boolean(mainImage.trim() || form.images[0]);

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar personaje' : 'Nuevo personaje'}
      maxWidthClass="max-w-4xl"
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
      <div
        className={`grid max-h-[65vh] gap-6 overflow-y-auto pr-1 ${
          hasPreview ? 'md:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]' : ''
        }`}
      >
        {hasPreview && (
          <>
            <div className="mx-auto w-full max-w-[220px] md:sticky md:top-0 md:mx-0 md:max-w-none md:self-start">
              <div className="overflow-hidden rounded-2xl border border-[#2A3045] bg-[#111318] shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                <div className="aspect-[3/4] w-full">
                  <img
                    src={(mainImage.trim() || form.images[0]) as string}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-[#5A6078]">Vista previa</p>
            </div>
          </>
        )}
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Nombre *</label>
          <input className="story-input w-full" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Alias</label>
          <input className="story-input w-full" value={form.alias} onChange={(e) => patch({ alias: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Rol</label>
          <select className="story-input w-full text-sm" value={form.role} onChange={(e) => patch({ role: e.target.value as CharacterRole })}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Casa / afiliación</label>
          <select
            className="story-input w-full text-sm"
            value={form.houseId ?? ''}
            onChange={(e) => {
              const h = houses.find((x) => x.id === e.target.value);
              patch({ houseId: e.target.value || undefined, house: h?.name ?? '' });
            }}
          >
            <option value="">— Sin casa —</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Edad general</label>
          <input type="number" className="story-input w-full" value={form.age || ''} onChange={(e) => patch({ age: Number(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Estado</label>
          <select className="story-input w-full text-sm" value={form.status} onChange={(e) => patch({ status: e.target.value as Character['status'] })}>
            <option value="alive">Vivo</option>
            <option value="dead">Muerto</option>
            <option value="missing">Desaparecido</option>
            <option value="unknown">Desconocido</option>
          </select>
        </div>
        {timelines.map((tl) => (
          <div key={tl.id} className="md:col-span-2">
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Edad en “{tl.name}”</label>
            <input
              className="story-input w-full max-w-xs"
              value={ageTimelineDraft[tl.id] ?? ''}
              onChange={(e) => setAgeTimelineDraft((d) => ({ ...d, [tl.id]: e.target.value }))}
              placeholder="opcional"
            />
          </div>
        ))}
        <div className="md:col-span-2">
          <ImageInputField label="Imagen principal" value={mainImage} onChange={setMainImage} />
        </div>
        {(
          [
            ['appearance', 'Apariencia'],
            ['personality', 'Personalidad'],
            ['backstory', 'Trasfondo'],
            ['traumas', 'Traumas'],
            ['goals', 'Deseo principal'],
            ['breakingPoint', 'Qué lo quiebra'],
            ['fears', 'Miedos'],
            ['powers', 'Poderes / habilidades'],
            ['arc', 'Arco'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="md:col-span-2">
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">{label}</label>
            <textarea
              className="story-input h-20 w-full resize-none"
              value={(form[key] as string) ?? ''}
              onChange={(e) => patch({ [key]: e.target.value } as Partial<Character>)}
            />
          </div>
        ))}

        <div className="md:col-span-2 space-y-3 rounded-xl border border-[#2A3045] bg-[#111318] p-4">
          <h4 className="text-xs font-mono uppercase tracking-wider text-[#5A6078]">Relaciones</h4>
          {form.relationships.length > 0 && (
            <ul className="space-y-2">
              {form.relationships.map((rel, idx) => (
                <li key={`${rel.characterId}-${idx}`} className="flex items-start justify-between gap-2 rounded-lg bg-[#1E2230] p-2 text-xs">
                  <span className="text-[#E8E9EB]">
                    <strong>{rel.characterName}</strong> · {rel.type}
                    {rel.description ? <span className="block text-[#8B91A7]">{rel.description}</span> : null}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-[#D61E2B] hover:underline"
                    onClick={() =>
                      patch({ relationships: form.relationships.filter((_, i) => i !== idx) })
                    }
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <select className="story-input text-sm" value={relCharId} onChange={(e) => setRelCharId(e.target.value)}>
              <option value="">Personaje…</option>
              {worldCharacters
                .filter((ch) => ch.id !== initial?.id)
                .map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name}
                  </option>
                ))}
            </select>
            <select className="story-input text-sm" value={relType} onChange={(e) => setRelType(e.target.value)}>
              <option value="">Tipo de relación…</option>
              {['Familia', 'Vínculos', 'Tensión', 'Otros'].map((group) => (
                <optgroup key={group} label={group}>
                  {RELATIONSHIP_TYPE_OPTIONS.filter((o) => o.group === group).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input
              className="story-input text-sm sm:col-span-1"
              placeholder="Descripción"
              value={relDesc}
              onChange={(e) => setRelDesc(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="story-btn-secondary text-xs"
            onClick={() => {
              const ch = worldCharacters.find((x) => x.id === relCharId);
              if (!ch || !relType) return;
              const next: Relationship = {
                characterId: ch.id,
                characterName: ch.name,
                type: relType,
                description: relDesc.trim(),
              };
              patch({ relationships: [...form.relationships, next] });
              setRelCharId('');
              setRelType('');
              setRelDesc('');
            }}
          >
            Añadir relación
          </button>
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Frases memorables (una por línea)</label>
          <textarea className="story-input h-24 w-full resize-none" value={quotesRaw} onChange={(e) => setQuotesRaw(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tags (coma)</label>
          <input className="story-input w-full" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <input id="cf-fav" type="checkbox" checked={form.isFavorite} onChange={(e) => patch({ isFavorite: e.target.checked })} />
          <label htmlFor="cf-fav" className="text-sm text-[#E8E9EB]">
            Favorito
          </label>
        </div>
        </div>
      </div>
    </BaseModal>
  );
}
