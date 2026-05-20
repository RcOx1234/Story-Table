import { normalizeGender } from '@/lib/characterGender';
import { normalizeKey } from '@/lib/normalizeLabels';
import type { Character, Relationship } from '@/types';

const PARENT_TYPES = /^(padre|madre)$/;

function countType(rels: Relationship[], type: string): number {
  const k = normalizeKey(type);
  return rels.filter((r) => normalizeKey(r.type) === k).length;
}

export function validateRelationshipAdd(
  source: Character,
  target: Character,
  type: string,
  inverseType?: string
): string | null {
  const t = normalizeKey(type);
  const inv = inverseType ? normalizeKey(inverseType) : '';

  if (t === 'padre' || inv === 'padre') {
    if (countType(source.relationships, 'padre') >= 1) {
      return 'Este personaje ya tiene un padre registrado.';
    }
    if (normalizeGender(target.gender) === 'female') {
      return 'Una mujer no puede registrarse como padre. Usa «madre».';
    }
  }

  if (t === 'madre' || inv === 'madre') {
    if (countType(source.relationships, 'madre') >= 1) {
      return 'Este personaje ya tiene una madre registrada.';
    }
    if (normalizeGender(target.gender) === 'male') {
      return 'Un hombre no puede registrarse como madre. Usa «padre».';
    }
  }

  if (PARENT_TYPES.test(t) && source.id === target.id) {
    return 'Un personaje no puede ser su propio progenitor.';
  }

  return null;
}
