import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BaseModal } from './BaseModal';
import { ImageInputField } from '@/components/common/ImageInputField';
import { EntityMultiPicker } from '@/components/common/EntityMultiPicker';
import { useAppStore } from '@/store';
import type { MapCollection } from '@/types';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: MapCollection | null;
  onSubmit: (data: Omit<MapCollection, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

function empty(worldId: string): Omit<MapCollection, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    name: '',
    description: '',
    imageUrl: '',
    mapIds: [],
  };
}

export function MapCollectionFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const maps = useAppStore((s) => s.getMapsByWorld(worldId));
  const [form, setForm] = useState<Omit<MapCollection, 'id' | 'createdAt' | 'updatedAt'>>(() => empty(worldId));
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...empty(worldId), ...initial, worldId } : empty(worldId));
    setErr('');
  }, [open, worldId, initial?.id, initial?.updatedAt]);

  const patch = (p: Partial<Omit<MapCollection, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const mapItems = useMemo(
    () => maps.map((m) => ({ id: m.id, label: m.name, sublabel: `${m.markers.length} marcadores`, imageUrl: m.imageUrl })),
    [maps]
  );

  const save = () => {
    if (!form.name.trim()) {
      setErr('El nombre es obligatorio');
      return;
    }
    onSubmit({ ...form, name: form.name.trim() });
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar colección' : 'Nueva colección de mapas'}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="story-btn-primary text-sm" onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      {err && <p className="mb-3 text-sm text-[#D61E2B]">{err}</p>}
      <motion.div className="space-y-4" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Nombre *</label>
          <input className="story-input w-full" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripción</label>
          <StoryRichTextField worldId={worldId} value={form.description} onChange={(v) => patch({ description: v })} minHeight="4rem" />
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <ImageInputField label="Imagen de portada" value={form.imageUrl} onChange={(v) => patch({ imageUrl: v })} />
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
          <EntityMultiPicker
            label="Mapas en la colección"
            items={mapItems}
            value={form.mapIds}
            onChange={(ids) => patch({ mapIds: ids })}
            placeholder="Añadir mapas…"
            emptyMessage="No hay mapas en este mundo"
          />
        </motion.div>
      </motion.div>
    </BaseModal>
  );
}
