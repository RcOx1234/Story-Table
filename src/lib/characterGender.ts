import type { Character } from '@/types';

export type CharacterGender = 'male' | 'female' | 'unspecified';

export const GENDER_OPTIONS: { value: CharacterGender; label: string }[] = [
  { value: 'male', label: 'Hombre' },
  { value: 'female', label: 'Mujer' },
  { value: 'unspecified', label: 'Sin definir' },
];

export function normalizeGender(g?: CharacterGender | string): CharacterGender {
  if (g === 'male' || g === 'female') return g;
  const raw = String(g ?? '')
    .trim()
    .toLowerCase();
  if (raw === 'm' || raw === 'hombre' || raw === 'masculino' || raw === 'male' || raw === 'man') return 'male';
  if (raw === 'f' || raw === 'mujer' || raw === 'femenino' || raw === 'female' || raw === 'woman') return 'female';
  return 'unspecified';
}

export function genderLabel(g?: CharacterGender | string): string {
  return GENDER_OPTIONS.find((o) => o.value === normalizeGender(g))?.label ?? 'Sin definir';
}

export function childRelationType(g?: CharacterGender | string): 'hijo' | 'hija' {
  const ng = normalizeGender(g);
  if (ng === 'female') return 'hija';
  if (ng === 'male') return 'hijo';
  return 'hijo';
}

export function parentRelationType(isMother: boolean): 'padre' | 'madre' {
  return isMother ? 'madre' : 'padre';
}

/** Tipo de relación hacia la pareja (esposa = mujer, esposo = hombre). */
export function siblingRelationTypeFor(gender?: CharacterGender | string): 'hermano' | 'hermana' {
  if (normalizeGender(gender) === 'female') return 'hermana';
  return 'hermano';
}

export function spouseRelationTypeFor(rootGender: CharacterGender, partnerGender?: CharacterGender): string {
  const partner = normalizeGender(partnerGender);
  if (partner === 'female') return 'esposa';
  if (partner === 'male') return 'esposo';
  const root = normalizeGender(rootGender);
  if (root === 'male') return 'esposa';
  if (root === 'female') return 'esposo';
  return 'pareja';
}

export function filterCharactersByGender(characters: Character[], filter?: CharacterGender): Character[] {
  if (!filter) return characters;
  return characters.filter((c) => normalizeGender(c.gender) === filter);
}

export function genderSublabel(c: Character): string | undefined {
  const g = genderLabel(c.gender);
  if (c.house) return `${g} · ${c.house}`;
  return g;
}
