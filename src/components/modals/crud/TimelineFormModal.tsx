import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';
import type { Timeline } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: Timeline | null;
  onSubmit: (data: Omit<Timeline, 'id' | 'createdAt' | 'updatedAt'>) => void;
  nextOrder: number;
};

function empty(worldId: string, order: number): Omit<Timeline, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    name: '',
    description: '',
    order,
    startDate: '',
    endDate: '',
    color: `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')}`,
  };
}

export function TimelineFormModal({ open, onClose, worldId, initial, onSubmit, nextOrder }: Props) {
  const [form, setForm] = useState<Omit<Timeline, 'id' | 'createdAt' | 'updatedAt'>>(() => empty(worldId, nextOrder));
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        worldId,
        name: initial.name,
        description: initial.description,
        order: initial.order,
        startDate: initial.startDate,
        endDate: initial.endDate,
        color: initial.color,
      });
    } else {
      setForm(empty(worldId, nextOrder));
    }
    setErr('');
  }, [open, initial, worldId, nextOrder]);

  const patch = (p: Partial<Omit<Timeline, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.name.trim()) {
      setErr('El nombre es obligatorio');
      return;
    }
    onSubmit({ ...form, name: form.name.trim() });
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar línea temporal' : 'Nueva línea temporal'}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="story-btn-primary text-sm" onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      {err && <p className="mb-2 text-sm text-[#D61E2B]">{err}</p>}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Nombre *</label>
          <input className="story-input w-full" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripción</label>
          <StoryRichTextField worldId={worldId} value={form.description} onChange={(v) => patch({ description: v })} minHeight="5rem" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Color</label>
            <input type="color" className="h-10 w-full cursor-pointer rounded-lg border border-[#2A3045] bg-[#111318]" value={form.color} onChange={(e) => patch({ color: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Orden</label>
            <input type="number" className="story-input w-full" value={form.order} onChange={(e) => patch({ order: Number(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Inicio (opc.)</label>
            <input className="story-input w-full" value={form.startDate} onChange={(e) => patch({ startDate: e.target.value })} placeholder="Año -100" />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Fin (opc.)</label>
            <input className="story-input w-full" value={form.endDate} onChange={(e) => patch({ endDate: e.target.value })} />
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
