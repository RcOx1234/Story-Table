import { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal';
import { useAppStore } from '@/store';
import type { Component } from '@/types';
import { Box, Mail, Gem, Sword, Sparkles, ScrollText, type LucideIcon } from 'lucide-react';
import { ImageInputField } from '@/components/common/ImageInputField';
import { StoryRichTextField } from '@/components/common/StoryRichTextField';
import { EntityMultiPicker } from '@/components/common/EntityMultiPicker';

const TYPES: { value: Component['type']; label: string }[] = [
  { value: 'object', label: 'Objeto' },
  { value: 'letter', label: 'Carta' },
  { value: 'relic', label: 'Reliquia' },
  { value: 'weapon', label: 'Arma' },
  { value: 'artifact', label: 'Artefacto' },
  { value: 'other', label: 'Otro' },
];

const TYPE_ICONS: Record<Component['type'], LucideIcon> = {
  object: Box,
  letter: Mail,
  relic: Gem,
  weapon: Sword,
  artifact: Sparkles,
  other: ScrollText,
};

const TARGET_LABEL: Record<Component['type'], string> = {
  object: 'Ubicación o dueño actual',
  letter: 'Destinatario de la carta',
  relic: 'Guardián o portador',
  weapon: 'Portador o dueño',
  artifact: 'Vinculado a (persona u organización)',
  other: 'Dirigido a / propietario',
};

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: Component | null;
  onSubmit: (data: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

function empty(worldId: string): Omit<Component, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    name: '',
    description: '',
    history: '',
    target: '',
    effect: '',
    imageUrl: '',
    letterFrom: '',
    letterTo: '',
    letterDate: '',
    letterSalutation: '',
    letterClosing: '',
    scenes: [],
    type: 'object',
    isFavorite: false,
    isDeleted: false,
    tags: [],
  };
}

export function ComponentFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const sceneList = useAppStore((s) => s.getScenesByWorld(worldId));
  const [form, setForm] = useState<Omit<Component, 'id' | 'createdAt' | 'updatedAt'>>(() => empty(worldId));
  const [tagsRaw, setTagsRaw] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...empty(worldId), ...initial, worldId } : empty(worldId));
    setTagsRaw((initial?.tags ?? []).join(', '));
    setErr('');
  }, [open, worldId, initial?.id, initial?.updatedAt]);

  const patch = (p: Partial<Omit<Component, 'id' | 'createdAt' | 'updatedAt'>>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    if (!form.name.trim()) {
      setErr('El nombre es obligatorio');
      return;
    }
    if (form.type === 'letter' && !form.description.trim()) {
      setErr('Escribe el cuerpo de la carta');
      return;
    }
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({ ...form, name: form.name.trim(), tags });
    onClose();
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar componente' : 'Nuevo componente'}
      maxWidthClass="max-w-3xl"
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
      <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-[#2A3045] bg-[#111318]/90 p-2">
        {TYPES.map(({ value, label }) => {
          const Icon = TYPE_ICONS[value];
          const active = form.type === value;
          return (
            <button
              key={value}
              type="button"
              title={label}
              onClick={() => patch({ type: value })}
              className={`rounded-lg p-2.5 transition-all ${
                active ? 'bg-[#D61E2B]/25 text-[#D61E2B] shadow-[0_0_0_1px_rgba(214,30,43,0.35)]' : 'text-[#5A6078] hover:bg-[#1E2230] hover:text-[#E8E9EB]'
              }`}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>
      <div className="max-h-[60vh] space-y-3 overflow-y-auto">
        <div>
          <label className="mb-1 flex items-center gap-2 text-xs uppercase text-[#5A6078]">
            <Box size={12} className="text-[#8B5CF6]" /> Nombre *
          </label>
          <input className="story-input w-full" value={form.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tipo</label>
          <select className="story-input w-full text-sm" value={form.type} onChange={(e) => patch({ type: e.target.value as Component['type'] })}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <ImageInputField label="Imagen del componente" value={form.imageUrl ?? ''} onChange={(v) => patch({ imageUrl: v })} />
        {form.type === 'letter' ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs uppercase text-[#5A6078]">De (remitente)</label>
                <input className="story-input w-full" value={form.letterFrom ?? ''} onChange={(e) => patch({ letterFrom: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-[#5A6078]">Para (destinatario)</label>
                <input className="story-input w-full" value={form.letterTo ?? form.target} onChange={(e) => patch({ letterTo: e.target.value, target: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-[#5A6078]">Fecha</label>
                <input className="story-input w-full" value={form.letterDate ?? ''} onChange={(e) => patch({ letterDate: e.target.value })} placeholder="Ej. 12 de marzo de 1847" />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase text-[#5A6078]">Saludo inicial</label>
                <input className="story-input w-full" value={form.letterSalutation ?? ''} onChange={(e) => patch({ letterSalutation: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Cuerpo de la carta *</label>
              <StoryRichTextField worldId={worldId} value={form.description} onChange={(v) => patch({ description: v })} minHeight="7rem" className="[&_textarea]:font-serif" />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Despedida / cierre</label>
              <input className="story-input w-full" value={form.letterClosing ?? ''} onChange={(e) => patch({ letterClosing: e.target.value })} />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripción</label>
              <StoryRichTextField worldId={worldId} value={form.description} onChange={(v) => patch({ description: v })} minHeight="4rem" />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">Historia / origen</label>
              <StoryRichTextField worldId={worldId} value={form.history} onChange={(v) => patch({ history: v })} minHeight="4rem" />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase text-[#5A6078]">{TARGET_LABEL[form.type]}</label>
              <input className="story-input w-full" value={form.target} onChange={(e) => patch({ target: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs uppercase text-[#5A6078]">
                <Sparkles size={12} className="text-[#EAB308]" /> Poderes o efecto
              </label>
              <StoryRichTextField worldId={worldId} value={form.effect ?? ''} onChange={(v) => patch({ effect: v })} minHeight="3.5rem" />
            </div>
          </>
        )}
        <EntityMultiPicker
          label="Escenas donde aparece"
          items={sceneList.map((s) => ({
            id: s.id,
            label: s.title,
            sublabel: s.description?.slice(0, 60) || undefined,
          }))}
          value={form.scenes}
          onChange={(ids) => patch({ scenes: ids })}
          placeholder="Buscar y elegir escenas…"
          emptyMessage="No hay escenas en este mundo"
        />
        <div>
          <label className="mb-1 block text-xs uppercase text-[#5A6078]">Tags (coma)</label>
          <input className="story-input w-full" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
        </div>
      </div>
    </BaseModal>
  );
}