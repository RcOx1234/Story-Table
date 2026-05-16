import { useState } from 'react';
import { useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Clock, ChevronRight } from 'lucide-react';
import type { Timeline } from '@/types';
import { TimelineFormModal } from '@/components/modals/crud/TimelineFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { toast } from 'sonner';

interface Props {
  worldId: string;
}

export function TimelinesSection({ worldId }: Props) {
  const navigateWithReturn = useNavigateWithReturn();
  const timelines = useAppStore((s) => s.getTimelinesByWorld(worldId));
  const addTimeline = useAppStore((s) => s.addTimeline);
  const updateTimeline = useAppStore((s) => s.updateTimeline);
  const deleteTimeline = useAppStore((s) => s.deleteTimeline);
  const scenes = useAppStore((s) => s.scenes.filter((sc) => sc.worldId === worldId && !sc.isDeleted));
  const [activeTimeline, setActiveTimeline] = useState<string>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Timeline | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const activeId = activeTimeline || timelines[0]?.id;
  const active = timelines.find((t) => t.id === activeId);
  const timelineScenes = scenes.filter((s) => s.timelineId === activeId);

  const nextOrder = timelines.length ? Math.max(...timelines.map((t) => t.order)) + 1 : 1;

  const onSubmit = (data: Omit<Timeline, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editing) {
      updateTimeline(editing.id, data);
      toast.success('Línea temporal actualizada');
    } else {
      addTimeline(data);
      toast.success('Línea temporal creada');
    }
    setEditing(null);
  };

  if (timelines.length === 0) {
    return (
      <>
        <div className="py-16 text-center">
          <Clock size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="mb-4 text-[#5A6078]">No hay líneas temporales</p>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="story-btn-primary text-sm"
          >
            <Plus size={16} /> Crear Timeline
          </button>
        </div>
        <TimelineFormModal
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          worldId={worldId}
          initial={editing}
          nextOrder={nextOrder}
          onSubmit={onSubmit}
        />
      </>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {timelines.map((tl) => (
            <button
              key={tl.id}
              type="button"
              onClick={() => setActiveTimeline(tl.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeId === tl.id ? 'text-white' : 'bg-[#1E2230] text-[#8B91A7] hover:text-[#E8E9EB]'
              }`}
              style={activeId === tl.id ? { backgroundColor: tl.color } : {}}
            >
              {tl.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const tl = timelines.find((t) => t.id === activeId);
              setEditing(tl ?? null);
              setFormOpen(true);
            }}
            className="story-btn-secondary text-sm"
          >
            Editar línea
          </button>
          <button
            type="button"
            onClick={() => activeId && setDeleteId(activeId)}
            className="story-btn-secondary text-sm text-[#D61E2B] hover:border-[#D61E2B]/40"
          >
            Eliminar línea
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="story-btn-secondary text-sm"
          >
            <Plus size={16} /> Nueva Línea
          </button>
        </div>
      </div>

      {active && (
        <div className="mb-6">
          <h3 className="mb-1 text-lg font-semibold text-[#E8E9EB]">{active.name}</h3>
          {active.description && <p className="text-sm text-[#8B91A7]">{active.description}</p>}
        </div>
      )}

      <div className="relative">
        <div className="absolute bottom-0 left-6 top-0 w-0.5" style={{ backgroundColor: active?.color || '#3A4460' }} />
        <div className="space-y-4">
          {timelineScenes.map((scene, i) => (
            <motion.div
              key={scene.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="ml-0 flex items-start gap-4"
            >
              <div
                className="mt-2 h-3 w-3 flex-shrink-0 rounded-full border-2 border-[#0B0D10]"
                style={{ backgroundColor: active?.color }}
              />
              <button
                type="button"
                onClick={() => navigateWithReturn(`/world/${worldId}/scene/${scene.id}`)}
                className="story-card flex-1 p-4 text-left transition-all hover:border-[#D61E2B]"
              >
                <div className="mb-1 flex items-center gap-2">
                  <h4 className="font-medium text-[#E8E9EB]">{scene.title}</h4>
                  <ChevronRight size={14} className="text-[#D61E2B]" />
                </div>
                {scene.description && <p className="line-clamp-2 text-xs text-[#8B91A7]">{scene.description}</p>}
              </button>
            </motion.div>
          ))}
          {timelineScenes.length === 0 && <div className="ml-10 text-sm text-[#5A6078]">No hay escenas en esta línea temporal</div>}
        </div>
      </div>

      <TimelineFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        worldId={worldId}
        initial={editing}
        nextOrder={nextOrder}
        onSubmit={onSubmit}
      />

      <ConfirmDeleteModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Eliminar línea temporal"
        message="Las escenas no se borran; solo se quitará esta línea del mundo."
        onConfirm={() => {
          if (deleteId) {
            deleteTimeline(deleteId);
            setActiveTimeline('');
            toast.success('Línea temporal enviada a la papelera');
          }
        }}
      />
    </div>
  );
}
