import type { Character, HouseMember } from '@/types';
import { normalizeHouseMember } from '@/lib/houseMemberNormalize';
import { houseMemberRoleLabel, houseMemberRoleSort } from '@/lib/houseMemberRoles';

export interface FamilyTreeNode {
  member: HouseMember;
  character: Character;
  spouseCharacters: Character[];
  parentIds: string[];
  childIds: string[];
  depth: number;
  branch?: string;
  warnings?: string[];
}

export interface FamilyTreeGeneration {
  depth: number;
  label: string;
  entries: FamilyTreeNode[];
}

export type FamilyTreeResult = {
  generations: FamilyTreeGeneration[];
  unlinked: FamilyTreeNode[];
  conflicts: FamilyTreeNode[];
};

const DEPTH_LABELS: Record<number, string> = {
  0: 'Fundadores / raíz',
  1: 'Primera generación',
  2: 'Segunda generación',
  3: 'Tercera generación',
};

function parentIdsOf(m: HouseMember): string[] {
  return [m.fatherId, m.motherId, ...(m.adoptedParentIds ?? [])].filter(
    (id): id is string => Boolean(id)
  );
}

function sortNodes(a: FamilyTreeNode, b: FamilyTreeNode): number {
  if (a.member.isFounder !== b.member.isFounder) return a.member.isFounder ? -1 : 1;
  const sa = a.member.successionOrder ?? 999;
  const sb = b.member.successionOrder ?? 999;
  if (sa !== sb) return sa - sb;
  const ra = houseMemberRoleSort(String(a.member.role));
  const rb = houseMemberRoleSort(String(b.member.role));
  if (ra !== rb) return ra - rb;
  return a.character.name.localeCompare(b.character.name, 'es');
}

function detectCycle(memberIds: Set<string>, membersByChar: Map<string, HouseMember>): Set<string> {
  const cyclic = new Set<string>();
  const visit = (id: string, stack: Set<string>): boolean => {
    if (stack.has(id)) {
      cyclic.add(id);
      return true;
    }
    stack.add(id);
    const m = membersByChar.get(id);
    let found = false;
    if (m) {
      for (const pid of parentIdsOf(m)) {
        if (!memberIds.has(pid)) continue;
        if (visit(pid, stack)) {
          cyclic.add(id);
          found = true;
        }
      }
    }
    stack.delete(id);
    return found;
  };
  for (const id of memberIds) visit(id, new Set());
  return cyclic;
}

export function buildFamilyTree(
  members: HouseMember[],
  characters: Character[]
): FamilyTreeResult {
  const charMap = new Map(characters.map((c) => [c.id, c]));
  const normalized = members
    .map(normalizeHouseMember)
    .filter((m) => charMap.has(m.characterId));
  const membersByChar = new Map(normalized.map((m) => [m.characterId, m]));
  const memberIds = new Set(normalized.map((m) => m.characterId));

  const childrenByParentId = new Map<string, string[]>();
  for (const m of normalized) {
    for (const pid of parentIdsOf(m)) {
      if (!memberIds.has(pid)) continue;
      const list = childrenByParentId.get(pid) ?? [];
      if (!list.includes(m.characterId)) list.push(m.characterId);
      childrenByParentId.set(pid, list);
    }
  }

  const cyclicIds = detectCycle(memberIds, membersByChar);
  const depths = new Map<string, number>();

  const roots = normalized.filter(
    (m) =>
      m.isFounder ||
      parentIdsOf(m).filter((id) => memberIds.has(id)).length === 0
  );

  const queue: { id: string; depth: number }[] = roots.map((m) => ({ id: m.characterId, depth: 0 }));
  const seen = new Set<string>();

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (seen.has(id)) {
      const prev = depths.get(id) ?? depth;
      depths.set(id, Math.min(prev, depth));
      continue;
    }
    seen.add(id);
    depths.set(id, depth);

    const children = childrenByParentId.get(id) ?? [];
    for (const childId of children) {
      if (cyclicIds.has(childId)) continue;
      queue.push({ id: childId, depth: depth + 1 });
    }
  }

  const nodes: FamilyTreeNode[] = normalized.map((m) => {
    const spouseCharacters = (m.spouseIds ?? [])
      .filter((id) => memberIds.has(id) && id !== m.characterId)
      .map((id) => charMap.get(id)!)
      .filter(Boolean);

    const nodeWarnings: string[] = [];
    for (const pid of parentIdsOf(m)) {
      if (!memberIds.has(pid)) {
        nodeWarnings.push('Este personaje tiene como padre/madre a alguien que no pertenece a la casa.');
      }
    }
    if (cyclicIds.has(m.characterId)) {
      nodeWarnings.push('Esta relación crea un ciclo familiar.');
    }

    const depth = depths.get(m.characterId);
    const isUnlinked =
      depth === undefined &&
      !m.isFounder &&
      parentIdsOf(m).filter((id) => memberIds.has(id)).length === 0;

    return {
      member: m,
      character: charMap.get(m.characterId)!,
      spouseCharacters,
      parentIds: parentIdsOf(m).filter((id) => memberIds.has(id)),
      childIds: childrenByParentId.get(m.characterId) ?? [],
      depth: depth ?? (isUnlinked ? -1 : 0),
      branch: m.branch,
      warnings: nodeWarnings.length ? nodeWarnings : undefined,
    };
  });

  const unlinked = nodes.filter((n) => n.depth < 0).sort(sortNodes);
  const conflicts = nodes.filter((n) => cyclicIds.has(n.member.characterId)).sort(sortNodes);
  const linked = nodes.filter((n) => n.depth >= 0 && !cyclicIds.has(n.member.characterId));

  const byDepth = new Map<number, FamilyTreeNode[]>();
  for (const n of linked) {
    const list = byDepth.get(n.depth) ?? [];
    list.push(n);
    byDepth.set(n.depth, list);
  }

  const generations: FamilyTreeGeneration[] = [...byDepth.keys()]
    .sort((a, b) => a - b)
    .map((depth) => ({
      depth,
      label: DEPTH_LABELS[depth] ?? `Generación ${depth + 1}`,
      entries: (byDepth.get(depth) ?? []).sort(sortNodes),
    }));

  return { generations, unlinked, conflicts };
}

/** @deprecated Usar buildFamilyTree */
export function buildFamilyGenerations(
  members: HouseMember[],
  characters: Character[]
): FamilyTreeGeneration[] {
  return buildFamilyTree(members, characters).generations;
}

export function formatMemberRole(role: string): string {
  return houseMemberRoleLabel(role);
}
