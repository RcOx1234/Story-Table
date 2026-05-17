import { useState } from 'react';
import { useAppStore } from '@/store';
import type { HouseMember } from '@/types';
import { ChipRolePicker } from '@/components/common/ChipRolePicker';
import { HOUSE_MEMBER_ROLE_OPTIONS, HOUSE_ROLE_GROUPS, houseMemberRoleLabel } from '@/lib/houseMemberRoles';
import { Plus, UserMinus, Users } from 'lucide-react';
import { motion } from 'framer-motion';

type Props = {
  worldId: string;
  houseName: string;
  members: HouseMember[];
  onChange: (members: HouseMember[]) => void;
};

export function HouseMembersEditor({ worldId, houseName, members, onChange }: Props) {
  const characters = useAppStore((s) => s.getCharactersByWorld(worldId));
  const [charId, setCharId] = useState('');
  const [role, setRole] = useState('');
  const [parentId, setParentId] = useState('');

  const available = characters.filter((c) => !members.some((m) => m.characterId === c.id));

  const add = () => {
    if (!charId || !role) return;
    onChange([
      ...members,
      {
        characterId: charId,
        role,
        parentCharacterId: parentId || undefined,
      },
    ]);
    setCharId('');
    setRole('');
    setParentId('');
  };

  return (
    <div className="rounded-xl border border-[#2A3045] bg-[#111318]/80 p-4">
      <motion.div
        className="mb-4 flex items-center gap-2"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Users size={16} className="text-[#D61E2B]" />
        <h4 className="text-sm font-semibold text-[#E8E9EB]">Miembros de {houseName || 'la casa'}</h4>
      </motion.div>

      {members.length > 0 && (
        <ul className="mb-4 space-y-2">
          {members.map((m) => {
            const ch = characters.find((c) => c.id === m.characterId);
            const parent = m.parentCharacterId
              ? characters.find((c) => c.id === m.parentCharacterId)?.name
              : null;
            return (
              <li
                key={m.characterId}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#2A3045] bg-[#1E2230] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#E8E9EB]">{ch?.name ?? 'Personaje'}</p>
                  <p className="text-[10px] text-[#8B91A7]">
                    <span className="rounded-full bg-[#D61E2B]/15 px-1.5 py-0.5 text-[#D61E2B]">
                      {houseMemberRoleLabel(m.role)}
                    </span>
                    {parent ? <span className="ml-1">· bajo {parent}</span> : null}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-1.5 text-[#5A6078] hover:bg-[#0B0D10] hover:text-[#D61E2B]"
                  aria-label="Quitar miembro"
                  onClick={() => onChange(members.filter((x) => x.characterId !== m.characterId))}
                >
                  <UserMinus size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-3 rounded-lg border border-dashed border-[#2A3045] bg-[#0B0D10]/50 p-3">
        <p className="text-[10px] font-mono uppercase text-[#5A6078]">Añadir miembro</p>
        <select className="story-input w-full text-sm" value={charId} onChange={(e) => setCharId(e.target.value)}>
          <option value="">Elegir personaje…</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <ChipRolePicker
          label="Rol en la casa"
          options={HOUSE_MEMBER_ROLE_OPTIONS}
          groups={HOUSE_ROLE_GROUPS}
          value={role}
          onChange={setRole}
        />
        {members.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] uppercase text-[#3A4460]">Superior en el árbol (opcional)</p>
            <motion.div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setParentId('')}
                className={`rounded-full px-3 py-1 text-xs ${
                  !parentId ? 'bg-[#3B82F6]/20 text-[#93C5FD]' : 'bg-[#1E2230] text-[#5A6078]'
                }`}
              >
                Raíz
              </button>
              {members.map((m) => {
                const ch = characters.find((c) => c.id === m.characterId);
                if (!ch) return null;
                return (
                  <button
                    key={m.characterId}
                    type="button"
                    onClick={() => setParentId(m.characterId)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      parentId === m.characterId
                        ? 'bg-[#3B82F6]/20 text-[#93C5FD]'
                        : 'bg-[#1E2230] text-[#5A6078] hover:text-[#E8E9EB]'
                    }`}
                  >
                    {ch.name}
                  </button>
                );
              })}
            </motion.div>
          </div>
        )}
        <button
          type="button"
          disabled={!charId || !role}
          onClick={add}
          className="story-btn-primary flex w-full items-center justify-center gap-1.5 text-xs disabled:opacity-40"
        >
          <Plus size={14} /> Añadir a la casa
        </button>
      </div>
    </div>
  );
}
