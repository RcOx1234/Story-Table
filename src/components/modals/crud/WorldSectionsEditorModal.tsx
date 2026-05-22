import { useState, useEffect, useRef } from 'react';
import { GripVertical, Plus } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { ALL_WORLD_SECTIONS } from '@/lib/worldSections';
import type { SectionType, World } from '@/types';

const SECTION_LABELS: Record<SectionType, string> = {
  characters: 'Personajes',
  scenes: 'Escenas',
  places: 'Lugares',
  plots: 'Tramas',
  maps: 'Mapas',
  components: 'Componentes',
  organizations: 'Organizaciones',
  houses: 'Casas',
  datos: 'Datos',
  hechos: 'Hechos',
  ideas: 'Ideas',
  timelines: 'Timeline',
  fantastic: 'Elementos fantásticos',
};

type Props = {
  open: boolean;
  onClose: () => void;
  world: World;
  onSave: (enabledSections: SectionType[], sectionOrder: SectionType[]) => void;
};

export function WorldSectionsEditorModal({ open, onClose, world, onSave }: Props) {
  const [enabled, setEnabled] = useState<SectionType[]>([]);
  const [order, setOrder] = useState<SectionType[]>([]);
  const dragIdRef = useRef<SectionType | null>(null);
  const [dragOverId, setDragOverId] = useState<SectionType | null>(null);

  useEffect(() => {
    if (!open) return;
    const en = world.enabledSections?.length ? [...world.enabledSections] : [...ALL_WORLD_SECTIONS];
    const ord = world.sectionOrder?.length
      ? world.sectionOrder.filter((s) => en.includes(s))
      : en.filter((s) => en.includes(s));
    const missing = en.filter((s) => !ord.includes(s));
    setEnabled(en);
    setOrder([...ord, ...missing]);
    setDragOverId(null);
    dragIdRef.current = null;
  }, [open, world.id, world.updatedAt]);

  const toggle = (id: SectionType) => {
    if (enabled.includes(id)) {
      if (enabled.length <= 1) return;
      setEnabled(enabled.filter((s) => s !== id));
      setOrder(order.filter((s) => s !== id));
    } else {
      setEnabled([...enabled, id]);
      setOrder([...order, id]);
    }
  };

  const visibleOrder = order.filter((s) => enabled.includes(s));
  const disabled = ALL_WORLD_SECTIONS.filter((s) => !enabled.includes(s));

  const reorder = (dragId: SectionType, overId: SectionType) => {
    if (dragId === overId) return;
    const from = visibleOrder.indexOf(dragId);
    const to = visibleOrder.indexOf(overId);
    if (from < 0 || to < 0) return;
    const next = [...visibleOrder];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    const hidden = order.filter((s) => !enabled.includes(s));
    setOrder([...next, ...hidden]);
  };

  const onDragStart = (id: SectionType) => {
    dragIdRef.current = id;
    setDragOverId(id);
  };

  const lastOverRef = useRef<SectionType | null>(null);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDragEnter = (overId: SectionType) => {
    const dragId = dragIdRef.current;
    if (!dragId || dragId === overId || lastOverRef.current === overId) return;
    lastOverRef.current = overId;
    setDragOverId(overId);
    reorder(dragId, overId);
  };

  const onDragEnd = () => {
    dragIdRef.current = null;
    lastOverRef.current = null;
    setDragOverId(null);
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Editar secciones del mundo"
      description="Arrastra para reordenar. Ocultar una sección no borra sus datos."
      maxWidthClass="max-w-md"
      footer={
        <>
          <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="story-btn-primary text-sm"
            onClick={() => {
              onSave(enabled, visibleOrder);
              onClose();
            }}
          >
            Guardar
          </button>
        </>
      }
    >
      <p className="mb-3 text-xs uppercase tracking-wider text-[#5A6078]">Visibles (orden)</p>
      <ul className="mb-4 space-y-1">
        {visibleOrder.map((id) => (
          <li
            key={id}
            draggable
            onDragStart={() => onDragStart(id)}
            onDragOver={onDragOver}
            onDragEnter={() => onDragEnter(id)}
            onDragEnd={onDragEnd}
            className={`flex cursor-grab items-center gap-2 rounded-lg border bg-[#111318] px-3 py-2 text-sm text-[#E8E9EB] transition-colors active:cursor-grabbing ${
              dragOverId === id
                ? 'border-[#D61E2B]/50 bg-[#1a1f2a]'
                : 'border-[#2A3045] hover:border-[#3A4460]'
            }`}
          >
            <GripVertical size={14} className="text-[#5A6078]" />
            <span className="flex-1">{SECTION_LABELS[id]}</span>
            <button type="button" className="text-xs text-[#D61E2B]" onClick={() => toggle(id)}>
              Quitar
            </button>
          </li>
        ))}
      </ul>
      {disabled.length > 0 && (
        <>
          <p className="mb-2 text-xs uppercase tracking-wider text-[#5A6078]">Añadir sección</p>
          <div className="flex flex-wrap gap-2">
            {disabled.map((id) => (
              <button
                key={id}
                type="button"
                className="flex items-center gap-1 rounded-full border border-[#2A3045] px-3 py-1 text-xs text-[#8B91A7] hover:border-[#D61E2B]/40 hover:text-[#E8E9EB]"
                onClick={() => toggle(id)}
              >
                <Plus size={12} /> {SECTION_LABELS[id]}
              </button>
            ))}
          </div>
        </>
      )}
    </BaseModal>
  );
}
