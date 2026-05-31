import type { NavigateFunction } from 'react-router-dom';
import type { DetectedEntity, StoryEntityType } from '@/lib/storyEntityContext';
import { canEditInPlaceEntity, opensInPlacePreview } from '@/lib/storyInsertionPreview';
import { captureNavigationReturn, navigateWithReturnState } from '@/lib/storyNavigation';
import { useStore } from '@/store';
import { toast } from 'sonner';

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
  openEntityViewModal: (entity: DetectedEntity) => void
) {
  const path = entityViewPath(entity);
  if (path) {
    navigateWithReturnState(navigate, path);
    return;
  }
  if (opensInPlacePreview(entity.type)) {
    const returnTo = captureNavigationReturn();
    useStore.getState().openInsertionPreview(entity.worldId, entity.type, entity.id, returnTo);
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
    requestEntityView: (worldId: string, type: string, id: string) => void;
    requestEntityEdit: (worldId: string, type: string, id: string) => void;
    onViewDetails?: () => void;
  }
) {
  return {
    onViewDetails:
      handlers.onViewDetails ??
      (() =>
        openEntityView({ type, id, worldId, label }, handlers.navigate, (e) =>
          handlers.requestEntityView(e.worldId, e.type, e.id)
        )),
    onEdit: () => {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const search = typeof window !== 'undefined' ? window.location.search : '';
      if (!canEditInPlaceEntity(type, path, search)) {
        toast.info('Abre la sección correspondiente del mundo para editar este elemento.');
        return;
      }
      handlers.requestEntityEdit(worldId, type, id);
    },
  };
}
