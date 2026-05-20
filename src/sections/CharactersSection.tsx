import { useMemo, useState } from 'react';
import { useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { useSectionCardMenuDeps, entityCardMenuProps } from '@/hooks/useEntityCardMenu';
import { motion } from 'framer-motion';
import { Plus, Heart, LayoutGrid, List } from 'lucide-react';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import {
  CharacterFiltersBar,
  EMPTY_CHARACTER_FILTERS,
  filterCharacters,
} from '@/components/common/CharacterFiltersBar';
import { CHARACTER_ROLE_LABELS } from '@/lib/characterRoles';
import type { Character } from '@/types';
import { storyEntityDataAttrs } from '@/lib/storyEntityContext';
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
  const cardMenu = useSectionCardMenuDeps();
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
          <div className="flex items-center gap-1.5">
            <div className="flex rounded-lg border border-[#2A3045] bg-[#111318] p-0.5">
              <button
                type="button"
                title="Vista cuadrícula"
                className={`rounded-md p-2 transition-all ${viewMode === 'grid' ? 'bg-[#D61E2B] text-white' : 'text-[#5A6078] hover:text-[#E8E9EB]'}`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                title="Vista lista"
                className={`rounded-md p-2 transition-all ${viewMode === 'list' ? 'bg-[#D61E2B] text-white' : 'text-[#5A6078] hover:text-[#E8E9EB]'}`}
                onClick={() => setViewMode('list')}
              >
                <List size={14} />
              </button>
            </div>
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
          </div>
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
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'flex flex-col gap-2'
          }
        >
          {filtered.map((char, i) => (
            <motion.div
              key={char.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigateWithReturn(`/world/${worldId}/character/${char.id}`)}
              className={`story-card group relative cursor-pointer ${
                viewMode === 'list' ? 'flex items-center gap-3 p-2.5' : 'p-5'
              }`}
              {...storyEntityDataAttrs('character', char.id, worldId, char.name)}
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
                  {...entityCardMenuProps(worldId, 'character', char.id, char.name, cardMenu)}
                  onDelete={() => setDeleteId(char.id)}
                />
              </div>
              <div
                className={`shrink-0 overflow-hidden rounded-full bg-[#1E2230] ${
                  viewMode === 'list' ? 'h-11 w-11' : 'mx-auto mb-3 h-16 w-16'
                }`}
              >
                {char.images[0] ? (
                  <img src={char.images[0]} alt={char.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-[#8B91A7]">
                    {char.name.charAt(0)}
                  </div>
                )}
              </div>
              {viewMode === 'list' ? (
                <>
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <h3 className="truncate font-semibold text-[#E8E9EB]">{char.name}</h3>
                      {char.alias && (
                        <span className="truncate text-xs text-[#5A6078]">"{char.alias}"</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                        style={{
                          backgroundColor: `${CHARACTER_ROLE_LABELS[char.role]?.color ?? '#5A6078'}15`,
                          color: CHARACTER_ROLE_LABELS[char.role]?.color ?? '#5A6078',
                        }}
                      >
                        {CHARACTER_ROLE_LABELS[char.role]?.label ?? char.role}
                      </span>
                      {houseName(char) && (
                        <span className="text-[11px] text-[#5A6078]">{houseName(char)}</span>
                      )}
                    </div>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-0.5 pr-14 text-right text-[11px] text-[#5A6078] sm:flex">
                    <span>{char.age || '?'} años</span>
                    <span>{char.relationships.length} rel.</span>
                  </div>
                </>
              ) : (
                <div>
                  <h3 className="mb-1 truncate text-center font-semibold text-[#E8E9EB]">{char.name}</h3>
                  {char.alias && (
                    <p className="mb-2 truncate text-center text-xs text-[#5A6078]">"{char.alias}"</p>
                  )}
                  <div className="mb-2 flex flex-col items-center gap-1">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                      style={{
                        backgroundColor: `${CHARACTER_ROLE_LABELS[char.role]?.color ?? '#5A6078'}15`,
                        color: CHARACTER_ROLE_LABELS[char.role]?.color ?? '#5A6078',
                      }}
                    >
                      {CHARACTER_ROLE_LABELS[char.role]?.label ?? char.role}
                    </span>
                    {houseName(char) && (
                      <span className="text-xs text-[#5A6078]">{houseName(char)}</span>
                    )}
                  </div>
                  <div className="mt-3 flex justify-between border-t border-[#1E2230] pt-3 text-xs text-[#5A6078]">
                    <span>{char.age || '?'} años</span>
                    <span>{char.relationships.length} relaciones</span>
                  </div>
                </div>
              )}
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
