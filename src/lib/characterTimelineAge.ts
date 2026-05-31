import type { Character, CharacterDeathInfo, Timeline } from '@/types';

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

export type CharacterTimelineResolved = {
  status: Character['status'];
  death?: CharacterDeathInfo;
  recoveredThisTimeline: boolean;
};

function walkTimelineStates(
  character: Character,
  orderedTimelines: Timeline[],
  targetTimelineId?: string
): CharacterTimelineResolved {
  let status: Character['status'] = character.status;
  let death: CharacterDeathInfo | undefined;
  let recoveredThisTimeline = false;

  for (const tl of orderedTimelines) {
    if (character.statusRecoveryByTimeline?.[tl.id]) {
      status = 'alive';
      death = undefined;
      recoveredThisTimeline = true;
      if (tl.id === targetTimelineId) return { status, death, recoveredThisTimeline };
      continue;
    }

    recoveredThisTimeline = false;
    const explicit = character.statusByTimeline?.[tl.id];
    if (explicit !== undefined) {
      const ignoreLegacyAlive =
        explicit === 'alive' &&
        (status === 'dead' || status === 'missing') &&
        !character.statusRecoveryByTimeline?.[tl.id];

      if (!ignoreLegacyAlive) {
        status = explicit;
        if (status === 'dead') {
          death = character.deathByTimeline?.[tl.id] ?? death;
        } else {
          death = undefined;
        }
      }
    }

    if (tl.id === targetTimelineId) {
      return { status, death, recoveredThisTimeline: false };
    }
  }

  return { status, death, recoveredThisTimeline: false };
}

/** Estado efectivo en una línea (propaga muerte/desaparición hacia adelante). */
export function resolveCharacterTimelineState(
  character: Character,
  timelineId: string,
  orderedTimelines: Timeline[]
): CharacterTimelineResolved {
  if (!orderedTimelines.length) {
    return {
      status: character.statusByTimeline?.[timelineId] ?? character.status,
      death: character.deathByTimeline?.[timelineId],
      recoveredThisTimeline: Boolean(character.statusRecoveryByTimeline?.[timelineId]),
    };
  }
  return walkTimelineStates(character, orderedTimelines, timelineId);
}

/** Estado del personaje en una línea temporal (o global si no hay override). */
export function characterStatusForTimeline(
  character: Character,
  timelineId: string | null | undefined,
  orderedTimelines?: Timeline[]
): Character['status'] {
  if (!timelineId) return character.status;
  if (!orderedTimelines?.length) {
    return character.statusByTimeline?.[timelineId] ?? character.status;
  }
  return resolveCharacterTimelineState(character, timelineId, orderedTimelines).status;
}

/** Muerte efectiva en una línea (conserva la causa desde la línea en que murió). */
export function characterDeathForTimeline(
  character: Character,
  timelineId: string | null | undefined,
  orderedTimelines?: Timeline[]
): CharacterDeathInfo | undefined {
  if (!timelineId) return undefined;
  if (!orderedTimelines?.length) {
    return character.deathByTimeline?.[timelineId];
  }
  const { status, death } = resolveCharacterTimelineState(character, timelineId, orderedTimelines);
  return status === 'dead' ? death : undefined;
}

export const CHARACTER_STATUS_LABELS: Record<Character['status'], string> = {
  alive: 'Vivo',
  dead: 'Muerto',
  missing: 'Desaparecido',
  unknown: 'Desconocido',
};
