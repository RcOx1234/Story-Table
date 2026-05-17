import { useState } from 'react';
import { useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Search, Heart } from 'lucide-react';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import type { Character } from '@/types';
import { CharacterFormModal } from '@/components/modals/crud/CharacterFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { toast } from 'sonner';

const roleLabels: Record<string, { label: string; color: string }> = {
  protagonist: { label: 'Protagonista', color: '#22C55E' },
  antagonist: { label: 'Antagonista', color: '#D61E2B' },
  secondary: { label: 'Secundario', color: '#3B82F6' },
  supporting: { label: 'Apoyo', color: '#8B5CF6' },
  extra: { label: 'Extra', color: '#5A6078' },
  king: { label: 'Rey', color: '#EAB308' },
  queen: { label: 'Reina', color: '#EAB308' },
  assassin: { label: 'Asesino', color: '#6B7280' },
  prince: { label: 'Príncipe', color: '#3B82F6' },
  princess: { label: 'Princesa', color: '#EC4899' },
  other: { label: 'Otro', color: '#5A6078' },
};

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
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Character | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = characters.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.alias.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || c.role === roleFilter;
    return matchSearch && matchRole;
  });

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
    <div>
      <motion.div
        className="mb-6 flex flex-col gap-3 sm:flex-row"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="relative flex-1"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
          <input
            type="text"
            placeholder="Buscar personajes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="story-input w-full pl-10"
          />
        </motion.div>
        <div className="flex gap-2">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="story-input text-sm">
            <option value="">Todos los roles</option>
            {Object.entries(roleLabels).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
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
      </motion.div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-4 text-[#5A6078]">No hay personajes aún</p>
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
              {char.alias && <p className="mb-2 truncate text-center text-xs text-[#5A6078]">"{char.alias}"</p>}
              <motion.div
                className="mb-3 flex items-center justify-center gap-2"
                initial={false}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.15 }}
              >
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                  style={{
                    backgroundColor: `${roleLabels[char.role]?.color}15`,
                    color: roleLabels[char.role]?.color,
                  }}
                >
                  {roleLabels[char.role]?.label}
                </span>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColors[char.status] }} title={char.status} />
              </motion.div>
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
    </div>
  );
}
