import type { Character, Timeline } from '@/types';

/** Extrae el primer entero de una etiqueta de fecha (p. ej. "Año 1245", "-100"). */
export function parseYearFromDateLabel(value: string): number | null {
  const m = value.trim().match(/-?\d+/);
  if (!m) return null;
  const y = parseInt(m[0], 10);
  return Number.isFinite(y) ? y : null;
}

/** Año de referencia de una línea temporal (inicio, si no fin). */
export function timelineReferenceYear(timeline: Timeline): number | null {
  return parseYearFromDateLabel(timeline.startDate) ?? parseYearFromDateLabel(timeline.endDate);
}

export function ageAtYear(birthYear: number, referenceYear: number): number {
  return Math.max(0, referenceYear - birthYear);
}

export function computeAgeForTimeline(birthYear: number | undefined, timeline: Timeline): number | null {
  if (birthYear == null || !Number.isFinite(birthYear)) return null;
  const ref = timelineReferenceYear(timeline);
  if (ref == null) return null;
  return ageAtYear(birthYear, ref);
}

/** Estado del personaje en una línea temporal (o global si no hay override). */
export function characterStatusForTimeline(
  character: Character,
  timelineId: string | null | undefined
): Character['status'] {
  if (!timelineId) return character.status;
  return character.statusByTimeline?.[timelineId] ?? character.status;
}

export const CHARACTER_STATUS_LABELS: Record<Character['status'], string> = {
  alive: 'Vivo',
  dead: 'Muerto',
  missing: 'Desaparecido',
  unknown: 'Desconocido',
};
