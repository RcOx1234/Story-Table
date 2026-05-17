import type {
  House,
  HouseFamilyPerson,
  HouseFamilyRelation,
  HouseFamilyUnit,
  HouseMember,
} from '@/types';

export const MAIN_TIMELINE_ID = 'main';
export const ALL_TIMELINES_ID = 'all';

function relId() {
  return crypto.randomUUID();
}

function unitId() {
  return crypto.randomUUID();
}

/** Convierte relaciones embebidas en miembros al modelo de grafo. */
export type HouseGenealogyInput = Pick<
  House,
  'members' | 'familyPeople' | 'familyRelations' | 'familyUnits'
> &
  Partial<House>;

export function migrateHouseGenealogy(house: HouseGenealogyInput): HouseGenealogyInput {
  if ((house.familyUnits?.length ?? 0) > 0 || (house.familyRelations?.length ?? 0) > 0) {
    return ensureFamilyPeople(house);
  }

  const members = house.members ?? [];
  const relations: HouseFamilyRelation[] = [];
  const units: HouseFamilyUnit[] = [];
  const childToParents = new Map<string, Set<string>>();

  for (const m of members) {
    const parents = [
      m.fatherId ?? m.parentCharacterId,
      m.motherId,
      ...(m.adoptedParentIds ?? []),
    ].filter((id): id is string => Boolean(id));

    for (const pid of parents) {
      relations.push({
        id: relId(),
        type: (m.adoptedParentIds ?? []).includes(pid) ? 'adoptive_parent_child' : 'parent_child',
        fromCharacterId: pid,
        toCharacterId: m.characterId,
        timelineId: MAIN_TIMELINE_ID,
      });
      const set = childToParents.get(m.characterId) ?? new Set();
      set.add(pid);
      childToParents.set(m.characterId, set);
    }

    for (const sid of m.spouseIds ?? []) {
      relations.push({
        id: relId(),
        type: 'spouse',
        fromCharacterId: m.characterId,
        toCharacterId: sid,
        timelineId: MAIN_TIMELINE_ID,
      });
    }
  }

  const unitByKey = new Map<string, HouseFamilyUnit>();
  for (const [childId, parentSet] of childToParents) {
    const parentIds = [...parentSet].sort();
    const key = parentIds.join('|');
    let unit = unitByKey.get(key);
    if (!unit) {
      unit = {
        id: unitId(),
        parentIds,
        childIds: [],
        relationType: 'biological',
        timelineId: MAIN_TIMELINE_ID,
      };
      unitByKey.set(key, unit);
      units.push(unit);
    }
    if (!unit.childIds.includes(childId)) unit.childIds.push(childId);
  }

  return ensureFamilyPeople({
    ...house,
    familyRelations: relations,
    familyUnits: units,
  });
}

export function ensureFamilyPeople(house: HouseGenealogyInput): HouseGenealogyInput {
  const memberIds = new Set((house.members ?? []).map((m) => m.characterId));
  const peopleMap = new Map<string, HouseFamilyPerson>();

  for (const p of house.familyPeople ?? []) {
    peopleMap.set(p.characterId, p);
  }

  for (const m of house.members ?? []) {
    if (!peopleMap.has(m.characterId)) {
      peopleMap.set(m.characterId, {
        characterId: m.characterId,
        isHouseMember: true,
        connectionType: 'blood',
        branch: m.branch,
      });
    } else {
      const existing = peopleMap.get(m.characterId)!;
      peopleMap.set(m.characterId, { ...existing, isHouseMember: true, branch: m.branch ?? existing.branch });
    }
  }

  for (const r of house.familyRelations ?? []) {
    for (const id of [r.fromCharacterId, r.toCharacterId]) {
      if (!peopleMap.has(id)) {
        const isMember = memberIds.has(id);
        peopleMap.set(id, {
          characterId: id,
          isHouseMember: isMember,
          connectionType: isMember ? 'blood' : r.type === 'spouse' ? 'marriage' : 'external',
        });
      }
    }
  }

  for (const u of house.familyUnits ?? []) {
    for (const id of [...u.parentIds, ...u.childIds]) {
      if (!peopleMap.has(id)) {
        peopleMap.set(id, {
          characterId: id,
          isHouseMember: memberIds.has(id),
          connectionType: memberIds.has(id) ? 'blood' : 'external',
        });
      }
    }
  }

  return {
    ...house,
    familyPeople: [...peopleMap.values()],
    familyRelations: house.familyRelations ?? [],
    familyUnits: house.familyUnits ?? [],
  };
}

export function addOfficialMember(house: HouseGenealogyInput, member: HouseMember): HouseGenealogyInput {
  const members = [...(house.members ?? [])];
  if (!members.some((m) => m.characterId === member.characterId)) {
    members.push(member);
  }
  let next = { ...house, members };
  const people = [...(next.familyPeople ?? [])];
  const idx = people.findIndex((p) => p.characterId === member.characterId);
  const person: HouseFamilyPerson = {
    characterId: member.characterId,
    isHouseMember: true,
    connectionType: 'blood',
    branch: member.branch,
  };
  if (idx >= 0) people[idx] = { ...people[idx], ...person };
  else people.push(person);
  next = { ...next, familyPeople: people };
  return next;
}

export function removeOfficialMember(house: HouseGenealogyInput, characterId: string): HouseGenealogyInput {
  return {
    ...house,
    members: (house.members ?? []).filter((m) => m.characterId !== characterId),
  };
}
