import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { useAppStore } from '@/store';
import type { MapMarker, MapMarkerEntityType } from '@/types';

const TYPES: { value: MapMarkerEntityType; label: string }[] = [
  { value: 'place', label: 'Lugar' },
  { value: 'scene', label: 'Escena' },
  { value: 'component', label: 'Componente' },
  { value: 'organization', label: 'Organización' },
  { value: 'note', label: 'Nota libre' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: MapMarker | null;
  coords: { x: number; y: number } | null;
  onSubmit: (data: Omit<MapMarker, 'id'> & { id?: string }) => void;
};

function emptyMarker(x: number, y: number): Omit<MapMarker, 'id'> {
  return {
    x,
    y,
    placeId: '',
    placeName: '',
    note: '',
    type: 'note',
    label: '',
    description: '',
    sceneId: '',
    componentId: '',
    organizationId: '',
    color: '#D61E2B',
  };
}

export function MarkerFormModal({ open, onClose, worldId, initial, coords, onSubmit }: Props) {
  const places = useAppStore((s) => s.getPlacesByWorld(worldId));
  const scenes = useAppStore((s) => s.getScenesByWorld(worldId));
  const components = useAppStore((s) => s.getComponentsByWorld(worldId));
  const orgs = useAppStore((s) => s.getOrganizationsByWorld(worldId));
  const [form, setForm] = useState<Omit<MapMarker, 'id'>>(emptyMarker(50, 50));
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    const x = initial?.x ?? coords?.x ?? 50;
    const y = initial?.y ?? coords?.y ?? 50;
    if (initial) {
      setForm({
        x: initial.x,
        y: initial.y,
        placeId: initial.placeId ?? '',
        placeName: initial.placeName ?? '',
        note: initial.note ?? '',
        type: initial.type ?? 'note',
        label: initial.label ?? initial.placeName ?? '',
        description: initial.description ?? initial.note ?? '',
        sceneId: initial.sceneId ?? '',
        componentId: initial.componentId ?? '',
        organizationId: initial.organizationId ?? '',
        color: initial.color ?? '#D61E2B',
        icon: initial.icon,
      });
    } else {
      setForm(emptyMarker(x, y));
    }
    setErr('');
  }, [open, initial, coords]);

  const patch = (p: Partial<Omit<MapMarker, 'id'>>) => setForm((f) => ({ ...f, ...p }));

  const onPlace = (placeId: string) => {
    const pl = places.find((p) => p.id === placeId);
    patch({
      placeId,
      placeName: pl?.name ?? '',
      label: form.label || pl?.name || '',
    });
  };

  const save = () => {
    const label = (form.label || form.placeName || 'Marcador').trim();
    if (!label) {
      setErr('Nombre o etiqueta obligatoria');
      return;
    }
    const placeName = form.placeName || label;
    const note = form.description || form.note || '';
    onSubmit({
      ...form,
      id: initial?.id,
      label,
      placeName,
      note,
      x: Math.min(100, Math.max(0, form.x)),
      y: Math.min(100, Math.max(0, form.y)),
    });
    onClose();
  };

  const mt = form.type ?? 'note';

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar marcador' : 'Nuevo marcador'}
      description={`Posición ${Math.round(form.x)}%, ${Math.round(form.y)}%`}
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
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Nombre / etiqueta</label>
          <input className="story-input w-full" value={form.label ?? ''} onChange={(e) => patch({ label: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tipo</label>
          <select className="story-input w-full text-sm" value={mt} onChange={(e) => patch({ type: e.target.value as MapMarkerEntityType })}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripción</label>
          <textarea className="story-input h-20 w-full resize-none" value={form.description ?? form.note} onChange={(e) => patch({ description: e.target.value, note: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Lugar (opcional)</label>
          <select className="story-input w-full text-sm" value={form.placeId} onChange={(e) => onPlace(e.target.value)}>
            <option value="">—</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Escena (opcional)</label>
          <select
            className="story-input w-full text-sm"
            value={form.sceneId ?? ''}
            onChange={(e) => patch({ sceneId: e.target.value })}
          >
            <option value="">—</option>
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Componente (opcional)</label>
          <select className="story-input w-full text-sm" value={form.componentId ?? ''} onChange={(e) => patch({ componentId: e.target.value })}>
            <option value="">—</option>
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Organización (opcional)</label>
          <select className="story-input w-full text-sm" value={form.organizationId ?? ''} onChange={(e) => patch({ organizationId: e.target.value })}>
            <option value="">—</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Color</label>
          <input type="color" className="h-10 w-full cursor-pointer rounded-lg border border-[#2A3045]" value={form.color ?? '#D61E2B'} onChange={(e) => patch({ color: e.target.value })} />
        </div>
      </div>
    </BaseModal>
  );
}
