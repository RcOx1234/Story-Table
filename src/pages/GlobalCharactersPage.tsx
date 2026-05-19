import { useMemo, useState, useCallback } from 'react';
import { useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Heart, Users } from 'lucide-react';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import {
  CharacterFiltersBar,
  EMPTY_CHARACTER_FILTERS,
  filterCharacters,
} from '@/components/common/CharacterFiltersBar';
import { CHARACTER_ROLE_LABELS } from '@/lib/characterRoles';
import { CharacterFormModal } from '@/components/modals/crud/CharacterFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { WorldPasswordModal } from '@/components/modals/crud/WorldPasswordModal';
import { isWorldUnlocked } from '@/lib/worldUnlock';
import type { Character, World } from '@/types';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  alive: '#22C55E',
  dead: '#6B7280',
  missing: '#EAB308',
  unknown: '#5A6078',
};

export function GlobalCharactersPage() {
  const navigateWithReturn = useNavigateWithReturn();
  const worlds = useAppStore((s) => s.worlds.filter((w) => !w.isDeleted));
  const characters = useAppStore((s) => s.characters.filter((c) => !c.isDeleted));
  const houses = useAppStore((s) => s.houses.filter((h) => !h.isDeleted));
  const worldTags = useAppStore((s) => s.worldTags);
  const addCharacter = useAppStore((s) => s.addCharacter);
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const deleteCharacter = useAppStore((s) => s.deleteCharacter);
  const toggleFavorite = useAppStore((s) => s.toggleFavoriteCharacter);

  const [filters, setFilters] = useState(EMPTY_CHARACTER_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Character | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [passwordWorld, setPasswordWorld] = useState<World | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const filtered = useMemo(
    () => filterCharacters(characters, filters, houses, worldTags),
    [characters, filters, houses, worldTags]
  );

  const worldName = (id: string) => worlds.find((w) => w.id === id)?.name ?? '—';
  const houseName = (char: Character) => {
    if (char.houseId) return houses.find((h) => h.id === char.houseId)?.name ?? char.house;
    return char.house;
  };

  const withWorldUnlock = useCallback(
    (char: Character, action: () => void) => {
      const world = worlds.find((w) => w.id === char.worldId);
      if (world?.protected && !isWorldUnlocked(world.id)) {
        setPasswordWorld(world);
        setPendingAction(() => action);
        return;
      }
      action();
    },
    [worlds]
  );

  const openCharacter = (char: Character) => {
    withWorldUnlock(char, () => navigateWithReturn(`/world/${char.worldId}/character/${char.id}`));
  };

  const onSubmit = (data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editing) {
      updateCharacter(editing.id, data);
      toast.success('Personaje actualizado');
    } else {
      addCharacter(data);
      toast.success('Personaje guardado');
    }
    setEditing(null);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-1 flex items-center gap-2 text-[#D61E2B]">
            <Users size={20} />
            <span className="text-xs font-mono uppercase tracking-wider">Biblioteca</span>
          </div>
          <h1 className="text-2xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
            Personajes
          </h1>
          <p className="text-sm text-[#5A6078]">Administra personajes de todos tus mundos en un solo lugar.</p>
        </motion.div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="story-btn-primary shrink-0 text-sm"
        >
          <Plus size={16} /> Nuevo personaje
        </button>
      </div>

      <CharacterFiltersBar
        filters={filters}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        worlds={worlds}
        houses={houses}
        worldTags={worldTags}
        showWorldFilter
      />

      {filtered.length === 0 ? (
        <motion.div className="py-16 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="mb-4 text-[#5A6078]">No hay personajes con estos filtros</p>
          {worlds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="story-btn-primary text-sm"
            >
              <Plus size={16} /> Crear personaje
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filtered.map((char, i) => (
            <motion.div
              key={char.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              onClick={() => openCharacter(char)}
              className="story-card group relative cursor-pointer p-5"
            >
              <span
                className="absolute left-3 top-3 z-10 h-2.5 w-2.5 rounded-full ring-2 ring-[#111318]"
                style={{ backgroundColor: statusColors[char.status] }}
                title={char.status}
              />
              <div
                className="absolute right-2 top-2 z-10 flex items-center gap-0.5"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  aria-label="Favorito"
                  onClick={(e) => {
                    e.stopPropagation();
                    withWorldUnlock(char, () => toggleFavorite(char.id));
                  }}
                  className="rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
                >
                  <Heart size={14} className={char.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
                </button>
                <EntityCardMenu
                  onEdit={() =>
                    withWorldUnlock(char, () => {
                      setEditing(char);
                      setFormOpen(true);
                    })
                  }
                  onDelete={() => withWorldUnlock(char, () => setDeleteId(char.id))}
                />
              </div>
              <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full bg-[#1E2230]">
                {char.images[0] ? (
                  <img src={char.images[0]} alt={char.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-[#8B91A7]">
                    {char.name.charAt(0)}
                  </div>
                )}
              </div>
              <h3 className="mb-1 truncate text-center font-semibold text-[#E8E9EB]">{char.name}</h3>
              {char.alias && <p className="mb-1 truncate text-center text-xs text-[#5A6078]">"{char.alias}"</p>}
              <p className="mb-2 truncate text-center text-[10px] uppercase tracking-wider text-[#D61E2B]">
                {worldName(char.worldId)}
              </p>
              <div className="mb-3 flex justify-center">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                  style={{
                    backgroundColor: `${CHARACTER_ROLE_LABELS[char.role]?.color ?? '#5A6078'}15`,
                    color: CHARACTER_ROLE_LABELS[char.role]?.color ?? '#5A6078',
                  }}
                >
                  {CHARACTER_ROLE_LABELS[char.role]?.label ?? char.role}
                </span>
              </div>
              {houseName(char) && <p className="truncate text-center text-xs text-[#5A6078]">{houseName(char)}</p>}
            </motion.div>
          ))}
        </motion.div>
      )}

      <CharacterFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        worldId={editing?.worldId ?? ''}
        initial={editing}
        showWorldPicker={!editing}
        worldsList={worlds}
        onSubmit={onSubmit}
      />

      <ConfirmDeleteModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        message="Este personaje irá a la papelera."
        onConfirm={() => {
          if (deleteId) {
            deleteCharacter(deleteId);
            toast.success('Personaje enviado a la papelera');
          }
        }}
      />

      {passwordWorld && (
        <WorldPasswordModal
          open={!!passwordWorld}
          world={passwordWorld}
          onUnlocked={() => {
            setPasswordWorld(null);
            pendingAction?.();
            setPendingAction(null);
          }}
          onCancel={() => {
            setPasswordWorld(null);
            setPendingAction(null);
          }}
        />
      )}
    </div>
  );
}
