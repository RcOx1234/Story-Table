import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
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

export function SceneFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const characters = useAppStore((s) => s.getCharactersByWorld(worldId));
  const places = useAppStore((s) => s.getPlacesByWorld(worldId));
  const timelines = useAppStore((s) => s.getTimelinesByWorld(worldId));
  const [form, setForm] = useState<Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>>(() => emptyScene(worldId));
  const [tagsRaw, setTagsRaw] = useState('');
  const [revealsRaw, setRevealsRaw] = useState('');
  const [dialoguesRaw, setDialoguesRaw] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    const base = initial ? { ...emptyScene(worldId), ...initial, worldId } : emptyScene(worldId);
    setForm(base);
    setTagsRaw((initial?.tags ?? []).join(', '));
    setRevealsRaw((initial?.reveals ?? []).join('\n'));
    setDialoguesRaw(
      (initial?.dialogues ?? [])
        .map((d) => `${d.characterName}|${d.text}`)
        .join('\n')
    );
    setErr('');
  }, [open, initial, worldId]);

  const patch = (p: Partial<Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const toggleChar = (id: string) => {
    setForm((f) => ({
      ...f,
      characters: f.characters.includes(id) ? f.characters.filter((c) => c !== id) : [...f.characters, id],
    }));
  };

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
    const reveals = revealsRaw
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);
    const dialogues: Dialogue[] = dialoguesRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [n, ...rest] = line.split('|');
        return { characterName: (n ?? '').trim(), text: rest.join('|').trim() };
      })
      .filter((d) => d.characterName && d.text);
    onSubmit({ ...form, title: form.title.trim(), tags, reveals, dialogues });
    onClose();
  };

  const moodValue = form.mood ?? 'tranquila';

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar escena' : 'Nueva escena'}
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
      {err && <p className="mb-2 text-sm text-[#D61E2B]">{err}</p>}
      <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Título *</label>
          <input className="story-input w-full" value={form.title} onChange={(e) => patch({ title: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripción corta</label>
          <input className="story-input w-full" value={form.description} onChange={(e) => patch({ description: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Contenido</label>
          <textarea className="story-input h-36 w-full resize-none" value={form.content} onChange={(e) => patch({ content: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Personajes</label>
          <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-lg border border-[#2A3045] bg-[#111318] p-2">
            {characters.length === 0 && <span className="text-xs text-[#5A6078]">Aún no hay personajes</span>}
            {characters.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-1.5 text-xs text-[#E8E9EB]">
                <input type="checkbox" checked={form.characters.includes(c.id)} onChange={() => toggleChar(c.id)} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Lugar</label>
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Intensidad emocional</label>
            <select className="story-input w-full text-sm" value={moodValue} onChange={(e) => onMood(e.target.value)}>
              {MOODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Importancia</label>
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
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Música / inspiración</label>
          <input className="story-input w-full" value={form.music} onChange={(e) => patch({ music: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Diálogos (líneas “Personaje|texto”)</label>
          <textarea className="story-input h-20 w-full resize-none" value={dialoguesRaw} onChange={(e) => setDialoguesRaw(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Revelaciones (una por línea)</label>
          <textarea className="story-input h-20 w-full resize-none" value={revealsRaw} onChange={(e) => setRevealsRaw(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Estado</label>
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
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tags (coma)</label>
          <input className="story-input w-full" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <input id="sc-draft" type="checkbox" checked={form.draft ?? false} onChange={(e) => patch({ draft: e.target.checked })} />
          <label htmlFor="sc-draft" className="text-sm text-[#E8E9EB]">
            Aún no sé dónde va (borrador)
          </label>
        </div>
      </div>
    </BaseModal>
  );
}
