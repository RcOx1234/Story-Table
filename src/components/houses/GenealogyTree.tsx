import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2, Minus, Plus, RotateCcw, UserPlus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Character } from '@/types';
import { buildGenealogyTree, pickGenealogyRoot, type GenealogyUnit } from '@/lib/characterGenealogy';
import { CHARACTER_ROLE_LABELS } from '@/lib/characterRoles';

const statusDot: Record<string, string> = {
  alive: '#22C55E',
  dead: '#6B7280',
  missing: '#EAB308',
  unknown: '#5A6078',
};

function PersonNode({
  character,
  houseName,
  selected,
  onSelect,
}: {
  character: Character;
  houseName?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const role = CHARACTER_ROLE_LABELS[character.role]?.label;
  const external = houseName && character.house && character.house !== houseName;

  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`relative flex w-[92px] flex-col items-center rounded-xl border p-2 text-center transition-all ${
        selected
          ? 'border-[#D61E2B] bg-[#D61E2B]/15 shadow-[0_0_12px_rgba(214,30,43,0.25)]'
          : 'border-[#2A3045] bg-gradient-to-b from-[#161922] to-[#111318] hover:border-[#D61E2B]/50'
      }`}
    >
      <span
        className="absolute left-1.5 top-1.5 z-10 h-2 w-2 rounded-full ring-2 ring-[#111318]"
        style={{ backgroundColor: statusDot[character.status] ?? statusDot.unknown }}
      />
      <div className="relative mb-1.5 h-11 w-11 overflow-hidden rounded-full ring-2 ring-[#2A3045]">
        {character.images[0] ? (
          <img src={character.images[0]} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#8B91A7]">
            {character.name.charAt(0)}
          </div>
        )}
      </div>
      <span className="line-clamp-2 text-[11px] font-medium leading-tight text-[#E8E9EB]">{character.name}</span>
      {role && <span className="mt-0.5 line-clamp-1 text-[9px] text-[#5A6078]">{role}</span>}
      {external && (
        <span className="mt-0.5 line-clamp-1 text-[9px] text-[#EAB308]/90">{character.house}</span>
      )}
    </button>
  );
}

function CoupleRow({
  unit,
  houseName,
  selectedId,
  onSelect,
}: {
  unit: GenealogyUnit;
  houseName?: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {unit.partners.map((p, i) => (
        <div key={p.id} className="flex items-center gap-2">
          {i > 0 && <span className="text-sm text-[#D61E2B]/70">♥</span>}
          <PersonNode
            character={p}
            houseName={houseName}
            selected={selectedId === p.id}
            onSelect={() => onSelect(p.id)}
          />
        </div>
      ))}
    </div>
  );
}

function TreeBranch({
  unit,
  houseName,
  selectedId,
  onSelect,
  depth = 0,
}: {
  unit: GenealogyUnit;
  houseName?: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  return (
    <div className="flex flex-col items-center">
      <CoupleRow unit={unit} houseName={houseName} selectedId={selectedId} onSelect={onSelect} />
      {unit.children.length > 0 && (
        <>
          <div className="my-2 h-6 w-px bg-[#2A3045]" aria-hidden />
          <div className="relative flex flex-wrap items-start justify-center gap-12 pt-1">
            <BranchConnectorLine />
            {unit.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center pt-4">
                <div className="mb-2 h-4 w-px bg-[#2A3045]" aria-hidden />
                <TreeBranch
                  unit={child}
                  houseName={houseName}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  depth={depth + 1}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BranchConnectorLine() {
  return <div className="absolute left-[8%] right-[8%] top-0 h-px bg-[#2A3045]/80" aria-hidden />;
}

type Props = {
  characters: Character[];
  rootCharacterId: string;
  houseName?: string;
  onSelectCharacter: (characterId: string) => void;
  onAddCharacter?: () => void;
  selectedId?: string | null;
};

export function GenealogyTree({
  characters,
  rootCharacterId,
  houseName,
  onSelectCharacter,
  onAddCharacter,
  selectedId = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);

  const effectiveRoot = rootCharacterId || pickGenealogyRoot(characters) || '';
  const tree = useMemo(
    () => (effectiveRoot ? buildGenealogyTree(characters, effectiveRoot) : null),
    [characters, effectiveRoot]
  );

  const resetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setScale(1);
  }, []);

  useEffect(() => {
    resetView();
  }, [effectiveRoot, resetView]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setDragging(false);

  const canvasHeight = fullscreen ? 'h-full min-h-[70vh]' : 'h-[420px] lg:h-[480px]';

  const canvas = (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl border border-[#2A3045] bg-[#08090c] ${canvasHeight} ${
        dragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,#1a1f2a_0%,transparent_65%)] opacity-40" />
      <p className="pointer-events-none absolute bottom-2 left-3 z-10 text-[10px] text-[#5A6078]">
        Arrastra para mover · Usa +/− para zoom
      </p>

      <div
        className="absolute left-1/2 top-6 min-w-max -translate-x-1/2 lg:top-4"
        style={{
          transform: `translate(calc(-50% + ${pan.x}px), ${pan.y}px) scale(${scale})`,
          transformOrigin: 'top center',
          transition: dragging ? 'none' : 'transform 0.15s ease-out',
        }}
      >
        {tree ? (
          <TreeBranch
            unit={tree}
            houseName={houseName}
            selectedId={selectedId}
            onSelect={onSelectCharacter}
          />
        ) : (
          <p className="px-8 py-16 text-center text-sm text-[#5A6078]">
            Añade miembros y relaciones familiares para construir el árbol de la casa.
          </p>
        )}
      </div>
    </div>
  );

  const toolbar = (
    <div className="mb-2 flex flex-wrap items-center gap-2 lg:mb-3">
      <div className="flex items-center gap-1 rounded-lg border border-[#2A3045] bg-[#111318] p-0.5">
        <button
          type="button"
          className="rounded-md p-1.5 hover:bg-[#1E2230]"
          onClick={() => setScale((s) => Math.max(0.4, s - 0.1))}
          aria-label="Alejar"
        >
          <Minus size={14} className="text-[#8B91A7]" />
        </button>
        <span className="min-w-[2.75rem] text-center text-xs text-[#5A6078]">{Math.round(scale * 100)}%</span>
        <button
          type="button"
          className="rounded-md p-1.5 hover:bg-[#1E2230]"
          onClick={() => setScale((s) => Math.min(1.6, s + 0.1))}
          aria-label="Acercar"
        >
          <Plus size={14} className="text-[#8B91A7]" />
        </button>
      </div>
      <button type="button" className="story-btn-secondary flex items-center gap-1 px-2 py-1 text-xs" onClick={resetView}>
        <RotateCcw size={14} /> Reiniciar
      </button>
      {onAddCharacter && (
        <button type="button" className="story-btn-primary flex items-center gap-1 px-2 py-1 text-xs" onClick={onAddCharacter}>
          <UserPlus size={14} /> Nuevo
        </button>
      )}
      <ToolbarActions
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((f) => !f)}
        onCloseFullscreen={() => setFullscreen(false)}
      />
    </div>
  );

  const treeBlock = (
    <>
      {toolbar}
      <div className={fullscreen ? 'flex-1 min-h-0' : ''}>{canvas}</div>
    </>
  );

  if (fullscreen) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-[#0B0D10]/98 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {treeBlock}
        </motion.div>
      </AnimatePresence>
    );
  }

  return treeBlock;
}

function ToolbarActions({
  fullscreen,
  onToggleFullscreen,
  onCloseFullscreen,
}: {
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onCloseFullscreen: () => void;
}) {
  return (
    <div className="ml-auto flex items-center gap-1">
      <button
        type="button"
        className="story-btn-secondary flex items-center gap-1 px-2 py-1 text-xs"
        onClick={onToggleFullscreen}
        aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
      >
        {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
      {fullscreen && (
        <button
          type="button"
          className="rounded-lg p-2 hover:bg-[#1E2230]"
          onClick={onCloseFullscreen}
          aria-label="Cerrar pantalla completa"
        >
          <X size={18} className="text-[#E8E9EB]" />
        </button>
      )}
    </div>
  );
}
