import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { Trash2, RotateCcw, AlertTriangle, ArrowLeft, Users, FileText, MapPin, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';

export function TrashPage() {
  const navigate = useNavigate();
  const trash = useAppStore((s) => s.getTrashItems());
  const restoreWorld = useAppStore((s) => s.restoreWorld);
  const restoreCharacter = useAppStore((s) => s.restoreCharacter);
  const restoreScene = useAppStore((s) => s.restoreScene);
  const restorePlace = useAppStore((s) => s.restorePlace);
  const restorePlot = useAppStore((s) => s.restorePlot);
  const restoreComponent = useAppStore((s) => s.restoreComponent);
  const restoreOrganization = useAppStore((s) => s.restoreOrganization);
  const restoreIdea = useAppStore((s) => s.restoreIdea);
  const emptyTrash = useAppStore((s) => s.emptyTrash);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const allItems = [
    ...trash.worlds.map((w) => ({ type: 'world' as const, data: w, icon: Globe, color: '#3B82F6', restore: () => restoreWorld(w.id) })),
    ...trash.characters.map((c) => ({ type: 'character' as const, data: c, icon: Users, color: '#22C55E', restore: () => restoreCharacter(c.id) })),
    ...trash.scenes.map((s) => ({ type: 'scene' as const, data: s, icon: FileText, color: '#EAB308', restore: () => restoreScene(s.id) })),
    ...trash.places.map((p) => ({ type: 'place' as const, data: p, icon: MapPin, color: '#8B5CF6', restore: () => restorePlace(p.id) })),
    ...trash.plots.map((p) => ({ type: 'plot' as const, data: p, icon: Globe, color: '#3B82F6', restore: () => restorePlot(p.id) })),
    ...trash.components.map((c) => ({ type: 'component' as const, data: c, icon: Globe, color: '#EC4899', restore: () => restoreComponent(c.id) })),
    ...trash.organizations.map((o) => ({ type: 'organization' as const, data: o, icon: Globe, color: '#F97316', restore: () => restoreOrganization(o.id) })),
    ...trash.ideas.map((i) => ({ type: 'idea' as const, data: i, icon: Globe, color: '#D61E2B', restore: () => restoreIdea(i.id) })),
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate('/')} className="rounded-lg p-2 transition-all hover:bg-[#1E2230]">
            <ArrowLeft size={20} className="text-[#8B91A7]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
              Papelera
            </h1>
            <p className="text-sm text-[#5A6078]">{allItems.length} elementos eliminados</p>
          </div>
        </div>
        {allItems.length > 0 && (
          <button type="button" onClick={() => setConfirmEmpty(true)} className="story-btn-secondary text-sm text-[#D61E2B] border-[#D61E2B]/30 hover:bg-[#D61E2B]/10">
            <AlertTriangle size={14} /> Vaciar Papelera
          </button>
        )}
      </div>

      {allItems.length === 0 ? (
        <div className="py-16 text-center">
          <Trash2 size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="text-[#5A6078]">La papelera está vacía</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allItems.map((item, i) => (
            <motion.div
              key={`${item.type}-${item.data.id}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="story-card flex items-center gap-4 p-4"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#D61E2B]/10">
                <Trash2 size={18} className="text-[#D61E2B]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#E8E9EB]">
                  {(item.data as { name?: string; title?: string; description?: string }).name ||
                    (item.data as { title?: string }).title ||
                    (item.data as { description?: string }).description?.slice(0, 50)}
                </p>
                <p className="text-xs capitalize text-[#5A6078]">
                  {item.type} · Eliminado {new Date((item.data as { deletedAt?: string }).deletedAt ?? '').toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  item.restore();
                  toast.success(`${item.type} restaurado`);
                }}
                className="rounded-lg p-2 text-[#5A6078] transition-all hover:bg-[#22C55E]/10 hover:text-[#22C55E]"
                aria-label="Restaurar"
              >
                <RotateCcw size={16} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        open={confirmEmpty}
        onClose={() => setConfirmEmpty(false)}
        title="Vaciar papelera"
        message="¿Eliminar permanentemente todos los elementos? Esta acción no se puede deshacer."
        confirmLabel="Vaciar todo"
        onConfirm={() => {
          emptyTrash();
          toast.success('Papelera vaciada');
        }}
      />
    </motion.div>
  );
}
