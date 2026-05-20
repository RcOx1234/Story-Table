/** Tipos que abren vista previa/modal en el lugar actual (sin navegar a otra sección). */
export const IN_PLACE_PREVIEW_TYPES = new Set([
  'component',
  'organization',
  'idea',
  'plot',
  'fantastic',
  'fact',
  'datum',
  'timeline',
]);

const TYPE_WORLD_TAB: Record<string, string> = {
  component: 'components',
  organization: 'organizations',
  plot: 'plots',
  idea: 'ideas',
  fantastic: 'fantastic',
  fact: 'hechos',
  datum: 'datos',
  timeline: 'timelines',
};

export function opensInPlacePreview(type: string): boolean {
  return IN_PLACE_PREVIEW_TYPES.has(type);
}

/** Tipos con ficha propia (personaje, escena, lugar, casa, mapa). */
export function hasEntityDetailPage(type: string): boolean {
  return ['character', 'scene', 'place', 'house', 'map'].includes(type);
}

/** Solo se puede editar en la pestaña del mundo o en su ficha (no desde inserciones en otra sección). */
export function canEditInPlaceEntity(
  type: string,
  pathname: string,
  search: string
): boolean {
  if (hasEntityDetailPage(type)) return true;
  if (!opensInPlacePreview(type)) return true;
  const tab = TYPE_WORLD_TAB[type];
  if (!tab) return false;
  if (!/^\/world\/[^/]+/.test(pathname)) return false;
  if (/\/world\/[^/]+\/(character|scene|place|house|map)\//.test(pathname)) return false;
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  return params.get('tab') === tab;
}
