import { normalizeKey } from '@/lib/normalizeLabels';
import { getBirthOrder } from '@/lib/relationshipMeta';
import { normalizeGender, spouseRelationTypeFor } from '@/lib/characterGender';
import type { Character, Relationship } from '@/types';

export type GenealogyUnit = {
  id: string;
  partners: Character[];
  children: GenealogyUnit[];
};

const PARENT_TYPES = /^(padre|madre)$/;
const CHILD_TYPES = /^(hij[oa])$/;
const SPOUSE_TYPES = /^(espos[oa]|consorte|pareja|marido|mujer)$/;

function relType(type: string): string {
  return normalizeKey(type);
}

function findChar(characters: Character[], id: string): Character | undefined {
  return characters.find((c) => c.id === id);
}

function getRels(char: Character, predicate: (t: string) => boolean): Relationship[] {
  return char.relationships.filter((r) => predicate(relType(r.type)));
}

export function getSpouseIds(char: Character): string[] {
  return getRels(char, (t) => SPOUSE_TYPES.test(t)).map((r) => r.characterId);
}

export function getChildIds(char: Character, characters: Character[]): string[] {
  const ids = new Set<string>();
  for (const rel of getRels(char, (t) => CHILD_TYPES.test(t))) {
    ids.add(rel.characterId);
  }
  for (const other of characters) {
    if (other.id === char.id) continue;
    const listsParent = getRels(other, (t) => PARENT_TYPES.test(t)).some((r) => r.characterId === char.id);
    if (listsParent) ids.add(other.id);
  }
  return [...ids];
}

/** Hijos compartidos de una unión (varios progenitores en la misma fila). */
export function getUnionChildIds(partnerIds: string[], characters: Character[]): string[] {
  const ids = new Set<string>();
  for (const pid of partnerIds) {
    const p = findChar(characters, pid);
    if (!p) continue;
    for (const cid of getChildIds(p, characters)) ids.add(cid);
  }
  return [...ids];
}

/** Ordena hijos por meta `order` en la relación del progenitor (1 = mayor). */
export function sortChildIdsByBirthOrder(
  childIds: string[],
  parentIds: string[],
  characters: Character[]
): string[] {
  const orderOf = (childId: string): number => {
    let best = 999;
    for (const pid of parentIds) {
      const parent = findChar(characters, pid);
      if (!parent) continue;
      const rel = parent.relationships.find(
        (r) => r.characterId === childId && CHILD_TYPES.test(relType(r.type))
      );
      if (rel) best = Math.min(best, getBirthOrder(rel.description));
    }
    return best;
  };
  return [...childIds].sort((a, b) => orderOf(a) - orderOf(b) || a.localeCompare(b));
}

function resolvePartners(characters: Character[], personId: string, placed: Set<string>): Character[] {
  const person = findChar(characters, personId);
  if (!person) return [];
  const partners = [person];
  for (const sid of getSpouseIds(person)) {
    if (placed.has(sid)) continue;
    const sp = findChar(characters, sid);
    if (sp) partners.push(sp);
  }
  return partners;
}

/**
 * Árbol genealógico canónico: parejas en la misma fila, hijos debajo.
 * Cada personaje aparece una sola vez en el árbol visible.
 */
export function buildGenealogyTree(
  characters: Character[],
  rootId: string,
  placed = new Set<string>()
): GenealogyUnit | null {
  if (!rootId || placed.has(rootId)) return null;
  const person = findChar(characters, rootId);
  if (!person) return null;

  const partners = resolvePartners(characters, rootId, placed);
  const partnerIds = partners.map((p) => p.id);
  for (const p of partners) placed.add(p.id);

  const childIds = sortChildIdsByBirthOrder(
    getUnionChildIds(partnerIds, characters).filter((id) => !placed.has(id)),
    partnerIds,
    characters
  );
  const children: GenealogyUnit[] = [];
  for (const cid of childIds) {
    const unit = buildGenealogyTree(characters, cid, placed);
    if (unit) children.push(unit);
  }

  return {
    id: rootId,
    partners,
    children,
  };
}

const SIBLING_TYPES = /^herman[oa]$/;

/** Personajes que pertenecen al árbol de una casa (miembros + familia conectada). */
export function getHouseGenealogyCharacters(
  memberIds: string[],
  allCharacters: Character[]
): Character[] {
  const relevant = new Set(memberIds.filter(Boolean));
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...relevant]) {
      const c = findChar(allCharacters, id);
      if (!c) continue;
      for (const r of c.relationships) {
        const t = relType(r.type);
        const isFamily =
          PARENT_TYPES.test(t) ||
          CHILD_TYPES.test(t) ||
          SPOUSE_TYPES.test(t) ||
          SIBLING_TYPES.test(t) ||
          /^(abuel|t[ií]o|primo|sobrin|niet)/.test(t);
        if (isFamily && !relevant.has(r.characterId)) {
          relevant.add(r.characterId);
          changed = true;
        }
      }
    }
  }
  return allCharacters.filter((c) => relevant.has(c.id));
}

/** Raíz: preferida, o la de más descendientes y menos ancestros registrados. */
export function pickGenealogyRoot(characters: Character[], preferredId?: string): string | null {
  if (preferredId && characters.some((c) => c.id === preferredId)) return preferredId;
  const scores = characters.map((c) => {
    const parents = getRels(c, (t) => PARENT_TYPES.test(t)).length;
    const children = getChildIds(c, characters).length;
    return { id: c.id, score: children * 3 - parents };
  });
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.id ?? characters[0]?.id ?? null;
}

export type RelationSlot =
  | 'father'
  | 'mother'
  | 'spouse'
  | 'child'
  | 'sibling'
  | 'extended';

export function relationSlot(type: string): RelationSlot {
  const t = relType(type);
  if (t === 'padre') return 'father';
  if (t === 'madre') return 'mother';
  if (SPOUSE_TYPES.test(t)) return 'spouse';
  if (CHILD_TYPES.test(t)) return 'child';
  if (/^herman[oa]$/.test(t)) return 'sibling';
  return 'extended';
}

function slotSeenKey(slot: RelationSlot, otherId: string, type: string): string {
  if (slot === 'spouse' || slot === 'sibling') return `${slot}:${otherId}`;
  return `${slot}:${otherId}|${relType(type)}`;
}

function pushSlot(
  slots: Record<RelationSlot, { rel: Relationship; character: Character }[]>,
  seen: Set<string>,
  slot: RelationSlot,
  rel: Relationship,
  other: Character,
  prefer = false
) {
  const key = slotSeenKey(slot, other.id, rel.type);
  const list = slots[slot];
  const existingIdx = list.findIndex((e) => e.character.id === other.id);

  if (seen.has(key)) {
    if (prefer && existingIdx >= 0) list[existingIdx] = { rel, character: other };
    return;
  }

  if (existingIdx >= 0 && (slot === 'spouse' || slot === 'sibling')) {
    if (prefer) list[existingIdx] = { rel, character: other };
    return;
  }

  seen.add(key);
  list.push({ rel, character: other });
}

export function getCharacterRelationsBySlot(
  char: Character,
  characters: Character[]
): Record<RelationSlot, { rel: Relationship; character: Character }[]> {
  const slots: Record<RelationSlot, { rel: Relationship; character: Character }[]> = {
    father: [],
    mother: [],
    spouse: [],
    child: [],
    sibling: [],
    extended: [],
  };
  const seen = new Set<string>();

  for (const rel of char.relationships) {
    const other = findChar(characters, rel.characterId);
    if (!other) continue;
    const slot = relationSlot(rel.type);
    pushSlot(slots, seen, slot, rel, other, true);
  }

  for (const other of characters) {
    if (other.id === char.id) continue;
    for (const rel of other.relationships) {
      if (rel.characterId !== char.id) continue;
      const t = relType(rel.type);

      if (PARENT_TYPES.test(t)) {
        const childType = t === 'madre' ? 'hija' : 'hijo';
        pushSlot(slots, seen, 'child', {
          characterId: other.id,
          characterName: other.name,
          type: childType,
          description: rel.description,
        }, other);
        continue;
      }

      if (CHILD_TYPES.test(t)) {
        const parentType = t === 'hija' ? 'madre' : 'padre';
        const slot = parentType === 'madre' ? 'mother' : 'father';
        pushSlot(slots, seen, slot, {
          characterId: other.id,
          characterName: other.name,
          type: parentType,
          description: rel.description,
        }, other);
        continue;
      }

      if (SPOUSE_TYPES.test(t)) {
        pushSlot(slots, seen, 'spouse', {
          characterId: other.id,
          characterName: other.name,
          type: rel.type,
          description: rel.description,
        }, other);
        continue;
      }

      if (SIBLING_TYPES.test(t)) {
        pushSlot(slots, seen, 'sibling', {
          characterId: other.id,
          characterName: other.name,
          type: rel.type,
          description: rel.description,
        }, other);
      }
    }
  }

  slots.spouse = slots.spouse.map((entry) => {
    const canonical = spouseRelationTypeFor(
      normalizeGender(char.gender),
      normalizeGender(entry.character.gender)
    );
    return {
      ...entry,
      rel: { ...entry.rel, type: canonical },
    };
  });

  return slots;
}

/** Detecta relaciones contradictorias (ej. dos padres distintos). */
export function detectRelationConflicts(char: Character): string[] {
  const warnings: string[] = [];
  const fathers = getRels(char, (t) => t === 'padre');
  const mothers = getRels(char, (t) => t === 'madre');
  if (fathers.length > 1) warnings.push('Hay más de un padre registrado.');
  if (mothers.length > 1) warnings.push('Hay más de una madre registrada.');
  const spouses = getRels(char, (t) => SPOUSE_TYPES.test(t));
  if (spouses.length > 3) warnings.push('Muchas parejas registradas; revisa duplicados.');
  return warnings;
}
