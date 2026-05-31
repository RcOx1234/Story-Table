import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { restoreScrollFromState } from '@/lib/storyNavigation';

export const MAIN_SCROLL_ID = 'main-scroll';

export type NavigationReturnState = {
  from?: string;
  scrollY?: number;
};

const WORLDS_LIST_PATH_KEY = 'story-table-worlds-list-path';
const NAV_BACK_STACK_KEY = 'story-table-nav-back-stack';
const MAX_BACK_STACK = 3;

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

/** Recuerda si el usuario estaba en inicio o en Mis Mundos. */
export function rememberWorldsListPath(path: string) {
  if (path === '/' || path === '/mundos') {
    sessionStorage.setItem(WORLDS_LIST_PATH_KEY, path);
  }
}

export function getWorldsListPath(): string {
  return sessionStorage.getItem(WORLDS_LIST_PATH_KEY) ?? '/mundos';
}

function readBackStack(): string[] {
  try {
    const raw = sessionStorage.getItem(NAV_BACK_STACK_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeBackStack(stack: string[]) {
  sessionStorage.setItem(NAV_BACK_STACK_KEY, JSON.stringify(stack.slice(-MAX_BACK_STACK)));
}

export function pushNavBack(fromPath: string) {
  if (!fromPath) return;
  const stack = readBackStack();
  if (stack[stack.length - 1] === fromPath) return;
  stack.push(fromPath);
  writeBackStack(stack);
}

export function popNavBack(): string | null {
  const stack = readBackStack();
  const target = stack.pop() ?? null;
  writeBackStack(stack);
  return target;
}

export function useRememberWorldsListPath() {
  const { pathname } = useLocation();
  useEffect(() => {
    rememberWorldsListPath(pathname);
  }, [pathname]);
}

export function useNavigateWithReturn() {
  const location = useLocation();
  const navigate = useNavigate();

  return useCallback(
    (to: string, options?: { replace?: boolean }) => {
      const from = getCurrentPath(location.pathname, location.search);
      pushNavBack(from);
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
    const current = getCurrentPath(location.pathname, location.search);
    const stacked = popNavBack();

    if (stacked && stacked !== current) {
      navigate(stacked, { replace: true, state: {} });
      restoreScrollFromState(state);
      return;
    }

    if (state?.from && state.from !== current) {
      navigate(state.from, { replace: true, state: {} });
      restoreScrollFromState(state);
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  }, [location.pathname, location.search, location.state, navigate, fallback]);

  return goBack;
}

/** Botón atrás del encabezado de un mundo: vuelve al listado de mundos (inicio o Mis Mundos). */
export function useWorldsListReturn() {
  const navigate = useNavigate();
  return useCallback(() => {
    navigate(getWorldsListPath(), { replace: true, state: {} });
  }, [navigate]);
}
