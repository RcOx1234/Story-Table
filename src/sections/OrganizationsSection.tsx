import { useState } from 'react';
import { useWorldEditFromUrl } from '@/hooks/useWorldEditFromUrl';
import { useSectionCardMenuDeps, entityCardMenuProps } from '@/hooks/useEntityCardMenu';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Search, Heart, Building2, Crown, Users } from 'lucide-react';
import type { Organization } from '@/types';
import { OrganizationFormModal } from '@/components/modals/crud/OrganizationFormModal';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import { EntityReference } from '@/components/common/EntityReference';
import { toast } from 'sonner';
import { storyEntityDataAttrs } from '@/lib/storyEntityContext';

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
  const cardMenu = useSectionCardMenuDeps();
  const organizations = useAppStore((s) => s.getOrganizationsByWorld(worldId));
  const addOrg = useAppStore((s) => s.addOrganization);
  const updateOrganization = useAppStore((s) => s.updateOrganization);
  const deleteOrganization = useAppStore((s) => s.deleteOrganization);
  const toggleFav = useAppStore((s) => s.toggleFavoriteOrganization);
  const getCharacterById = useAppStore((s) => s.getCharacterById);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [viewing, setViewing] = useState<Organization | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (org: Organization) => {
    setEditing(org);
    setFormOpen(true);
  };

  useWorldEditFromUrl(openEdit, (id) => organizations.find((o) => o.id === id));

  return (
    <div>
      <div className="mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
          <input
            type="text"
            placeholder="Buscar organizaciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="story-input w-full pl-10"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Building2 size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="mb-4 text-[#5A6078]">No hay organizaciones</p>
          <button type="button" onClick={openNew} className="story-btn-primary text-sm">
            <Plus size={16} /> Crear organización
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((org, i) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="story-card group relative cursor-pointer overflow-hidden p-0 transition-all hover:border-[#D61E2B]/40"
                {...storyEntityDataAttrs('organization', org.id, worldId, org.name)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setViewing(org);
                }}
                onClick={() => setViewing(org)}
              >
                <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    aria-label="Favorito"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFav(org.id);
                    }}
                    className="rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
                  >
                    <Heart size={14} className={org.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
                  </button>
                  <EntityCardMenu
                    {...entityCardMenuProps(worldId, 'organization', org.id, org.name, {
                      ...cardMenu,
                      onViewDetails: () => setViewing(org),
                    })}
                    onDelete={() => setDeleteId(org.id)}
                  />
                </div>
                {org.imageUrl ? (
                  <div className="aspect-video bg-[#0B0D10]">
                    <img src={org.imageUrl} alt={org.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-[#111318]">
                    <Building2 size={32} className="text-[#3A4460]" />
                  </div>
                )}
                <motion.div className="p-4" whileHover={{ y: -1 }} transition={{ duration: 0.15 }}>
                  <span className="mb-2 inline-block rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#5A6078]">
                    {typeLabels[org.type]}
                  </span>
                  <h3 className="mb-1 font-semibold text-[#E8E9EB]">{org.name}</h3>
                  {org.goals && <p className="mb-2 line-clamp-2 text-xs text-[#8B91A7]">{org.goals}</p>}
                  <span className="flex items-center gap-1 text-xs text-[#5A6078]">
                    <Crown size={10} /> {org.members.length} miembros
                  </span>
                </motion.div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-center pt-10">
            <button type="button" onClick={openNew} className="story-btn-primary text-sm">
              <Plus size={16} /> Agregar organización
            </button>
          </div>
        </>
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

      <BaseModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        description={viewing ? typeLabels[viewing.type] : undefined}
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
            Editar organización
          </button>
        }
      >
        {viewing && (
          <div className="space-y-5 text-sm">
            <div>
              <h4 className="mb-1 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Objetivos</h4>
              <p className="leading-relaxed text-[#8B91A7]">{viewing.goals || '—'}</p>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Símbolos e insignias</h4>
              <p className="leading-relaxed text-[#8B91A7]">{viewing.symbols || '—'}</p>
            </div>
            <div>
              <h4 className="mb-1 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Jerarquía</h4>
              <p className="leading-relaxed text-[#8B91A7]">{viewing.hierarchy || '—'}</p>
            </div>
            {viewing.history && (
              <div>
                <h4 className="mb-1 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Historia</h4>
                <p className="leading-relaxed text-[#8B91A7]">{viewing.history}</p>
              </div>
            )}
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#5A6078]">
                <Users size={12} /> Miembros ({viewing.members.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {viewing.members.length === 0 ? (
                  <p className="text-[#3A4460]">Sin miembros vinculados</p>
                ) : (
                  viewing.members.map((mid) => {
                    const ch = getCharacterById(mid);
                    if (!ch) return <span key={mid} className="text-xs text-[#5A6078]">Personaje desconocido</span>;
                    return (
                      <EntityReference key={mid} type="character" id={ch.id} worldId={worldId} label={ch.name} />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </BaseModal>

      <ConfirmDeleteModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        message="Esta organización irá a la papelera."
        onConfirm={() => {
          if (deleteId) {
            deleteOrganization(deleteId);
            toast.success('Organización enviada a la papelera');
          }
        }}
      />
    </div>
  );
}
