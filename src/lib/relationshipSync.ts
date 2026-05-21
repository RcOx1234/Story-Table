import type { Character, Relationship } from '@/types';
import { normalizeKey } from '@/lib/normalizeLabels';
import {
  childRelationType,
  normalizeGender,
  parentRelationType,
  siblingRelationTypeFor,
  spouseRelationTypeFor,
} from '@/lib/characterGender';
import { encodeRelationshipDescription } from '@/lib/relationshipMeta';
import { validateRelationshipAdd } from '@/lib/relationshipLimits';

/** Relación inversa aproximada (género neutro cuando aplica). */
const INVERSE_MAP: Record<string, string> = {
  padre: 'hijo',
  madre: 'hija',
  hijo: 'padre',
  hija: 'madre',
  hermano: 'hermano',
  hermana: 'hermana',
  abuelo: 'nieto',
  abuela: 'nieta',
  nieto: 'abuelo',
  nieta: 'abuela',
  tío: 'sobrino',
  tio: 'sobrino',
  tia: 'sobrina',
  tía: 'sobrina',
  sobrino: 'tío',
  sobrina: 'tía',
  primo: 'primo',
  prima: 'prima',
  esposo: 'esposa',
  esposa: 'esposo',
  marido: 'esposa',
  mujer: 'esposo',
  consorte: 'consorte',
  pareja: 'pareja',
  amigo: 'amigo',
  amiga: 'amiga',
  mentor: 'alumno',
  alumno: 'mentor',
  aliado: 'aliado',
  enemigo: 'enemigo',
  rival: 'rival',
  traidor: 'traidor',
};

const CHILD_TYPES = /^(hij[oa])$/;
const PARENT_TYPES = /^(padre|madre)$/;
const SPOUSE_TYPES = /^(espos[oa]|consorte|pareja|marido|mujer)$/;

function removeSpouseLinksTo(rels: Relationship[], characterId: string): Relationship[] {
  return rels.filter((r) => {
    if (r.characterId !== characterId) return true;
    return !SPOUSE_TYPES.test(normalizeKey(r.type));
  });
}

export function inverseRelationshipType(type: string): string {
  const key = normalizeKey(type);
  return INVERSE_MAP[key] ?? type;
}

/** Tipo inverso esperado en el otro personaje (respeta género en pareja/hermanos/hijos). */
export function expectedInverseType(
  fromType: string,
  fromChar: Character,
  toChar: Character
): string {
  const key = normalizeKey(fromType);
  if (SPOUSE_TYPES.test(key)) {
    return spouseRelationTypeFor(normalizeGender(toChar.gender), fromChar.gender);
  }
  if (/^herman[oa]$/.test(key)) {
    return siblingRelationTypeFor(fromChar.gender);
  }
  if (CHILD_TYPES.test(key)) {
    return parentRelationType(normalizeGender(fromChar.gender) === 'female');
  }
  if (PARENT_TYPES.test(key)) {
    return childRelationType(toChar.gender);
  }
  return inverseRelationshipType(fromType);
}

/** Comprueba si dos tipos son vínculo recíproco válido (no exige el mismo string). */
export function areRelationshipTypesReciprocal(typeA: string, typeB: string): boolean {
  const a = normalizeKey(typeA);
  const b = normalizeKey(typeB);
  if (a === b && (/^herman[oa]$/.test(a) || a === 'pareja' || a === 'consorte')) return true;
  if (PARENT_TYPES.test(a) && CHILD_TYPES.test(b)) return true;
  if (CHILD_TYPES.test(a) && PARENT_TYPES.test(b)) return true;
  if (SPOUSE_TYPES.test(a) && SPOUSE_TYPES.test(b)) return true;
  return normalizeKey(inverseRelationshipType(typeA)) === b || normalizeKey(inverseRelationshipType(typeB)) === a;
}

function hasReciprocalLink(char: Character, otherId: string, relType: string): boolean {
  return char.relationships.some(
    (r) => r.characterId === otherId && areRelationshipTypesReciprocal(relType, r.type)
  );
}

/**
 * Repara vínculos faltantes o incompatibles (p. ej. esposo/esposa) en un conjunto de personajes.
 */
export function repairCharacterRelationships(characters: Character[]): Map<string, Partial<Character>> {
  const updates = new Map<string, Partial<Character>>();
  const byId = new Map(characters.map((c) => [c.id, c]));

  const merged = (): Character[] =>
    characters.map((c) => {
      const p = updates.get(c.id);
      return p?.relationships ? ({ ...c, relationships: p.relationships } as Character) : c;
    });

  for (const char of characters) {
    for (const rel of char.relationships) {
      const other = byId.get(rel.characterId);
      if (!other) continue;
      const currentOther = merged().find((c) => c.id === other.id) ?? other;
      if (hasReciprocalLink(currentOther, char.id, rel.type)) continue;

      const inverse = expectedInverseType(rel.type, char, other);
      const batch = syncRelationshipChange(merged(), char.id, {
        characterId: other.id,
        characterName: other.name,
        type: rel.type,
        description: rel.description ?? '',
        inverseType: inverse,
        action: 'add',
      });
      mergeUpdates(updates, batch);
    }
  }

  return updates;
}

function upsertRel(rels: Relationship[], rel: Relationship): Relationship[] {
  const t = normalizeKey(rel.type);
  let next = [...rels];
  if (CHILD_TYPES.test(t)) {
    next = next.filter(
      (r) => r.characterId !== rel.characterId || !CHILD_TYPES.test(normalizeKey(r.type))
    );
  }
  if (PARENT_TYPES.test(t)) {
    next = next.filter(
      (r) => r.characterId !== rel.characterId || !PARENT_TYPES.test(normalizeKey(r.type))
    );
  }
  const idx = next.findIndex((r) => r.characterId === rel.characterId && normalizeKey(r.type) === t);
  if (idx >= 0) {
    next = [...next];
    next[idx] = { ...next[idx], ...rel, characterName: rel.characterName };
    return next;
  }
  return [...next, rel];
}

function removeRel(rels: Relationship[], characterId: string, type?: string): Relationship[] {
  return rels.filter((r) => {
    if (r.characterId !== characterId) return true;
    if (!type) return false;
    return normalizeKey(r.type) !== normalizeKey(type);
  });
}

function mergeUpdates(
  target: Map<string, Partial<Character>>,
  batch: Map<string, Partial<Character>>
): void {
  batch.forEach((v, k) => {
    const prev = target.get(k);
    target.set(k, prev ? { ...prev, ...v } : v);
  });
}

function applyPatchToMap(
  updates: Map<string, Partial<Character>>,
  charId: string,
  rels: Relationship[]
): void {
  updates.set(charId, {
    relationships: rels,
    updatedAt: new Date().toISOString(),
  });
}

export type RelationshipPatch = {
  characterId: string;
  characterName: string;
  type: string;
  description?: string;
  action: 'add' | 'remove' | 'update';
  previousType?: string;
  /** Tipo inverso explícito (p. ej. madre en vez de padre al añadir hijo). */
  inverseType?: string;
};

/**
 * Aplica cambio de relación en un personaje y devuelve actualizaciones para todos los afectados.
 */
export function syncRelationshipChange(
  characters: Character[],
  sourceId: string,
  patch: RelationshipPatch
): Map<string, Partial<Character>> {
  const updates = new Map<string, Partial<Character>>();
  const source = characters.find((c) => c.id === sourceId);
  const target = characters.find((c) => c.id === patch.characterId);
  if (!source || !target) return updates;

  let sourceRels = [...(updates.get(sourceId)?.relationships ?? source.relationships)];
  let targetRels = [...(updates.get(target.id)?.relationships ?? target.relationships)];

  if (patch.action === 'add') {
    const err = validateRelationshipAdd(source, target, patch.type, patch.inverseType);
    if (err) return updates;
    if (patch.inverseType) {
      const errTarget = validateRelationshipAdd(target, source, patch.inverseType, patch.type);
      if (errTarget) return updates;
    }
  }

  if (patch.action === 'remove') {
    if (SPOUSE_TYPES.test(normalizeKey(patch.type))) {
      sourceRels = removeSpouseLinksTo(sourceRels, patch.characterId);
      targetRels = removeSpouseLinksTo(targetRels, sourceId);
    } else {
      sourceRels = removeRel(sourceRels, patch.characterId, patch.type);
      const inv = patch.inverseType ?? inverseRelationshipType(patch.type);
      targetRels = removeRel(targetRels, sourceId, inv);
    }

    applyPatchToMap(updates, sourceId, sourceRels);
    applyPatchToMap(updates, target.id, targetRels);
    return updates;
  }

  let inverse = patch.inverseType ?? inverseRelationshipType(patch.type);
  const typeKey = normalizeKey(patch.type);
  if (/^herman[oa]$/.test(typeKey)) {
    inverse = siblingRelationTypeFor(source.gender);
  }
  const isSpouse = SPOUSE_TYPES.test(typeKey);

  if (patch.action === 'update' && patch.previousType) {
    sourceRels = removeRel(sourceRels, patch.characterId, patch.previousType);
    targetRels = removeRel(
      targetRels,
      sourceId,
      patch.inverseType ?? inverseRelationshipType(patch.previousType)
    );
  }

  if (isSpouse) {
    sourceRels = removeSpouseLinksTo(sourceRels, patch.characterId);
    targetRels = removeSpouseLinksTo(targetRels, sourceId);
  }

  sourceRels = upsertRel(sourceRels, {
    characterId: target.id,
    characterName: target.name,
    type: patch.type,
    description: patch.description ?? '',
  });

  targetRels = upsertRel(targetRels, {
    characterId: source.id,
    characterName: source.name,
    type: inverse,
    description: patch.description ?? '',
  });

  applyPatchToMap(updates, sourceId, sourceRels);
  applyPatchToMap(updates, target.id, targetRels);
  return updates;
}

export type AddChildOptions = {
  /** Si el progenitor actual es la madre (si no, padre). */
  isMother: boolean;
  coParentId?: string;
  birthOrder?: number;
};

/**
 * Añade vínculo hijo/a con sincronización bidireccional y co-progenitor opcional.
 */
export function addChildRelationship(
  characters: Character[],
  parentId: string,
  childId: string,
  options: AddChildOptions
): Map<string, Partial<Character>> {
  const updates = new Map<string, Partial<Character>>();
  const parent = characters.find((c) => c.id === parentId);
  const child = characters.find((c) => c.id === childId);
  if (!parent || !child || parentId === childId) return updates;

  const childType = childRelationType(child.gender);
  const parentLinkType = parentRelationType(options.isMother);
  const description = encodeRelationshipDescription({
    birthOrder: options.birthOrder,
    coParentId: options.coParentId,
  });

  mergeUpdates(
    updates,
    syncRelationshipChange(characters, parentId, {
      characterId: childId,
      characterName: child.name,
      type: childType,
      description,
      inverseType: parentLinkType,
      action: 'add',
    })
  );

  if (options.coParentId) {
    const coParent = characters.find((c) => c.id === options.coParentId);
    if (coParent) {
      const coIsMother = !options.isMother;
      const mergedChars = characters.map((c) => {
        const p = updates.get(c.id);
        return p?.relationships ? ({ ...c, relationships: p.relationships } as Character) : c;
      });
      mergeUpdates(
        updates,
        syncRelationshipChange(mergedChars, options.coParentId, {
          characterId: childId,
          characterName: child.name,
          type: childType,
          description,
          inverseType: parentRelationType(coIsMother),
          action: 'add',
        })
      );
    }
  }

  return updates;
}

/** Quitar relación bidireccional sin borrar personajes. */
export function removeBidirectionalRelation(
  characters: Character[],
  sourceId: string,
  targetId: string,
  type: string,
  targetName = '',
  inverseType?: string
): Map<string, Partial<Character>> {
  return syncRelationshipChange(characters, sourceId, {
    characterId: targetId,
    characterName: targetName,
    type,
    inverseType,
    action: 'remove',
  });
}

/** Sincroniza todas las relaciones de un personaje tras guardar el formulario completo. */
export function syncAllRelationshipsFromCharacter(
  characters: Character[],
  updated: Character
): Map<string, Partial<Character>> {
  const updates = new Map<string, Partial<Character>>();
  const prev = characters.find((c) => c.id === updated.id);
  if (!prev) return updates;

  const prevIds = new Set(prev.relationships.map((r) => `${r.characterId}|${normalizeKey(r.type)}`));
  const nextIds = new Set(updated.relationships.map((r) => `${r.characterId}|${normalizeKey(r.type)}`));

  for (const rel of prev.relationships) {
    const key = `${rel.characterId}|${normalizeKey(rel.type)}`;
    if (!nextIds.has(key)) {
      const batch = syncRelationshipChange(characters, updated.id, {
        characterId: rel.characterId,
        characterName: rel.characterName,
        type: rel.type,
        action: 'remove',
      });
      mergeUpdates(updates, batch);
    }
  }

  for (const rel of updated.relationships) {
    const key = `${rel.characterId}|${normalizeKey(rel.type)}`;
    if (!prevIds.has(key)) {
      const batch = syncRelationshipChange(characters, updated.id, {
        characterId: rel.characterId,
        characterName: rel.characterName,
        type: rel.type,
        description: rel.description,
        action: 'add',
      });
      mergeUpdates(updates, batch);
    }
  }

  updates.set(updated.id, {
    ...updated,
    updatedAt: new Date().toISOString(),
  });

  return updates;
}

export const updateBidirectionalRelation = syncRelationshipChange;
export const syncCharacterRelations = syncAllRelationshipsFromCharacter;

export function isChildRelationType(type: string): boolean {
  return CHILD_TYPES.test(normalizeKey(type));
}

export function isParentRelationType(type: string): boolean {
  return PARENT_TYPES.test(normalizeKey(type));
}
