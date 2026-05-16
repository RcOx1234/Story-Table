import { useState, useEffect } from 'react';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { useAppStore } from '@/store';
import type { Idea } from '@/types';
import { FileText, Globe, Lightbulb, Tag, UserCircle } from 'lucide-react';
import { ImageInputField } from '@/components/common/ImageInputField';
import { AudioPlayer } from '@/components/common/AudioPlayer';

type Props = {
  open: boolean;
  onClose: () => void;
  /** null = bandeja global */
  worldId: string | null;
  initial?: Idea | null;
  onSubmit: (data: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

export function IdeaFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const worlds = useAppStore((s) => s.worlds.filter((w) => !w.isDeleted));
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Idea['type']>('scene');
  const [tagsRaw, setTagsRaw] = useState('');
  const [targetWorld, setTargetWorld] = useState<string | null>(worldId);
  const [linkedCharacterId, setLinkedCharacterId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [err, setErr] = useState('');

  const effectiveWorldId = worldId ?? targetWorld;
  const worldCharacters = useAppStore((s) =>
    effectiveWorldId ? s.getCharactersByWorld(effectiveWorldId).filter((c) => !c.isDeleted) : []
  );

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDescription(initial.description);
      setType(initial.type);
      setTagsRaw((initial.tags ?? []).join(', '));
      setTargetWorld(initial.worldId);
      setLinkedCharacterId(initial.linkedCharacterId ?? null);
      setImageUrl(initial.imageUrl ?? '');
    } else {
      setDescription('');
      setType('scene');
      setTagsRaw('');
      setTargetWorld(worldId);
      setLinkedCharacterId(null);
      setImageUrl('');
    }
    setErr('');
  }, [open, worldId, initial?.id, initial?.updatedAt]);

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
      description="Captura rápida con contexto opcional del mundo y un personaje vinculado."
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
      <div className="mb-3">
        <ImageInputField label="Imagen adjunta" value={imageUrl} onChange={setImageUrl} />
      </div>
      {initial?.audioUrl && (
        <div className="mb-3">
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Nota de voz</label>
          <AudioPlayer src={initial.audioUrl} />
        </div>
      )}

      <div className="mb-3 flex items-start gap-3 rounded-xl border border-[#2A3045] bg-[#111318]/80 p-3">
        <Lightbulb size={20} className="mt-0.5 shrink-0 text-[#EAB308]" />
        <textarea
          className="min-h-[7rem] w-full resize-none border-0 bg-transparent text-sm text-[#E8E9EB] placeholder:text-[#5A6078] focus:outline-none"
          placeholder="Describe tu idea..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-[#5A6078]">
            <FileText size={12} className="text-[#22C55E]" /> Tipo
          </label>
          <select className="story-input w-full text-sm" value={type} onChange={(e) => setType(e.target.value as Idea['type'])}>
            <option value="scene">Escena</option>
            <option value="character">Personaje</option>
            <option value="plot">Trama</option>
            <option value="world">Mundo</option>
            <option value="dialogue">Diálogo</option>
            <option value="lore">Lore</option>
            <option value="other">Otro</option>
          </select>
        </div>
        {worldId === null && (
          <div>
            <label className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-[#5A6078]">
              <Globe size={12} className="text-[#8B5CF6]" /> Ubicación
            </label>
            <select
              className="story-input w-full text-sm"
              value={targetWorld ?? ''}
              onChange={(e) => {
                setTargetWorld(e.target.value || null);
                setLinkedCharacterId(null);
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
      </div>

      {effectiveWorldId && worldCharacters.length > 0 && (
        <div className="mb-3">
          <label className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-[#5A6078]">
            <UserCircle size={12} className="text-[#3B82F6]" /> Personaje vinculado
          </label>
          <select
            className="story-input w-full text-sm"
            value={linkedCharacterId ?? ''}
            onChange={(e) => setLinkedCharacterId(e.target.value || null)}
          >
            <option value="">Sin personaje específico</option>
            {worldCharacters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-[#5A6078]">
          <Tag size={12} className="text-[#D61E2B]" /> Tags (coma)
        </label>
        <input
          className="story-input w-full"
          placeholder="p. ej. magia, giro, revelación"
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
        />
      </div>
    </BaseModal>
  );
}
