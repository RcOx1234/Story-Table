/** Roles dentro de una casa noble (jerarquía familiar). */
export const HOUSE_MEMBER_ROLE_OPTIONS: { value: string; label: string; group: string }[] = [
  { value: 'patriarca', label: 'Patriarca', group: 'Liderazgo' },
  { value: 'matriarca', label: 'Matriarca', group: 'Liderazgo' },
  { value: 'heredero', label: 'Heredero', group: 'Liderazgo' },
  { value: 'heredera', label: 'Heredera', group: 'Liderazgo' },
  { value: 'regente', label: 'Regente', group: 'Liderazgo' },
  { value: 'padre', label: 'Padre', group: 'Familia' },
  { value: 'madre', label: 'Madre', group: 'Familia' },
  { value: 'hijo', label: 'Hijo', group: 'Familia' },
  { value: 'hija', label: 'Hija', group: 'Familia' },
  { value: 'hermano', label: 'Hermano', group: 'Familia' },
  { value: 'hermana', label: 'Hermana', group: 'Familia' },
  { value: 'abuelo', label: 'Abuelo', group: 'Familia' },
  { value: 'abuela', label: 'Abuela', group: 'Familia' },
  { value: 'tio', label: 'Tío', group: 'Familia' },
  { value: 'tia', label: 'Tía', group: 'Familia' },
  { value: 'primo', label: 'Primo', group: 'Familia' },
  { value: 'prima', label: 'Prima', group: 'Familia' },
  { value: 'esposo', label: 'Esposo', group: 'Familia' },
  { value: 'esposa', label: 'Esposa', group: 'Familia' },
  { value: 'consorte', label: 'Consorte', group: 'Familia' },
  { value: 'bastardo', label: 'Bastardo/a', group: 'Otros' },
  { value: 'sirviente', label: 'Sirviente leal', group: 'Otros' },
  { value: 'other', label: 'Otro', group: 'Otros' },
];

export function houseMemberRoleLabel(value: string): string {
  return HOUSE_MEMBER_ROLE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export const HOUSE_ROLE_GROUPS = ['Liderazgo', 'Familia', 'Otros'] as const;
