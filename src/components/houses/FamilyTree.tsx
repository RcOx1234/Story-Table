import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Maximize2, X } from 'lucide-react';
import type { Character, HouseMember } from '@/types';
import { buildFamilyGenerations, formatMemberRole, type FamilyTreeGeneration } from '@/lib/houseFamilyTree';

function MemberNode({
  entry,
  worldId,
  compact,
}: {
  entry: FamilyTreeGeneration['entries'][0];
  worldId: string;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const { member, character, parentName } = entry;
  const size = compact ? 'w-[100px]' : 'w-[120px]';
  const avatar = compact ? 'h-11 w-11' : 'h-14 w-14';

  return (
    <button
      type="button"
      onClick={() => navigate(`/world/${worldId}/character/${character.id}`)}
      className={`group flex ${size} flex-col items-center rounded-xl border border-[#2A3045] bg-gradient-to-b from-[#161922] to-[#111318] p-2.5 text-center transition-colors hover:border-[#D61E2B]/45 hover:bg-[#1E2230]`}
    >
      <div className={`mb-2 ${avatar} overflow-hidden rounded-full ring-2 ring-[#2A3045]`}>
        {character.images[0] ? (
          <img src={character.images[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#1E2230] text-sm font-semibold text-[#8B91A7]">
            {character.name.charAt(0)}
          </div>
        )}
      </div>
      <span className="line-clamp-2 text-[11px] font-medium leading-tight text-[#E8E9EB]">{character.name}</span>
      <span className="mt-1 rounded-full bg-[#D61E2B]/12 px-1.5 py-0.5 text-[8px] font-medium uppercase text-[#D61E2B]">
        {formatMemberRole(member.role)}
      </span>
      {parentName && <span className="mt-0.5 line-clamp-1 text-[8px] text-[#5A6078]">↳ {parentName}</span>}
    </button>
  );
}

function TreeBody({
  generations,
  worldId,
  compact,
}: {
  generations: FamilyTreeGeneration[];
  worldId: string;
  compact?: boolean;
}) {
  if (generations.length === 0) return null;

  if (compact) {
    return (
      <div className="space-y-2">
        {generations.map((gen, i) => (
          <details
            key={gen.depth}
            open={i === 0}
            className="group rounded-xl border border-[#2A3045] bg-[#111318]/60 open:border-[#D61E2B]/25"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-mono uppercase tracking-wider text-[#8B91A7] [&::-webkit-details-marker]:hidden">
              <span>
                {gen.label}{' '}
                <span className="text-[#5A6078]">({gen.entries.length})</span>
              </span>
              <ChevronDown size={14} className="shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="flex flex-wrap justify-center gap-3 border-t border-[#2A3045]/80 px-3 py-3">
              {gen.entries.map((entry) => (
                <MemberNode key={entry.character.id} entry={entry} worldId={worldId} compact />
              ))}
            </div>
          </details>
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-w-min flex-col items-center gap-0">
      {generations.map((gen, genIndex) => (
        <div key={gen.depth} className="flex w-full flex-col items-center">
          {genIndex > 0 && (
            <div className="flex flex-col items-center py-2" aria-hidden>
              <div className="h-4 w-px bg-[#3A4460]" />
              <div className="h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-[#5A6078]" />
            </div>
          )}
          <p className="mb-3 text-[10px] font-mono uppercase tracking-widest text-[#5A6078]">{gen.label}</p>
          <div className="flex flex-wrap items-start justify-center gap-4 px-2 pb-4">
            {gen.entries.map((entry) => (
              <MemberNode key={entry.character.id} entry={entry} worldId={worldId} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type Props = {
  worldId: string;
  members: HouseMember[];
  characters: Character[];
};

export function FamilyTree({ worldId, members, characters }: Props) {
  const [largeOpen, setLargeOpen] = useState(false);
  const generations = useMemo(() => buildFamilyGenerations(members, characters), [members, characters]);

  if (members.length === 0) {
    return <p className="text-sm text-[#5A6078]">Añade miembros para ver el árbol familiar.</p>;
  }

  return (
    <>
      <div className="rounded-2xl border border-[#2A3045] bg-[#0B0D10]/90 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#5A6078]">Árbol familiar</h4>
            <p className="text-[10px] text-[#3A4460]">Despliega cada generación · arriba = mayor rango</p>
          </div>
          <button
            type="button"
            onClick={() => setLargeOpen(true)}
            className="story-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            <Maximize2 size={14} /> Ver en grande
          </button>
        </div>
        <TreeBody generations={generations} worldId={worldId} compact />
      </div>

      <AnimatePresence>
        {largeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              aria-hidden
              onClick={() => setLargeOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal
              aria-label="Árbol familiar ampliado"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#2A3045] bg-[#0B0D10] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[#2A3045] px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#E8E9EB]">Árbol familiar</h2>
                  <p className="text-xs text-[#5A6078]">{members.length} miembros · desplázate si no cabe todo</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLargeOpen(false)}
                  className="rounded-lg p-2 text-[#5A6078] hover:bg-[#1E2230] hover:text-[#E8E9EB]"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-6 scrollbar-thin">
                <TreeBody generations={generations} worldId={worldId} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
