import { useMemo, useState } from 'react';
import { useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Clock, ChevronRight } from 'lucide-react';
import type { Timeline } from '@/types';
import { TimelineFormModal } from '@/components/modals/crud/TimelineFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { EntityMultiPicker } from '@/components/common/EntityMultiPicker';
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
  const updateScene = useAppStore((s) => s.updateScene);
  const updateWorldFact = useAppStore((s) => s.updateWorldFact);
  const scenes = useAppStore((s) => s.scenes.filter((sc) => sc.worldId === worldId && !sc.isDeleted));
  const facts = useAppStore((s) => s.getWorldFactsByWorld(worldId));
  const [activeTimeline, setActiveTimeline] = useState<string>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Timeline | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assignScenesOpen, setAssignScenesOpen] = useState(false);
  const [assignFactsOpen, setAssignFactsOpen] = useState(false);
  const [pickedSceneIds, setPickedSceneIds] = useState<string[]>([]);
  const [pickedFactIds, setPickedFactIds] = useState<string[]>([]);

  const activeId = activeTimeline || timelines[0]?.id;
  const active = timelines.find((t) => t.id === activeId);
  const timelineScenes = scenes.filter((s) => s.timelineId === activeId);
  const timelineFacts = facts.filter((f) => f.timelineId === activeId);

  const scenePickerItems = useMemo(
    () =>
      scenes
        .filter((s) => s.timelineId !== activeId)
        .map((s) => ({ id: s.id, label: s.title, sublabel: s.description })),
    [scenes, activeId]
  );

  const factPickerItems = useMemo(
    () =>
      facts
        .filter((f) => f.timelineId !== activeId)
        .map((f) => ({ id: f.id, label: f.title, sublabel: f.dateLabel })),
    [facts, activeId]
  );

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

  const assignScenes = () => {
    if (!active) return;
    for (const id of pickedSceneIds) {
      updateScene(id, { timelineId: active.id, timelineName: active.name });
    }
    toast.success(`${pickedSceneIds.length} escena(s) asignadas`);
    setPickedSceneIds([]);
    setAssignScenesOpen(false);
  };

  const assignFacts = () => {
    if (!active) return;
    for (const id of pickedFactIds) {
      updateWorldFact(id, { timelineId: active.id });
    }
    toast.success(`${pickedFactIds.length} hecho(s) asignados`);
    setPickedFactIds([]);
    setAssignFactsOpen(false);
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
            disabled={!activeId}
            onClick={() => {
              setPickedSceneIds([]);
              setAssignScenesOpen(true);
            }}
            className="story-btn-secondary text-sm"
          >
            Añadir escena
          </button>
          <button
            type="button"
            disabled={!activeId}
            onClick={() => {
              setPickedFactIds([]);
              setAssignFactsOpen(true);
            }}
            className="story-btn-secondary text-sm"
          >
            Añadir hecho
          </button>
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
          {timelineFacts.map((fact, i) => (
            <motion.div
              key={fact.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (timelineScenes.length + i) * 0.1 }}
              className="ml-0 flex items-start gap-4"
            >
              <div
                className="mt-2 h-3 w-3 flex-shrink-0 rounded-full border-2 border-[#0B0D10] bg-[#8B5CF6]"
                style={{ backgroundColor: active?.color }}
              />
              <div className="story-card flex-1 p-4">
                <h4 className="font-medium text-[#E8E9EB]">{fact.title}</h4>
                {fact.description && <p className="mt-1 line-clamp-2 text-xs text-[#8B91A7]">{fact.description}</p>}
              </div>
            </motion.div>
          ))}
          {timelineScenes.length === 0 && timelineFacts.length === 0 && (
            <div className="ml-10 text-sm text-[#5A6078]">No hay escenas ni hechos en esta línea temporal</div>
          )}
        </div>
      </div>

      <BaseModal
        open={assignScenesOpen}
        onClose={() => setAssignScenesOpen(false)}
        title="Asignar escenas a la línea"
        maxWidthClass="max-w-md"
        footer={
          <>
            <button type="button" className="story-btn-secondary text-sm" onClick={() => setAssignScenesOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="story-btn-primary text-sm"
              disabled={pickedSceneIds.length === 0}
              onClick={assignScenes}
            >
              Asignar
            </button>
          </>
        }
      >
        <EntityMultiPicker
          label="Escenas"
          items={scenePickerItems}
          value={pickedSceneIds}
          onChange={setPickedSceneIds}
          placeholder="Elegir escenas…"
          emptyMessage="No hay escenas disponibles"
        />
      </BaseModal>

      <BaseModal
        open={assignFactsOpen}
        onClose={() => setAssignFactsOpen(false)}
        title="Asignar hechos a la línea"
        maxWidthClass="max-w-md"
        footer={
          <>
            <button type="button" className="story-btn-secondary text-sm" onClick={() => setAssignFactsOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="story-btn-primary text-sm"
              disabled={pickedFactIds.length === 0}
              onClick={assignFacts}
            >
              Asignar
            </button>
          </>
        }
      >
        <EntityMultiPicker
          label="Hechos"
          items={factPickerItems}
          value={pickedFactIds}
          onChange={setPickedFactIds}
          placeholder="Elegir hechos…"
          emptyMessage="No hay hechos disponibles"
        />
      </BaseModal>

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
