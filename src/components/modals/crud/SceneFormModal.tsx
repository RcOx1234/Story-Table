import { useState, useEffect, useMemo } from 'react';
import { Clapperboard, FileText, MapPin, Music, Sparkles, Users } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';
import { EntityMultiPicker } from '@/components/common/EntityMultiPicker';
import { MultiImageInputField } from '@/components/common/MultiImageInputField';
import { DialogueLinesEditor, type DialogueLine } from '@/components/common/DialogueLinesEditor';
import { RevealLinesEditor, type RevealLine } from '@/components/common/RevealLinesEditor';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '@/store';
import type { Scene, SceneImportance, Dialogue } from '@/types';

const MOODS = ['tranquila', 'triste', 'brutal', 'épica', 'nostálgica', 'terrorífica', 'reveladora'] as const;
const MOOD_INT: Record<string, number> = {
  tranquila: 1,
  triste: 2,
  brutal: 4,
  épica: 5,
  nostálgica: 3,
  terrorífica: 5,
  reveladora: 4,
};

const IMPORTANCE: { value: SceneImportance; label: string }[] = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'unforgettable', label: 'Inolvidable' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: Scene | null;
  onSubmit: (data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

function emptyScene(worldId: string): Omit<Scene, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    title: '',
    description: '',
    content: '',
    characters: [],
    placeId: '',
    placeName: '',
    timelineId: '',
    timelineName: '',
    emotionalIntensity: 2,
    mood: 'tranquila',
    importance: 'medium',
    draft: false,
    music: '',
    dialogues: [],
    reveals: [],
    images: [],
    video: '',
    audio: '',
    status: 'pending',
    isFavorite: false,
    isDeleted: false,
    tags: [],
  };
}

function dialoguesToLines(dialogues: Dialogue[], characters: { id: string; name: string }[]): DialogueLine[] {
  return dialogues.map((d) => {
    const ch = characters.find((c) => c.name === d.characterName);
    return { characterId: ch?.id ?? '', characterName: d.characterName, text: d.text };
  });
}

export function SceneFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const characters = useAppStore((s) => s.getCharactersByWorld(worldId));
  const places = useAppStore((s) => s.getPlacesByWorld(worldId));
  const timelines = useAppStore((s) => s.getTimelinesByWorld(worldId));
  const [form, setForm] = useState<Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>>(() => emptyScene(worldId));
  const [tagsRaw, setTagsRaw] = useState('');
  const [revealLines, setRevealLines] = useState<RevealLine[]>([]);
  const [dialogueLines, setDialogueLines] = useState<DialogueLine[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    const base = initial ? { ...emptyScene(worldId), ...initial, worldId } : emptyScene(worldId);
    setForm(base);
    setTagsRaw((initial?.tags ?? []).join(', '));
    const charSnap = characters.map((c) => ({ id: c.id, name: c.name }));
    setDialogueLines(dialoguesToLines(initial?.dialogues ?? [], charSnap));
    setRevealLines((initial?.reveals ?? []).map((text) => ({ id: uuidv4(), text })));
    setErr('');
  }, [open, worldId, initial?.id, initial?.updatedAt, characters.length]);

  const patch = (p: Partial<Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const characterItems = useMemo(
    () =>
      characters.map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: c.alias || undefined,
        imageUrl: c.images[0],
        value: c.id,
      })),
    [characters]
  );

  const characterSelectOptions = useMemo(
    () => characterItems.map((c) => ({ value: c.id, label: c.label, sublabel: c.sublabel, imageUrl: c.imageUrl })),
    [characterItems]
  );

  const onPlace = (placeId: string) => {
    const pl = places.find((p) => p.id === placeId);
    patch({ placeId, placeName: pl?.name ?? '' });
  };

  const onTimeline = (timelineId: string) => {
    const tl = timelines.find((t) => t.id === timelineId);
    patch({ timelineId, timelineName: tl?.name ?? '' });
  };

  const onMood = (mood: string) => {
    patch({ mood, emotionalIntensity: MOOD_INT[mood] ?? 2 });
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
    const dialogues: Dialogue[] = dialogueLines
      .filter((d) => d.characterName.trim() && d.text.trim())
      .map((d) => ({ characterName: d.characterName.trim(), text: d.text.trim() }));
    const reveals = revealLines.map((r) => r.text.trim()).filter((t) => t.length > 0);
    onSubmit({ ...form, title: form.title.trim(), tags, reveals, dialogues });
    onClose();
  };

  const moodValue = form.mood ?? 'tranquila';
  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar escena' : 'Nueva escena'}
      description="Estructura narrativa con diálogos, revelaciones e inserciones enriquecidas."
      maxWidthClass="max-w-4xl"
      footer={
        <>
          <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="story-btn-primary text-sm" onClick={save}>
            Guardar escena
          </button>
        </>
      }
    >
      {err && (
        <p className="mb-3 rounded-lg border border-[#D61E2B]/30 bg-[#D61E2B]/10 px-3 py-2 text-sm text-[#D61E2B]">{err}</p>
      )}
      <div className="max-h-[68vh] space-y-4 overflow-y-auto pr-1 scrollbar-thin">
        <section className="rounded-xl border border-[#2A3045]/70 bg-gradient-to-b from-[#13161c] to-[#111318] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Clapperboard size={16} className="text-[#D61E2B]" />
            <h3 className="text-sm font-semibold text-[#E8E9EB]">Identidad</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Título *</label>
              <input className="story-input w-full" value={form.title} onChange={(e) => patch({ title: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripción corta</label>
              <StoryRichTextField worldId={worldId} value={form.description} onChange={(v) => patch({ description: v })} minHeight="4rem" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs uppercase text-[#5A6078]">
                  <MapPin size={11} /> Lugar
                </label>
                <select className="story-input w-full text-sm" value={form.placeId} onChange={(e) => onPlace(e.target.value)}>
                  <option value="">—</option>
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-[#5A6078]">Línea temporal</label>
                <select className="story-input w-full text-sm" value={form.timelineId} onChange={(e) => onTimeline(e.target.value)}>
                  <option value="">—</option>
                  {timelines.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <EntityMultiPicker
              label="Personajes"
              items={characterItems}
              value={form.characters}
              onChange={(ids) => patch({ characters: ids })}
              placeholder="Elegir personajes…"
              emptyMessage="Aún no hay personajes"
            />
          </div>
        </section>

        <section className="rounded-xl border border-[#2A3045]/70 bg-[#111318]/80 p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText size={16} className="text-[#22C55E]" />
            <h3 className="text-sm font-semibold text-[#E8E9EB]">Contenido</h3>
          </div>
          <StoryRichTextField worldId={worldId} value={form.content} onChange={(v) => patch({ content: v })} minHeight="10rem" />
        </section>

        <section className="rounded-xl border border-[#2A3045]/70 bg-[#111318]/80 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users size={16} className="text-[#3B82F6]" />
            <h3 className="text-sm font-semibold text-[#E8E9EB]">Diálogos</h3>
          </div>
          <DialogueLinesEditor
            label="Líneas de diálogo"
            lines={dialogueLines}
            onChange={setDialogueLines}
            characterOptions={characterSelectOptions}
            worldId={worldId}
          />
        </section>

        <section className="rounded-xl border border-[#2A3045]/70 bg-[#111318]/80 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-[#EAB308]" />
            <h3 className="text-sm font-semibold text-[#E8E9EB]">Revelaciones</h3>
          </div>
          <RevealLinesEditor label="Revelaciones" lines={revealLines} onChange={setRevealLines} worldId={worldId} />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#2A3045]/70 bg-[#111318]/80 p-4">
            <label className="mb-2 flex items-center gap-1 text-xs uppercase text-[#5A6078]">
              <Music size={11} /> Intensidad / ánimo
            </label>
            <select className="story-input w-full text-sm" value={moodValue} onChange={(e) => onMood(e.target.value)}>
              {MOODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <label className="mb-1 mt-3 block text-xs uppercase text-[#5A6078]">Importancia</label>
            <select
              className="story-input w-full text-sm"
              value={form.importance ?? 'medium'}
              onChange={(e) => patch({ importance: e.target.value as SceneImportance })}
            >
              {IMPORTANCE.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
            <label className="mb-1 mt-3 block text-xs uppercase text-[#5A6078]">Música / inspiración</label>
            <input className="story-input w-full text-sm" value={form.music} onChange={(e) => patch({ music: e.target.value })} />
          </div>
          <div className="rounded-xl border border-[#2A3045]/70 bg-[#111318]/80 p-4 space-y-3">
            <label className="block text-xs uppercase text-[#5A6078]">Estado</label>
            <select className="story-input w-full text-sm" value={form.status} onChange={(e) => patch({ status: e.target.value as Scene['status'] })}>
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmado</option>
              <option value="revision">Revisión</option>
              <option value="discarded">Descartado</option>
              <option value="important">Importante</option>
              <option value="secret">Secreto</option>
              <option value="canon">Canon</option>
              <option value="noncanon">No canon</option>
            </select>
            <label className="block text-xs uppercase text-[#5A6078]">Tags (coma)</label>
            <input className="story-input w-full text-sm" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
            <label className="flex items-center gap-2 text-sm text-[#E8E9EB]">
              <input id="sc-draft" type="checkbox" checked={form.draft ?? false} onChange={(e) => patch({ draft: e.target.checked })} className="accent-[#D61E2B]" />
              Borrador (sin ubicar en la historia)
            </label>
          </div>
        </section>

        <MultiImageInputField label="Imágenes" value={form.images ?? []} onChange={(urls) => patch({ images: urls })} />
      </div>
    </BaseModal>
  );
}
