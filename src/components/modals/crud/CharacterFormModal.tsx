import { useState, useEffect } from 'react';
import { Plus, Trash2, User, BookOpen, Link2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { BaseModal } from './BaseModal';
import { ImageInputField } from '@/components/common/ImageInputField';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';
import { useAppStore, useStore } from '@/store';
import type { Character, CharacterDeathInfo, CharacterExtraField, CharacterGender, CharacterRole, DeathCauseType, Relationship } from '@/types';
import { DEATH_CAUSE_OPTIONS } from '@/lib/deathCause';
import { GENDER_OPTIONS } from '@/lib/characterGender';
import { RELATIONSHIP_TYPE_OPTIONS, relationshipTypeLabel } from '@/lib/relationshipTypes';
import { CHARACTER_ROLE_OPTIONS } from '@/lib/characterRoles';
import { WorldTagInput } from '@/components/common/WorldTagInput';
import { resolveTagNames } from '@/lib/worldTags';
import { StorySelect } from '@/components/common/StorySelect';
import type { World } from '@/types';
import { toast } from 'sonner';
import { computeAgeForTimeline, resolveCharacterTimelineState } from '@/lib/characterTimelineAge';
import { StoryToggle } from '@/components/common/StoryToggle';

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: Character | null;
  onSubmit: (data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => void;
  showWorldPicker?: boolean;
  worldsList?: World[];
  defaultHouseId?: string;
  defaultHouseName?: string;
};

type FormTab = 'identity' | 'story' | 'relations';

const GENDER_FORM_OPTIONS = GENDER_OPTIONS.filter((g) => g.value !== 'unspecified');

function emptyCharacter(worldId: string): Omit<Character, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    name: '',
    alias: '',
    role: 'secondary',
    house: '',
    age: 0,
    birthYear: undefined,
    birthDateLabel: '',
    ageByTimeline: {},
    statusByTimeline: {},
    deathByTimeline: {},
    statusRecoveryByTimeline: {},
    extraFields: [],
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
    gender: 'male',
    isFavorite: false,
    isDeleted: false,
    tags: [],
    tagIds: [],
  };
}

const STORY_FIELDS: { key: 'appearance' | 'personality' | 'backstory' | 'traumas' | 'goals' | 'breakingPoint' | 'fears' | 'powers' | 'arc'; label: string }[] = [
  { key: 'appearance', label: 'Apariencia' },
  { key: 'personality', label: 'Personalidad' },
  { key: 'backstory', label: 'Trasfondo' },
  { key: 'traumas', label: 'Traumas' },
  { key: 'goals', label: 'Deseo principal' },
  { key: 'breakingPoint', label: 'Qué lo quiebra' },
  { key: 'fears', label: 'Miedos' },
  { key: 'powers', label: 'Poderes / habilidades' },
  { key: 'arc', label: 'Arco narrativo' },
];

export function CharacterFormModal({
  open,
  onClose,
  worldId,
  initial,
  onSubmit,
  showWorldPicker = false,
  worldsList = [],
  defaultHouseId,
  defaultHouseName,
}: Props) {
  const [pickedWorldId, setPickedWorldId] = useState(worldId);
  const effectiveWorldId = showWorldPicker ? pickedWorldId : worldId;
  const timelines = useAppStore((s) => s.getTimelinesByWorld(effectiveWorldId));
  const houses = useAppStore((s) => s.getHousesByWorld(effectiveWorldId));
  const worldCharacters = useAppStore((s) => s.getCharactersByWorld(effectiveWorldId));
  const [form, setForm] = useState<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>>(() =>
    emptyCharacter(effectiveWorldId)
  );
  const [tab, setTab] = useState<FormTab>('identity');
  const [mainImage, setMainImage] = useState('');
  const [quotesRaw, setQuotesRaw] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const worldTags = useAppStore((s) => s.getWorldTagsByWorld(effectiveWorldId));
  const [ageTimelineDraft, setAgeTimelineDraft] = useState<Record<string, string>>({});
  const [statusTimelineDraft, setStatusTimelineDraft] = useState<Record<string, Character['status']>>({});
  const [deathTimelineDraft, setDeathTimelineDraft] = useState<Record<string, CharacterDeathInfo>>({});
  const [recoveryTimelineDraft, setRecoveryTimelineDraft] = useState<Record<string, boolean>>({});
  const [extraFields, setExtraFields] = useState<CharacterExtraField[]>([]);
  const [useTimelineStatus, setUseTimelineStatus] = useState(false);
  const [err, setErr] = useState('');
  const [relCharId, setRelCharId] = useState('');
  const [relType, setRelType] = useState('');
  const [relDesc, setRelDesc] = useState('');

  useEffect(() => {
    if (!open) return;
    const wid = showWorldPicker ? pickedWorldId || worldsList[0]?.id || worldId : worldId;
    if (showWorldPicker && !pickedWorldId && worldsList[0]) setPickedWorldId(worldsList[0].id);
    const timelinesSnap = useStore.getState().getTimelinesByWorld(wid);
    const base = initial
      ? { ...emptyCharacter(wid), ...initial, worldId: wid }
      : {
          ...emptyCharacter(wid),
          houseId: defaultHouseId,
          house: defaultHouseName ?? '',
        };
    if (base.gender === 'unspecified') base.gender = 'male';
    setForm(base);
    setTab('identity');
    setMainImage(initial?.images[0] ?? '');
    setQuotesRaw((initial?.quotes ?? []).join('\n'));
    setTagIds(initial?.tagIds ?? []);
    const draft: Record<string, string> = {};
    for (const tl of timelinesSnap) {
      draft[tl.id] = String(base.ageByTimeline[tl.id] ?? '');
    }
    setAgeTimelineDraft(draft);
    const statusDraft: Record<string, Character['status']> = {};
    for (const tl of timelinesSnap) {
      if (base.statusByTimeline?.[tl.id] !== undefined) {
        statusDraft[tl.id] = base.statusByTimeline[tl.id];
      }
    }
    setStatusTimelineDraft(statusDraft);
    setDeathTimelineDraft({ ...(base.deathByTimeline ?? {}) });
    setRecoveryTimelineDraft({ ...(base.statusRecoveryByTimeline ?? {}) });
    setExtraFields(base.extraFields ?? []);
    setUseTimelineStatus(
      Boolean(initial?.statusByTimeline && Object.keys(initial.statusByTimeline).length > 0)
    );
    setErr('');
  }, [open, worldId, pickedWorldId, initial?.id, initial?.updatedAt, defaultHouseId, showWorldPicker]);

  const patch = (p: Partial<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.name.trim()) {
      setErr('El nombre es obligatorio');
      return;
    }
    if (!form.gender || form.gender === 'unspecified') {
      setErr('Selecciona el sexo del personaje (hombre o mujer)');
      return;
    }
    const birthYear =
      form.birthYear != null && Number.isFinite(form.birthYear) ? Math.round(form.birthYear) : undefined;
    const ageByTimeline: Record<string, number> = {};
    for (const tl of timelines) {
      const v = ageTimelineDraft[tl.id]?.trim();
      if (v !== undefined && v !== '') {
        ageByTimeline[tl.id] = Number(v) || 0;
      } else if (birthYear != null) {
        const computed = computeAgeForTimeline(birthYear, tl);
        if (computed != null) ageByTimeline[tl.id] = computed;
      }
    }
    const statusByTimeline: Record<string, Character['status']> | undefined = useTimelineStatus
      ? Object.fromEntries(
          timelines
            .filter((tl) => statusTimelineDraft[tl.id] !== undefined)
            .map((tl) => [tl.id, statusTimelineDraft[tl.id]!])
        )
      : undefined;
    const statusRecoveryByTimeline: Record<string, boolean> | undefined = useTimelineStatus
      ? Object.fromEntries(
          Object.entries(recoveryTimelineDraft).filter(([, active]) => active)
        )
      : undefined;
    const deathByTimeline: Record<string, CharacterDeathInfo> = {};
    for (const tl of timelines) {
      if (statusTimelineDraft[tl.id] !== 'dead') continue;
      const d = deathTimelineDraft[tl.id];
      if (d?.causeType) {
        deathByTimeline[tl.id] = { ...d, timelineId: tl.id };
      }
    }
    const quotes = quotesRaw
      .split('\n')
      .map((q) => q.trim())
      .filter(Boolean);
    const tags = resolveTagNames(tagIds, worldTags);
    const images = mainImage.trim() ? [mainImage.trim()] : [];
    if (showWorldPicker && !effectiveWorldId) {
      setErr('Selecciona un mundo');
      return;
    }
    onSubmit({
      ...form,
      worldId: effectiveWorldId,
      name: form.name.trim(),
      birthYear,
      birthDateLabel: form.birthDateLabel?.trim() || undefined,
      ageByTimeline,
      statusByTimeline: statusByTimeline && Object.keys(statusByTimeline).length ? statusByTimeline : undefined,
      statusRecoveryByTimeline:
        statusRecoveryByTimeline && Object.keys(statusRecoveryByTimeline).length
          ? statusRecoveryByTimeline
          : undefined,
      deathByTimeline: Object.keys(deathByTimeline).length ? deathByTimeline : undefined,
      extraFields: extraFields.filter((f) => f.label.trim()),
      quotes,
      tags,
      tagIds,
      images: images.length ? images : form.images,
    });
    setErr('');
    onClose();
  };

  const portrait = mainImage.trim() || form.images[0];
  const tabs: { id: FormTab; label: string; icon: typeof User }[] = [
    { id: 'identity', label: 'Identidad', icon: User },
    { id: 'story', label: 'Historia', icon: BookOpen },
    { id: 'relations', label: 'Relaciones', icon: Link2 },
  ];

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar personaje' : 'Nuevo personaje'}
      maxWidthClass="max-w-5xl"
      footer={
        <>
          <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="story-btn-primary text-sm" onClick={save}>
            Guardar personaje
          </button>
        </>
      }
    >
      {err && (
        <p className="mb-3 rounded-lg border border-[#D61E2B]/30 bg-[#D61E2B]/10 px-3 py-2 text-sm text-[#D61E2B]">{err}</p>
      )}
      {showWorldPicker && !initial && (
        <div className="mb-4">
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Mundo *</label>
          <StorySelect
            value={pickedWorldId}
            onChange={(id) => {
              setPickedWorldId(id);
              setForm(emptyCharacter(id));
            }}
            options={worldsList.map((w) => ({ value: w.id, label: w.name }))}
            placeholder="Elige un mundo…"
            clearable={false}
            className="max-w-sm"
          />
        </div>
      )}

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-[#2A3045] pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t.id ? 'bg-[#D61E2B] text-white shadow-lg shadow-[#D61E2B]/20' : 'bg-[#1E2230] text-[#8B91A7] hover:text-[#E8E9EB]'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid max-h-[62vh] gap-6 overflow-y-auto pr-1 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-3 lg:sticky lg:top-0 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-[#2A3045] bg-gradient-to-b from-[#161922] to-[#0B0D10] shadow-xl">
            <div className="aspect-[3/4] w-full">
              {portrait ? (
                <img src={portrait} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-[#5A6078]">
                  <User size={40} className="opacity-40" />
                  <span className="text-xs">Sin retrato</span>
                </div>
              )}
            </div>
            <div className="border-t border-[#2A3045] p-3">
              <p className="truncate text-center font-semibold text-[#E8E9EB]">{form.name || 'Sin nombre'}</p>
              {form.alias && <p className="truncate text-center text-xs text-[#8B91A7]">«{form.alias}»</p>}
            </div>
          </div>
          <ImageInputField label="Retrato" value={mainImage} onChange={setMainImage} />
        </div>

        <div className="min-w-0 space-y-4">
          {tab === 'identity' && (
            <div className="space-y-4 rounded-xl border border-[#2A3045]/60 bg-[#111318]/80 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-[#5A6078]">Nombre *</label>
                  <input className="story-input w-full" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-[#5A6078]">Alias</label>
                  <input className="story-input w-full" value={form.alias} onChange={(e) => patch({ alias: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-[#5A6078]">Sexo *</label>
                  <select
                    className="story-input w-full text-sm"
                    value={form.gender === 'unspecified' ? 'male' : form.gender}
                    onChange={(e) => patch({ gender: e.target.value as CharacterGender })}
                  >
                    {GENDER_FORM_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-[#5A6078]">Rol narrativo</label>
                  <select className="story-input w-full text-sm" value={form.role} onChange={(e) => patch({ role: e.target.value as CharacterRole })}>
                    {CHARACTER_ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-[#5A6078]">Casa</label>
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
                  <label className="mb-1 block text-xs uppercase tracking-wider text-[#5A6078]">Estado</label>
                  <select
                    className="story-input w-full text-sm disabled:opacity-50"
                    value={form.status}
                    disabled={useTimelineStatus && timelines.length > 0}
                    onChange={(e) => patch({ status: e.target.value as Character['status'] })}
                  >
                    <option value="alive">Vivo</option>
                    <option value="dead">Muerto</option>
                    <option value="missing">Desaparecido</option>
                    <option value="unknown">Desconocido</option>
                  </select>
                  {useTimelineStatus && timelines.length > 0 && (
                    <p className="mt-1 text-[10px] text-[#5A6078]">Configura el estado en cada línea abajo.</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-[#5A6078]">Año de nacimiento</label>
                  <input
                    type="number"
                    className="story-input w-full"
                    value={form.birthYear ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      patch({ birthYear: raw === '' ? undefined : Number(raw) || undefined });
                    }}
                    placeholder="opcional"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-[#5A6078]">Fecha de nacimiento</label>
                  <input
                    className="story-input w-full"
                    value={form.birthDateLabel ?? ''}
                    onChange={(e) => patch({ birthDateLabel: e.target.value })}
                    placeholder="ej. 12 de marzo, año 402"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wider text-[#5A6078]">Edad</label>
                  <input type="number" className="story-input w-full" value={form.age || ''} onChange={(e) => patch({ age: Number(e.target.value) || 0 })} />
                </div>
              </div>
              {timelines.length > 0 && (
                <>
                  <label className="flex items-center gap-2 text-sm text-[#E8E9EB]">
                    <input
                      type="checkbox"
                      checked={useTimelineStatus}
                      onChange={(e) => setUseTimelineStatus(e.target.checked)}
                      className="accent-[#D61E2B]"
                    />
                    Estado distinto por línea temporal
                  </label>
                  {timelines.map((tl, tlIndex) => {
                    const computed =
                      form.birthYear != null ? computeAgeForTimeline(form.birthYear, tl) : null;
                    const previewCharacter: Character = {
                      ...(form as Character),
                      id: initial?.id ?? 'preview',
                      createdAt: initial?.createdAt ?? '',
                      updatedAt: initial?.updatedAt ?? '',
                      statusByTimeline: useTimelineStatus
                        ? Object.fromEntries(
                            timelines
                              .filter((t) => statusTimelineDraft[t.id] !== undefined)
                              .map((t) => [t.id, statusTimelineDraft[t.id]!])
                          )
                        : undefined,
                      statusRecoveryByTimeline: useTimelineStatus ? recoveryTimelineDraft : undefined,
                      deathByTimeline: deathTimelineDraft,
                    };
                    const resolved = useTimelineStatus
                      ? resolveCharacterTimelineState(previewCharacter, tl.id, timelines)
                      : { status: form.status, death: undefined, recoveredThisTimeline: false };
                    const displayStatus = statusTimelineDraft[tl.id] ?? resolved.status;
                    const explicitDead = statusTimelineDraft[tl.id] === 'dead';
                    const priorTimeline = tlIndex > 0 ? timelines[tlIndex - 1] : null;
                    const priorResolved =
                      priorTimeline && useTimelineStatus
                        ? resolveCharacterTimelineState(previewCharacter, priorTimeline.id, timelines)
                        : null;
                    const showRecoveryToggle =
                      useTimelineStatus &&
                      tlIndex > 0 &&
                      (priorResolved?.status === 'dead' ||
                        priorResolved?.status === 'missing' ||
                        Boolean(recoveryTimelineDraft[tl.id]));
                    const recoveryLabel =
                      priorResolved?.status === 'missing' ? 'Reapareció en esta línea' : 'Revivió en esta línea';

                    return (
                      <div key={tl.id} className="rounded-lg border border-[#2A3045]/60 bg-[#111318]/40 p-3">
                        <p className="mb-2 text-xs font-medium text-[#8B91A7]">Línea: {tl.name}</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Edad</label>
                            <input
                              className="story-input w-full"
                              value={ageTimelineDraft[tl.id] ?? ''}
                              onChange={(e) => setAgeTimelineDraft((d) => ({ ...d, [tl.id]: e.target.value }))}
                              placeholder={computed != null ? String(computed) : 'opcional'}
                            />
                            {computed != null && !ageTimelineDraft[tl.id]?.trim() && (
                              <p className="mt-1 text-[10px] text-[#5A6078]">
                                Calculada: {computed} años (según año de la línea)
                              </p>
                            )}
                          </div>
                          {useTimelineStatus && (
                            <div>
                              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Estado</label>
                              <select
                                className="story-input w-full text-sm"
                                value={displayStatus}
                                disabled={Boolean(recoveryTimelineDraft[tl.id])}
                                onChange={(e) => {
                                  const next = e.target.value as Character['status'];
                                  setStatusTimelineDraft((d) => ({ ...d, [tl.id]: next }));
                                  if (next !== 'dead') {
                                    setDeathTimelineDraft((d) => {
                                      const copy = { ...d };
                                      delete copy[tl.id];
                                      return copy;
                                    });
                                  }
                                }}
                              >
                                <option value="alive">Vivo</option>
                                <option value="dead">Muerto</option>
                                <option value="missing">Desaparecido</option>
                                <option value="unknown">Desconocido</option>
                              </select>
                            </div>
                          )}
                        </div>
                        {showRecoveryToggle && (
                          <div className="mt-3 flex items-center gap-3 border-t border-[#2A3045]/50 pt-3">
                            <StoryToggle
                              checked={Boolean(recoveryTimelineDraft[tl.id])}
                              onChange={(checked) => {
                                setRecoveryTimelineDraft((d) => ({ ...d, [tl.id]: checked }));
                                if (checked) {
                                  setStatusTimelineDraft((d) => {
                                    const copy = { ...d };
                                    delete copy[tl.id];
                                    return copy;
                                  });
                                  setDeathTimelineDraft((d) => {
                                    const copy = { ...d };
                                    delete copy[tl.id];
                                    return copy;
                                  });
                                }
                              }}
                              aria-label={recoveryLabel}
                            />
                            <span className="text-sm text-[#E8E9EB]">{recoveryLabel}</span>
                          </div>
                        )}
                        {useTimelineStatus && displayStatus === 'dead' && !explicitDead && resolved.death && (
                          <p className="mt-3 border-t border-[#2A3045]/50 pt-3 text-[10px] text-[#5A6078]">
                            Muerto desde una línea anterior (se mantiene la causa registrada allí).
                          </p>
                        )}
                        {useTimelineStatus && explicitDead && (
                          <div className="mt-3 grid gap-2 border-t border-[#2A3045]/50 pt-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tipo de muerte</label>
                              <select
                                className="story-input w-full text-sm"
                                value={deathTimelineDraft[tl.id]?.causeType ?? 'unknown'}
                                onChange={(e) =>
                                  setDeathTimelineDraft((d) => ({
                                    ...d,
                                    [tl.id]: {
                                      timelineId: tl.id,
                                      causeType: e.target.value as DeathCauseType,
                                      customCause: d[tl.id]?.customCause,
                                      dateLabel: d[tl.id]?.dateLabel,
                                      notes: d[tl.id]?.notes,
                                    },
                                  }))
                                }
                              >
                                {DEATH_CAUSE_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Fecha / momento</label>
                              <input
                                className="story-input w-full text-sm"
                                value={deathTimelineDraft[tl.id]?.dateLabel ?? ''}
                                onChange={(e) =>
                                  setDeathTimelineDraft((d) => ({
                                    ...d,
                                    [tl.id]: {
                                      ...d[tl.id],
                                      timelineId: tl.id,
                                      causeType: d[tl.id]?.causeType ?? 'unknown',
                                      dateLabel: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="opcional"
                              />
                            </div>
                            {(deathTimelineDraft[tl.id]?.causeType ?? 'unknown') === 'other' && (
                              <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs uppercase text-[#5A6078]">Causa (texto)</label>
                                <input
                                  className="story-input w-full text-sm"
                                  value={deathTimelineDraft[tl.id]?.customCause ?? ''}
                                  onChange={(e) =>
                                    setDeathTimelineDraft((d) => ({
                                      ...d,
                                      [tl.id]: {
                                        timelineId: tl.id,
                                        causeType: 'other',
                                        customCause: e.target.value,
                                        dateLabel: d[tl.id]?.dateLabel,
                                        notes: d[tl.id]?.notes,
                                      },
                                    }))
                                  }
                                />
                              </div>
                            )}
                            <div className="sm:col-span-2">
                              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Cómo murió</label>
                              <StoryRichTextField
                                worldId={effectiveWorldId}
                                value={deathTimelineDraft[tl.id]?.notes ?? ''}
                                onChange={(notes) =>
                                  setDeathTimelineDraft((d) => ({
                                    ...d,
                                    [tl.id]: {
                                      timelineId: tl.id,
                                      causeType: d[tl.id]?.causeType ?? 'unknown',
                                      dateLabel: d[tl.id]?.dateLabel,
                                      customCause: d[tl.id]?.customCause,
                                      notes,
                                    },
                                  }))
                                }
                                minHeight="5.5rem"
                                placeholder="Detalle narrativo de la muerte…"
                                hideHint
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
              <div>
                <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tags</label>
                <WorldTagInput worldId={effectiveWorldId} tagIds={tagIds} onChange={setTagIds} />
              </div>
              <label className="flex items-center gap-2 text-sm text-[#E8E9EB]">
                <input id="cf-fav" type="checkbox" checked={form.isFavorite} onChange={(e) => patch({ isFavorite: e.target.checked })} className="accent-[#D61E2B]" />
                Marcar como favorito
              </label>
            </div>
          )}

          {tab === 'story' && (
            <div className="space-y-4">
              {STORY_FIELDS.map(({ key, label }) => (
                <div key={key} className="rounded-xl border border-[#2A3045]/50 bg-[#111318]/60 p-3">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#8B91A7]">{label}</label>
                  <StoryRichTextField
                    worldId={effectiveWorldId}
                    value={(form[key] as string) ?? ''}
                    onChange={(v) => patch({ [key]: v })}
                    minHeight="5rem"
                  />
                </div>
              ))}
              <div className="rounded-xl border border-[#2A3045]/50 bg-[#111318]/60 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-[#8B91A7]">Datos extra</label>
                  <button
                    type="button"
                    className="story-btn-secondary flex items-center gap-1 px-2 py-1 text-xs"
                    onClick={() =>
                      setExtraFields((f) => [...f, { id: uuidv4(), label: '', value: '', section: 'extra' }])
                    }
                  >
                    <Plus size={12} /> Campo
                  </button>
                </div>
                {extraFields.length === 0 ? (
                  <p className="text-xs text-[#5A6078]">Añade campos como «Traumas», «Debilidad», etc. con el nombre que quieras.</p>
                ) : (
                  <ul className="space-y-2">
                    {extraFields.map((field, i) => (
                      <li key={field.id} className="flex flex-col gap-2 rounded-lg border border-[#2A3045] p-2 sm:flex-row">
                        <input
                          className="story-input w-full text-sm sm:max-w-[8rem]"
                          value={field.label}
                          onChange={(e) =>
                            setExtraFields((list) =>
                              list.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))
                            )
                          }
                          placeholder="Nombre"
                        />
                        <div className="min-w-0 flex-1">
                          <StoryRichTextField
                            worldId={effectiveWorldId}
                            value={field.value}
                            onChange={(value) =>
                              setExtraFields((list) =>
                                list.map((x, j) => (j === i ? { ...x, value } : x))
                              )
                            }
                            minHeight="4.5rem"
                            placeholder="Contenido"
                            hideHint
                          />
                        </div>
                        <button
                          type="button"
                          className="self-end rounded-lg p-2 text-[#5A6078] hover:text-[#D61E2B] sm:self-center"
                          onClick={() => setExtraFields((list) => list.filter((_, j) => j !== i))}
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border border-[#2A3045]/50 bg-[#111318]/60 p-3">
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#8B91A7]">Frases memorables</label>
                <StoryRichTextField
                  worldId={effectiveWorldId}
                  value={quotesRaw}
                  onChange={setQuotesRaw}
                  minHeight="5rem"
                  placeholder="Una cita por línea"
                />
              </div>
            </div>
          )}

          {tab === 'relations' && (
            <div className="space-y-3 rounded-xl border border-[#2A3045] bg-gradient-to-b from-[#13161c] to-[#111318] p-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#D61E2B]">Vínculos con otros personajes</h4>
              {form.relationships.length > 0 ? (
                <ul className="space-y-2">
                  {form.relationships.map((rel, idx) => (
                    <li key={`${rel.characterId}-${rel.type}-${idx}`} className="flex items-center justify-between gap-2 rounded-lg bg-[#1E2230] px-3 py-2">
                      <span className="text-sm text-[#E8E9EB]">
                        <strong>{rel.characterName}</strong>
                        <span className="ml-2 text-xs text-[#5A6078]">{relationshipTypeLabel(rel.type)}</span>
                      </span>
                      <button
                        type="button"
                        className="text-xs text-[#D61E2B] hover:underline"
                        onClick={() => patch({ relationships: form.relationships.filter((_, i) => i !== idx) })}
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#5A6078]">Sin relaciones en esta ficha (puedes añadirlas aquí o en el árbol genealógico).</p>
              )}
              <div className="grid gap-2 sm:grid-cols-3">
                <StorySelect
                  value={relCharId}
                  onChange={setRelCharId}
                  options={worldCharacters
                    .filter((ch) => ch.id !== initial?.id)
                    .map((ch) => ({ value: ch.id, label: ch.name, imageUrl: ch.images[0] }))}
                  placeholder="Personaje…"
                />
                <StorySelect
                  value={relType}
                  onChange={setRelType}
                  options={RELATIONSHIP_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label, sublabel: o.group }))}
                  placeholder="Tipo…"
                />
                <input className="story-input text-sm" placeholder="Nota" value={relDesc} onChange={(e) => setRelDesc(e.target.value)} />
              </div>
              <button
                type="button"
                className="story-btn-secondary text-xs"
                onClick={() => {
                  const ch = worldCharacters.find((x) => x.id === relCharId);
                  if (!ch || !relType) {
                    toast.error('Elige personaje y tipo');
                    return;
                  }
                  const dup = form.relationships.some(
                    (r) => r.characterId === ch.id && r.type === relType
                  );
                  if (dup) {
                    toast.error('Esa relación ya está en la lista');
                    return;
                  }
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
          )}
        </div>
      </div>
    </BaseModal>
  );
}
