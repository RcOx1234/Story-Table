import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

  useEffect(() => {
    if (!open) return;
    const en = world.enabledSections?.length ? [...world.enabledSections] : [...ALL_WORLD_SECTIONS];
    const ord = world.sectionOrder?.length
      ? world.sectionOrder.filter((s) => en.includes(s))
      : en.filter((s) => en.includes(s));
    const missing = en.filter((s) => !ord.includes(s));
    setEnabled(en);
    setOrder([...ord, ...missing]);
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

  const move = (id: SectionType, dir: -1 | 1) => {
    const idx = order.indexOf(id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= order.length) return;
    const copy = [...order];
    [copy[idx], copy[next]] = [copy[next], copy[idx]];
    setOrder(copy);
  };

  const disabled = ALL_WORLD_SECTIONS.filter((s) => !enabled.includes(s));

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Editar secciones del mundo"
      description="Ocultar una sección no borra sus datos; solo la quita del menú."
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
              onSave(enabled, order.filter((s) => enabled.includes(s)));
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
        {order
          .filter((s) => enabled.includes(s))
          .map((id) => (
            <li
              key={id}
              className="flex items-center gap-2 rounded-lg border border-[#2A3045] bg-[#111318] px-3 py-2 text-sm text-[#E8E9EB]"
            >
              <GripVertical size={14} className="text-[#5A6078]" />
              <span className="flex-1">{SECTION_LABELS[id]}</span>
              <button type="button" className="text-xs text-[#5A6078] hover:text-[#E8E9EB]" onClick={() => move(id, -1)}>
                ↑
              </button>
              <button type="button" className="text-xs text-[#5A6078] hover:text-[#E8E9EB]" onClick={() => move(id, 1)}>
                ↓
              </button>
              <button type="button" className="text-xs text-[#D61E2B]" onClick={() => toggle(id)}>
                Quitar
              </button>
            </li>
          ))}
      </ul>
      {disabled.length > 0 && (
        <>
          <p className="mb-2 text-xs uppercase tracking-wider text-[#5A6078]">Añadir sección</p>
          <motion.div className="flex flex-wrap gap-2">
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
          </motion.div>
        </>
      )}
    </BaseModal>
  );
}
