import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Maximize2, X } from 'lucide-react';
import type { Character, Timeline } from '@/types';
import type { HouseGenealogyInput } from '@/lib/houseGenealogyMigrate';
import {
  buildHouseFamilyGraph,
  type FamilyGraphNode,
  type RenderFamilyUnit,
  MAIN_TIMELINE_ID,
  ALL_TIMELINES_ID,
} from '@/lib/houseFamilyGraph';

function PersonNode({
  node,
  worldId,
  compact,
}: {
  node: FamilyGraphNode;
  worldId: string;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const avatar = compact ? 'h-10 w-10' : 'h-12 w-12';

  return (
    <button
      type="button"
      onClick={() => navigate(`/world/${worldId}/character/${node.character.id}`)}
      className={`flex min-w-[88px] max-w-[110px] flex-col items-center rounded-lg border p-2 text-center transition-colors ${
        node.isExternal
          ? 'border-dashed border-[#5A6078] bg-[#111318]/80 hover:border-[#8B91A7]'
          : 'border-[#2A3045] bg-gradient-to-b from-[#161922] to-[#111318] hover:border-[#D61E2B]/40'
      } ${node.isAlternate ? 'ring-1 ring-[#EAB308]/30' : ''}`}
    >
      <div className={`mb-1.5 ${avatar} overflow-hidden rounded-full ring-2 ring-[#2A3045]`}>
        {node.character.images[0] ? (
          <img src={node.character.images[0]} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#8B91A7]">
            {node.character.name.charAt(0)}
          </div>
        )}
      </div>
      <span className="line-clamp-2 text-[10px] font-medium leading-tight text-[#E8E9EB]">{node.character.name}</span>
      <span className="mt-0.5 line-clamp-2 text-[8px] text-[#5A6078]">{node.label}</span>
      {node.isAlternate && <span className="mt-0.5 text-[7px] uppercase text-[#EAB308]">Alterna</span>}
    </button>
  );
}

function UnitBlock({
  unit,
  worldId,
  compact,
}: {
  unit: RenderFamilyUnit;
  worldId: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl p-2 ${
        unit.isAlternate ? 'bg-[#EAB308]/5 border border-[#EAB308]/20' : ''
      }`}
    >
      {unit.label && <p className="text-[9px] uppercase tracking-wider text-[#5A6078]">{unit.label}</p>}
      {unit.parentNodes.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {unit.parentNodes.map((p, i) => (
            <div key={p.characterId} className="flex items-center gap-2">
              {i > 0 && <span className="text-[10px] text-[#D61E2B]">♥</span>}
              <PersonNode node={p} worldId={worldId} compact={compact} />
            </div>
          ))}
        </div>
      )}
      {unit.parentNodes.length > 0 && unit.childNodes.length > 0 && (
        <div className="flex flex-col items-center py-1" aria-hidden>
          <div className="h-3 w-px bg-[#3A4460]" />
          <div className="h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent border-t-[#5A6078]" />
        </div>
      )}
      {unit.childNodes.length > 0 && (
        <div className="flex flex-wrap items-start justify-center gap-2">
          {unit.childNodes.map((c) => (
            <PersonNode key={c.characterId} node={c} worldId={worldId} compact={compact} />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeContent({
  graph,
  worldId,
  compact,
}: {
  graph: ReturnType<typeof buildHouseFamilyGraph>;
  worldId: string;
  compact?: boolean;
}) {
  if (graph.units.length === 0 && graph.disconnected.length === 0) {
    return <p className="text-sm text-[#5A6078]">Define unidades familiares o relaciones para ver el árbol.</p>;
  }

  return (
    <div className="space-y-6">
      {graph.units.length > 0 && (
        <div className="flex flex-col items-center gap-8">
          {graph.units.map((unit) => (
            <UnitBlock key={unit.id} unit={unit} worldId={worldId} compact={compact} />
          ))}
        </div>
      )}
      {graph.disconnected.length > 0 && (
        <section>
          <h4 className="mb-2 text-[10px] font-mono uppercase tracking-wider text-[#5A6078]">
            Miembros sin conexión familiar
          </h4>
          <div className="flex flex-wrap justify-center gap-2">
            {graph.disconnected.map((n) => (
              <PersonNode key={n.characterId} node={n} worldId={worldId} compact={compact} />
            ))}
          </div>
        </section>
      )}
      {graph.conflicts.length > 0 && (
        <section className="rounded-xl border border-[#EAB308]/30 bg-[#EAB308]/5 p-3">
          <p className="mb-2 flex items-center gap-2 text-xs text-[#EAB308]">
            <AlertTriangle size={14} /> Relaciones con conflicto
          </p>
          {graph.conflicts.map((c) => (
            <p key={c.message} className="text-[10px] text-[#8B91A7]">
              {c.message}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}

type Props = {
  worldId: string;
  house: HouseGenealogyInput;
  characters: Character[];
  timelines?: Timeline[];
  selectedTimelineId?: string;
  onTimelineChange?: (id: string) => void;
  showTimelineSelector?: boolean;
};

export function FamilyTree({
  worldId,
  house,
  characters,
  timelines = [],
  selectedTimelineId: controlledTimeline,
  onTimelineChange,
  showTimelineSelector = true,
}: Props) {
  const [internalTimeline, setInternalTimeline] = useState(MAIN_TIMELINE_ID);
  const [largeOpen, setLargeOpen] = useState(false);
  const selectedTimelineId = controlledTimeline ?? internalTimeline;
  const setTimeline = onTimelineChange ?? setInternalTimeline;

  const graph = useMemo(
    () => buildHouseFamilyGraph({ house, characters, selectedTimelineId }),
    [house, characters, selectedTimelineId]
  );

  const timelineOptions = useMemo(
    () => [
      { id: ALL_TIMELINES_ID, name: 'Todas' },
      { id: MAIN_TIMELINE_ID, name: 'Principal' },
      ...timelines.map((t) => ({ id: t.id, name: t.name })),
    ],
    [timelines]
  );

  const selector = showTimelineSelector && (
    <label className="flex items-center gap-2 text-[10px] text-[#5A6078]">
      <span className="uppercase tracking-wider">Línea temporal</span>
      <select
        className="story-input py-1 text-xs"
        value={selectedTimelineId}
        onChange={(e) => setTimeline(e.target.value)}
      >
        {timelineOptions.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );

  if ((house.familyPeople?.length ?? 0) === 0 && (house.members?.length ?? 0) === 0) {
    return <p className="text-sm text-[#5A6078]">Añade miembros o personas al árbol familiar.</p>;
  }

  return (
    <>
      <div className="rounded-2xl border border-[#2A3045] bg-[#0B0D10]/90 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#5A6078]">Árbol familiar</h4>
            <p className="text-[10px] text-[#3A4460]">Conexiones por unidad familiar · no por generación</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selector}
            <button
              type="button"
              onClick={() => setLargeOpen(true)}
              className="story-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <Maximize2 size={14} /> Ver en grande
            </button>
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <TreeContent graph={graph} worldId={worldId} compact />
        </div>
      </div>

      <AnimatePresence>
        {largeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => setLargeOpen(false)} />
            <motion.div
              role="dialog"
              aria-modal
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="relative flex max-h-[92vh] w-[96vw] max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#2A3045] bg-[#0B0D10]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[#2A3045] px-5 py-4">
                <h2 className="text-lg font-semibold text-[#E8E9EB]">Árbol familiar</h2>
                <button type="button" onClick={() => setLargeOpen(false)} className="rounded-lg p-2 text-[#5A6078] hover:bg-[#1E2230]">
                  <X size={20} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-6 scrollbar-thin">
                {selector}
                <TreeContent graph={graph} worldId={worldId} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
