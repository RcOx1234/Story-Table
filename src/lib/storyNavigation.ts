import type { NavigateFunction } from 'react-router-dom';
import {
  getCurrentPath,
  getMainScrollY,
  pushNavBack,
  setMainScrollY,
  type NavigationReturnState,
} from '@/hooks/useNavigationReturn';

export type StoryHistoryState = {
  storyTable?: boolean;
  overlay?: 'insertion-preview';
  preview?: { worldId: string; type: string; id: string };
  returnTo?: NavigationReturnState;
};

export function captureNavigationReturn(): NavigationReturnState {
  return {
    from: getCurrentPath(window.location.pathname, window.location.search),
    scrollY: getMainScrollY(),
  };
}

export function navigateWithReturnState(navigate: NavigateFunction, to: string, replace?: boolean) {
  pushNavBack(getCurrentPath(window.location.pathname, window.location.search));
  navigate(to, {
    replace,
    state: captureNavigationReturn() satisfies NavigationReturnState,
  });
}

export function pushInsertionPreviewHistory(
  preview: { worldId: string; type: string; id: string },
  returnTo: NavigationReturnState
) {
  const state: StoryHistoryState = {
    storyTable: true,
    overlay: 'insertion-preview',
    preview,
    returnTo,
  };
  window.history.pushState(state, '', window.location.href);
}

export function restoreScrollFromState(state: NavigationReturnState | null | undefined) {
  const scrollY = state?.scrollY;
  if (typeof scrollY === 'number') {
    requestAnimationFrame(() => setMainScrollY(scrollY));
  }
}

export function folderParamKey(scope: string) {
  return `folder_${scope}`;
}
