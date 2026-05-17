/** Tipos de relación predefinidos entre personajes. */
export const RELATIONSHIP_TYPE_OPTIONS: { value: string; label: string; group: string }[] = [
  { value: 'padre', label: 'Padre', group: 'Familia' },
  { value: 'madre', label: 'Madre', group: 'Familia' },
  { value: 'hijo', label: 'Hijo', group: 'Familia' },
  { value: 'hija', label: 'Hija', group: 'Familia' },
  { value: 'hermano', label: 'Hermano', group: 'Familia' },
  { value: 'hermana', label: 'Hermana', group: 'Familia' },
  { value: 'abuelo', label: 'Abuelo', group: 'Familia' },
  { value: 'abuela', label: 'Abuela', group: 'Familia' },
  { value: 'tío', label: 'Tío', group: 'Familia' },
  { value: 'tía', label: 'Tía', group: 'Familia' },
  { value: 'primo', label: 'Primo', group: 'Familia' },
  { value: 'prima', label: 'Prima', group: 'Familia' },
  { value: 'esposo', label: 'Esposo', group: 'Familia' },
  { value: 'esposa', label: 'Esposa', group: 'Familia' },
  { value: 'consorte', label: 'Consorte', group: 'Familia' },
  { value: 'amigo', label: 'Amigo', group: 'Vínculos' },
  { value: 'amiga', label: 'Amiga', group: 'Vínculos' },
  { value: 'mentor', label: 'Mentor', group: 'Vínculos' },
  { value: 'alumno', label: 'Alumno', group: 'Vínculos' },
  { value: 'aliado', label: 'Aliado', group: 'Vínculos' },
  { value: 'compañero', label: 'Compañero', group: 'Vínculos' },
  { value: 'enemigo', label: 'Enemigo', group: 'Tensión' },
  { value: 'rival', label: 'Rival', group: 'Tensión' },
  { value: 'nemesis', label: 'Némesis', group: 'Tensión' },
  { value: 'antagonista', label: 'Antagonista', group: 'Tensión' },
  { value: 'other', label: 'Otro', group: 'Otros' },
];

export function relationshipTypeLabel(value: string): string {
  return RELATIONSHIP_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
