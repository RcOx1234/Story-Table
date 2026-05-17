import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import type { HouseMember } from '@/types';
import { ChipRolePicker } from '@/components/common/ChipRolePicker';
import {
  HOUSE_MEMBER_ROLE_OPTIONS,
  HOUSE_ROLE_GROUPS,
  houseMemberRoleLabel,
} from '@/lib/houseMemberRoles';
import { roleNeedsParent, suggestParentCharacterId } from '@/lib/houseFamilyTree';
import { Plus, UserMinus, Users } from 'lucide-react';
import { toast } from 'sonner';

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
  const needsParent = roleNeedsParent(role);
  const parentCandidates = members.filter((m) => m.characterId !== charId);
  const showParentField = members.length > 0;

  useEffect(() => {
    if (!role || !roleNeedsParent(role)) {
      if (!role) setParentId('');
      return;
    }
    const suggested = suggestParentCharacterId(role, members);
    if (suggested) setParentId((prev) => prev || suggested);
  }, [role, members]);

  const add = () => {
    if (!charId) {
      toast.error('Elige un personaje');
      return;
    }
    if (!role) {
      toast.error('Elige un rol en la casa');
      return;
    }
    if (needsParent && !parentId) {
      toast.error('Indica de quién desciende (padre, madre o cabeza de la casa)');
      return;
    }

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
    toast.success('Miembro añadido');
  };

  return (
    <div className="rounded-xl border border-[#2A3045] bg-[#111318]/80 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Users size={16} className="text-[#D61E2B]" />
        <h4 className="text-sm font-semibold text-[#E8E9EB]">Miembros de {houseName || 'la casa'}</h4>
      </div>

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
                    {parent ? <span className="ml-1">· descendiente de {parent}</span> : null}
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

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] uppercase text-[#5A6078]">1. Personaje</label>
            <select
              className="story-input w-full text-sm"
              value={charId}
              onChange={(e) => setCharId(e.target.value)}
            >
              <option value="">Elegir personaje…</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] uppercase text-[#5A6078]">2. Rol en la casa</label>
            <ChipRolePicker
              options={HOUSE_MEMBER_ROLE_OPTIONS}
              groups={HOUSE_ROLE_GROUPS}
              value={role}
              onChange={setRole}
            />
          </div>

          {showParentField && (
            <div>
              <label className="mb-1 block text-[10px] uppercase text-[#5A6078]">
                3. {needsParent ? 'Descendiente de' : 'Vinculado a (opcional)'}
                {needsParent ? ' *' : ''}
              </label>
              <select
                className="story-input w-full text-sm"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">{needsParent ? '— Elige padre/madre —' : '— Sin vínculo —'}</option>
                {parentCandidates.map((m) => {
                  const ch = characters.find((c) => c.id === m.characterId);
                  return (
                    <option key={m.characterId} value={m.characterId}>
                      {ch?.name ?? 'Personaje'} ({houseMemberRoleLabel(m.role)})
                    </option>
                  );
                })}
              </select>
              <p className="mt-1 text-[10px] text-[#5A6078]">
                {needsParent
                  ? 'Obligatorio para hijo, hija o bastardo/a. Aparece en el árbol debajo de esa persona.'
                  : 'Opcional: ayuda a ordenar el árbol familiar.'}
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={!charId || !role}
            onClick={add}
            className="story-btn-primary flex w-full items-center justify-center gap-1.5 text-xs disabled:opacity-40"
          >
            <Plus size={14} /> Añadir miembro
          </button>
        </div>
      </div>
    </div>
  );
}
