import { useMemo, useState } from 'react';
import { useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Search, Heart, Castle } from 'lucide-react';
import type { House, NobleRank } from '@/types';
import { HouseFormModal } from '@/components/modals/crud/HouseFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import { toast } from 'sonner';

const nobleRankLabels: Record<NobleRank, string> = {
  emperor: 'Emperador',
  king: 'Rey',
  duke: 'Duque',
  marquis: 'Marqués',
  count: 'Conde',
  baron: 'Barón',
  knight: 'Caballero',
  commoner: 'Plebeyo',
  other: 'Otro',
};

const NOBLE_RANK_ORDER: Record<NobleRank, number> = {
  emperor: 0,
  king: 1,
  duke: 2,
  marquis: 3,
  count: 4,
  baron: 5,
  knight: 6,
  commoner: 7,
  other: 8,
};

type HouseSortMode = 'relevance' | 'name' | 'rank' | 'influence' | 'members';

const SORT_LABELS: Record<HouseSortMode, string> = {
  relevance: 'Relevancia',
  name: 'Nombre',
  rank: 'Rango noble',
  influence: 'Influencia',
  members: 'Nº miembros',
};

interface Props {
  worldId: string;
}

export function HousesSection({ worldId }: Props) {
  const navigateWithReturn = useNavigateWithReturn();
  const houses = useAppStore((s) => s.getHousesByWorld(worldId));
  const addHouse = useAppStore((s) => s.addHouse);
  const updateHouse = useAppStore((s) => s.updateHouse);
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const deleteHouse = useAppStore((s) => s.deleteHouse);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<House | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<HouseSortMode>('relevance');

  const filtered = useMemo(() => {
    const matched = houses.filter(
      (h) =>
        !search ||
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.motto.toLowerCase().includes(search.toLowerCase())
    );
    const sorted = [...matched];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        break;
      case 'rank':
        sorted.sort((a, b) => NOBLE_RANK_ORDER[a.nobleRank] - NOBLE_RANK_ORDER[b.nobleRank]);
        break;
      case 'influence':
        sorted.sort((a, b) => b.influenceLevel - a.influenceLevel);
        break;
      case 'members':
        sorted.sort((a, b) => (b.members?.length ?? 0) - (a.members?.length ?? 0));
        break;
      case 'relevance':
      default:
        sorted.sort((a, b) => {
          if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
          const rankDiff = NOBLE_RANK_ORDER[a.nobleRank] - NOBLE_RANK_ORDER[b.nobleRank];
          if (rankDiff !== 0) return rankDiff;
          if (b.influenceLevel !== a.influenceLevel) return b.influenceLevel - a.influenceLevel;
          return (b.members?.length ?? 0) - (a.members?.length ?? 0);
        });
        break;
    }
    return sorted;
  }, [houses, search, sortBy]);

  const parentName = (id?: string) => houses.find((h) => h.id === id)?.name;

  const onSubmit = (data: Omit<House, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editing) {
      updateHouse(editing.id, data);
      for (const m of data.members ?? []) {
        updateCharacter(m.characterId, { houseId: editing.id, house: data.name });
      }
      toast.success('Casa actualizada');
    } else {
      const newId = addHouse(data);
      for (const m of data.members ?? []) {
        updateCharacter(m.characterId, { houseId: newId, house: data.name });
      }
      toast.success('Casa guardada');
    }
    setEditing(null);
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
          <input
            type="text"
            placeholder="Buscar casas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="story-input w-full pl-10"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as HouseSortMode)}
          className="story-input min-w-[160px] text-sm"
          aria-label="Ordenar casas"
        >
          {(Object.keys(SORT_LABELS) as HouseSortMode[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
        <button type="button" onClick={openNew} className="story-btn-primary shrink-0 text-sm">
          <Plus size={16} /> Agregar
        </button>
      </div>

      {filtered.length === 0 ? (
        <motion.div className="py-16 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Castle size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="mb-4 text-[#5A6078]">No hay casas nobles</p>
          <button type="button" onClick={openNew} className="story-btn-primary text-sm">
            <Plus size={16} /> Crear casa
          </button>
        </motion.div>
      ) : (
        <>
          <motion.div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          >
            {filtered.map((house) => (
              <motion.div
                key={house.id}
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigateWithReturn(`/world/${worldId}/house/${house.id}`)}
                onClick={() => navigateWithReturn(`/world/${worldId}/house/${house.id}`)}
                className="story-card group relative cursor-pointer p-5 transition-all hover:border-[#D61E2B]/40"
              >
                <motion.div className="absolute right-2 top-2 z-10 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    aria-label="Favorito"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateHouse(house.id, { isFavorite: !house.isFavorite });
                    }}
                    className="rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
                  >
                    <Heart size={14} className={house.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
                  </button>
                  <EntityCardMenu
                    onEdit={() => {
                      setEditing(house);
                      setFormOpen(true);
                    }}
                    onDelete={() => setDeleteId(house.id)}
                  />
                </motion.div>
                <span className="absolute left-3 top-3 rounded-full bg-[#D61E2B]/20 px-2 py-0.5 text-[10px] font-bold text-[#D61E2B]">
                  {house.influenceLevel}
                </span>
                <div className="mx-auto mb-3 mt-4 h-16 w-16 overflow-hidden rounded-full bg-[#1E2230] ring-2 ring-[#2A3045]">
                  {house.imageUrl ? (
                    <img src={house.imageUrl} alt={house.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Castle size={24} className="text-[#5A6078]" />
                    </div>
                  )}
                </div>
                <h3 className="mb-1 truncate text-center font-semibold text-[#E8E9EB]">{house.name}</h3>
                {house.motto && <p className="mb-2 truncate text-center text-xs italic text-[#5A6078]">"{house.motto}"</p>}
                <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#8B91A7]">
                    {nobleRankLabels[house.nobleRank]}
                  </span>
                </div>
                <p className="text-center text-[10px] text-[#5A6078]">
                  {(house.members ?? []).length} miembro{(house.members ?? []).length !== 1 ? 's' : ''}
                </p>
                {parentName(house.parentHouseId) && (
                  <p className="mt-1 truncate text-center text-[10px] text-[#5A6078]">Vasalla de {parentName(house.parentHouseId)}</p>
                )}
              </motion.div>
            ))}
          </motion.div>
        </>
      )}

      <HouseFormModal
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
        message="Esta casa irá a la papelera."
        onConfirm={() => {
          if (deleteId) {
            deleteHouse(deleteId);
            toast.success('Casa enviada a la papelera');
          }
        }}
      />
    </div>
  );
}
