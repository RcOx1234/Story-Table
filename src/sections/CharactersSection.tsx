import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Search, Heart, MoreVertical, Trash2 } from 'lucide-react';
import type { Character } from '@/types';
import { CharacterFormModal } from '@/components/modals/crud/CharacterFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const navigate = useNavigate();
  const characters = useAppStore((s) => s.getCharactersByWorld(worldId));
  const addCharacter = useAppStore((s) => s.addCharacter);
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const deleteCharacter = useAppStore((s) => s.deleteCharacter);
  const toggleFavorite = useAppStore((s) => s.toggleFavoriteCharacter);
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
          <input
            type="text"
            placeholder="Buscar personajes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="story-input w-full pl-10"
          />
        </div>
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
      </div>

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
              onClick={() => navigate(`/world/${worldId}/character/${char.id}`)}
              className="story-card group relative cursor-pointer p-5"
            >
              <div className="absolute right-10 top-3 flex gap-1">
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Menú"
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
                    >
                      <MoreVertical size={14} className="text-[#5A6078]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border-[#2A3045] bg-[#111318] text-[#E8E9EB]">
                    <DropdownMenuItem
                      className="cursor-pointer focus:bg-[#1E2230]"
                      onClick={(e) => {
                        e.preventDefault();
                        setEditing(char);
                        setFormOpen(true);
                      }}
                    >
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-[#D61E2B] focus:bg-[#D61E2B]/10"
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteId(char.id);
                      }}
                    >
                      <Trash2 size={12} className="mr-2 inline" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full bg-[#1E2230]">
                {char.images[0] ? (
                  <img src={char.images[0]} alt={char.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-[#8B91A7]">{char.name.charAt(0)}</div>
                )}
              </div>
              <h3 className="mb-1 truncate text-center font-semibold text-[#E8E9EB]">{char.name}</h3>
              {char.alias && <p className="mb-2 truncate text-center text-xs text-[#5A6078]">"{char.alias}"</p>}
              <div className="mb-3 flex items-center justify-center gap-2">
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
              </div>
              {char.house && <p className="truncate text-center text-xs text-[#5A6078]">{char.house}</p>}
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
