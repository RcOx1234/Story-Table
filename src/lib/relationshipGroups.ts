import { relationshipTypeLabel } from '@/lib/relationshipTypes';
import type { Relationship } from '@/types';

export type RelationshipGroupId =
  | 'core_family'
  | 'extended_family'
  | 'house'
  | 'friends'
  | 'conflicts'
  | 'other';

export const RELATIONSHIP_GROUP_LABELS: Record<RelationshipGroupId, string> = {
  core_family: 'Familia central',
  extended_family: 'Familia extendida',
  house: 'Casa',
  friends: 'Amistades y alianzas',
  conflicts: 'Conflictos',
  other: 'Otros vínculos',
};

const CORE = /^(padre|madre|hij[oa]|herman[oa]|espos[oa]|consorte|pareja|marido|mujer)$/i;
const EXTENDED = /^(abuel[oa]|t[ií]o|t[ií]a|primo|prima|sobrin[oa]|niet[oa])$/i;
const FRIENDS = /^(amig[oa]|aliad[oa]|mentor|alumno|compañer[oa]|maestro)$/i;
const CONFLICTS = /^(enemig[oa]|rival|traidor|nemesis|antagonista)$/i;
const HOUSE = /^(casa|linaje|miembro|heredero|heredera|cabecilla)$/i;

export function relationshipGroup(type: string): RelationshipGroupId {
  const t = type.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (CORE.test(t)) return 'core_family';
  if (EXTENDED.test(t)) return 'extended_family';
  if (HOUSE.test(t)) return 'house';
  if (FRIENDS.test(t)) return 'friends';
  if (CONFLICTS.test(t)) return 'conflicts';
  return 'other';
}

export function groupRelationships(rels: Relationship[]): Record<RelationshipGroupId, Relationship[]> {
  const groups: Record<RelationshipGroupId, Relationship[]> = {
    core_family: [],
    extended_family: [],
    house: [],
    friends: [],
    conflicts: [],
    other: [],
  };
  for (const rel of rels) {
    groups[relationshipGroup(rel.type)].push(rel);
  }
  return groups;
}

export function relationshipDisplayLabel(type: string): string {
  return relationshipTypeLabel(type);
}
