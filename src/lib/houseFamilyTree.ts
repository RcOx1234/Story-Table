import type { Character, HouseMember } from '@/types';
import { houseMemberRoleLabel } from '@/lib/houseMemberRoles';

/** Nivel por defecto según el rol (0 = más alto en la casa). */
const ROLE_TIER: Record<string, number> = {
  patriarca: 0,
  matriarca: 0,
  regente: 0,
  abuelo: 0,
  abuela: 0,
  padre: 1,
  madre: 1,
  heredero: 1,
  heredera: 1,
  tio: 1,
  tia: 1,
  esposo: 1,
  esposa: 1,
  consorte: 1,
  hijo: 2,
  hija: 2,
  hermano: 2,
  hermana: 2,
  primo: 2,
  prima: 2,
  bastardo: 2,
  sirviente: 3,
  other: 3,
};

const ROLES_NEEDING_PARENT = new Set(['hijo', 'hija', 'bastardo']);

const LEADER_ROLES = ['patriarca', 'matriarca', 'regente', 'padre', 'madre', 'abuelo', 'abuela'] as const;

export function roleNeedsParent(role: string): boolean {
  return ROLES_NEEDING_PARENT.has(role);
}

export function suggestParentCharacterId(role: string, members: HouseMember[]): string | undefined {
  if (!roleNeedsParent(role)) return undefined;
  const leaders = members.filter((m) => LEADER_ROLES.includes(m.role as (typeof LEADER_ROLES)[number]));
  if (role === 'hijo' || role === 'hija') {
    const padre = members.find((m) => m.role === 'padre');
    const madre = members.find((m) => m.role === 'madre');
    return padre?.characterId ?? madre?.characterId ?? leaders[0]?.characterId;
  }
  return leaders[0]?.characterId;
}

const TIER_LABELS: Record<number, string> = {
  0: 'Cabeza de la casa',
  1: 'Generación parental',
  2: 'Descendencia',
  3: 'Otros miembros',
};

export type FamilyTreeEntry = {
  member: HouseMember;
  character: Character;
  depth: number;
  parentName?: string;
};

export type FamilyTreeGeneration = {
  depth: number;
  label: string;
  entries: FamilyTreeEntry[];
};

function defaultTier(role: string): number {
  return ROLE_TIER[role] ?? 2;
}

/** Profundidad en el árbol: prioriza vínculo padre/hijo; si no hay, usa el rol. */
export function computeMemberDepth(
  member: HouseMember,
  membersByChar: Map<string, HouseMember>,
  memo: Map<string, number>,
  visiting = new Set<string>()
): number {
  const id = member.characterId;
  if (memo.has(id)) return memo.get(id)!;
  if (visiting.has(id)) return defaultTier(member.role);

  visiting.add(id);
  let depth: number;

  const parentId = member.parentCharacterId;
  if (parentId && parentId !== id && membersByChar.has(parentId)) {
    const parent = membersByChar.get(parentId)!;
    depth = computeMemberDepth(parent, membersByChar, memo, visiting) + 1;
  } else {
    depth = defaultTier(member.role);
  }

  visiting.delete(id);
  memo.set(id, depth);
  return depth;
}

export function buildFamilyGenerations(
  members: HouseMember[],
  characters: Character[]
): FamilyTreeGeneration[] {
  const charMap = new Map(characters.map((c) => [c.id, c]));
  const membersByChar = new Map(members.map((m) => [m.characterId, m]));
  const memo = new Map<string, number>();

  const entries: FamilyTreeEntry[] = members
    .filter((m) => charMap.has(m.characterId))
    .map((m) => {
      const parentId = m.parentCharacterId;
      const parentName =
        parentId && membersByChar.has(parentId)
          ? charMap.get(parentId)?.name
          : undefined;
      return {
        member: m,
        character: charMap.get(m.characterId)!,
        depth: computeMemberDepth(m, membersByChar, memo),
        parentName,
      };
    });

  const byDepth = new Map<number, FamilyTreeEntry[]>();
  for (const e of entries) {
    const list = byDepth.get(e.depth) ?? [];
    list.push(e);
    byDepth.set(e.depth, list);
  }

  const depths = [...byDepth.keys()].sort((a, b) => a - b);

  return depths.map((depth) => ({
    depth,
    label: TIER_LABELS[depth] ?? (depth >= 3 ? TIER_LABELS[3] : `Nivel ${depth + 1}`),
    entries: (byDepth.get(depth) ?? []).sort((a, b) => {
      const ta = defaultTier(a.member.role);
      const tb = defaultTier(b.member.role);
      if (ta !== tb) return ta - tb;
      return a.character.name.localeCompare(b.character.name, 'es');
    }),
  }));
}

export function formatMemberRole(role: string): string {
  return houseMemberRoleLabel(role);
}
