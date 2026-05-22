import type { DeathCauseType } from '@/types';

export const DEATH_CAUSE_OPTIONS: { value: DeathCauseType; label: string }[] = [
  { value: 'natural', label: 'Muerte natural' },
  { value: 'murder', label: 'Asesinato' },
  { value: 'suicide', label: 'Suicidio' },
  { value: 'accident', label: 'Accidente' },
  { value: 'execution', label: 'Ejecución' },
  { value: 'unknown', label: 'Desconocido' },
  { value: 'other', label: 'Otro' },
];

export function deathCauseLabel(type?: DeathCauseType, custom?: string): string {
  if (!type) return '';
  if (type === 'other' && custom?.trim()) return custom.trim();
  return DEATH_CAUSE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}
