import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Character, HouseMember } from '@/types';

type TreeNode = {
  member: HouseMember;
  character: Character;
  children: TreeNode[];
};

function buildTree(members: HouseMember[], characters: Character[]): TreeNode[] {
  const byChar = new Map(members.map((m) => [m.characterId, m]));
  const charMap = new Map(characters.map((c) => [c.id, c]));
  const nodes: TreeNode[] = members
    .filter((m) => charMap.has(m.characterId))
    .map((m) => ({
      member: m,
      character: charMap.get(m.characterId)!,
      children: [],
    }));
  const nodeById = new Map(nodes.map((n) => [n.character.id, n]));
  const roots: TreeNode[] = [];

  for (const node of nodes) {
    const parentId = node.member.parentCharacterId;
    const parentNode = parentId ? nodeById.get(parentId) : undefined;
    if (parentId && parentNode && parentId !== node.character.id && byChar.has(parentId)) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots.length ? roots : nodes;
}

function TreeBranch({ node, worldId }: { node: TreeNode; worldId: string }) {
  const navigate = useNavigate();
  return (
    <li className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => navigate(`/world/${worldId}/character/${node.character.id}`)}
        className="group flex min-w-[100px] max-w-[140px] flex-col items-center rounded-xl border border-[#2A3045] bg-[#111318] p-3 transition-all hover:border-[#D61E2B]/50 hover:bg-[#1E2230]"
      >
        <div className="mb-2 h-12 w-12 overflow-hidden rounded-full bg-[#1E2230]">
          {node.character.images[0] ? (
            <img src={node.character.images[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <motion.div
              className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#8B91A7]"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.15 }}
            >
              {node.character.name.charAt(0)}
            </motion.div>
          )}
        </div>
        <span className="line-clamp-2 text-center text-xs font-medium text-[#E8E9EB] group-hover:text-white">
          {node.character.name}
        </span>
        {node.member.role ? (
          <span className="mt-1 rounded-full bg-[#D61E2B]/15 px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#D61E2B]">
            {node.member.role}
          </span>
        ) : null}
      </button>
      {node.children.length > 0 ? (
        <>
          <motion.div className="my-2 h-4 w-px bg-[#3A4460]" layout />
          <ul className="flex flex-wrap items-start justify-center gap-6">
            {node.children.map((child) => (
              <TreeBranch key={child.character.id} node={child} worldId={worldId} />
            ))}
          </ul>
        </>
      ) : null}
    </li>
  );
}

type Props = {
  worldId: string;
  members: HouseMember[];
  characters: Character[];
};

export function FamilyTree({ worldId, members, characters }: Props) {
  const roots = useMemo(() => buildTree(members, characters), [members, characters]);

  if (members.length === 0) {
    return <p className="text-sm text-[#5A6078]">Añade miembros para ver el árbol familiar.</p>;
  }

  return (
    <motion.div
      className="overflow-x-auto rounded-xl border border-[#2A3045] bg-[#0B0D10]/80 p-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <h4 className="mb-4 text-center text-xs font-mono uppercase tracking-wider text-[#5A6078]">Árbol familiar</h4>
      <ul className="flex flex-wrap items-start justify-center gap-8">
        {roots.map((root) => (
          <TreeBranch key={root.character.id} node={root} worldId={worldId} />
        ))}
      </ul>
    </motion.div>
  );
}
