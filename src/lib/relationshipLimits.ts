import { normalizeGender } from '@/lib/characterGender';
import { normalizeKey } from '@/lib/normalizeLabels';
import type { Character, Relationship } from '@/types';

const PARENT_TYPES = /^(padre|madre)$/;
const CHILD_TYPES = /^(hij[oa])$/;

function findParentRel(char: Character, role: 'padre' | 'madre'): Relationship | undefined {
  return char.relationships.find((r) => normalizeKey(r.type) === role);
}

export function validateRelationshipAdd(
  source: Character,
  target: Character,
  type: string,
  inverseType?: string
): string | null {
  const t = normalizeKey(type);
  const inv = inverseType ? normalizeKey(inverseType) : '';

  if (PARENT_TYPES.test(t) && source.id === target.id) {
    return 'Un personaje no puede ser su propio progenitor.';
  }

  /** Hijo/a en el progenitor → el inverso padre/madre queda en el hijo (target). */
  if (CHILD_TYPES.test(t) && (inv === 'padre' || inv === 'madre')) {
    const role = inv as 'padre' | 'madre';
    const existing = findParentRel(target, role);
    if (existing && existing.characterId !== source.id) {
      return role === 'padre'
        ? 'Este personaje ya tiene un padre registrado.'
        : 'Este personaje ya tiene una madre registrada.';
    }
    const parentGender = normalizeGender(source.gender);
    if (role === 'padre' && parentGender === 'female') {
      return 'Una mujer no puede registrarse como padre. Usa «madre» o revisa el género en la ficha.';
    }
    if (role === 'madre' && parentGender === 'male') {
      return 'Un hombre no puede registrarse como madre. Usa «padre» o revisa el género en la ficha.';
    }
    if (parentGender === 'unspecified') {
      return 'Define el género del progenitor (Hombre/Mujer) en su ficha antes de añadir el vínculo.';
    }
    return null;
  }

  /** Padre/madre en el hijo → el progenitor es target. */
  if (t === 'padre' || t === 'madre') {
    const role = t as 'padre' | 'madre';
    const existing = findParentRel(source, role);
    if (existing && existing.characterId !== target.id) {
      return role === 'padre'
        ? 'Este personaje ya tiene un padre registrado.'
        : 'Este personaje ya tiene una madre registrada.';
    }
    const parentGender = normalizeGender(target.gender);
    if (role === 'padre' && parentGender === 'female') {
      return 'Una mujer no puede registrarse como padre. Usa «madre» o revisa el género en la ficha.';
    }
    if (role === 'madre' && parentGender === 'male') {
      return 'Un hombre no puede registrarse como madre. Usa «padre» o revisa el género en la ficha.';
    }
    if (parentGender === 'unspecified') {
      return 'Define el género del progenitor (Hombre/Mujer) en su ficha antes de añadir el vínculo.';
    }
    return null;
  }

  return null;
}
