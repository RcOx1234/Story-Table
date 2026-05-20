import type { NavigateFunction } from 'react-router-dom';
import type { DetectedEntity, StoryEntityType } from '@/lib/storyEntityContext';
import { opensInPlacePreview } from '@/lib/storyInsertionPreview';

const DETAIL_ROUTE =
  /^\/world\/[^/]+\/(character|scene|place|house|map)\/[^/]+/;

export function isEntityDetailPage(pathname: string): boolean {
  return DETAIL_ROUTE.test(pathname);
}

/** Rutas de ficha con id (no solo pestaña del mundo). */
export function entityViewPath(entity: DetectedEntity): string | null {
  const { worldId, type, id } = entity;
  if (!worldId || !id) return null;
  switch (type) {
    case 'character':
      return `/world/${worldId}/character/${id}`;
    case 'scene':
      return `/world/${worldId}/scene/${id}`;
    case 'place':
      return `/world/${worldId}/place/${id}`;
    case 'house':
      return `/world/${worldId}/house/${id}`;
    case 'map':
      return `/world/${worldId}/map/${id}`;
    default:
      return null;
  }
}

export function openEntityView(
  entity: DetectedEntity,
  navigate: NavigateFunction,
  openInsertionPreview: (worldId: string, type: string, id: string) => void,
  openEntityViewModal: (entity: DetectedEntity) => void
) {
  const path = entityViewPath(entity);
  if (path) {
    navigate(path);
    return;
  }
  if (opensInPlacePreview(entity.type)) {
    openInsertionPreview(entity.worldId, entity.type, entity.id);
    return;
  }
  openEntityViewModal(entity);
}

export type EntityEditRequest = {
  worldId: string;
  type: StoryEntityType;
  id: string;
};

/** Props para EntityCardMenu (usable dentro de .map sin hook). */
export function entityCardMenuProps(
  worldId: string,
  type: StoryEntityType,
  id: string,
  label: string,
  handlers: {
    navigate: NavigateFunction;
    openInsertionPreview: (worldId: string, type: string, id: string) => void;
    requestEntityView: (worldId: string, type: string, id: string) => void;
    requestEntityEdit: (worldId: string, type: string, id: string) => void;
    onViewDetails?: () => void;
  }
) {
  return {
    onViewDetails:
      handlers.onViewDetails ??
      (() =>
        openEntityView(
          { type, id, worldId, label },
          handlers.navigate,
          handlers.openInsertionPreview,
          (e) => handlers.requestEntityView(e.worldId, e.type, e.id)
        )),
    onEdit: () => handlers.requestEntityEdit(worldId, type, id),
  };
}
