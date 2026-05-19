import { X } from 'lucide-react';
import { relationshipTypeLabel } from '@/lib/relationshipTypes';
import type { Character } from '@/types';

type Props = {
  character: Character;
  relationType: string;
  worldId: string;
  onOpen?: (characterId: string) => void;
  onRemove?: () => void;
  readOnly?: boolean;
};

export function RelationshipChip({
  character,
  relationType,
  onOpen,
  onRemove,
  readOnly = false,
}: Props) {
  return (
    <div className="group flex max-w-full items-center gap-2 rounded-xl border border-[#2A3045] bg-[#111318] py-1.5 pl-1.5 pr-2 transition-colors hover:border-[#3A4460]">
      <button
        type="button"
        onClick={() => onOpen?.(character.id)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        {character.images[0] ? (
          <img src={character.images[0]} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1E2230] text-xs font-semibold text-[#8B91A7]">
            {character.name.charAt(0)}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-[#E8E9EB]">{character.name}</span>
          <span className="block truncate text-[10px] text-[#5A6078]">{relationshipTypeLabel(relationType)}</span>
        </span>
      </button>
      {!readOnly && onRemove && (
        <button
          type="button"
          aria-label="Quitar relación"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded-lg p-1 text-[#5A6078] opacity-0 transition-all hover:bg-[#1E2230] hover:text-[#D61E2B] group-hover:opacity-100"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
