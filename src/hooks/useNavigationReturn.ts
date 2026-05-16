import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const MAIN_SCROLL_ID = 'main-scroll';

export type NavigationReturnState = {
  from?: string;
  scrollY?: number;
};

export function getCurrentPath(pathname: string, search: string) {
  return `${pathname}${search}`;
}

function getMainScrollEl(): HTMLElement | null {
  return document.getElementById(MAIN_SCROLL_ID);
}

export function getMainScrollY(): number {
  return getMainScrollEl()?.scrollTop ?? 0;
}

export function setMainScrollY(y: number) {
  const el = getMainScrollEl();
  if (el) el.scrollTop = y;
}

export function useNavigateWithReturn() {
  const location = useLocation();
  const navigate = useNavigate();

  return useCallback(
    (to: string, options?: { replace?: boolean }) => {
      const from = getCurrentPath(location.pathname, location.search);
      navigate(to, {
        replace: options?.replace,
        state: { from, scrollY: getMainScrollY() } satisfies NavigationReturnState,
      });
    },
    [location.pathname, location.search, navigate]
  );
}

export function useNavigationReturn(fallback: string) {
  const location = useLocation();
  const navigate = useNavigate();

  const goBack = useCallback(() => {
    const state = location.state as NavigationReturnState | null;
    if (state?.from) {
      navigate(state.from);
      if (typeof state.scrollY === 'number') {
        requestAnimationFrame(() => {
          setMainScrollY(state.scrollY!);
        });
      }
    } else {
      navigate(fallback);
    }
  }, [location.state, navigate, fallback]);

  return goBack;
}
