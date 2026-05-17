import type { HouseMember } from '@/types';
import { normalizeHouseMembers } from '@/lib/houseMemberNormalize';

function parentIdsOf(m: HouseMember): string[] {
  return [m.fatherId, m.motherId, ...(m.adoptedParentIds ?? [])].filter(
    (id): id is string => Boolean(id)
  );
}

function hasCycle(members: HouseMember[]): boolean {
  const byId = new Map(members.map((m) => [m.characterId, m]));

  const visit = (id: string, stack: Set<string>, visited: Set<string>): boolean => {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    stack.add(id);
    const member = byId.get(id);
    if (member) {
      for (const pid of parentIdsOf(member)) {
        if (byId.has(pid) && visit(pid, stack, visited)) return true;
      }
    }
    stack.delete(id);
    return false;
  };

  for (const m of members) {
    if (visit(m.characterId, new Set(), new Set())) return true;
  }
  return false;
}

export function validateHouseMembers(members: HouseMember[]): string[] {
  const errors: string[] = [];
  const normalized = normalizeHouseMembers(members);
  const ids = new Set<string>();

  for (const m of normalized) {
    if (ids.has(m.characterId)) {
      errors.push('Hay miembros duplicados en la casa.');
      break;
    }
    ids.add(m.characterId);
  }

  const memberIds = new Set(normalized.map((m) => m.characterId));

  for (const m of normalized) {
    const self = m.characterId;

    if (m.fatherId === self) {
      errors.push('No puedes seleccionar al mismo personaje como su propio padre.');
    }
    if (m.motherId === self) {
      errors.push('No puedes seleccionar al mismo personaje como su propia madre.');
    }
    if ((m.spouseIds ?? []).includes(self)) {
      errors.push('No puedes seleccionar al mismo personaje como su propia pareja.');
    }
    if ((m.adoptedParentIds ?? []).includes(self)) {
      errors.push('No puedes seleccionar al mismo personaje como su propio padre adoptivo.');
    }

    const refs = [
      m.fatherId,
      m.motherId,
      ...(m.adoptedParentIds ?? []),
      ...(m.spouseIds ?? []),
    ].filter((id): id is string => Boolean(id));

    for (const ref of refs) {
      if (!memberIds.has(ref)) {
        errors.push('Este padre o madre no pertenece a la casa.');
        break;
      }
    }
  }

  if (hasCycle(normalized)) {
    errors.push('Esta relación crea un ciclo familiar.');
  }

  return [...new Set(errors)];
}
