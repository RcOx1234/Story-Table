import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';
import { ImageInputField } from '@/components/common/ImageInputField';
import type { MapData } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: MapData | null;
  onSubmit: (data: Omit<MapData, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

function empty(worldId: string): Omit<MapData, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    name: '',
    description: '',
    imageUrl: '',
    markers: [],
    isFavorite: false,
  };
}

export function MapFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const [form, setForm] = useState<Omit<MapData, 'id' | 'createdAt' | 'updatedAt'>>(() => empty(worldId));
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...empty(worldId), ...initial, worldId, markers: initial.markers ?? [] } : empty(worldId));
    setErr('');
  }, [open, initial, worldId]);

  const patch = (p: Partial<Omit<MapData, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.name.trim()) {
      setErr('El nombre es obligatorio');
      return;
    }
    if (!form.imageUrl.trim()) {
      setErr('Indica una imagen base (URL)');
      return;
    }
    onSubmit({ ...form, name: form.name.trim(), imageUrl: form.imageUrl.trim() });
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar mapa' : 'Nuevo mapa'}
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
      {err && <p className="mb-2 text-sm text-[#D61E2B]">{err}</p>}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Nombre *</label>
          <input className="story-input w-full" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripción</label>
          <StoryRichTextField worldId={worldId} value={form.description ?? ''} onChange={(v) => patch({ description: v })} minHeight="5rem" />
        </div>
        <ImageInputField label="Imagen base" value={form.imageUrl} onChange={(v) => patch({ imageUrl: v })} required />
      </div>
    </BaseModal>
  );
}
