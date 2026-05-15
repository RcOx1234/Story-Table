import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import type { World, WorldType } from '@/types';

export type WorldFormValues = {
  name: string;
  description: string;
  imageUrl: string;
  tags: string[];
  worldType: WorldType;
  protected: boolean;
  password: string;
};

const WORLD_TYPES: { value: WorldType; label: string }[] = [
  { value: 'single', label: 'Mundo único' },
  { value: 'saga', label: 'Saga' },
  { value: 'trilogy', label: 'Trilogía' },
  { value: 'shared', label: 'Universo compartido' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<World>;
  onSubmit: (data: WorldFormValues) => void;
};

export function WorldFormModal({ open, onClose, initialData, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [worldType, setWorldType] = useState<WorldType>('single');
  const [prot, setProt] = useState(false);
  const [password, setPassword] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(initialData?.name ?? '');
    setDescription(initialData?.description ?? '');
    setImageUrl(initialData?.imageUrl ?? '');
    setTagsRaw((initialData?.tags ?? []).join(', '));
    setWorldType(initialData?.worldType ?? 'single');
    setProt(initialData?.protected ?? false);
    setPassword('');
    setNameError('');
  }, [open, initialData]);

  const handleSave = () => {
    if (!name.trim()) {
      setNameError('El nombre es obligatorio');
      return;
    }
    const hasExistingSecret = Boolean(initialData?.passwordHash || initialData?.password);
    if (prot && !password.trim() && !hasExistingSecret) {
      setNameError('Indica una contraseña o desactiva la protección');
      return;
    }
    setNameError('');
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      tags,
      worldType,
      protected: prot,
      password: password.trim(),
    });
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initialData?.id ? 'Editar mundo' : 'Nuevo mundo'}
      description="Configura tu proyecto narrativo."
      maxWidthClass="max-w-3xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="story-btn-secondary text-sm">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} className="story-btn-primary text-sm">
            Guardar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">Nombre del mundo / proyecto *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="story-input w-full" placeholder="Aethelon" />
          {nameError && <p className="mt-1 text-xs text-[#D61E2B]">{nameError}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="story-input h-24 w-full resize-none"
            placeholder="De qué trata este mundo..."
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">Imagen de portada (URL)</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="story-input w-full" placeholder="https://..." />
          <p className="mt-1 text-[10px] text-[#5A6078]">La subida de archivos se completará con Storage.</p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">Tags (separados por coma)</label>
          <input
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            className="story-input w-full"
            placeholder="fantasía, magia, reinos"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">Tipo</label>
          <select value={worldType} onChange={(e) => setWorldType(e.target.value as WorldType)} className="story-input w-full text-sm">
            {WORLD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-[#2A3045] bg-[#111318] p-4">
          <input
            id="world-prot"
            type="checkbox"
            checked={prot}
            onChange={(e) => setProt(e.target.checked)}
            className="mt-1 rounded border-[#2A3045]"
          />
          <div className="flex-1">
            <label htmlFor="world-prot" className="text-sm font-medium text-[#E8E9EB]">
              Proteger con contraseña
            </label>
            {prot && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="story-input mt-2 w-full"
                placeholder={initialData?.passwordHash ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
              />
            )}
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
