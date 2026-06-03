import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Lightbulb,
  Tag,
  Search,
  Globe,
  ChevronDown,
  User,
  Check,
  X,
} from 'lucide-react';
import { BaseModal } from './BaseModal';
import { useAppStore } from '@/store';
import type { Idea } from '@/types';
import { ImageInputField } from '@/components/common/ImageInputField';
import { AudioPlayer } from '@/components/common/AudioPlayer';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';
import type { EntityPickerItem } from '@/components/common/EntityMultiPicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string | null;
  initial?: Idea | null;
  onSubmit: (data: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

const TYPE_OPTIONS: { value: Idea['type']; label: string; color: string }[] = [
  { value: 'scene', label: 'Escena', color: '#22C55E' },
  { value: 'character', label: 'Personaje', color: '#3B82F6' },
  { value: 'plot', label: 'Trama', color: '#D61E2B' },
  { value: 'world', label: 'Mundo', color: '#8B5CF6' },
  { value: 'dialogue', label: 'Diálogo', color: '#EAB308' },
  { value: 'lore', label: 'Lore', color: '#EC4899' },
  { value: 'other', label: 'Otro', color: '#5A6078' },
];

type LinkState = {
  linkedCharacterId: string | null;
  relatedCharacterIds: string[];
  relatedPlaceIds: string[];
  relatedSceneIds: string[];
  relatedHouseIds: string[];
  relatedOrganizationIds: string[];
};

function emptyLinks(): LinkState {
  return {
    linkedCharacterId: null,
    relatedCharacterIds: [],
    relatedPlaceIds: [],
    relatedSceneIds: [],
    relatedHouseIds: [],
    relatedOrganizationIds: [],
  };
}

function linksFromIdea(idea: Idea): LinkState {
  return {
    linkedCharacterId: idea.linkedCharacterId ?? null,
    relatedCharacterIds: idea.relatedCharacterIds ?? [],
    relatedPlaceIds: idea.relatedPlaceIds ?? [],
    relatedSceneIds: idea.relatedSceneIds ?? [],
    relatedHouseIds: idea.relatedHouseIds ?? [],
    relatedOrganizationIds: idea.relatedOrganizationIds ?? [],
  };
}

function filterItems(items: EntityPickerItem[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((i) => i.label.toLowerCase().includes(q));
}

function InlineEntityChecklist({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: EntityPickerItem[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => filterItems(items, search), [items, search]);
  const selectedCount = value.filter((id) => items.some((i) => i.id === id)).length;

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#2A3045]/80 bg-[#0d0f14]/80">
      <div className="flex items-center justify-between gap-2 border-b border-[#2A3045]/60 px-3 py-2">
        <span className="text-xs font-mono uppercase tracking-wider text-[#5A6078]">{label}</span>
        {selectedCount > 0 && (
          <span className="rounded-full bg-[#D61E2B]/15 px-2 py-0.5 text-[10px] font-semibold text-[#D61E2B]">
            {selectedCount}
          </span>
        )}
      </div>
      <div className="relative border-b border-[#2A3045]/40 px-2 py-1.5">
        <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5A6078]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar…"
          className="w-full rounded-lg border-0 bg-[#111318]/60 py-2 pl-8 pr-2 text-sm text-[#E8E9EB] placeholder:text-[#5A6078] focus:outline-none focus:ring-1 focus:ring-[#3A4460]"
        />
      </div>
      <div className="max-h-36 space-y-0.5 overflow-y-auto p-2 scrollbar-thin">
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-[#5A6078]">Sin resultados</p>
        ) : (
          filtered.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#E8E9EB] hover:bg-[#1E2230]"
            >
              <input
                type="checkbox"
                className="story-checkbox shrink-0"
                checked={value.includes(item.id)}
                onChange={() => toggle(item.id)}
              />
              <span className="min-w-0 truncate">{item.label}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

function InlineSearchableSinglePick({
  label,
  items,
  value,
  onChange,
  placeholder = 'Sin foco único',
}: {
  label: string;
  items: EntityPickerItem[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => filterItems(items, search), [items, search]);
  const selected = items.find((i) => i.id === value);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-mono uppercase tracking-wider text-[#5A6078]">{label}</label>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full max-w-md items-center justify-between gap-2 rounded-xl border border-[#2A3045] bg-[#111318] px-3 py-2.5 text-left text-sm transition-all hover:border-[#3A4460]"
          >
            <span className="flex min-w-0 items-center gap-2">
              <User size={14} className="shrink-0 text-[#3B82F6]" />
              <span className={selected ? 'truncate text-[#E8E9EB]' : 'text-[#5A6078]'}>
                {selected?.label ?? placeholder}
              </span>
            </span>
            <ChevronDown size={16} className="shrink-0 text-[#5A6078]" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="z-[60] w-[min(100vw-2rem,22rem)] border-[#2A3045] bg-[#111318] p-0"
        >
          <div className="relative border-b border-[#2A3045] p-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar personaje…"
              className="w-full border-0 bg-transparent py-2.5 pl-9 pr-3 text-sm text-[#E8E9EB] placeholder:text-[#5A6078] focus:outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-all ${
                !value ? 'bg-[#D61E2B]/15 text-[#E8E9EB]' : 'text-[#8B91A7] hover:bg-[#1E2230]'
              }`}
            >
              <span className="text-[#5A6078]">{placeholder}</span>
              {!value && <Check size={14} className="ml-auto text-[#D61E2B]" />}
            </button>
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-[#5A6078]">Sin resultados</p>
            ) : (
              filtered.map((item) => {
                const picked = value === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-all ${
                      picked ? 'bg-[#D61E2B]/15 text-[#E8E9EB]' : 'text-[#8B91A7] hover:bg-[#1E2230]'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <Check size={14} className={picked ? 'text-[#D61E2B]' : 'opacity-0'} />
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
      {selected && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex items-center gap-1 rounded-full border border-[#2A3045] bg-[#1E2230] px-2 py-0.5 text-xs text-[#8B91A7] hover:text-[#E8E9EB]"
        >
          <X size={10} />
          Quitar foco
        </button>
      )}
    </div>
  );
}

export function IdeaFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Idea['type']>('scene');
  const [tagsRaw, setTagsRaw] = useState('');
  const [targetWorld, setTargetWorld] = useState<string | null>(worldId);
  const [links, setLinks] = useState<LinkState>(emptyLinks);
  const [imageUrl, setImageUrl] = useState('');
  const [err, setErr] = useState('');

  const effectiveWorldId = worldId ?? targetWorld;
  const richTextWorldId = effectiveWorldId ?? undefined;

  const allWorlds = useAppStore((s) => s.worlds);
  const worlds = useMemo(() => allWorlds.filter((w) => !w.isDeleted), [allWorlds]);
  const effectiveWorldName = useMemo(
    () => worlds.find((w) => w.id === effectiveWorldId)?.name,
    [worlds, effectiveWorldId]
  );

  const characters = useAppStore((s) => s.characters);
  const places = useAppStore((s) => s.places);
  const scenes = useAppStore((s) => s.scenes);
  const houses = useAppStore((s) => s.houses);
  const organizations = useAppStore((s) => s.organizations);
  const characterOrderByWorld = useAppStore((s) => s.characterOrderByWorld);

  const characterItems = useMemo(() => {
    if (!effectiveWorldId) return [];

    const list = characters.filter((c) => c.worldId === effectiveWorldId && !c.isDeleted);

    const order = characterOrderByWorld[effectiveWorldId];

    const sorted = order?.length
      ? [...list].sort((a, b) => {
          const rank = new Map(order.map((id, i) => [id, i]));
          return (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999);
        })
      : list;

    return sorted.map((c) => ({
      id: c.id,
      label: c.name,
      imageUrl: c.images?.[0],
    }));
  }, [characters, characterOrderByWorld, effectiveWorldId]);

  const placeItems = useMemo(() => {
    if (!effectiveWorldId) return [];

    return places
      .filter((p) => p.worldId === effectiveWorldId && !p.isDeleted)
      .map((p) => ({
        id: p.id,
        label: p.name,
      }));
  }, [places, effectiveWorldId]);

  const sceneItems = useMemo(() => {
    if (!effectiveWorldId) return [];

    return scenes
      .filter((sc) => sc.worldId === effectiveWorldId && !sc.isDeleted)
      .map((sc) => ({
        id: sc.id,
        label: sc.title,
      }));
  }, [scenes, effectiveWorldId]);

  const houseItems = useMemo(() => {
    if (!effectiveWorldId) return [];

    return houses
      .filter((h) => h.worldId === effectiveWorldId && !h.isDeleted)
      .sort((a, b) => b.influenceLevel - a.influenceLevel)
      .map((h) => ({
        id: h.id,
        label: h.name,
      }));
  }, [houses, effectiveWorldId]);

  const orgItems = useMemo(() => {
    if (!effectiveWorldId) return [];

    return organizations
      .filter((o) => o.worldId === effectiveWorldId && !o.isDeleted)
      .map((o) => ({
        id: o.id,
        label: o.name,
      }));
  }, [organizations, effectiveWorldId]);

  const hasLinkSections =
    characterItems.length > 0 ||
    placeItems.length > 0 ||
    sceneItems.length > 0 ||
    houseItems.length > 0 ||
    orgItems.length > 0;

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDescription(initial.description);
      setType(initial.type);
      setTagsRaw((initial.tags ?? []).join(', '));
      setTargetWorld(initial.worldId);
      setLinks(linksFromIdea(initial));
      setImageUrl(initial.imageUrl ?? '');
    } else {
      setDescription('');
      setType('scene');
      setTagsRaw('');
      setTargetWorld(worldId);
      setLinks(emptyLinks());
      setImageUrl('');
    }
    setErr('');
  }, [open, worldId, initial?.id]);

  const activeType = useMemo(() => TYPE_OPTIONS.find((t) => t.value === type), [type]);

  const handleInsertionWorldChange = useCallback((id: string) => {
    const next = id || null;

    if (targetWorld === next) return;

    setTargetWorld(next);
    setLinks(emptyLinks());
  }, [targetWorld]);

  const handleDescriptionChange = useCallback((v: string) => {
    setDescription((prev) => (prev === v ? prev : v));
  }, []);

  const save = () => {
    if (!description.trim()) {
      setErr('Escribe tu idea');
      return;
    }
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({
      worldId: worldId ?? targetWorld,
      linkedCharacterId: links.linkedCharacterId,
      relatedCharacterIds: links.relatedCharacterIds,
      relatedPlaceIds: links.relatedPlaceIds,
      relatedSceneIds: links.relatedSceneIds,
      relatedHouseIds: links.relatedHouseIds,
      relatedOrganizationIds: links.relatedOrganizationIds,
      description: description.trim(),
      type,
      references: initial?.references ?? [],
      imageUrl: imageUrl.trim() || undefined,
      audioUrl: initial?.audioUrl,
      status: initial?.status ?? 'pending',
      isFavorite: initial?.isFavorite ?? false,
      isDeleted: false,
      tags,
    });
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar idea' : 'Nueva idea'}
      description="Captura con contexto: personajes, lugares, escenas y más."
      maxWidthClass="max-w-3xl"
      footer={
        <>
          <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="story-btn-primary text-sm" onClick={save}>
            Guardar idea
          </button>
        </>
      }
    >
      {err && (
        <p className="mb-3 rounded-lg border border-[#D61E2B]/30 bg-[#D61E2B]/10 px-3 py-2 text-sm text-[#D61E2B]">{err}</p>
      )}
      <div className="space-y-5">
        {worldId === null && (
          <div className="rounded-xl border border-[#8B5CF6]/25 bg-gradient-to-r from-[#8B5CF6]/10 to-transparent px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex shrink-0 items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B5CF6]/15">
                  <Globe size={16} className="text-[#8B5CF6]" />
                </span>
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-[#8B91A7]">Mundo</p>
                  <p className="text-[10px] text-[#5A6078]">Para inserciones y vínculos</p>
                </div>
              </div>
              <select
                className="story-input min-w-0 flex-1 text-sm"
                value={targetWorld ?? ''}
                onChange={(e) => handleInsertionWorldChange(e.target.value)}
              >
                <option value="">Selecciona un mundo…</option>
                {worlds.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {effectiveWorldName && (
          <p className="flex items-center gap-2 text-xs text-[#8B91A7]">
            <Globe size={12} className="text-[#8B5CF6]" />
            Contexto:
            <span className="font-medium text-[#E8E9EB]">{effectiveWorldName}</span>
          </p>
        )}

        <div>
          <p className="mb-2 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Tipo de idea</p>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  type === opt.value ? 'text-white shadow-md' : 'border-[#2A3045] text-[#8B91A7] hover:border-[#3A4460]'
                }`}
                style={
                  type === opt.value
                    ? { backgroundColor: opt.color, borderColor: opt.color }
                    : undefined
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_200px]">
          <div
            className="min-w-0 rounded-xl border p-4"
            style={{
              borderColor: `${activeType?.color ?? '#EAB308'}33`,
              background: `linear-gradient(160deg, ${activeType?.color ?? '#EAB308'}12 0%, transparent 50%)`,
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb size={18} className="shrink-0 text-[#EAB308]" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#5A6078]">Descripción</span>
            </div>
            <StoryRichTextField
              key={`idea-richtext-${initial?.id ?? 'new'}-${effectiveWorldId ?? 'global'}`}
              className="w-full min-w-0"
              worldId={richTextWorldId}
              showInsertionWorldPicker={false}
              value={description}
              onChange={handleDescriptionChange}
              minHeight="8rem"
              placeholder="Describe tu idea…"
              hideHint
            />
          </div>
          <div className="space-y-3">
            <ImageInputField label="Imagen" value={imageUrl} onChange={setImageUrl} />
            {initial?.audioUrl && (
              <div>
                <label className="mb-1 block text-xs uppercase text-[#5A6078]">Nota de voz</label>
                <AudioPlayer src={initial.audioUrl} />
              </div>
            )}
          </div>
        </div>

        {effectiveWorldId && hasLinkSections && (
          <section className="rounded-xl border border-[#2A3045]/70 bg-[#111318]/80 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#D61E2B]">
                <FileText size={12} /> Vínculos del mundo
              </p>
              <p className="text-[10px] text-[#5A6078]">Busca y marca lo que aplique a esta idea</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {characterItems.length > 0 && (
                <InlineEntityChecklist
                  label="Personajes"
                  items={characterItems}
                  value={links.relatedCharacterIds}
                  onChange={(ids) => setLinks((l) => ({ ...l, relatedCharacterIds: ids }))}
                />
              )}
              {placeItems.length > 0 && (
                <InlineEntityChecklist
                  label="Lugares"
                  items={placeItems}
                  value={links.relatedPlaceIds}
                  onChange={(ids) => setLinks((l) => ({ ...l, relatedPlaceIds: ids }))}
                />
              )}
              {sceneItems.length > 0 && (
                <InlineEntityChecklist
                  label="Escenas"
                  items={sceneItems}
                  value={links.relatedSceneIds}
                  onChange={(ids) => setLinks((l) => ({ ...l, relatedSceneIds: ids }))}
                />
              )}
              {houseItems.length > 0 && (
                <InlineEntityChecklist
                  label="Casas"
                  items={houseItems}
                  value={links.relatedHouseIds}
                  onChange={(ids) => setLinks((l) => ({ ...l, relatedHouseIds: ids }))}
                />
              )}
              {orgItems.length > 0 && (
                <InlineEntityChecklist
                  label="Organizaciones"
                  items={orgItems}
                  value={links.relatedOrganizationIds}
                  onChange={(ids) => setLinks((l) => ({ ...l, relatedOrganizationIds: ids }))}
                />
              )}
            </div>
            {characterItems.length > 0 && (
              <div className="mt-4 border-t border-[#2A3045]/60 pt-4">
                <InlineSearchableSinglePick
                  label="Protagonista principal (opc.)"
                  items={characterItems}
                  value={links.linkedCharacterId}
                  onChange={(id) => setLinks((l) => ({ ...l, linkedCharacterId: id }))}
                  placeholder="Sin foco único"
                />
              </div>
            )}
          </section>
        )}

        <div>
          <label className="mb-1 flex items-center gap-2 text-xs uppercase text-[#5A6078]">
            <Tag size={12} /> Tags (coma)
          </label>
          <input
            className="story-input w-full"
            placeholder="magia, giro, revelación…"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
          />
        </div>
      </div>
    </BaseModal>
  );
}
