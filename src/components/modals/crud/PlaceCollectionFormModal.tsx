import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BaseModal } from './BaseModal';
import { ImageInputField } from '@/components/common/ImageInputField';
import { EntityMultiPicker } from '@/components/common/EntityMultiPicker';
import { useAppStore } from '@/store';
import type { PlaceCollection } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: PlaceCollection | null;
  onSubmit: (data: Omit<PlaceCollection, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

function empty(worldId: string): Omit<PlaceCollection, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    name: '',
    description: '',
    imageUrl: '',
    placeIds: [],
    isDeleted: false,
  };
}

export function PlaceCollectionFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const places = useAppStore((s) => s.getPlacesByWorld(worldId));
  const [form, setForm] = useState<Omit<PlaceCollection, 'id' | 'createdAt' | 'updatedAt'>>(() => empty(worldId));
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...empty(worldId), ...initial, worldId } : empty(worldId));
    setErr('');
  }, [open, worldId, initial?.id, initial?.updatedAt]);

  const patch = (p: Partial<Omit<PlaceCollection, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const placeItems = useMemo(
    () => places.map((p) => ({ id: p.id, label: p.name, sublabel: p.type, imageUrl: p.mapUrl || undefined })),
    [places]
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
      title={initial ? 'Editar colección' : 'Nueva colección de lugares'}
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
          <textarea
            className="story-input h-20 w-full resize-none"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <ImageInputField label="Imagen de portada" value={form.imageUrl} onChange={(v) => patch({ imageUrl: v })} />
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
          <EntityMultiPicker
            label="Lugares en la colección"
            items={placeItems}
            value={form.placeIds}
            onChange={(ids) => patch({ placeIds: ids })}
            placeholder="Añadir lugares…"
            emptyMessage="No hay lugares en este mundo"
          />
        </motion.div>
      </motion.div>
    </BaseModal>
  );
}