import type { HouseMemberRole } from '@/types';

export const HOUSE_MEMBER_ROLE_OPTIONS: { value: HouseMemberRole; label: string }[] = [
  { value: 'head', label: 'Cabeza de casa' },
  { value: 'heir', label: 'Heredero/a' },
  { value: 'consort', label: 'Consorte' },
  { value: 'blood', label: 'Sangre familiar' },
  { value: 'adopted', label: 'Adoptado/a' },
  { value: 'bastard', label: 'Bastardo/a' },
  { value: 'servant', label: 'Sirviente' },
  { value: 'guard', label: 'Guardia' },
  { value: 'ally', label: 'Aliado/a' },
  { value: 'other', label: 'Otro' },
];

const ROLE_SORT: Record<string, number> = {
  head: 0,
  heir: 1,
  consort: 2,
  blood: 3,
  adopted: 4,
  bastard: 5,
  servant: 6,
  guard: 7,
  ally: 8,
  other: 9,
};

export function houseMemberRoleLabel(value: string): string {
  return HOUSE_MEMBER_ROLE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function houseMemberRoleSort(value: string): number {
  return ROLE_SORT[value] ?? 99;
}
