import { BaseModal } from '@/components/modals/crud/BaseModal';
import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';
import { Calendar, Skull, Users } from 'lucide-react';
import type { Character, Timeline } from '@/types';
import {
  characterStatusForTimeline,
  CHARACTER_STATUS_LABELS,
} from '@/lib/characterTimelineAge';
import { deathCauseLabel } from '@/lib/deathCause';

type Props = {
  open: boolean;
  onClose: () => void;
  character: Character;
  worldId: string;
  timelines: Timeline[];
  mainTimelineId?: string;
  worldCharacters: Character[];
};

export function CharacterTimelineDetailModal({
  open,
  onClose,
  character,
  worldId,
  timelines,
  mainTimelineId,
  worldCharacters,
}: Props) {
  const coreRelations = character.relationships
    .filter((r) => ['father', 'mother', 'spouse', 'child', 'sibling'].some((t) => r.type.includes(t)))
    .slice(0, 10);

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={character.name}
      description="Estado, edad y muerte por línea temporal"
      maxWidthClass="max-w-lg"
      footer={
        <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1 scrollbar-thin">
        {(character.birthDateLabel || character.birthYear != null) && (
          <div className="flex items-center gap-2 rounded-lg border border-[#2A3045]/60 bg-[#111318]/60 px-3 py-2 text-sm text-[#8B91A7]">
            <Calendar size={14} className="shrink-0 text-[#EAB308]" />
            {character.birthDateLabel ||
              (character.birthYear != null ? `Nacimiento: año ${character.birthYear}` : '')}
          </div>
        )}

        {timelines.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#5A6078]">
              Líneas temporales
            </p>
            {timelines.map((tl) => {
              const status = characterStatusForTimeline(character, tl.id);
              const statusLabel = CHARACTER_STATUS_LABELS[status];
              const age = character.ageByTimeline?.[tl.id];
              const death = character.deathByTimeline?.[tl.id];
              const isMain = tl.id === mainTimelineId;
              return (
                <div
                  key={tl.id}
                  className={`rounded-xl border px-3 py-2.5 ${
                    isMain
                      ? 'border-[#D61E2B]/40 bg-[#D61E2B]/8'
                      : 'border-[#2A3045]/60 bg-[#111318]/60'
                  }`}
                >
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#E8E9EB]">
                      {tl.name}
                      {isMain && (
                        <span className="ml-2 rounded-full bg-[#D61E2B]/20 px-1.5 py-0.5 text-[9px] font-mono uppercase text-[#D61E2B]">
                          Principal
                        </span>
                      )}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        status === 'alive'
                          ? 'bg-[#22C55E]/15 text-[#22C55E]'
                          : status === 'dead'
                            ? 'bg-[#6B7280]/20 text-[#9CA3AF]'
                            : 'bg-[#EAB308]/15 text-[#EAB308]'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  {age != null && (
                    <p className="text-xs text-[#5A6078]">
                      Edad: <span className="text-[#8B91A7]">{age} años</span>
                    </p>
                  )}
                  {status === 'dead' && (
                    <div className="mt-2 rounded-lg border border-[#D61E2B]/25 bg-[#D61E2B]/8 px-2 py-1.5">
                      <p className="flex items-center gap-1 text-xs font-medium text-[#E8E9EB]">
                        <Skull size={12} className="text-[#D61E2B]" />
                        {death
                          ? deathCauseLabel(death.causeType, death.customCause)
                          : 'Sin causa registrada'}
                      </p>
                      {death?.dateLabel && (
                        <p className="mt-0.5 text-[10px] text-[#8B91A7]">{death.dateLabel}</p>
                      )}
                      {death?.notes && (
                        <div className="mt-1 border-t border-[#2A3045]/40 pt-1">
                          <StoryRichTextDisplay
                            text={death.notes}
                            worldId={worldId}
                            className="text-[10px]"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[#5A6078]">
            Sin líneas temporales. Estado global: {CHARACTER_STATUS_LABELS[character.status]}.
          </p>
        )}

        {coreRelations.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[#5A6078]">
              <Users size={11} /> Relaciones clave
            </p>
            <ul className="space-y-1">
              {coreRelations.map((rel) => (
                <li
                  key={`${rel.characterId}-${rel.type}`}
                  className="rounded-lg border border-[#2A3045]/50 bg-[#0d0f12]/60 px-2.5 py-1.5 text-xs"
                >
                  <span className="font-medium text-[#E8E9EB]">
                    {rel.characterName ||
                      worldCharacters.find((c) => c.id === rel.characterId)?.name ||
                      'Personaje'}
                  </span>
                  <span className="text-[#5A6078]"> · {rel.type}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
