/** Tipos que abren vista previa/modal en el lugar actual (sin navegar a otra sección). */
export const IN_PLACE_PREVIEW_TYPES = new Set([
  'component',
  'organization',
  'idea',
  'plot',
  'fantastic',
]);

export function opensInPlacePreview(type: string): boolean {
  return IN_PLACE_PREVIEW_TYPES.has(type);
}
