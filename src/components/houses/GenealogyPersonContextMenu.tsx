import { useNavigate } from 'react-router-dom';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Calendar, ExternalLink, Pencil, Skull, User } from 'lucide-react';
import type { Character, Timeline } from '@/types';
import {
  characterStatusForTimeline,
  CHARACTER_STATUS_LABELS,
} from '@/lib/characterTimelineAge';
import { deathCauseLabel } from '@/lib/deathCause';
import { CHARACTER_ROLE_LABELS } from '@/lib/characterRoles';
import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';
import { MENU_PANEL, MENU_SCROLL } from '@/lib/menuStyles';
import { useAppStore } from '@/store';

const MENU_CONTENT = `${MENU_PANEL} z-[250] min-w-[14rem] overflow-hidden p-1 text-[#E8E9EB] shadow-[0_16px_48px_rgba(0,0,0,0.55)]`;
const SUB_CONTENT = `${MENU_PANEL} z-[251] min-w-[18rem] max-w-[22rem] p-0 text-[#E8E9EB] shadow-[0_16px_48px_rgba(0,0,0,0.55)]`;
const ITEM =
  'flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#E8E9EB] outline-none transition-colors focus:bg-[#1E2230] data-[highlighted]:bg-[#1E2230]';
const SUB_TRIGGER = `${ITEM} data-[state=open]:bg-[#1E2230]`;

type Props = {
  character: Character;
  viewTimelineId: string | null;
  timelines: Timeline[];
  children: React.ReactNode;
  onFocusTree?: (characterId: string) => void;
  onEditCharacter?: (characterId: string) => void;
};

export function GenealogyPersonContextMenu({
  character,
  viewTimelineId: _viewTimelineId,
  timelines,
  children,
  onFocusTree,
  onEditCharacter,
}: Props) {
  const navigate = useNavigate();
  const world = useAppStore((s) => s.worlds.find((w) => w.id === character.worldId));
  const worldCharacters = useAppStore((s) => s.getCharactersByWorld(character.worldId));
  const role = CHARACTER_ROLE_LABELS[character.role]?.label;

  const mainTimelineId =
    world?.mainTimelineId && timelines.some((t) => t.id === world.mainTimelineId)
      ? world.mainTimelineId
      : timelines[0]?.id;

  const openFicha = () => {
    navigate(`/world/${character.worldId}/character/${character.id}`);
  };

  const coreRelations = character.relationships
    .filter((r) => ['father', 'mother', 'spouse', 'child', 'sibling'].some((t) => r.type.includes(t)))
    .slice(0, 8);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className={MENU_CONTENT}>
        <p className="border-b border-[#2A3045]/80 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-[#D61E2B]">
          Personaje
        </p>
        <div className="border-b border-[#2A3045]/80 px-3 py-2">
          <p className="truncate text-sm font-semibold text-[#E8E9EB]">{character.name}</p>
          {role && <p className="text-[10px] text-[#5A6078]">{role}</p>}
          {character.house && <p className="text-[10px] text-[#8B91A7]">{character.house}</p>}
        </div>

        <ContextMenuSub>
          <ContextMenuSubTrigger className={SUB_TRIGGER}>
            <User size={14} className="text-[#3B82F6]" />
            Ver detalles
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className={`${SUB_CONTENT} ${MENU_SCROLL} max-h-[min(70vh,28rem)]`}>
            <div className="space-y-3 p-3">
              {(character.birthDateLabel || character.birthYear != null) && (
                <div className="flex items-center gap-2 rounded-lg border border-[#2A3045]/60 bg-[#0d0f12]/80 px-2.5 py-2 text-xs text-[#8B91A7]">
                  <Calendar size={13} className="shrink-0 text-[#EAB308]" />
                  <span>
                    {character.birthDateLabel ||
                      (character.birthYear != null ? `Nacimiento: año ${character.birthYear}` : '')}
                  </span>
                </div>
              )}

              {timelines.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#5A6078]">
                    Por línea temporal
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
                        className={`rounded-xl border px-2.5 py-2 ${
                          isMain
                            ? 'border-[#D61E2B]/40 bg-[#D61E2B]/8'
                            : 'border-[#2A3045]/60 bg-[#111318]/60'
                        }`}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium text-[#E8E9EB]">
                            {tl.name}
                            {isMain && (
                              <span className="ml-1.5 rounded-full bg-[#D61E2B]/20 px-1.5 py-0.5 text-[9px] font-mono uppercase text-[#D61E2B]">
                                Principal
                              </span>
                            )}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
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
                          <p className="text-[10px] text-[#5A6078]">
                            Edad: <span className="text-[#8B91A7]">{age} años</span>
                          </p>
                        )}
                        {status === 'dead' && (
                          <div className="mt-1.5 rounded-lg border border-[#D61E2B]/25 bg-[#D61E2B]/8 px-2 py-1.5">
                            <p className="flex items-center gap-1 text-[11px] font-medium text-[#E8E9EB]">
                              <Skull size={11} className="text-[#D61E2B]" />
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
                                  worldId={character.worldId}
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
                <p className="text-xs text-[#5A6078]">
                  Estado: {CHARACTER_STATUS_LABELS[character.status]}
                </p>
              )}

              {coreRelations.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#5A6078]">
                    Relaciones clave
                  </p>
                  <ul className="space-y-1">
                    {coreRelations.map((rel) => (
                      <li
                        key={`${rel.characterId}-${rel.type}`}
                        className="rounded-lg border border-[#2A3045]/50 bg-[#0d0f12]/60 px-2 py-1 text-[11px]"
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
          </ContextMenuSubContent>
        </ContextMenuSub>

        {onFocusTree && (
          <ContextMenuItem className={ITEM} onSelect={() => onFocusTree(character.id)}>
            <User size={14} className="text-[#8B91A7]" />
            Enfocar en el árbol
          </ContextMenuItem>
        )}
        <ContextMenuItem className={ITEM} onSelect={openFicha}>
          <ExternalLink size={14} className="text-[#8B91A7]" />
          Abrir ficha
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-[#2A3045]" />
        {onEditCharacter && (
          <ContextMenuItem className={ITEM} onSelect={() => onEditCharacter(character.id)}>
            <Pencil size={14} className="text-[#8B91A7]" />
            Editar personaje…
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
