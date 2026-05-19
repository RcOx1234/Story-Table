import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { useAppStore } from '@/store';
import { findTagByName, tagChipStyle, TAG_CHIP_COLORS } from '@/lib/worldTags';
import { normalizeKey } from '@/lib/normalizeLabels';

type Props = {
  worldId: string;
  tagIds: string[];
  onChange: (tagIds: string[]) => void;
  label?: string;
};

export function WorldTagInput({ worldId, tagIds, onChange, label = 'Etiquetas' }: Props) {
  const worldTags = useAppStore((s) => s.getWorldTagsByWorld(worldId));
  const addWorldTag = useAppStore((s) => s.addWorldTag);
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => tagIds.map((id) => worldTags.find((t) => t.id === id)).filter(Boolean),
    [tagIds, worldTags]
  );

  const suggestions = useMemo(() => {
    const q = normalizeKey(draft);
    if (!q) return worldTags.filter((t) => !tagIds.includes(t.id)).slice(0, 8);
    return worldTags
      .filter((t) => !tagIds.includes(t.id) && normalizeKey(t.name).includes(q))
      .slice(0, 8);
  }, [draft, worldTags, tagIds]);

  const addTagId = (id: string) => {
    if (!tagIds.includes(id)) onChange([...tagIds, id]);
    setDraft('');
    setOpen(false);
  };

  const createAndAdd = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = findTagByName(worldTags, trimmed);
    if (existing) {
      addTagId(existing.id);
      return;
    }
    const color = TAG_CHIP_COLORS[worldTags.length % TAG_CHIP_COLORS.length];
    const id = addWorldTag({ worldId, name: trimmed, color });
    addTagId(id);
  };

  return (
    <motion.div className="space-y-2">
      <label className="mb-1 block text-xs uppercase text-[#5A6078]">{label}</label>
      <motion.div className="flex flex-wrap gap-1.5">
        {selected.map((tag) =>
          tag ? (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
              style={tagChipStyle(tag.color)}
            >
              {tag.name}
              <button
                type="button"
                aria-label={`Quitar ${tag.name}`}
                className="rounded-full p-0.5 hover:bg-black/20"
                onClick={() => onChange(tagIds.filter((id) => id !== tag.id))}
              >
                <X size={10} />
              </button>
            </span>
          ) : null
        )}
      </motion.div>
      <motion.div className="relative">
        <input
          className="story-input w-full pr-9 text-sm"
          placeholder="Buscar o crear etiqueta…"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              createAndAdd(draft);
            }
          }}
        />
        <button
          type="button"
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-[#5A6078] hover:text-[#E8E9EB]"
          onClick={() => createAndAdd(draft)}
          aria-label="Añadir etiqueta"
        >
          <Plus size={14} />
        </button>
        {open && (suggestions.length > 0 || draft.trim()) && (
          <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-[#2A3045] bg-[#111318] py-1 shadow-xl">
            {suggestions.map((t) => (
              <button
                key={t.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-[#E8E9EB] hover:bg-[#1E2230]"
                onClick={() => addTagId(t.id)}
              >
                {t.name}
              </button>
            ))}
            {draft.trim() && !findTagByName(worldTags, draft) && (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#D61E2B] hover:bg-[#1E2230]"
                onClick={() => createAndAdd(draft)}
              >
                <Plus size={12} /> Crear «{draft.trim()}»
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
