import { Plus, Trash2 } from 'lucide-react';
import { StorySelect } from '@/components/common/StorySelect';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';

export type DialogueLine = { characterId: string; characterName: string; text: string };

type CharacterOption = { value: string; label: string; sublabel?: string; imageUrl?: string };

type Props = {
  label: string;
  lines: DialogueLine[];
  onChange: (lines: DialogueLine[]) => void;
  characterOptions: CharacterOption[];
  worldId: string;
  textPlaceholder?: string;
  showCharacterPicker?: boolean;
};

export function DialogueLinesEditor({
  label,
  lines,
  onChange,
  characterOptions,
  worldId,
  textPlaceholder = 'Texto del diálogo…',
  showCharacterPicker = true,
}: Props) {
  const addLine = () => {
    onChange([...lines, { characterId: '', characterName: '', text: '' }]);
  };

  const patchLine = (index: number, patch: Partial<DialogueLine>) => {
    onChange(lines.map((l, j) => (j === index ? { ...l, ...patch } : l)));
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-mono uppercase tracking-wider text-[#5A6078]">{label}</label>
        <button type="button" className="story-btn-secondary flex items-center gap-1 px-2 py-1 text-xs" onClick={addLine}>
          <Plus size={12} /> Añadir
        </button>
      </div>
      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#2A3045] px-3 py-4 text-center text-xs text-[#5A6078]">
          {showCharacterPicker
            ? 'Sin líneas. Pulsa «Añadir» para crear diálogos con personaje.'
            : 'Sin líneas. Pulsa «Añadir» para añadir contenido.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {lines.map((line, i) => (
            <li key={i} className="rounded-xl border border-[#2A3045] bg-[#111318]/80 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                {showCharacterPicker ? (
                  <StorySelect
                    value={line.characterId}
                    onChange={(id) => {
                      const ch = characterOptions.find((o) => o.value === id);
                      patchLine(i, { characterId: id, characterName: ch?.label ?? '' });
                    }}
                    options={[{ value: '', label: 'Personaje…' }, ...characterOptions]}
                    searchable
                    placeholder="Personaje"
                    className="w-full max-w-[14rem]"
                    popoverMinWidth="14rem"
                  />
                ) : (
                  <span className="text-[10px] uppercase text-[#5A6078]">Línea {i + 1}</span>
                )}
                <button
                  type="button"
                  aria-label="Quitar línea"
                  className="rounded-lg p-2 text-[#5A6078] hover:bg-[#1E2230] hover:text-[#D61E2B]"
                  onClick={() => removeLine(i)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <StoryRichTextField
                worldId={worldId}
                value={line.text}
                onChange={(text) => patchLine(i, { text })}
                placeholder={textPlaceholder}
                minHeight="5.5rem"
                hideHint
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
