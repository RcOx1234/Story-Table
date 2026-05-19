import { useMemo, useState } from 'react';
import { useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Heart } from 'lucide-react';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import {
  CharacterFiltersBar,
  EMPTY_CHARACTER_FILTERS,
  filterCharacters,
} from '@/components/common/CharacterFiltersBar';
import { CHARACTER_ROLE_LABELS } from '@/lib/characterRoles';
import type { Character } from '@/types';
import { CharacterFormModal } from '@/components/modals/crud/CharacterFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  alive: '#22C55E',
  dead: '#6B7280',
  missing: '#EAB308',
  unknown: '#5A6078',
};

interface Props {
  worldId: string;
}

export function CharactersSection({ worldId }: Props) {
  const navigateWithReturn = useNavigateWithReturn();
  const characters = useAppStore((s) => s.getCharactersByWorld(worldId));
  const addCharacter = useAppStore((s) => s.addCharacter);
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const deleteCharacter = useAppStore((s) => s.deleteCharacter);
  const toggleFavorite = useAppStore((s) => s.toggleFavoriteCharacter);
  const houses = useAppStore((s) => s.getHousesByWorld(worldId));
  const worldTags = useAppStore((s) => s.getWorldTagsByWorld(worldId));
  const [filters, setFilters] = useState({ ...EMPTY_CHARACTER_FILTERS, worldId });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Character | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterCharacters(characters, { ...filters, worldId }, houses, worldTags),
    [characters, filters, houses, worldTags, worldId]
  );

  const houseName = (char: Character) => {
    if (char.houseId) return houses.find((h) => h.id === char.houseId)?.name ?? char.house;
    return char.house;
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <CharacterFiltersBar
        filters={{ ...filters, worldId }}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        houses={houses}
        worldTags={worldTags}
        action={
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="story-btn-primary text-sm"
          >
            <Plus size={16} /> Agregar
          </button>
        }
      />

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-4 text-[#5A6078]">No hay personajes con estos filtros</p>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="story-btn-primary text-sm"
          >
            <Plus size={16} /> Crear Personaje
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((char, i) => (
            <motion.div
              key={char.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigateWithReturn(`/world/${worldId}/character/${char.id}`)}
              className="story-card group relative cursor-pointer p-5"
            >
              <span
                className="absolute left-3 top-3 z-10 h-2.5 w-2.5 rounded-full ring-2 ring-[#111318]"
                style={{ backgroundColor: statusColors[char.status] }}
                title={char.status}
              />
              <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  aria-label="Favorito"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(char.id);
                  }}
                  className="rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
                >
                  <Heart size={14} className={char.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
                </button>
                <EntityCardMenu
                  onEdit={() => {
                    setEditing(char);
                    setFormOpen(true);
                  }}
                  onDelete={() => setDeleteId(char.id)}
                />
              </div>
              <motion.div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full bg-[#1E2230]">
                {char.images[0] ? (
                  <img src={char.images[0]} alt={char.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-[#8B91A7]">
                    {char.name.charAt(0)}
                  </div>
                )}
              </motion.div>
              <h3 className="mb-1 truncate text-center font-semibold text-[#E8E9EB]">{char.name}</h3>
              {char.alias && <p className="mb-2 truncate text-center text-xs text-[#5A6078]">"{char.alias}"</p>}
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
              <div className="mt-3 flex items-center justify-between border-t border-[#1E2230] pt-3 text-xs text-[#5A6078]">
                <span>{char.age || '?'} años</span>
                <span>{char.relationships.length} relaciones</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <CharacterFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        worldId={worldId}
        initial={editing}
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
    </motion.div>
  );
}
