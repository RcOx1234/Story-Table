import type { House, HouseFamilyRelation, HouseMember } from '@/types';
import { migrateHouseGenealogy } from '@/lib/houseGenealogyMigrate';

function hasCycle(relations: HouseFamilyRelation[]): boolean {
  const parentEdges = relations.filter(
    (r) => r.type === 'parent_child' || r.type === 'adoptive_parent_child'
  );
  const childrenOf = new Map<string, string[]>();
  for (const r of parentEdges) {
    const list = childrenOf.get(r.fromCharacterId) ?? [];
    list.push(r.toCharacterId);
    childrenOf.set(r.fromCharacterId, list);
  }

  const visit = (id: string, stack: Set<string>, visited: Set<string>): boolean => {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    stack.add(id);
    for (const child of childrenOf.get(id) ?? []) {
      if (visit(child, stack, visited)) return true;
    }
    stack.delete(id);
    return false;
  };

  const ids = new Set<string>();
  for (const r of parentEdges) {
    ids.add(r.fromCharacterId);
    ids.add(r.toCharacterId);
  }
  for (const id of ids) {
    if (visit(id, new Set(), new Set())) return true;
  }
  return false;
}

export function validateHouseFamilyGraph(
  house: Pick<House, 'members' | 'familyPeople' | 'familyRelations' | 'familyUnits'>
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const migrated = migrateHouseGenealogy(house);
  const peopleIds = new Set((migrated.familyPeople ?? []).map((p) => p.characterId));
  const memberIds = new Set((migrated.members ?? []).map((m) => m.characterId));

  for (const m of migrated.members ?? []) {
    if (memberIds.has(m.characterId) && [...memberIds].filter((id) => id === m.characterId).length > 1) {
      errors.push('Hay miembros duplicados en la casa.');
      break;
    }
  }

  for (const r of migrated.familyRelations ?? []) {
    if (r.fromCharacterId === r.toCharacterId) {
      errors.push('Una persona no puede ser su propia pareja o pariente.');
    }
    if (!peopleIds.has(r.fromCharacterId) || !peopleIds.has(r.toCharacterId)) {
      errors.push('Hay una relación que apunta a un personaje inexistente.');
    }
    if (r.type === 'parent_child' || r.type === 'adoptive_parent_child') {
      if (r.fromCharacterId === r.toCharacterId) {
        errors.push('Una persona no puede ser su propio padre/madre.');
      }
    }
  }

  for (const u of migrated.familyUnits ?? []) {
    const parentSet = new Set(u.parentIds);
    if (parentSet.size !== u.parentIds.length) {
      errors.push('Hay una unidad familiar con padres duplicados.');
    }
    const childSet = new Set(u.childIds);
    if (childSet.size !== u.childIds.length) {
      errors.push('Hay una unidad familiar con hijos duplicados.');
    }
    if (u.childIds.length > 0 && u.parentIds.length === 0) {
      errors.push('Hay un hijo conectado a una unidad familiar sin padres.');
    }
    for (const pid of u.parentIds) {
      if (!peopleIds.has(pid)) errors.push('Hay una relación que apunta a un personaje inexistente.');
    }
    for (const cid of u.childIds) {
      if (!peopleIds.has(cid)) errors.push('Hay una relación que apunta a un personaje inexistente.');
    }
  }

  if (hasCycle(migrated.familyRelations ?? [])) {
    errors.push('Esta relación crea un ciclo familiar.');
  }

  for (const p of migrated.familyPeople ?? []) {
    if (!p.isHouseMember) {
      warnings.push(`${p.characterId}: aparece en el árbol pero no es miembro oficial de la casa.`);
    }
    if (!p.connectionType || p.connectionType === 'unknown') {
      warnings.push('Hay personas sin tipo de conexión definido.');
    }
  }

  const inRelations = new Set<string>();
  for (const r of migrated.familyRelations ?? []) {
    inRelations.add(r.fromCharacterId);
    inRelations.add(r.toCharacterId);
  }
  for (const u of migrated.familyUnits ?? []) {
    for (const id of [...u.parentIds, ...u.childIds]) inRelations.add(id);
  }
  for (const p of migrated.familyPeople ?? []) {
    if (!inRelations.has(p.characterId) && !memberIds.has(p.characterId)) {
      warnings.push('Esta persona no tiene conexión familiar directa.');
    }
  }

  return {
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)].slice(0, 8),
  };
}

/** @deprecated */
export function validateHouseMembers(members: HouseMember[]): string[] {
  return validateHouseFamilyGraph({
    members,
    familyPeople: [],
    familyRelations: [],
    familyUnits: [],
  }).errors;
}
