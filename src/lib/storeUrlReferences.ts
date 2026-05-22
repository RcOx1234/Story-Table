import type { AppState } from '@/store';

export type UrlReference = {
  entityLabel: string;
  fieldPath: string;
};

const URL_LIKE = /^https?:\/\//i;

function isUrlString(v: unknown): v is string {
  return typeof v === 'string' && (URL_LIKE.test(v) || v.startsWith('data:'));
}

function walk(
  value: unknown,
  path: string,
  hits: { path: string; value: string }[]
): void {
  if (isUrlString(value)) {
    hits.push({ path, value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${path}[${i}]`, hits));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walk(v, path ? `${path}.${k}` : k, hits);
    }
  }
}

function entityLabel(type: string, item: { name?: string; title?: string; description?: string }): string {
  const name = item.name ?? item.title ?? item.description?.slice(0, 40);
  return name ? `${type}: ${name}` : type;
}

/** Busca usos de una URL en el estado de la app. */
export function findUrlReferencesInState(state: AppState, url: string): UrlReference[] {
  const refs: UrlReference[] = [];
  const collections: { key: keyof AppState; type: string; items: unknown[] }[] = [
    { key: 'worlds', type: 'Mundo', items: state.worlds },
    { key: 'characters', type: 'Personaje', items: state.characters },
    { key: 'scenes', type: 'Escena', items: state.scenes },
    { key: 'places', type: 'Lugar', items: state.places },
    { key: 'maps', type: 'Mapa', items: state.maps },
    { key: 'plots', type: 'Trama', items: state.plots },
    { key: 'components', type: 'Componente', items: state.components },
    { key: 'organizations', type: 'Organización', items: state.organizations },
    { key: 'ideas', type: 'Idea', items: state.ideas },
    { key: 'houses', type: 'Casa', items: state.houses },
    { key: 'worldFacts', type: 'Hecho', items: state.worldFacts },
    { key: 'worldData', type: 'Dato', items: state.worldData },
    { key: 'placeCollections', type: 'Colección lugares', items: state.placeCollections },
    { key: 'mapCollections', type: 'Colección mapas', items: state.mapCollections },
    { key: 'fantasticElements', type: 'Elemento fantástico', items: state.fantasticElements },
    { key: 'timelines', type: 'Línea temporal', items: state.timelines },
  ];

  for (const { type, items } of collections) {
    for (const item of items) {
      const hits: { path: string; value: string }[] = [];
      walk(item, '', hits);
      for (const h of hits) {
        if (h.value === url) {
          refs.push({
            entityLabel: entityLabel(type, item as { name?: string; title?: string; description?: string }),
            fieldPath: h.path,
          });
        }
      }
    }
  }

  const user = state.user;
  if (user?.photoURL === url) {
    refs.push({ entityLabel: 'Perfil de usuario', fieldPath: 'photoURL' });
  }

  return refs;
}

function replaceInValue(value: unknown, oldUrl: string, newUrl: string): unknown {
  if (isUrlString(value) && value === oldUrl) return newUrl;
  if (Array.isArray(value)) return value.map((v) => replaceInValue(v, oldUrl, newUrl));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = replaceInValue(v, oldUrl, newUrl);
    }
    return out;
  }
  return value;
}

function replaceInArray<T>(arr: T[], oldUrl: string, newUrl: string): T[] {
  return arr.map((item) => replaceInValue(item, oldUrl, newUrl) as T);
}

/** Reemplaza una URL en todas las entidades del store (p. ej. tras renombrar archivo). */
export function buildStateWithReplacedUrl(
  state: AppState,
  oldUrl: string,
  newUrl: string
): Partial<AppState> {
  return {
    worlds: replaceInArray(state.worlds, oldUrl, newUrl),
    characters: replaceInArray(state.characters, oldUrl, newUrl),
    scenes: replaceInArray(state.scenes, oldUrl, newUrl),
    places: replaceInArray(state.places, oldUrl, newUrl),
    maps: replaceInArray(state.maps, oldUrl, newUrl),
    plots: replaceInArray(state.plots, oldUrl, newUrl),
    components: replaceInArray(state.components, oldUrl, newUrl),
    organizations: replaceInArray(state.organizations, oldUrl, newUrl),
    ideas: replaceInArray(state.ideas, oldUrl, newUrl),
    houses: replaceInArray(state.houses, oldUrl, newUrl),
    worldFacts: replaceInArray(state.worldFacts, oldUrl, newUrl),
    worldData: replaceInArray(state.worldData, oldUrl, newUrl),
    placeCollections: replaceInArray(state.placeCollections, oldUrl, newUrl),
    mapCollections: replaceInArray(state.mapCollections, oldUrl, newUrl),
    fantasticElements: replaceInArray(state.fantasticElements, oldUrl, newUrl),
    timelines: replaceInArray(state.timelines, oldUrl, newUrl),
    user: state.user?.photoURL === oldUrl ? { ...state.user, photoURL: newUrl } : state.user,
  };
}
