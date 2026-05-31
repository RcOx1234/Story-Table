import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '@/store';
import { restoreScrollFromState, type StoryHistoryState } from '@/lib/storyNavigation';
import type { NavigationReturnState } from '@/hooks/useNavigationReturn';

/** Sincroniza vista previa de inserciones, scroll y rutas con el botón Atrás del navegador. */
export function useStoryNavigationHistory() {
  const location = useLocation();

  useEffect(() => {
    const navState = location.state as NavigationReturnState | null;
    if (navState?.scrollY != null) {
      restoreScrollFromState(navState);
    }
  }, [location.key, location.state]);

  useEffect(() => {
    const onPopState = () => {
      const state = window.history.state as StoryHistoryState | null;
      const store = useStore.getState();

      if (store.insertionPreview && state?.overlay !== 'insertion-preview') {
        useStore.setState({ insertionPreview: null });
        restoreScrollFromState(state?.returnTo);
        return;
      }

      if (!store.insertionPreview && state?.returnTo) {
        restoreScrollFromState(state.returnTo);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
}
