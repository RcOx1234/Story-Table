import { useState, useEffect, useMemo } from 'react';
import { FileText, Globe, Lightbulb, Tag } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { useAppStore } from '@/store';
import type { Idea } from '@/types';
import { ImageInputField } from '@/components/common/ImageInputField';
import { AudioPlayer } from '@/components/common/AudioPlayer';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';
import { EntityMultiPicker } from '@/components/common/EntityMultiPicker';

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

export function IdeaFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const worlds = useAppStore((s) => s.worlds.filter((w) => !w.isDeleted));
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Idea['type']>('scene');
  const [tagsRaw, setTagsRaw] = useState('');
  const [targetWorld, setTargetWorld] = useState<string | null>(worldId);
  const [linkedCharacterId, setLinkedCharacterId] = useState<string | null>(null);
  const [relatedCharacterIds, setRelatedCharacterIds] = useState<string[]>([]);
  const [relatedPlaceIds, setRelatedPlaceIds] = useState<string[]>([]);
  const [relatedSceneIds, setRelatedSceneIds] = useState<string[]>([]);
  const [relatedHouseIds, setRelatedHouseIds] = useState<string[]>([]);
  const [relatedOrganizationIds, setRelatedOrganizationIds] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [err, setErr] = useState('');

  const effectiveWorldId = worldId ?? targetWorld;

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
      setLinkedCharacterId(initial.linkedCharacterId ?? null);
      setRelatedCharacterIds(initial.relatedCharacterIds ?? []);
      setRelatedPlaceIds(initial.relatedPlaceIds ?? []);
      setRelatedSceneIds(initial.relatedSceneIds ?? []);
      setRelatedHouseIds(initial.relatedHouseIds ?? []);
      setRelatedOrganizationIds(initial.relatedOrganizationIds ?? []);
      setImageUrl(initial.imageUrl ?? '');
    } else {
      setDescription('');
      setType('scene');
      setTagsRaw('');
      setTargetWorld(worldId);
      setLinkedCharacterId(null);
      setRelatedCharacterIds([]);
      setRelatedPlaceIds([]);
      setRelatedSceneIds([]);
      setRelatedHouseIds([]);
      setRelatedOrganizationIds([]);
      setImageUrl('');
    }
    setErr('');
  }, [open, worldId, initial?.id, initial?.updatedAt]);

  const activeType = useMemo(() => TYPE_OPTIONS.find((t) => t.value === type), [type]);

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
      linkedCharacterId: linkedCharacterId || null,
      relatedCharacterIds,
      relatedPlaceIds,
      relatedSceneIds,
      relatedHouseIds,
      relatedOrganizationIds,
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
                worldId={worldId ?? undefined}
                insertionWorldId={effectiveWorldId ?? ''}
                onInsertionWorldChange={(id) => {
                  if (worldId === null) setTargetWorld(id || null);
                }}
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

        {worldId === null && (
          <div>
            <label className="mb-1 flex items-center gap-2 text-xs uppercase text-[#5A6078]">
              <Globe size={12} /> Mundo
            </label>
            <select
              className="story-input w-full max-w-sm text-sm"
              value={targetWorld ?? ''}
              onChange={(e) => {
                setTargetWorld(e.target.value || null);
                setLinkedCharacterId(null);
                setRelatedCharacterIds([]);
                setRelatedPlaceIds([]);
                setRelatedSceneIds([]);
                setRelatedHouseIds([]);
                setRelatedOrganizationIds([]);
              }}
            >
              <option value="">Bandeja global</option>
              {worlds.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {effectiveWorldId && (
          <section className="rounded-xl border border-[#2A3045]/70 bg-[#111318]/80 p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#D61E2B]">
              <FileText size={12} /> Vínculos del mundo
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {characterItems.length > 0 && (
                <EntityMultiPicker
                  label="Personajes"
                  items={characterItems}
                  value={relatedCharacterIds}
                  onChange={setRelatedCharacterIds}
                  placeholder="Elegir…"
                />
              )}
              {placeItems.length > 0 && (
                <EntityMultiPicker
                  label="Lugares"
                  items={placeItems}
                  value={relatedPlaceIds}
                  onChange={setRelatedPlaceIds}
                  placeholder="Elegir…"
                />
              )}
              {sceneItems.length > 0 && (
                <EntityMultiPicker
                  label="Escenas"
                  items={sceneItems}
                  value={relatedSceneIds}
                  onChange={setRelatedSceneIds}
                  placeholder="Elegir…"
                />
              )}
              {houseItems.length > 0 && (
                <EntityMultiPicker
                  label="Casas"
                  items={houseItems}
                  value={relatedHouseIds}
                  onChange={setRelatedHouseIds}
                  placeholder="Elegir…"
                />
              )}
              {orgItems.length > 0 && (
                <EntityMultiPicker
                  label="Organizaciones"
                  items={orgItems}
                  value={relatedOrganizationIds}
                  onChange={setRelatedOrganizationIds}
                  placeholder="Elegir…"
                />
              )}
            </div>
            {characterItems.length > 0 && (
              <div className="mt-3 border-t border-[#2A3045]/60 pt-3">
                <label className="mb-1 block text-xs uppercase text-[#5A6078]">Protagonista principal (opc.)</label>
                <select
                  className="story-input w-full max-w-md text-sm"
                  value={linkedCharacterId ?? ''}
                  onChange={(e) => setLinkedCharacterId(e.target.value || null)}
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
