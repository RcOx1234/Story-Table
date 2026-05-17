import { useState } from 'react';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Plus, Search, Heart, Route, Zap } from 'lucide-react';
import type { Plot } from '@/types';
import { PlotFormModal } from '@/components/modals/crud/PlotFormModal';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';
import { toast } from 'sonner';

interface Props {
  worldId: string;
}

export function PlotsSection({ worldId }: Props) {
  const plots = useAppStore((s) => s.getPlotsByWorld(worldId));
  const addPlot = useAppStore((s) => s.addPlot);
  const updatePlot = useAppStore((s) => s.updatePlot);
  const deletePlot = useAppStore((s) => s.deletePlot);
  const toggleFav = useAppStore((s) => s.toggleFavoritePlot);
  const chars = useAppStore((s) => s.getCharactersByWorld(worldId));
  const scenes = useAppStore((s) => s.getScenesByWorld(worldId));
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Plot | null>(null);
  const [detail, setDetail] = useState<Plot | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
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
              className="story-card group relative cursor-pointer overflow-hidden border-l-4 border-l-[#D61E2B] p-5 pl-6 transition-all hover:border-[#D61E2B]/80 hover:shadow-lg hover:shadow-black/20"
            >
              <motion.div
                className="absolute right-2 top-2 z-10 flex items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  aria-label="Favorito"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFav(plot.id);
                  }}
                  className="rounded-lg p-1.5 transition-all hover:bg-[#1E2230]"
                >
                  <Heart size={14} className={plot.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
                </button>
                <EntityCardMenu
                  onEdit={() => {
                    setEditing(plot);
                    setFormOpen(true);
                  }}
                  onDelete={() => setDeleteId(plot.id)}
                />
              </motion.div>

              <div className="relative pr-14">
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D61E2B]/15">
                    <Route size={18} className="text-[#D61E2B]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold leading-tight text-[#E8E9EB]">{plot.title}</h3>
                    {plot.status && (
                      <span className="mt-1 inline-block rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#8B91A7]">
                        {plot.status}
                      </span>
                    )}
                  </div>
                </div>

                {plot.synopsis && <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-[#8B91A7]">{plot.synopsis}</p>}

                {charNames(plot.characters) ? (
                  <p className="mb-3 line-clamp-2 text-xs text-[#5A6078]">
                    <span className="font-medium text-[#8B91A7]">Involucrados: </span>
                    {charNames(plot.characters)}
                  </p>
                ) : null}

                {plot.twists.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {plot.twists.slice(0, 3).map((twist, idx) => (
                      <span
                        key={idx}
                        className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#EAB308]/10 px-2.5 py-1 text-[10px] text-[#EAB308]"
                      >
                        <Zap size={9} className="shrink-0" />
                        <span className="truncate">{twist}</span>
                      </span>
                    ))}
                    {plot.twists.length > 3 && (
                      <span className="rounded-full bg-[#1E2230] px-2 py-1 text-[10px] text-[#5A6078]">
                        +{plot.twists.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="border-t border-[#1E2230]/80 pt-3 text-xs text-[#5A6078]">
                  {plot.characters.length} personaje{plot.characters.length !== 1 ? 's' : ''}
                  {(plot.relatedScenes?.length ?? 0) > 0 && (
                    <span className="text-[#3A4460]"> · {plot.relatedScenes!.length} escena(s)</span>
                  )}
                </div>
              </div>
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
            {detail.twists.length > 0 && (
              <div>
                <p className="mb-2 text-[#5A6078]">Giros:</p>
                <ul className="space-y-1">
                  {detail.twists.map((t, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Zap size={12} className="mt-0.5 shrink-0 text-[#EAB308]" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </BaseModal>

      <ConfirmDeleteModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        message="Esta trama irá a la papelera."
        onConfirm={() => {
          if (deleteId) {
            deletePlot(deleteId);
            toast.success('Trama enviada a la papelera');
          }
        }}
      />
    </motion.div>
  );
}
