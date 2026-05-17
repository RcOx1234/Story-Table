import { useState } from 'react';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Search, Heart, Castle } from 'lucide-react';
import type { House, NobleRank } from '@/types';
import { HouseFormModal } from '@/components/modals/crud/HouseFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import { BaseModal } from '@/components/modals/crud/BaseModal';
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

interface Props {
  worldId: string;
}

export function HousesSection({ worldId }: Props) {
  const houses = useAppStore((s) => s.getHousesByWorld(worldId));
  const addHouse = useAppStore((s) => s.addHouse);
  const updateHouse = useAppStore((s) => s.updateHouse);
  const deleteHouse = useAppStore((s) => s.deleteHouse);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<House | null>(null);
  const [viewing, setViewing] = useState<House | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = houses.filter(
    (h) =>
      !search ||
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.motto.toLowerCase().includes(search.toLowerCase())
  );

  const parentName = (id?: string) => houses.find((h) => h.id === id)?.name;

  const onSubmit = (data: Omit<House, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editing) {
      updateHouse(editing.id, data);
      toast.success('Casa actualizada');
    } else {
      addHouse(data);
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
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
        <button type="button" onClick={openNew} className="story-btn-primary text-sm">
          <Plus size={16} /> Agregar
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Castle size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="mb-4 text-[#5A6078]">No hay casas nobles</p>
          <button type="button" onClick={openNew} className="story-btn-primary text-sm">
            <Plus size={16} /> Crear casa
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((house, i) => (
              <motion.div
                key={house.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setViewing(house)}
                onClick={() => setViewing(house)}
                className="story-card group relative cursor-pointer p-5 transition-all hover:border-[#D61E2B]/40"
              >
                <div className="absolute right-3 top-3 flex items-center gap-0.5">
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
                </div>
                <span className="absolute left-3 top-3 rounded-full bg-[#D61E2B]/20 px-2 py-0.5 text-[10px] font-bold text-[#D61E2B]">
                  {house.influenceLevel}
                </span>
                <div className="mx-auto mb-3 mt-4 h-16 w-16 overflow-hidden rounded-full bg-[#1E2230]">
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
                <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#8B91A7]">
                    {nobleRankLabels[house.nobleRank]}
                  </span>
                </div>
                {house.territory && <p className="truncate text-center text-xs text-[#5A6078]">{house.territory}</p>}
                {parentName(house.parentHouseId) && (
                  <p className="mt-1 truncate text-center text-[10px] text-[#5A6078]">Vasalla de {parentName(house.parentHouseId)}</p>
                )}
              </motion.div>
            ))}
          </div>
          <div className="flex justify-center pt-10">
            <button type="button" onClick={openNew} className="story-btn-primary text-sm">
              <Plus size={16} /> Agregar casa
            </button>
          </div>
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

      <BaseModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        description={viewing?.motto}
        footer={
          <button
            type="button"
            className="story-btn-primary text-sm"
            onClick={() => {
              if (!viewing) return;
              setEditing(viewing);
              setViewing(null);
              setFormOpen(true);
            }}
          >
            Editar casa
          </button>
        }
      >
        {viewing && (
          <div className="space-y-4 text-sm">
            <p className="text-[#8B91A7]">
              <span className="text-[#5A6078]">Rango:</span> {nobleRankLabels[viewing.nobleRank]} · Influencia {viewing.influenceLevel}/10
            </p>
            {viewing.description && (
              <div>
                <h4 className="mb-1 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Descripción</h4>
                <p className="leading-relaxed text-[#8B91A7]">{viewing.description}</p>
              </div>
            )}
            {viewing.lineage && (
              <div>
                <h4 className="mb-1 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Linaje</h4>
                <p className="leading-relaxed text-[#8B91A7]">{viewing.lineage}</p>
              </div>
            )}
            {viewing.symbols && (
              <div>
                <h4 className="mb-1 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Símbolos</h4>
                <p className="leading-relaxed text-[#8B91A7]">{viewing.symbols}</p>
              </div>
            )}
          </div>
        )}
      </BaseModal>

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
