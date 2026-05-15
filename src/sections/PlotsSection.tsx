import { useState } from 'react';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Search, Heart, Route, Zap } from 'lucide-react';
import type { Plot } from '@/types';
import { PlotFormModal } from '@/components/modals/crud/PlotFormModal';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { toast } from 'sonner';

interface Props {
  worldId: string;
}

export function PlotsSection({ worldId }: Props) {
  const plots = useAppStore((s) => s.getPlotsByWorld(worldId));
  const addPlot = useAppStore((s) => s.addPlot);
  const updatePlot = useAppStore((s) => s.updatePlot);
  const toggleFav = useAppStore((s) => s.toggleFavoritePlot);
  const chars = useAppStore((s) => s.getCharactersByWorld(worldId));
  const scenes = useAppStore((s) => s.getScenesByWorld(worldId));
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Plot | null>(null);
  const [detail, setDetail] = useState<Plot | null>(null);

  const filtered = plots.filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()));

  const onSubmit = (data: Omit<Plot, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editing) {
      updatePlot(editing.id, data);
      toast.success('Trama actualizada');
    } else {
      addPlot(data);
      toast.success('Trama guardada');
    }
    setEditing(null);
  };

  const charNames = (ids: string[]) =>
    ids
      .map((id) => chars.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(', ');

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
          <input
            type="text"
            placeholder="Buscar tramas..."
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
          <Route size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="mb-4 text-[#5A6078]">No hay tramas</p>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="story-btn-primary text-sm"
          >
            <Plus size={16} /> Crear Trama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((plot, i) => (
            <motion.div
              key={plot.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setDetail(plot)}
              onClick={() => setDetail(plot)}
              className="story-card group relative cursor-pointer p-5"
            >
              <button
                type="button"
                aria-label="Favorito"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFav(plot.id);
                }}
                className="absolute right-3 top-3 rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
              >
                <Heart size={14} className={plot.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
              </button>
              <button
                type="button"
                className="absolute right-12 top-3 rounded-lg px-2 py-1 text-[10px] text-[#8B91A7] hover:bg-[#1E2230]"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(plot);
                  setFormOpen(true);
                }}
              >
                Editar
              </button>
              <div className="mb-2 flex items-center gap-2">
                <Route size={14} className="text-[#D61E2B]" />
                <h3 className="font-semibold text-[#E8E9EB]">{plot.title}</h3>
              </div>
              {plot.synopsis && <p className="mb-3 line-clamp-3 text-sm text-[#8B91A7]">{plot.synopsis}</p>}
              {plot.twists.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="font-mono text-xs uppercase text-[#5A6078]">Giros:</p>
                  {plot.twists.map((twist, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-[#8B91A7]">
                      <Zap size={10} className="flex-shrink-0 text-[#EAB308]" />
                      <span className="line-clamp-1">{twist}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 border-t border-[#1E2230] pt-3 text-xs text-[#5A6078]">{plot.characters.length} personajes involucrados</div>
            </motion.div>
          ))}
        </div>
      )}

      <PlotFormModal
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
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.title ?? ''}
        description={detail?.synopsis ?? ''}
        maxWidthClass="max-w-xl"
        footer={
          <button type="button" className="story-btn-secondary text-sm" onClick={() => setDetail(null)}>
            Cerrar
          </button>
        }
      >
        {detail && (
          <div className="space-y-3 text-sm text-[#8B91A7]">
            <p>
              <span className="text-[#5A6078]">Personajes:</span> {charNames(detail.characters) || '—'}
            </p>
            <p>
              <span className="text-[#5A6078]">Escenas:</span>{' '}
              {(detail.relatedScenes ?? [])
                .map((id) => scenes.find((s) => s.id === id)?.title)
                .filter(Boolean)
                .join(', ') || '—'}
            </p>
            {detail.status && (
              <p>
                <span className="text-[#5A6078]">Estado:</span> {detail.status}
              </p>
            )}
          </div>
        )}
      </BaseModal>
    </div>
  );
}
