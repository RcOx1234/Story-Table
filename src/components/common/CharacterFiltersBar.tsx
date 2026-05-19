import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { StorySelect } from '@/components/common/StorySelect';
import { CHARACTER_ROLE_OPTIONS } from '@/lib/characterRoles';
import type { Character, House, World, WorldTag } from '@/types';

export type CharacterFilters = {
  search: string;
  worldId: string;
  houseId: string;
  role: string;
  status: string;
  tagId: string;
};

export const EMPTY_CHARACTER_FILTERS: CharacterFilters = {
  search: '',
  worldId: '',
  houseId: '',
  role: '',
  status: '',
  tagId: '',
};

type Props = {
  filters: CharacterFilters;
  onChange: (patch: Partial<CharacterFilters>) => void;
  worlds?: World[];
  houses?: House[];
  worldTags?: WorldTag[];
  showWorldFilter?: boolean;
  /** Botón u acción alineada a la derecha de los filtros (p. ej. Agregar personaje). */
  action?: ReactNode;
};

export function filterCharacters(
  characters: Character[],
  filters: CharacterFilters,
  houses: House[] = [],
  worldTags: WorldTag[] = []
): Character[] {
  const q = filters.search.trim().toLowerCase();
  return characters.filter((c) => {
    if (filters.worldId && c.worldId !== filters.worldId) return false;
    if (q && !c.name.toLowerCase().includes(q) && !c.alias.toLowerCase().includes(q)) return false;
    if (filters.role && c.role !== filters.role) return false;
    if (filters.status && c.status !== filters.status) return false;
    if (filters.houseId) {
      const matchHouse =
        c.houseId === filters.houseId ||
        houses.find((h) => h.id === filters.houseId)?.name === c.house;
      if (!matchHouse) return false;
    }
    if (filters.tagId) {
      const ids = c.tagIds ?? [];
      const legacy = c.tags ?? [];
      const tag = worldTags.find((t) => t.id === filters.tagId);
      const byId = ids.includes(filters.tagId);
      const byName = tag ? legacy.some((n) => n.toLowerCase() === tag.name.toLowerCase()) : false;
      if (!byId && !byName) return false;
    }
    return true;
  });
}

export function CharacterFiltersBar({
  filters,
  onChange,
  worlds = [],
  houses = [],
  worldTags = [],
  showWorldFilter = false,
  action,
}: Props) {
  const visibleHouses = filters.worldId ? houses.filter((h) => h.worldId === filters.worldId) : houses;
  const visibleTags = filters.worldId ? worldTags.filter((t) => t.worldId === filters.worldId) : worldTags;

  const roleOptions = [
    { value: '', label: 'Todos los rangos' },
    ...CHARACTER_ROLE_OPTIONS.map((o) => ({
      value: o.value,
      label: o.label,
      sublabel: o.group === 'narrative' ? 'Narrativo' : 'Rango',
    })),
  ];

  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'alive', label: 'Vivo' },
    { value: 'dead', label: 'Muerto' },
    { value: 'missing', label: 'Desaparecido' },
    { value: 'unknown', label: 'Desconocido' },
  ];

  return (
    <motion.div className="mb-6 flex flex-col gap-3" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
        <input
          type="text"
          placeholder="Buscar por nombre o alias…"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="story-input w-full pl-10"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {showWorldFilter && (
          <StorySelect
            value={filters.worldId}
            onChange={(v) => onChange({ worldId: v, houseId: '', tagId: '' })}
            options={[{ value: '', label: 'Todos los mundos' }, ...worlds.map((w) => ({ value: w.id, label: w.name }))]}
            placeholder="Mundo"
            className="shrink-0"
            clearable
          />
        )}
        <StorySelect
          value={filters.houseId}
          onChange={(v) => onChange({ houseId: v })}
          options={[
            { value: '', label: 'Todas las casas' },
            ...visibleHouses.map((h) => ({ value: h.id, label: h.name })),
          ]}
          placeholder="Casa"
          className="shrink-0"
        />
        <StorySelect
          value={filters.role}
          onChange={(v) => onChange({ role: v })}
          options={roleOptions}
          placeholder="Rango"
          className="shrink-0"
        />
        <StorySelect
          value={filters.status}
          onChange={(v) => onChange({ status: v })}
          options={statusOptions}
          placeholder="Estado"
          className="shrink-0"
          clearable={false}
        />
        {visibleTags.length > 0 && (
          <StorySelect
            value={filters.tagId}
            onChange={(v) => onChange({ tagId: v })}
            options={[
              { value: '', label: 'Todas las etiquetas' },
              ...visibleTags.map((t) => ({ value: t.id, label: t.name })),
            ]}
            placeholder="Etiqueta"
            className="shrink-0"
          />
        )}
        {action && <div className="ml-auto shrink-0">{action}</div>}
      </div>
    </motion.div>
  );
}
