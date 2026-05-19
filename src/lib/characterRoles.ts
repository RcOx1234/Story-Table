import type { CharacterRole } from '@/types';

export const CHARACTER_ROLE_OPTIONS: { value: CharacterRole; label: string; group: 'narrative' | 'rank' }[] = [
  { value: 'protagonist', label: 'Protagonista', group: 'narrative' },
  { value: 'antagonist', label: 'Antagonista', group: 'narrative' },
  { value: 'secondary', label: 'Secundario', group: 'narrative' },
  { value: 'supporting', label: 'Apoyo', group: 'narrative' },
  { value: 'extra', label: 'Extra', group: 'narrative' },
  { value: 'king', label: 'Rey', group: 'rank' },
  { value: 'queen', label: 'Reina', group: 'rank' },
  { value: 'prince', label: 'Príncipe', group: 'rank' },
  { value: 'princess', label: 'Princesa', group: 'rank' },
  { value: 'noble', label: 'Noble', group: 'rank' },
  { value: 'commoner', label: 'Plebeyo', group: 'rank' },
  { value: 'guard', label: 'Guardia', group: 'rank' },
  { value: 'villain', label: 'Villano', group: 'rank' },
  { value: 'creature', label: 'Criatura', group: 'rank' },
  { value: 'assassin', label: 'Asesino', group: 'rank' },
  { value: 'other', label: 'Otro', group: 'rank' },
];

export const CHARACTER_ROLE_LABELS: Record<string, { label: string; color: string }> = {
  protagonist: { label: 'Protagonista', color: '#22C55E' },
  antagonist: { label: 'Antagonista', color: '#D61E2B' },
  secondary: { label: 'Secundario', color: '#3B82F6' },
  supporting: { label: 'Apoyo', color: '#8B5CF6' },
  extra: { label: 'Extra', color: '#5A6078' },
  king: { label: 'Rey', color: '#EAB308' },
  queen: { label: 'Reina', color: '#EAB308' },
  prince: { label: 'Príncipe', color: '#3B82F6' },
  princess: { label: 'Princesa', color: '#EC4899' },
  noble: { label: 'Noble', color: '#A78BFA' },
  commoner: { label: 'Plebeyo', color: '#6B7280' },
  guard: { label: 'Guardia', color: '#64748B' },
  villain: { label: 'Villano', color: '#EF4444' },
  creature: { label: 'Criatura', color: '#14B8A6' },
  assassin: { label: 'Asesino', color: '#6B7280' },
  other: { label: 'Otro', color: '#5A6078' },
};

export function characterRoleLabel(role: string): string {
  return CHARACTER_ROLE_LABELS[role]?.label ?? role;
}

export function characterRoleColor(role: string): string {
  return CHARACTER_ROLE_LABELS[role]?.color ?? '#5A6078';
}
