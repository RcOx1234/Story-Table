import { useState, useEffect } from 'react';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { useAppStore } from '@/store';
import type { Idea } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
  /** null = bandeja global */
  worldId: string | null;
  onSubmit: (data: Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

export function IdeaFormModal({ open, onClose, worldId, onSubmit }: Props) {
  const worlds = useAppStore((s) => s.worlds.filter((w) => !w.isDeleted));
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Idea['type']>('scene');
  const [tagsRaw, setTagsRaw] = useState('');
  const [targetWorld, setTargetWorld] = useState<string | null>(worldId);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setDescription('');
    setType('scene');
    setTagsRaw('');
    setTargetWorld(worldId);
    setErr('');
  }, [open, worldId]);

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
      description: description.trim(),
      type,
      references: [],
      isFavorite: false,
      isDeleted: false,
      tags,
      status: 'pending',
    });
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Nueva idea"
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
      <textarea
        className="story-input mb-3 h-32 w-full resize-none"
        placeholder="Describe tu idea..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="mb-3 flex flex-wrap gap-3">
        <select className="story-input text-sm" value={type} onChange={(e) => setType(e.target.value as Idea['type'])}>
          <option value="scene">Escena</option>
          <option value="character">Personaje</option>
          <option value="plot">Trama</option>
          <option value="world">Mundo</option>
          <option value="dialogue">Diálogo</option>
          <option value="lore">Lore</option>
          <option value="other">Otro</option>
        </select>
        {worldId === null && (
          <select className="story-input min-w-[160px] flex-1 text-sm" value={targetWorld ?? ''} onChange={(e) => setTargetWorld(e.target.value || null)}>
            <option value="">Bandeja global</option>
            {worlds.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <input
        className="story-input w-full"
        placeholder="Tags (coma)"
        value={tagsRaw}
        onChange={(e) => setTagsRaw(e.target.value)}
      />
    </BaseModal>
  );
}
