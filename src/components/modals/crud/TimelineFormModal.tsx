import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Clock, GripVertical } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';
import { useAppStore } from '@/store';
import type { Timeline } from '@/types';
import { sortByTimelineOrder, reorderTimelineItems, applyTimelineSortOrders } from '@/lib/timelineSort';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: Timeline | null;
  onSubmit: (data: Omit<Timeline, 'id' | 'createdAt' | 'updatedAt'>) => void;
  nextOrder: number;
};

type TimelineEntry = { kind: 'scene' | 'fact'; id: string; title: string };

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
  const scenes = useAppStore((s) => s.scenes.filter((sc) => sc.worldId === worldId && !sc.isDeleted));
  const facts = useAppStore((s) => s.getWorldFactsByWorld(worldId));
  const updateScene = useAppStore((s) => s.updateScene);
  const updateWorldFact = useAppStore((s) => s.updateWorldFact);

  const [form, setForm] = useState<Omit<Timeline, 'id' | 'createdAt' | 'updatedAt'>>(() => empty(worldId, nextOrder));
  const [err, setErr] = useState('');
  const [entryOrder, setEntryOrder] = useState<TimelineEntry[]>([]);

  const buildEntries = (timelineId: string): TimelineEntry[] => {
    const sc = sortByTimelineOrder(scenes.filter((s) => s.timelineId === timelineId)).map((s) => ({
      kind: 'scene' as const,
      id: s.id,
      title: s.title,
    }));
    const fc = sortByTimelineOrder(facts.filter((f) => f.timelineId === timelineId)).map((f) => ({
      kind: 'fact' as const,
      id: f.id,
      title: f.title,
    }));
    return [...sc, ...fc];
  };

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
      setEntryOrder(buildEntries(initial.id));
    } else {
      setForm(empty(worldId, nextOrder));
      setEntryOrder([]);
    }
    setErr('');
  }, [open, initial?.id, worldId, nextOrder]);

  const patch = (p: Partial<Omit<Timeline, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const moveEntry = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= entryOrder.length) return;
    setEntryOrder(reorderTimelineItems(entryOrder, index, next));
  };

  const persistEntryOrder = () => {
    if (!initial) return;
    const orders = applyTimelineSortOrders(entryOrder);
    for (const { id, timelineSortOrder } of orders) {
      const entry = entryOrder.find((e) => e.id === id);
      if (!entry) continue;
      if (entry.kind === 'scene') updateScene(id, { timelineSortOrder });
      else updateWorldFact(id, { timelineSortOrder });
    }
  };

  const save = () => {
    if (!form.name.trim()) {
      setErr('El nombre es obligatorio');
      return;
    }
    if (initial && entryOrder.length > 0) {
      persistEntryOrder();
      toast.success('Orden de la línea guardado');
    }
    onSubmit({ ...form, name: form.name.trim() });
    onClose();
  };

  const previewColor = form.color || '#D61E2B';

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar línea temporal' : 'Nueva línea temporal'}
      description="Define el arco temporal y ordena escenas y hechos en esta línea."
      maxWidthClass="max-w-xl"
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
      {err && (
        <p className="mb-3 rounded-lg border border-[#D61E2B]/30 bg-[#D61E2B]/10 px-3 py-2 text-sm text-[#D61E2B]">{err}</p>
      )}
      <div className="max-h-[68vh] space-y-4 overflow-y-auto pr-1 scrollbar-thin">
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: `${previewColor}44`,
            background: `linear-gradient(135deg, ${previewColor}18 0%, transparent 55%)`,
          }}
        >
          <div className="mb-3 flex items-center gap-2">
            <Clock size={18} style={{ color: previewColor }} />
            <span className="text-xs font-mono uppercase tracking-wider text-[#5A6078]">Línea temporal</span>
          </div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Nombre *</label>
          <input className="story-input mb-3 w-full" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripción</label>
          <StoryRichTextField worldId={worldId} value={form.description} onChange={(v) => patch({ description: v })} minHeight="4.5rem" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Color</label>
            <input
              type="color"
              className="h-10 w-full cursor-pointer rounded-lg border border-[#2A3045] bg-[#111318]"
              value={form.color}
              onChange={(e) => patch({ color: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Orden global</label>
            <input
              type="number"
              className="story-input w-full"
              value={form.order}
              onChange={(e) => patch({ order: Number(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Inicio (opc.)</label>
            <input className="story-input w-full" value={form.startDate} onChange={(e) => patch({ startDate: e.target.value })} placeholder="Año -100" />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-[#5A6078]">Fin (opc.)</label>
            <input className="story-input w-full" value={form.endDate} onChange={(e) => patch({ endDate: e.target.value })} />
          </div>
        </div>

        {initial && (
          <div className="rounded-xl border border-[#2A3045] bg-[#111318]/80 p-3">
            <p className="mb-2 text-xs font-mono uppercase tracking-wider text-[#5A6078]">
              Orden en esta línea (arriba = antes)
            </p>
            {entryOrder.length === 0 ? (
              <p className="text-xs text-[#5A6078]">Aún no hay escenas ni hechos asignados a esta línea.</p>
            ) : (
              <ul className="space-y-1">
                {entryOrder.map((entry, i) => (
                  <li
                    key={`${entry.kind}-${entry.id}`}
                    className="flex items-center gap-2 rounded-lg border border-[#2A3045] bg-[#0B0D10]/60 px-2 py-1.5 text-sm"
                  >
                    <GripVertical size={14} className="shrink-0 text-[#5A6078]" />
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] uppercase ${
                        entry.kind === 'scene' ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#8B5CF6]/15 text-[#A78BFA]'
                      }`}
                    >
                      {entry.kind === 'scene' ? 'Escena' : 'Hecho'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[#E8E9EB]">{entry.title}</span>
                    <button
                      type="button"
                      className="rounded p-1 text-[#5A6078] hover:bg-[#1E2230] hover:text-[#E8E9EB] disabled:opacity-30"
                      disabled={i === 0}
                      onClick={() => moveEntry(i, -1)}
                      aria-label="Subir"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-[#5A6078] hover:bg-[#1E2230] hover:text-[#E8E9EB] disabled:opacity-30"
                      disabled={i === entryOrder.length - 1}
                      onClick={() => moveEntry(i, 1)}
                      aria-label="Bajar"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
