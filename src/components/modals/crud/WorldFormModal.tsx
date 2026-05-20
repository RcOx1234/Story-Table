import { useState, useEffect } from 'react';
import { Globe, FileText, Shield } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { ImageInputField } from '@/components/common/ImageInputField';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';
import type { World, WorldType } from '@/types';

export type WorldFormValues = {
  name: string;
  description: string;
  imageUrl: string;
  tags: string[];
  worldType: WorldType;
  protected: boolean;
  password: string;
  accountPassword?: string;
};

const WORLD_TYPES: { value: WorldType; label: string }[] = [
  { value: 'single', label: 'Mundo único' },
  { value: 'saga', label: 'Saga' },
  { value: 'trilogy', label: 'Trilogía' },
  { value: 'shared', label: 'Universo compartido' },
];

type FormTab = 'basics' | 'story' | 'security';

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
  const [accountPassword, setAccountPassword] = useState('');
  const [nameError, setNameError] = useState('');
  const [tab, setTab] = useState<FormTab>('basics');

  useEffect(() => {
    if (!open) return;
    setName(initialData?.name ?? '');
    setDescription(initialData?.description ?? '');
    setImageUrl(initialData?.imageUrl ?? '');
    setTagsRaw((initialData?.tags ?? []).join(', '));
    setWorldType(initialData?.worldType ?? 'single');
    setProt(initialData?.protected ?? false);
    setPassword('');
    setAccountPassword('');
    setNameError('');
    setTab('basics');
  }, [open, initialData?.id, initialData?.updatedAt]);

  const handleSave = () => {
    if (!name.trim()) {
      setNameError('El nombre es obligatorio');
      setTab('basics');
      return;
    }
    const hasExistingSecret = Boolean(initialData?.passwordHash || initialData?.password);
    if (prot && !password.trim() && !hasExistingSecret) {
      setNameError('Indica una contraseña o desactiva la protección');
      setTab('security');
      return;
    }
    if (initialData?.id && initialData.protected && password.trim() && !accountPassword.trim()) {
      setNameError('Confirma con la contraseña de tu cuenta para cambiar la del mundo');
      setTab('security');
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
      accountPassword: accountPassword.trim() || undefined,
    });
    onClose();
  };

  const tabs: { id: FormTab; label: string; icon: typeof Globe }[] = [
    { id: 'basics', label: 'Identidad', icon: Globe },
    { id: 'story', label: 'Descripción', icon: FileText },
    { id: 'security', label: 'Protección', icon: Shield },
  ];

  const cover = imageUrl.trim();

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initialData?.id ? 'Editar mundo' : 'Nuevo mundo'}
      description="Configura tu proyecto narrativo."
      maxWidthClass="max-w-5xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="story-btn-secondary text-sm">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} className="story-btn-primary text-sm">
            Guardar mundo
          </button>
        </>
      }
    >
      {nameError && (
        <p className="mb-3 rounded-lg border border-[#D61E2B]/30 bg-[#D61E2B]/10 px-3 py-2 text-sm text-[#D61E2B]">
          {nameError}
        </p>
      )}

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-[#2A3045] pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-[#D61E2B] text-white shadow-lg shadow-[#D61E2B]/20'
                : 'bg-[#1E2230] text-[#8B91A7] hover:text-[#E8E9EB]'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid max-h-[62vh] gap-6 overflow-y-auto pr-1 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-3 lg:sticky lg:top-0 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-[#2A3045] bg-gradient-to-b from-[#161922] to-[#0B0D10] shadow-xl">
            <div className="aspect-[4/3] w-full">
              {cover ? (
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-[#5A6078]">
                  <Globe size={40} className="opacity-40" />
                  <span className="text-xs">Portada del mundo</span>
                </div>
              )}
            </div>
            <div className="border-t border-[#2A3045] p-3">
              <p className="truncate text-sm font-semibold text-[#E8E9EB]">{name.trim() || 'Sin nombre'}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#5A6078]">
                {WORLD_TYPES.find((w) => w.value === worldType)?.label}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {tab === 'basics' && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">
                  Nombre del mundo / proyecto *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="story-input w-full"
                  placeholder="Aethelon"
                />
              </div>
              <ImageInputField label="Imagen de portada" value={imageUrl} onChange={setImageUrl} />
              <div>
                <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">Tipo</label>
                <select
                  value={worldType}
                  onChange={(e) => setWorldType(e.target.value as WorldType)}
                  className="story-input w-full text-sm"
                >
                  {WORLD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">
                  Tags (separados por coma)
                </label>
                <input
                  value={tagsRaw}
                  onChange={(e) => setTagsRaw(e.target.value)}
                  className="story-input w-full"
                  placeholder="fantasía, magia, reinos"
                />
              </div>
            </>
          )}

          {tab === 'story' && (
            <div>
              <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">
                Descripción del mundo
              </label>
              <StoryRichTextField
                worldId={initialData?.id}
                value={description}
                onChange={setDescription}
                minHeight="10rem"
                placeholder="De qué trata este mundo, tono, época, conflictos centrales…"
              />
            </div>
          )}

          {tab === 'security' && (
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
                <p className="mt-1 text-xs text-[#5A6078]">
                  Solo quien tenga la clave podrá abrir este mundo en Story Table.
                </p>
                {prot && (
                  <>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="story-input mt-3 w-full"
                      placeholder={
                        initialData?.passwordHash ? 'Nueva contraseña (vacío = sin cambiar)' : 'Contraseña'
                      }
                    />
                    {initialData?.id && initialData.protected && password.trim() ? (
                      <input
                        type="password"
                        value={accountPassword}
                        onChange={(e) => setAccountPassword(e.target.value)}
                        className="story-input mt-2 w-full"
                        placeholder="Contraseña de tu cuenta (obligatoria para cambiar)"
                      />
                    ) : null}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
