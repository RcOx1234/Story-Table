import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { CharacterFormModal } from '@/components/modals/crud/CharacterFormModal';
import { SceneFormModal } from '@/components/modals/crud/SceneFormModal';
import { PlaceFormModal } from '@/components/modals/crud/PlaceFormModal';
import { HouseFormModal } from '@/components/modals/crud/HouseFormModal';
import { MapFormModal } from '@/components/modals/crud/MapFormModal';
import { ComponentFormModal } from '@/components/modals/crud/ComponentFormModal';
import { OrganizationFormModal } from '@/components/modals/crud/OrganizationFormModal';
import { PlotFormModal } from '@/components/modals/crud/PlotFormModal';
import { IdeaFormModal } from '@/components/modals/crud/IdeaFormModal';
import { FactFormModal } from '@/components/modals/crud/FactFormModal';
import { DatumFormModal } from '@/components/modals/crud/DatumFormModal';
import { FantasticElementFormModal } from '@/components/modals/crud/FantasticElementFormModal';
import { TimelineFormModal } from '@/components/modals/crud/TimelineFormModal';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';
import { toast } from 'sonner';
import type { StoryEntityType } from '@/lib/storyEntityContext';

type EditState = { worldId: string; type: StoryEntityType; id: string } | null;
type ViewState = { worldId: string; type: StoryEntityType; id: string } | null;

export function StoryEntityActionHost() {
  const editReq = useAppStore((s) => s.entityEditRequest);
  const viewReq = useAppStore((s) => s.entityViewRequest);
  const clearEdit = useAppStore((s) => s.clearEntityEditRequest);
  const clearView = useAppStore((s) => s.clearEntityViewRequest);
  const openInsertionPreview = useAppStore((s) => s.openInsertionPreview);

  const [edit, setEdit] = useState<EditState>(null);
  const [view, setView] = useState<ViewState>(null);

  useEffect(() => {
    if (!editReq) return;
    const { worldId, type, id } = editReq;
    if (['component', 'organization', 'plot', 'idea', 'fantastic'].includes(type)) {
      setEdit({ worldId, type: type as StoryEntityType, id });
      clearEdit();
      return;
    }
    setEdit({ worldId, type: type as StoryEntityType, id });
    clearEdit();
  }, [editReq, clearEdit]);

  useEffect(() => {
    if (!viewReq) return;
    const { worldId, type, id } = viewReq;
    if (['component', 'organization', 'plot', 'idea', 'fantastic'].includes(type)) {
      openInsertionPreview(worldId, type, id);
      clearView();
      return;
    }
    if (['fact', 'datum', 'timeline'].includes(type)) {
      setView({ worldId, type: type as StoryEntityType, id });
      clearView();
      return;
    }
    clearView();
  }, [viewReq, clearView, openInsertionPreview]);

  const closeEdit = () => setEdit(null);
  const closeView = () => setView(null);

  if (!edit && !view) return null;

  return (
    <>
      {edit?.type === 'character' && (
        <CharacterEditModal worldId={edit.worldId} id={edit.id} onClose={closeEdit} />
      )}
      {edit?.type === 'scene' && <SceneEditModal worldId={edit.worldId} id={edit.id} onClose={closeEdit} />}
      {edit?.type === 'place' && <PlaceEditModal worldId={edit.worldId} id={edit.id} onClose={closeEdit} />}
      {edit?.type === 'house' && <HouseEditModal worldId={edit.worldId} id={edit.id} onClose={closeEdit} />}
      {edit?.type === 'map' && <MapEditModal worldId={edit.worldId} id={edit.id} onClose={closeEdit} />}
      {edit?.type === 'component' && (
        <ComponentEditModal worldId={edit.worldId} id={edit.id} onClose={closeEdit} />
      )}
      {edit?.type === 'organization' && (
        <OrganizationEditModal worldId={edit.worldId} id={edit.id} onClose={closeEdit} />
      )}
      {edit?.type === 'plot' && <PlotEditModal worldId={edit.worldId} id={edit.id} onClose={closeEdit} />}
      {edit?.type === 'idea' && <IdeaEditModal worldId={edit.worldId} id={edit.id} onClose={closeEdit} />}
      {edit?.type === 'fact' && <FactEditModal worldId={edit.worldId} id={edit.id} onClose={closeEdit} />}
      {edit?.type === 'datum' && <DatumEditModal worldId={edit.worldId} id={edit.id} onClose={closeEdit} />}
      {edit?.type === 'fantastic' && (
        <FantasticEditModal worldId={edit.worldId} id={edit.id} onClose={closeEdit} />
      )}
      {edit?.type === 'timeline' && (
        <TimelineEditModal worldId={edit.worldId} id={edit.id} onClose={closeEdit} />
      )}
      {view?.type === 'fact' && <FactViewModal worldId={view.worldId} id={view.id} onClose={closeView} />}
      {view?.type === 'datum' && <DatumViewModal worldId={view.worldId} id={view.id} onClose={closeView} />}
      {view?.type === 'timeline' && (
        <TimelineViewModal id={view.id} onClose={closeView} />
      )}
    </>
  );
}

function CharacterEditModal({ worldId, id, onClose }: { worldId: string; id: string; onClose: () => void }) {
  const initial = useAppStore((s) => s.getCharacterById(id));
  const update = useAppStore((s) => s.updateCharacter);
  if (!initial) return null;
  return (
    <CharacterFormModal
      open
      onClose={onClose}
      worldId={worldId}
      initial={initial}
      onSubmit={(data) => {
        update(id, data);
        toast.success('Personaje actualizado');
        onClose();
      }}
    />
  );
}

function SceneEditModal({ worldId, id, onClose }: { worldId: string; id: string; onClose: () => void }) {
  const initial = useAppStore((s) => s.getSceneById(id));
  const update = useAppStore((s) => s.updateScene);
  if (!initial) return null;
  return (
    <SceneFormModal
      open
      onClose={onClose}
      worldId={worldId}
      initial={initial}
      onSubmit={(data) => {
        update(id, data);
        toast.success('Escena actualizada');
        onClose();
      }}
    />
  );
}

function PlaceEditModal({ worldId, id, onClose }: { worldId: string; id: string; onClose: () => void }) {
  const initial = useAppStore((s) => s.places.find((p) => p.id === id));
  const update = useAppStore((s) => s.updatePlace);
  if (!initial) return null;
  return (
    <PlaceFormModal
      open
      onClose={onClose}
      worldId={worldId}
      initial={initial}
      onSubmit={(data) => {
        update(id, data);
        toast.success('Lugar actualizado');
        onClose();
      }}
    />
  );
}

function HouseEditModal({ worldId, id, onClose }: { worldId: string; id: string; onClose: () => void }) {
  const initial = useAppStore((s) => s.houses.find((h) => h.id === id));
  const update = useAppStore((s) => s.updateHouse);
  if (!initial) return null;
  return (
    <HouseFormModal
      open
      onClose={onClose}
      worldId={worldId}
      initial={initial}
      onSubmit={(data) => {
        update(id, data);
        toast.success('Casa actualizada');
        onClose();
      }}
    />
  );
}

function MapEditModal({ worldId, id, onClose }: { worldId: string; id: string; onClose: () => void }) {
  const initial = useAppStore((s) => s.maps.find((m) => m.id === id));
  const update = useAppStore((s) => s.updateMap);
  if (!initial) return null;
  return (
    <MapFormModal
      open
      onClose={onClose}
      worldId={worldId}
      initial={initial}
      onSubmit={(data) => {
        update(id, data);
        toast.success('Mapa actualizado');
        onClose();
      }}
    />
  );
}

function ComponentEditModal({ worldId, id, onClose }: { worldId: string; id: string; onClose: () => void }) {
  const initial = useAppStore((s) => s.components.find((c) => c.id === id));
  const update = useAppStore((s) => s.updateComponent);
  if (!initial) return null;
  return (
    <ComponentFormModal
      open
      onClose={onClose}
      worldId={worldId}
      initial={initial}
      onSubmit={(data) => {
        update(id, data);
        toast.success('Componente actualizado');
        onClose();
      }}
    />
  );
}

function OrganizationEditModal({ worldId, id, onClose }: { worldId: string; id: string; onClose: () => void }) {
  const initial = useAppStore((s) => s.organizations.find((o) => o.id === id));
  const update = useAppStore((s) => s.updateOrganization);
  if (!initial) return null;
  return (
    <OrganizationFormModal
      open
      onClose={onClose}
      worldId={worldId}
      initial={initial}
      onSubmit={(data) => {
        update(id, data);
        toast.success('Organización actualizada');
        onClose();
      }}
    />
  );
}

function PlotEditModal({ worldId, id, onClose }: { worldId: string; id: string; onClose: () => void }) {
  const initial = useAppStore((s) => s.plots.find((p) => p.id === id));
  const update = useAppStore((s) => s.updatePlot);
  if (!initial) return null;
  return (
    <PlotFormModal
      open
      onClose={onClose}
      worldId={worldId}
      initial={initial}
      onSubmit={(data) => {
        update(id, data);
        toast.success('Trama actualizada');
        onClose();
      }}
    />
  );
}

function IdeaEditModal({ worldId, id, onClose }: { worldId: string; id: string; onClose: () => void }) {
  const initial = useAppStore((s) => s.ideas.find((i) => i.id === id));
  const update = useAppStore((s) => s.updateIdea);
  if (!initial) return null;
  return (
    <IdeaFormModal
      open
      onClose={onClose}
      worldId={worldId}
      initial={initial}
      onSubmit={(data) => {
        update(id, data);
        toast.success('Idea actualizada');
        onClose();
      }}
    />
  );
}

function FactEditModal({ worldId, id, onClose }: { worldId: string; id: string; onClose: () => void }) {
  const initial = useAppStore((s) => s.worldFacts.find((f) => f.id === id));
  const update = useAppStore((s) => s.updateWorldFact);
  if (!initial) return null;
  return (
    <FactFormModal
      open
      onClose={onClose}
      worldId={worldId}
      initial={initial}
      onSubmit={(data) => {
        update(id, data);
        toast.success('Hecho actualizado');
        onClose();
      }}
    />
  );
}

function DatumEditModal({ worldId, id, onClose }: { worldId: string; id: string; onClose: () => void }) {
  const initial = useAppStore((s) => s.worldData.find((d) => d.id === id));
  const update = useAppStore((s) => s.updateWorldDatum);
  if (!initial) return null;
  return (
    <DatumFormModal
      open
      onClose={onClose}
      worldId={worldId}
      initial={initial}
      onSubmit={(data) => {
        update(id, data);
        toast.success('Dato actualizado');
        onClose();
      }}
    />
  );
}

function FantasticEditModal({ worldId, id, onClose }: { worldId: string; id: string; onClose: () => void }) {
  const initial = useAppStore((s) => s.fantasticElements.find((f) => f.id === id));
  const update = useAppStore((s) => s.updateFantasticElement);
  if (!initial) return null;
  return (
    <FantasticElementFormModal
      open
      onClose={onClose}
      worldId={worldId}
      initial={initial}
      onSubmit={(data) => {
        update(id, data);
        toast.success('Elemento actualizado');
        onClose();
      }}
    />
  );
}

function TimelineEditModal({ worldId, id, onClose }: { worldId: string; id: string; onClose: () => void }) {
  const initial = useAppStore((s) => s.timelines.find((t) => t.id === id));
  const timelines = useAppStore((s) => s.getTimelinesByWorld(worldId));
  const update = useAppStore((s) => s.updateTimeline);
  if (!initial) return null;
  const nextOrder = timelines.length ? Math.max(...timelines.map((t) => t.order)) + 1 : 1;
  return (
    <TimelineFormModal
      open
      onClose={onClose}
      worldId={worldId}
      initial={initial}
      nextOrder={nextOrder}
      onSubmit={(data) => {
        update(id, data);
        toast.success('Timeline actualizado');
        onClose();
      }}
    />
  );
}

function FactViewModal({ worldId, id, onClose }: { worldId: string; id: string; onClose: () => void }) {
  const fact = useAppStore((s) => s.worldFacts.find((f) => f.id === id));
  if (!fact) return null;
  return (
    <BaseModal
      open
      onClose={onClose}
      title={fact.title}
      maxWidthClass="max-w-xl"
      footer={
        <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <StoryRichTextDisplay text={fact.description} worldId={worldId} className="text-[#E8E9EB]" />
    </BaseModal>
  );
}

function DatumViewModal({ worldId, id, onClose }: { worldId: string; id: string; onClose: () => void }) {
  const datum = useAppStore((s) => s.worldData.find((d) => d.id === id));
  if (!datum) return null;
  return (
    <BaseModal
      open
      onClose={onClose}
      title={datum.title}
      maxWidthClass="max-w-xl"
      footer={
        <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <StoryRichTextDisplay text={datum.content} worldId={worldId} className="text-[#E8E9EB]" />
    </BaseModal>
  );
}

function TimelineViewModal({ id, onClose }: { id: string; onClose: () => void }) {
  const tl = useAppStore((s) => s.timelines.find((t) => t.id === id));
  if (!tl) return null;
  return (
    <BaseModal
      open
      onClose={onClose}
      title={tl.name}
      description={tl.description}
      maxWidthClass="max-w-xl"
      footer={
        <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <p className="text-sm text-[#8B91A7]">
        Color: <span style={{ color: tl.color }}>{tl.color}</span>
      </p>
    </BaseModal>
  );
}
