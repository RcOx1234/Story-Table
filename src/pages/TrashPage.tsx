import { useState, useMemo } from 'react';
import { useAppStore, useStore } from '@/store';
import { motion } from 'framer-motion';
import { Trash2, RotateCcw, AlertTriangle, ArrowLeft, Users, FileText, MapPin, Globe, X } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import {
  collectAllTrashStorageUrls,
  collectStorageUrls,
  purgeStorageUrls,
  purgeWorldStorage,
  type TrashEntityType,
} from '@/lib/trashStorage';
import { useNavigationReturn } from '@/hooks/useNavigationReturn';
import { isFirebaseConfigured } from '@/lib/firebase';

export function TrashPage() {
  const goBack = useNavigationReturn('/');
  const worlds = useAppStore((s) => s.worlds);
  const characters = useAppStore((s) => s.characters);
  const scenes = useAppStore((s) => s.scenes);
  const places = useAppStore((s) => s.places);
  const plots = useAppStore((s) => s.plots);
  const components = useAppStore((s) => s.components);
  const organizations = useAppStore((s) => s.organizations);
  const ideas = useAppStore((s) => s.ideas);
  const maps = useAppStore((s) => s.maps);
  const user = useAppStore((s) => s.user);

  const trash = useMemo(
    () => ({
      worlds: worlds.filter((w) => w.isDeleted),
      characters: characters.filter((c) => c.isDeleted),
      scenes: scenes.filter((sc) => sc.isDeleted),
      places: places.filter((p) => p.isDeleted),
      plots: plots.filter((p) => p.isDeleted),
      components: components.filter((c) => c.isDeleted),
      organizations: organizations.filter((o) => o.isDeleted),
      ideas: ideas.filter((i) => i.isDeleted),
    }),
    [worlds, characters, scenes, places, plots, components, organizations, ideas]
  );
  const restoreWorld = useAppStore((s) => s.restoreWorld);
  const restoreCharacter = useAppStore((s) => s.restoreCharacter);
  const restoreScene = useAppStore((s) => s.restoreScene);
  const restorePlace = useAppStore((s) => s.restorePlace);
  const restorePlot = useAppStore((s) => s.restorePlot);
  const restoreComponent = useAppStore((s) => s.restoreComponent);
  const restoreOrganization = useAppStore((s) => s.restoreOrganization);
  const restoreIdea = useAppStore((s) => s.restoreIdea);
  const emptyTrash = useAppStore((s) => s.emptyTrash);
  const permanentlyDeleteTrashItem = useAppStore((s) => s.permanentlyDeleteTrashItem);

  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: TrashEntityType; id: string; label: string } | null>(null);

  const allItems = [
    ...trash.worlds.map((w) => ({ type: 'world' as const, data: w, icon: Globe, restore: () => restoreWorld(w.id) })),
    ...trash.characters.map((c) => ({ type: 'character' as const, data: c, icon: Users, restore: () => restoreCharacter(c.id) })),
    ...trash.scenes.map((s) => ({ type: 'scene' as const, data: s, icon: FileText, restore: () => restoreScene(s.id) })),
    ...trash.places.map((p) => ({ type: 'place' as const, data: p, icon: MapPin, restore: () => restorePlace(p.id) })),
    ...trash.plots.map((p) => ({ type: 'plot' as const, data: p, icon: Globe, restore: () => restorePlot(p.id) })),
    ...trash.components.map((c) => ({ type: 'component' as const, data: c, icon: Globe, restore: () => restoreComponent(c.id) })),
    ...trash.organizations.map((o) => ({ type: 'organization' as const, data: o, icon: Globe, restore: () => restoreOrganization(o.id) })),
    ...trash.ideas.map((i) => ({ type: 'idea' as const, data: i, icon: Globe, restore: () => restoreIdea(i.id) })),
  ];

  const purgeItemStorage = async (type: TrashEntityType, id: string) => {
    if (!isFirebaseConfigured() || !user?.id) return;
    const state = useStore.getState();
    const bundle = { ...state, maps };
    if (type === 'world') {
      const world = state.worlds.find((w) => w.id === id);
      if (world) {
        await purgeWorldStorage(user.id, world, bundle);
        return;
      }
    }
    const urls = collectStorageUrls(bundle, type, id);
    await purgeStorageUrls(user.id, urls);
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    try {
      await purgeItemStorage(type, id);
      permanentlyDeleteTrashItem(type, id);
      toast.success('Eliminado permanentemente');
    } catch {
      permanentlyDeleteTrashItem(type, id);
      toast.success('Eliminado del dispositivo (Storage no disponible)');
    }
    setDeleteTarget(null);
  };

  const handleEmptyTrash = async () => {
    if (!isFirebaseConfigured() || !user?.id) {
      emptyTrash();
      toast.success('Papelera vaciada');
      return;
    }
    const state = useStore.getState();
    const bundle = { ...state, maps };
    try {
      for (const world of state.worlds.filter((w) => w.isDeleted)) {
        await purgeWorldStorage(user.id, world, bundle);
      }
      const urls = collectAllTrashStorageUrls(bundle);
      await purgeStorageUrls(user.id, urls);
    } catch {
      /* continuar con borrado local */
    }
    emptyTrash();
    toast.success('Papelera vaciada');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button type="button" onClick={goBack} className="rounded-lg p-2 transition-all hover:bg-[#1E2230]">
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
          <button
            type="button"
            onClick={() => setConfirmEmpty(true)}
            className="story-btn-secondary text-sm text-[#D61E2B] border-[#D61E2B]/30 hover:bg-[#D61E2B]/10"
          >
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
          {allItems.map((item, i) => {
            const label =
              (item.data as { name?: string; title?: string; description?: string }).name ||
              (item.data as { title?: string }).title ||
              (item.data as { description?: string }).description?.slice(0, 50) ||
              'Sin nombre';
            return (
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
                  <p className="truncate text-sm font-medium text-[#E8E9EB]">{label}</p>
                  <p className="text-xs capitalize text-[#5A6078]">
                    {item.type} · Eliminado{' '}
                    {new Date((item.data as { deletedAt?: string }).deletedAt ?? '').toLocaleDateString()}
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
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ type: item.type, id: item.data.id, label })}
                  className="rounded-lg p-2 text-[#5A6078] transition-all hover:bg-[#D61E2B]/10 hover:text-[#D61E2B]"
                  aria-label="Eliminar permanentemente"
                >
                  <X size={16} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      <ConfirmDeleteModal
        open={confirmEmpty}
        onClose={() => setConfirmEmpty(false)}
        title="Vaciar papelera"
        message="¿Eliminar permanentemente todos los elementos? También se borrarán sus archivos en Storage. Esta acción no se puede deshacer."
        confirmLabel="Vaciar todo"
        onConfirm={() => void handleEmptyTrash()}
      />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar permanentemente"
        message={`¿Borrar "${deleteTarget?.label}" para siempre? Se eliminará también de Firebase Storage si aplica.`}
        confirmLabel="Eliminar"
        onConfirm={() => void handlePermanentDelete()}
      />
    </motion.div>
  );
}