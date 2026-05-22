import { Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';

export type RevealLine = { id: string; text: string };

type Props = {
  label: string;
  lines: RevealLine[];
  onChange: (lines: RevealLine[]) => void;
  worldId: string;
};

export function RevealLinesEditor({ label, lines, onChange, worldId }: Props) {
  const addLine = () => {
    onChange([...lines, { id: uuidv4(), text: '' }]);
  };

  const patchLine = (id: string, text: string) => {
    onChange(lines.map((l) => (l.id === id ? { ...l, text } : l)));
  };

  const removeLine = (id: string) => {
    onChange(lines.filter((l) => l.id !== id));
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
          Sin revelaciones. Pulsa «Añadir» para registrar qué se descubre en la escena.
        </p>
      ) : (
        <ul className="space-y-3">
          {lines.map((line) => (
            <li key={line.id} className="rounded-xl border border-[#2A3045] bg-[#111318]/80 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase text-[#5A6078]">Revelación</span>
                <button
                  type="button"
                  aria-label="Quitar revelación"
                  className="rounded-lg p-1.5 text-[#5A6078] hover:bg-[#1E2230] hover:text-[#D61E2B]"
                  onClick={() => removeLine(line.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <StoryRichTextField
                worldId={worldId}
                value={line.text}
                onChange={(text) => patchLine(line.id, text)}
                minHeight="4.5rem"
                hideHint
              />
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-[#5A6078]">
        Clic derecho en el campo: negrita, cursiva e inserciones de entidades.
      </p>
    </div>
  );
}
