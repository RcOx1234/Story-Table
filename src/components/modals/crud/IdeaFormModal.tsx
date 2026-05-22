import { useState, useEffect, useMemo, useCallback } from 'react';
import { FileText, Lightbulb, Tag } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { useAppStore } from '@/store';
import type { Idea } from '@/types';
import { ImageInputField } from '@/components/common/ImageInputField';
import { AudioPlayer } from '@/components/common/AudioPlayer';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';
import type { EntityPickerItem } from '@/components/common/EntityMultiPicker';

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
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-mono uppercase tracking-wider text-[#5A6078]">{label}</label>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[#2A3045] bg-[#111318] p-2 scrollbar-thin">
        {items.map((item) => (
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
        ))}
      </div>
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

  const characterItems = useAppStore((s) =>
    effectiveWorldId
      ? s.getCharactersByWorld(effectiveWorldId).map((c) => ({
          id: c.id,
          label: c.name,
          imageUrl: c.images[0],
        }))
      : []
  );
  const placeItems = useAppStore((s) =>
    effectiveWorldId
      ? s.getPlacesByWorld(effectiveWorldId).map((p) => ({ id: p.id, label: p.name }))
      : []
  );
  const sceneItems = useAppStore((s) =>
    effectiveWorldId
      ? s.scenes.filter((sc) => sc.worldId === effectiveWorldId && !sc.isDeleted).map((sc) => ({
          id: sc.id,
          label: sc.title,
        }))
      : []
  );
  const houseItems = useAppStore((s) =>
    effectiveWorldId ? s.getHousesByWorld(effectiveWorldId).map((h) => ({ id: h.id, label: h.name })) : []
  );
  const orgItems = useAppStore((s) =>
    effectiveWorldId
      ? s.organizations.filter((o) => o.worldId === effectiveWorldId && !o.isDeleted).map((o) => ({
          id: o.id,
          label: o.name,
        }))
      : []
  );

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
  }, [open, worldId, initial?.id, initial?.updatedAt]);

  const activeType = useMemo(() => TYPE_OPTIONS.find((t) => t.value === type), [type]);

  const handleInsertionWorldChange = useCallback((id: string) => {
    const next = id || null;
    setTargetWorld((prev) => (prev === next ? prev : next));
    setLinks(emptyLinks());
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
      <div className="max-h-[68vh] space-y-4 overflow-y-auto pr-1 scrollbar-thin">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px]">
          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: `${activeType?.color ?? '#EAB308'}33`,
              background: `linear-gradient(160deg, ${activeType?.color ?? '#EAB308'}12 0%, transparent 50%)`,
            }}
          >
            <div className="mb-3 flex items-start gap-3">
              <Lightbulb size={22} className="shrink-0 text-[#EAB308]" />
              <StoryRichTextField
                key={`idea-richtext-${initial?.id ?? 'new'}-${worldId ?? 'global'}`}
                worldId={richTextWorldId}
                onInsertionWorldChange={worldId === null ? handleInsertionWorldChange : undefined}
                value={description}
                onChange={setDescription}
                minHeight="8rem"
                placeholder="Describe tu idea…"
                hideHint
              />
            </div>
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

        {effectiveWorldId && (
          <section className="rounded-xl border border-[#2A3045]/70 bg-[#111318]/80 p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#D61E2B]">
              <FileText size={12} /> Vínculos del mundo
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="mt-3 border-t border-[#2A3045]/60 pt-3">
                <label className="mb-1 block text-xs uppercase text-[#5A6078]">Protagonista principal (opc.)</label>
                <select
                  className="story-input w-full max-w-md text-sm"
                  value={links.linkedCharacterId ?? ''}
                  onChange={(e) =>
                    setLinks((l) => ({ ...l, linkedCharacterId: e.target.value || null }))
                  }
                >
                  <option value="">Sin foco único</option>
                  {characterItems.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
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
