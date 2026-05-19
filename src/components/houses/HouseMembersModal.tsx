import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, UserMinus, Users } from 'lucide-react';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { useAppStore } from '@/store';
import { HOUSE_MEMBER_ROLE_OPTIONS } from '@/lib/houseMemberRoles';
import type { House, HouseMember, HouseMemberRole } from '@/types';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onClose: () => void;
  house: House;
  onSave: (members: HouseMember[]) => void;
};

export function HouseMembersModal({ open, onClose, house, onSave }: Props) {
  const characters = useAppStore((s) => s.getCharactersByWorld(house.worldId));
  const [members, setMembers] = useState<HouseMember[]>(house.members ?? []);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setMembers(house.members ?? []);
      setSearch('');
    }
  }, [open, house.id, house.members, house.updatedAt]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.characterId)), [members]);

  const available = useMemo(() => {
    const q = search.trim().toLowerCase();
    return characters.filter((c) => {
      if (memberIds.has(c.id)) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.alias?.toLowerCase().includes(q) ?? false);
    });
  }, [characters, memberIds, search]);

  const addMember = (characterId: string) => {
    if (memberIds.has(characterId)) return;
    setMembers((m) => [...m, { characterId, role: 'blood' }]);
    setSearch('');
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Miembros de la casa"
      description={house.name}
      maxWidthClass="max-w-lg"
      footer={
        <div className="flex w-full justify-end gap-2">
          <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="story-btn-primary text-sm"
            onClick={() => {
              onSave(members);
              onClose();
              toast.success('Miembros actualizados');
            }}
          >
            Guardar
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
          <input
            className="story-input w-full pl-9"
            placeholder="Buscar personaje para anadir…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {available.length > 0 && (
          <div className="max-h-36 space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-[#2A3045] bg-[#0B0D10]/50 p-1 scrollbar-thin">
            {available.slice(0, 12).map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-[#1E2230]"
                onClick={() => addMember(c.id)}
              >
                <span className="flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#1E2230]">
                  {c.images[0] ? (
                    <img src={c.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#8B91A7]">
                      {c.name.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-[#E8E9EB]">{c.name}</span>
                <Plus size={14} className="shrink-0 text-[#D61E2B]" />
              </button>
            ))}
          </div>
        )}

        <div>
          <h4 className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#5A6078]">
            <Users size={12} /> En la casa ({members.length})
          </h4>
          {members.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#2A3045] py-8 text-center text-sm text-[#5A6078]">
              Aun no hay miembros. Busca arriba para anadir.
            </p>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {members.map((m) => {
                  const ch = characters.find((c) => c.id === m.characterId);
                  if (!ch) return null;
                  return (
                    <motion.div
                      key={m.characterId}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-2 rounded-xl border border-[#2A3045]/80 bg-[#111318] p-2"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#1E2230]">
                        {ch.images[0] ? (
                          <img src={ch.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#8B91A7]">
                            {ch.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#E8E9EB]">{ch.name}</p>
                        <select
                          className="mt-0.5 w-full max-w-[11rem] rounded-lg border border-[#2A3045] bg-[#0B0D10] px-2 py-0.5 text-[10px] text-[#8B91A7]"
                          value={m.role}
                          onChange={(e) =>
                            setMembers((list) =>
                              list.map((x) =>
                                x.characterId === m.characterId
                                  ? { ...x, role: e.target.value as HouseMemberRole }
                                  : x
                              )
                            )
                          }
                        >
                          {HOUSE_MEMBER_ROLE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        aria-label="Quitar"
                        className="rounded-lg p-2 text-[#5A6078] hover:bg-[#1E2230] hover:text-[#D61E2B]"
                        onClick={() => setMembers((list) => list.filter((x) => x.characterId !== m.characterId))}
                      >
                        <UserMinus size={16} />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
