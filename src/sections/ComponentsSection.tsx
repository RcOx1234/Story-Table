import { useState } from 'react';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Search, Heart, Box, Gem } from 'lucide-react';
import type { Component } from '@/types';
import { ComponentFormModal } from '@/components/modals/crud/ComponentFormModal';
import { ComponentDetailModal } from '@/components/modals/crud/ComponentDetailModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import { toast } from 'sonner';

const typeLabels: Record<string, string> = {
  object: 'Objeto',
  letter: 'Carta',
  relic: 'Reliquia',
  weapon: 'Arma',
  artifact: 'Artefacto',
  other: 'Otro',
};

interface Props {
  worldId: string;
}

export function ComponentsSection({ worldId }: Props) {
  const components = useAppStore((s) => s.getComponentsByWorld(worldId));
  const addComp = useAppStore((s) => s.addComponent);
  const updateComponent = useAppStore((s) => s.updateComponent);
  const deleteComponent = useAppStore((s) => s.deleteComponent);
  const toggleFav = useAppStore((s) => s.toggleFavoriteComponent);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Component | null>(null);
  const [detail, setDetail] = useState<Component | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = components.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  const onSubmit = (data: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editing) {
      updateComponent(editing.id, data);
      toast.success('Componente actualizado');
    } else {
      addComp(data);
      toast.success('Componente guardado');
    }
    setEditing(null);
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (comp: Component) => {
    setEditing(comp);
    setFormOpen(true);
  };

  return (
    <div>
      <div className="mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
          <input
            type="text"
            placeholder="Buscar componentes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="story-input w-full pl-10"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Gem size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="mb-4 text-[#5A6078]">No hay componentes</p>
          <button type="button" onClick={openNew} className="story-btn-primary text-sm">
            <Plus size={16} /> Crear componente
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((comp, i) => (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setDetail(comp)}
                onClick={() => setDetail(comp)}
                className="story-card group relative cursor-pointer p-5 transition-all hover:border-[#D61E2B]/30"
              >
                <div className="absolute right-3 top-3 flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label="Favorito"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFav(comp.id);
                    }}
                    className="rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
                  >
                    <Heart size={14} className={comp.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
                  </button>
                  <EntityCardMenu
                    className="opacity-70 group-hover:opacity-100"
                    onEdit={() => openEdit(comp)}
                    onDelete={() => setDeleteId(comp.id)}
                  />
                </div>
                {comp.imageUrl && comp.type !== 'letter' && (
                  <div className="mb-3 aspect-[4/3] overflow-hidden rounded-lg border border-[#2A3045] bg-[#0B0D10]">
                    <img src={comp.imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="mb-2 flex items-center gap-2">
                  <Box size={14} className="text-[#8B5CF6]" />
                  <span className="rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#5A6078]">
                    {typeLabels[comp.type]}
                  </span>
                </div>
                <h3 className="mb-1 font-semibold text-[#E8E9EB]">{comp.name}</h3>
                {comp.type === 'letter' ? (
                  <p className="line-clamp-2 text-xs italic text-[#8B91A7]">
                    {comp.letterTo || comp.target ? `Para: ${comp.letterTo || comp.target}` : comp.description || 'Carta sin contenido'}
                  </p>
                ) : (
                  <>
                    {comp.description && <p className="line-clamp-3 text-xs text-[#8B91A7]">{comp.description}</p>}
                    {comp.target && (
                      <p className="mt-2 text-xs text-[#5A6078]">
                        {typeLabels[comp.type]}: {comp.target}
                      </p>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </div>
          <div className="flex justify-center pt-10">
            <button type="button" onClick={openNew} className="story-btn-primary text-sm">
              <Plus size={16} /> Agregar componente
            </button>
          </div>
        </>
      )}

      <ComponentFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        worldId={worldId}
        initial={editing}
        onSubmit={onSubmit}
      />

      <ComponentDetailModal
        open={!!detail}
        onClose={() => setDetail(null)}
        component={detail}
        worldId={worldId}
        onEdit={() => {
          if (!detail) return;
          setDetail(null);
          openEdit(detail);
        }}
      />

      <ConfirmDeleteModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        message="Este componente irá a la papelera."
        onConfirm={() => {
          if (deleteId) {
            deleteComponent(deleteId);
            toast.success('Componente enviado a la papelera');
          }
        }}
      />
    </div>
  );
}
