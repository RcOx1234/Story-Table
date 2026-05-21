import type { Character } from '@/types';
import { siblingRelationTypeFor } from '@/lib/characterGender';
import { relationshipTypeLabel } from '@/lib/relationshipTypes';
import { normalizeKey } from '@/lib/normalizeLabels';

/** Etiqueta visible de la relación hacia `character` (corrige hermano/hermana según sexo). */
export function relationshipDisplayLabel(relationType: string, character: Character): string {
  const key = normalizeKey(relationType);
  if (/^herman[oa]$/.test(key)) {
    return relationshipTypeLabel(siblingRelationTypeFor(character.gender));
  }
  return relationshipTypeLabel(relationType);
}
