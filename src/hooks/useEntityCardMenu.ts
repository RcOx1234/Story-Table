import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { openEntityView, entityCardMenuProps } from '@/lib/entityActions';
import { canEditInPlaceEntity } from '@/lib/storyInsertionPreview';
import { toast } from 'sonner';
import type { StoryEntityType } from '@/lib/storyEntityContext';

/** Dependencias compartidas para EntityCardMenu en listados. */
export function useSectionCardMenuDeps() {
  const navigate = useNavigate();
  const openInsertionPreview = useAppStore((s) => s.openInsertionPreview);
  const requestEntityView = useAppStore((s) => s.requestEntityView);
  const requestEntityEdit = useAppStore((s) => s.requestEntityEdit);
  return useMemo(
    () => ({ navigate, openInsertionPreview, requestEntityView, requestEntityEdit }),
    [navigate, openInsertionPreview, requestEntityView, requestEntityEdit]
  );
}

export { entityCardMenuProps };

/** Acciones de tarjeta alineadas con el menú contextual (ver = navegar/modal, editar = formulario). */
export function useEntityCardMenu(
  worldId: string,
  type: StoryEntityType,
  id: string,
  label: string,
  onViewDetails?: () => void
) {
  const navigate = useNavigate();
  const openInsertionPreview = useAppStore((s) => s.openInsertionPreview);
  const requestEntityView = useAppStore((s) => s.requestEntityView);
  const requestEntityEdit = useAppStore((s) => s.requestEntityEdit);

  const view = useCallback(() => {
    if (onViewDetails) {
      onViewDetails();
      return;
    }
    openEntityView(
      { type, id, worldId, label },
      navigate,
      openInsertionPreview,
      (e) => requestEntityView(e.worldId, e.type, e.id)
    );
  }, [type, id, worldId, label, onViewDetails, navigate, openInsertionPreview, requestEntityView]);

  const edit = useCallback(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const search = typeof window !== 'undefined' ? window.location.search : '';
    if (!canEditInPlaceEntity(type, path, search)) {
      toast.info('Abre la sección correspondiente del mundo para editar este elemento.');
      return;
    }
    requestEntityEdit(worldId, type, id);
  }, [worldId, type, id, requestEntityEdit]);

  return { onViewDetails: view, onEdit: edit };
}
