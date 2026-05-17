import type { Character, HouseFamilyPerson, HouseFamilyRelation, HouseFamilyUnit } from '@/types';
import type { HouseGenealogyInput } from '@/lib/houseGenealogyMigrate';
import { migrateHouseGenealogy, MAIN_TIMELINE_ID, ALL_TIMELINES_ID } from '@/lib/houseGenealogyMigrate';
import { houseMemberRoleLabel } from '@/lib/houseMemberRoles';

export interface FamilyGraphNode {
  characterId: string;
  character: Character;
  person: HouseFamilyPerson;
  label: string;
  isExternal: boolean;
  isAlternate: boolean;
}

export interface RenderFamilyUnit {
  id: string;
  parentNodes: FamilyGraphNode[];
  childNodes: FamilyGraphNode[];
  relationType: HouseFamilyUnit['relationType'];
  timelineId?: string | null;
  label?: string;
  isAlternate: boolean;
}

export interface FamilyGraphConflict {
  message: string;
  characterIds: string[];
}

export interface HouseFamilyGraph {
  roots: FamilyGraphNode[];
  units: RenderFamilyUnit[];
  disconnected: FamilyGraphNode[];
  conflicts: FamilyGraphConflict[];
}

function timelineVisible(
  timelineId: string | null | undefined,
  timelineIds: string[] | undefined,
  selected: string
): boolean {
  if (selected === ALL_TIMELINES_ID) return true;
  const tid = timelineId ?? MAIN_TIMELINE_ID;
  if (tid === selected) return true;
  return (timelineIds ?? []).includes(selected);
}

function filterRelations(relations: HouseFamilyRelation[], selected: string) {
  return relations.filter((r) => timelineVisible(r.timelineId, r.timelineIds, selected));
}

function filterUnits(units: HouseFamilyUnit[], selected: string) {
  return units.filter((u) => timelineVisible(u.timelineId, u.timelineIds, selected));
}

function buildNode(
  characterId: string,
  charMap: Map<string, Character>,
  peopleMap: Map<string, HouseFamilyPerson>,
  memberRoleById: Map<string, string>,
  selectedTimeline: string
): FamilyGraphNode | null {
  const character = charMap.get(characterId);
  if (!character) return null;
  const person = peopleMap.get(characterId) ?? {
    characterId,
    isHouseMember: false,
    connectionType: 'unknown' as const,
  };
  const isAlternate =
    selectedTimeline !== ALL_TIMELINES_ID &&
    person.connectionType === 'alternate_timeline';
  let label = person.displayLabel ?? '';
  if (!label) {
    if (!person.isHouseMember) {
      if (person.connectionType === 'marriage') label = 'Consorte externo';
      else if (person.connectionType === 'external') label = 'Persona externa';
      else if (person.connectionType === 'alternate_timeline') label = 'Línea alternativa';
      else label = 'En el árbol';
    } else {
      label = houseMemberRoleLabel(memberRoleById.get(characterId) ?? 'blood');
    }
  }
  if (person.externalHouseName) label = `${label} · ${person.externalHouseName}`;

  return {
    characterId,
    character,
    person,
    label,
    isExternal: !person.isHouseMember,
    isAlternate,
  };
}

export function buildHouseFamilyGraph({
  house,
  characters,
  selectedTimelineId = MAIN_TIMELINE_ID,
}: {
  house: HouseGenealogyInput;
  characters: Character[];
  selectedTimelineId?: string;
}): HouseFamilyGraph {
  const migrated = migrateHouseGenealogy(house);
  const charMap = new Map(characters.map((c) => [c.id, c]));
  const peopleMap = new Map((migrated.familyPeople ?? []).map((p) => [p.characterId, p]));
  const memberRoleById = new Map((migrated.members ?? []).map((m) => [m.characterId, m.role]));
  const relations = filterRelations(migrated.familyRelations ?? [], selectedTimelineId);
  const units = filterUnits(migrated.familyUnits ?? [], selectedTimelineId);

  const childIdsFromUnits = new Set<string>();
  const parentIdsInUnits = new Set<string>();
  for (const u of units) {
    for (const c of u.childIds) childIdsFromUnits.add(c);
    for (const p of u.parentIds) parentIdsInUnits.add(p);
  }

  const spousePairs = new Map<string, Set<string>>();
  for (const r of relations) {
    if (r.type === 'spouse' || r.type === 'partner' || r.type === 'ex_spouse') {
      const a = spousePairs.get(r.fromCharacterId) ?? new Set();
      a.add(r.toCharacterId);
      spousePairs.set(r.fromCharacterId, a);
      const b = spousePairs.get(r.toCharacterId) ?? new Set();
      b.add(r.fromCharacterId);
      spousePairs.set(r.toCharacterId, b);
    }
  }

  const renderUnits = units
    .map((u): RenderFamilyUnit | null => {
      const parentNodes = u.parentIds
        .map((id) => buildNode(id, charMap, peopleMap, memberRoleById, selectedTimelineId))
        .filter((n): n is FamilyGraphNode => Boolean(n));
      const childNodes = u.childIds
        .map((id) => buildNode(id, charMap, peopleMap, memberRoleById, selectedTimelineId))
        .filter((n): n is FamilyGraphNode => Boolean(n));
      if (parentNodes.length === 0 && childNodes.length === 0) return null;
      return {
        id: u.id,
        parentNodes,
        childNodes,
        relationType: u.relationType,
        timelineId: u.timelineId,
        label: u.label,
        isAlternate: u.relationType === 'alternate' || u.timelineId !== MAIN_TIMELINE_ID,
      };
    })
    .filter((u): u is RenderFamilyUnit => u !== null);

  const inTree = new Set<string>();
  for (const u of renderUnits) {
    for (const n of [...u.parentNodes, ...u.childNodes]) inTree.add(n.characterId);
  }

  const conflicts: FamilyGraphConflict[] = [];
  const parentChild = relations.filter((r) => r.type === 'parent_child' || r.type === 'adoptive_parent_child');
  const childParentCount = new Map<string, Set<string>>();
  for (const r of parentChild) {
    if (units.some((u) => u.childIds.includes(r.toCharacterId))) continue;
    const set = childParentCount.get(r.toCharacterId) ?? new Set();
    set.add(r.fromCharacterId);
    childParentCount.set(r.toCharacterId, set);
  }

  const allPeopleIds = [...peopleMap.keys()].filter((id) => charMap.has(id));
  const disconnected: FamilyGraphNode[] = [];
  const roots: FamilyGraphNode[] = [];

  for (const id of allPeopleIds) {
    const node = buildNode(id, charMap, peopleMap, memberRoleById, selectedTimelineId);
    if (!node) continue;
    if (!inTree.has(id)) {
      if (!childIdsFromUnits.has(id) && !parentIdsInUnits.has(id)) {
        disconnected.push(node);
      } else if (!childIdsFromUnits.has(id) && parentIdsInUnits.has(id)) {
        roots.push(node);
      } else if (!childIdsFromUnits.has(id)) {
        disconnected.push(node);
      }
    }
  }

  const rootParents = renderUnits.filter((u) =>
    u.parentNodes.some((p) => !childIdsFromUnits.has(p.characterId))
  );
  if (rootParents.length > 0) {
    const rootIds = new Set<string>();
    for (const u of rootParents) {
      for (const p of u.parentNodes) {
        if (!childIdsFromUnits.has(p.characterId)) rootIds.add(p.characterId);
      }
    }
    for (const id of rootIds) {
      const node = buildNode(id, charMap, peopleMap, memberRoleById, selectedTimelineId);
      if (node && !roots.some((r) => r.characterId === id)) roots.push(node);
    }
  }

  return {
    roots: roots.sort((a, b) => a.character.name.localeCompare(b.character.name, 'es')),
    units: renderUnits,
    disconnected: disconnected.sort((a, b) => a.character.name.localeCompare(b.character.name, 'es')),
    conflicts,
  };
}

export { MAIN_TIMELINE_ID, ALL_TIMELINES_ID };
