import type { HouseMember } from '@/types';

/** Migra campos antiguos y normaliza relaciones recíprocas de pareja. */
export function normalizeHouseMember(member: HouseMember): HouseMember {
  const legacyParent = member.parentCharacterId;
  const fatherId = member.fatherId ?? legacyParent ?? null;
  const motherId = member.motherId ?? null;

  return {
    ...member,
    fatherId: fatherId || null,
    motherId: motherId || null,
    adoptedParentIds: [...(member.adoptedParentIds ?? [])].filter(Boolean),
    spouseIds: [...(member.spouseIds ?? [])].filter(Boolean),
    isFounder: member.isFounder ?? false,
    successionOrder: member.successionOrder ?? null,
  };
}

export function normalizeHouseMembers(members: HouseMember[]): HouseMember[] {
  const normalized = members.map(normalizeHouseMember);
  const byId = new Map(normalized.map((m) => [m.characterId, m]));

  for (const member of normalized) {
    for (const spouseId of member.spouseIds ?? []) {
      if (!byId.has(spouseId) || spouseId === member.characterId) continue;
      const spouse = byId.get(spouseId)!;
      const ids = new Set(spouse.spouseIds ?? []);
      ids.add(member.characterId);
      spouse.spouseIds = [...ids];
    }
  }

  return [...byId.values()];
}

/** Elimina referencias a un personaje de todos los miembros. */
export function removeMemberReferences(members: HouseMember[], removedId: string): HouseMember[] {
  return members
    .filter((m) => m.characterId !== removedId)
    .map((m) => {
      const spouseIds = (m.spouseIds ?? []).filter((id) => id !== removedId);
      const adoptedParentIds = (m.adoptedParentIds ?? []).filter((id) => id !== removedId);
      const fatherId = m.fatherId === removedId ? null : m.fatherId ?? null;
      const motherId = m.motherId === removedId ? null : m.motherId ?? null;
      return { ...m, fatherId, motherId, spouseIds, adoptedParentIds };
    });
}
