import { useState } from 'react';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Search, Heart, Building2, Crown } from 'lucide-react';
import type { Organization } from '@/types';
import { OrganizationFormModal } from '@/components/modals/crud/OrganizationFormModal';
import { toast } from 'sonner';

const typeLabels: Record<string, string> = {
  guild: 'Gremio',
  house: 'Casa',
  brotherhood: 'Hermandad',
  company: 'Compañía',
  clan: 'Clan',
  order: 'Orden',
  other: 'Otro',
};

interface Props {
  worldId: string;
}

export function OrganizationsSection({ worldId }: Props) {
  const organizations = useAppStore((s) => s.getOrganizationsByWorld(worldId));
  const addOrg = useAppStore((s) => s.addOrganization);
  const updateOrganization = useAppStore((s) => s.updateOrganization);
  const toggleFav = useAppStore((s) => s.toggleFavoriteOrganization);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);

  const filtered = organizations.filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()));

  const onSubmit = (data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editing) {
      updateOrganization(editing.id, data);
      toast.success('Organización actualizada');
    } else {
      addOrg(data);
      toast.success('Organización guardada');
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
            placeholder="Buscar organizaciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="story-input w-full pl-10"
          />
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
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Building2 size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="mb-4 text-[#5A6078]">No hay organizaciones</p>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="story-btn-primary text-sm"
          >
            <Plus size={16} /> Crear
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((org, i) => (
            <motion.div key={org.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="story-card group relative p-5">
              <button
                type="button"
                aria-label="Favorito"
                onClick={() => toggleFav(org.id)}
                className="absolute right-3 top-3 rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
              >
                <Heart size={14} className={org.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
              </button>
              <button
                type="button"
                className="absolute right-12 top-3 text-[10px] text-[#8B91A7]"
                onClick={() => {
                  setEditing(org);
                  setFormOpen(true);
                }}
              >
                Editar
              </button>
              <div className="mb-2 flex items-center gap-2">
                <Building2 size={14} className="text-[#3B82F6]" />
                <span className="rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#5A6078]">
                  {typeLabels[org.type]}
                </span>
              </div>
              <h3 className="mb-2 font-semibold text-[#E8E9EB]">{org.name}</h3>
              {org.goals && <p className="mb-2 line-clamp-2 text-xs text-[#8B91A7]">{org.goals}</p>}
              <div className="mt-2 flex items-center justify-between border-t border-[#1E2230] pt-2 text-xs text-[#5A6078]">
                <span className="flex items-center gap-1">
                  <Crown size={10} /> {org.members.length} miembros
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <OrganizationFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        worldId={worldId}
        initial={editing}
        onSubmit={onSubmit}
      />
    </div>
  );
}
