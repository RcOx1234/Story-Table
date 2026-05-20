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

function findChar(
  characters: Character[],
  id: string,
  resolve?: (id: string) => Character | undefined
): Character | undefined {
  return characters.find((c) => c.id === id) ?? resolve?.(id);
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
  characters: Character[],
  resolveCharacter?: (id: string) => Character | undefined
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
    const other = findChar(characters, rel.characterId, resolveCharacter);
    if (!other) continue;
    const slot = relationSlot(rel.type);
    pushSlot(slots, seen, slot, rel, other, true);
  }

  const others = new Map<string, Character>();
  for (const c of characters) others.set(c.id, c);
  if (resolveCharacter) {
    for (const rel of char.relationships) {
      if (!others.has(rel.characterId)) {
        const resolved = resolveCharacter(rel.characterId);
        if (resolved) others.set(resolved.id, resolved);
      }
    }
  }
  for (const other of others.values()) {
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

export type GenealogyIssue = {
  id: string;
  severity: 'error' | 'warning';
  message: string;
  characterId: string;
  characterName: string;
  focusCharacterId: string;
  relatedId?: string;
  relatedName?: string;
  hint?: string;
};

/** Detecta relaciones contradictorias (ej. dos padres distintos). */
export function detectRelationConflicts(char: Character): string[] {
  return collectGenealogyIssues([char], char.id).map((i) => i.message);
}

export function collectGenealogyIssues(
  characters: Character[],
  focusId?: string
): GenealogyIssue[] {
  const issues: GenealogyIssue[] = [];
  const byId = new Map(characters.map((c) => [c.id, c]));
  const list = focusId ? characters.filter((c) => c.id === focusId) : characters;

  for (const char of list) {
    const fathers = getRels(char, (t) => t === 'padre');
    const mothers = getRels(char, (t) => t === 'madre');
    if (fathers.length > 1) {
      issues.push({
        id: `${char.id}-multi-father`,
        severity: 'error',
        message: `${char.name} tiene más de un padre registrado.`,
        hint: 'Elimina el vínculo duplicado en la sección Padre.',
        characterId: char.id,
        characterName: char.name,
        focusCharacterId: char.id,
      });
    }
    if (mothers.length > 1) {
      issues.push({
        id: `${char.id}-multi-mother`,
        severity: 'error',
        message: `${char.name} tiene más de una madre registrada.`,
        hint: 'Elimina el vínculo duplicado en la sección Madre.',
        characterId: char.id,
        characterName: char.name,
        focusCharacterId: char.id,
      });
    }
    const spouses = getRels(char, (t) => SPOUSE_TYPES.test(t));
    if (spouses.length > 3) {
      issues.push({
        id: `${char.id}-many-spouses`,
        severity: 'warning',
        message: `${char.name} tiene muchas parejas registradas.`,
        hint: 'Revisa duplicados en la sección Pareja.',
        characterId: char.id,
        characterName: char.name,
        focusCharacterId: char.id,
      });
    }

    for (const rel of char.relationships) {
      const other = byId.get(rel.characterId);
      if (!other) {
        issues.push({
          id: `${char.id}-missing-${rel.characterId}`,
          severity: 'warning',
          message: `Vínculo con «${rel.characterName}» apunta a un personaje que no está en este mundo.`,
          hint: 'El personaje pudo haberse eliminado o pertenece a otro mundo.',
          characterId: char.id,
          characterName: char.name,
          focusCharacterId: char.id,
          relatedId: rel.characterId,
          relatedName: rel.characterName,
        });
        continue;
      }
      const inv = other.relationships.find(
        (r) => r.characterId === char.id && relType(r.type) === relType(rel.type)
      );
      if (!inv && !PARENT_TYPES.test(relType(rel.type)) && !CHILD_TYPES.test(relType(rel.type))) {
        issues.push({
          id: `${char.id}-no-inverse-${other.id}-${rel.type}`,
          severity: 'warning',
          message: `«${other.name}» no devuelve el vínculo con ${char.name} (${rel.type}).`,
          hint: 'Vuelve a añadir la relación o guarda desde el editor de relaciones.',
          characterId: char.id,
          characterName: char.name,
          focusCharacterId: char.id,
          relatedId: other.id,
          relatedName: other.name,
        });
      }
    }

    for (const cid of getChildIds(char, characters)) {
      const child = byId.get(cid);
      if (!child) continue;
      const hasParentLink = getRels(child, (t) => PARENT_TYPES.test(t)).some((r) => r.characterId === char.id);
      const hasChildLink = getRels(char, (t) => CHILD_TYPES.test(t)).some((r) => r.characterId === cid);
      if (!hasParentLink && !hasChildLink) {
        issues.push({
          id: `${char.id}-child-desync-${cid}`,
          severity: 'warning',
          message: `El vínculo con el hijo/a «${child.name}» puede estar incompleto.`,
          hint: 'Añade de nuevo al hijo desde la sección Hijos.',
          characterId: char.id,
          characterName: char.name,
          focusCharacterId: char.id,
          relatedId: child.id,
          relatedName: child.name,
        });
      }
    }
  }

  return issues;
}
