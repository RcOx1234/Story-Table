import { BaseModal } from './BaseModal';
import { LetterPreview } from '@/components/common/LetterPreview';
import { EntityReference } from '@/components/common/EntityReference';
import { useAppStore } from '@/store';
import type { Component } from '@/types';

const typeLabels: Record<Component['type'], string> = {
  object: 'Objeto',
  letter: 'Carta',
  relic: 'Reliquia',
  weapon: 'Arma',
  artifact: 'Artefacto',
  other: 'Otro',
};

type Props = {
  open: boolean;
  onClose: () => void;
  component: Component | null;
  worldId: string;
  onEdit: () => void;
};

export function ComponentDetailModal({ open, onClose, component, worldId, onEdit }: Props) {
  const scenes = useAppStore((s) => s.getScenesByWorld(worldId));

  if (!component) return null;

  const linkedScenes = component.scenes
    .map((id) => scenes.find((s) => s.id === id))
    .filter(Boolean);

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={component.name}
      description={typeLabels[component.type]}
      maxWidthClass={component.type === 'letter' ? 'max-w-2xl' : 'max-w-xl'}
      footer={
        <>
          <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="story-btn-primary text-sm" onClick={onEdit}>
            Editar
          </button>
        </>
      }
    >
      <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
        {component.type === 'letter' ? (
          <LetterPreview component={component} />
        ) : (
          <>
            {component.imageUrl && (
              <img
                src={component.imageUrl}
                alt=""
                className="max-h-56 w-full rounded-xl border border-[#2A3045] object-cover"
              />
            )}
            <div className="space-y-4 text-sm">
              {component.description && (
                <div>
                  <h4 className="mb-1 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Descripción</h4>
                  <p className="whitespace-pre-wrap leading-relaxed text-[#E8E9EB]">{component.description}</p>
                </div>
              )}
              {component.history && (
                <div>
                  <h4 className="mb-1 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Historia / origen</h4>
                  <p className="whitespace-pre-wrap leading-relaxed text-[#8B91A7]">{component.history}</p>
                </div>
              )}
              {component.target && (
                <div>
                  <h4 className="mb-1 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Vinculado a</h4>
                  <p className="text-[#E8E9EB]">{component.target}</p>
                </div>
              )}
              {component.effect && (
                <div>
                  <h4 className="mb-1 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Poder / efecto</h4>
                  <p className="whitespace-pre-wrap text-[#EAB308]">{component.effect}</p>
                </div>
              )}
            </div>
          </>
        )}

        {linkedScenes.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Aparece en escenas</h4>
            <div className="flex flex-wrap gap-2">
              {linkedScenes.map((s) =>
                s ? (
                  <EntityReference key={s.id} type="scene" id={s.id} worldId={worldId} label={s.title} />
                ) : null
              )}
            </div>
          </div>
        )}

        {component.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {component.tags.map((t) => (
              <span key={t} className="rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] text-[#8B91A7]">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
