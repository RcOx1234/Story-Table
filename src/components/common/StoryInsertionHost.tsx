import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import { ComponentDetailModal } from '@/components/modals/crud/ComponentDetailModal';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';
import { EntityReference } from '@/components/common/EntityReference';
import { FANTASTIC_CATEGORY_LABELS } from '@/lib/fantasticElementLabels';
import type { Component, FantasticElement, FantasticElementCategory, Idea, Organization, Plot } from '@/types';

const ORG_TYPE_LABELS: Record<string, string> = {
  guild: 'Gremio',
  house: 'Casa',
  brotherhood: 'Hermandad',
  company: 'Compañía',
  clan: 'Clan',
  order: 'Orden',
  other: 'Otro',
};

const IDEA_TYPE_LABELS: Record<string, string> = {
  scene: 'Escena',
  character: 'Personaje',
  plot: 'Trama',
  world: 'Mundo',
  dialogue: 'Diálogo',
  lore: 'Lore',
  other: 'Otro',
};

const FANTASTIC_COLORS: Record<FantasticElementCategory, string> = {
  power: '#8B5CF6',
  ability: '#3B82F6',
  spell: '#D61E2B',
  technique: '#EAB308',
  animal: '#22C55E',
};

export function StoryInsertionHost() {
  const preview = useAppStore((s) => s.insertionPreview);
  const close = useAppStore((s) => s.closeInsertionPreview);
  const components = useAppStore((s) => s.components);
  const organizations = useAppStore((s) => s.organizations);
  const ideas = useAppStore((s) => s.ideas);
  const plots = useAppStore((s) => s.plots);
  const fantasticElements = useAppStore((s) => s.fantasticElements);
  const worldFacts = useAppStore((s) => s.worldFacts);
  const worldData = useAppStore((s) => s.worldData);
  const timelines = useAppStore((s) => s.timelines);
  const getCharacterById = useAppStore((s) => s.getCharacterById);
  const getScenesByWorld = useAppStore((s) => s.getScenesByWorld);

  const payload = useMemo(() => {
    if (!preview) return null;
    const { worldId, type, id } = preview;
    switch (type) {
      case 'component': {
        const component = components.find((c) => c.id === id && !c.isDeleted);
        return component ? { type, worldId, component } : null;
      }
      case 'organization': {
        const org = organizations.find((o) => o.id === id && !o.isDeleted);
        return org ? { type, worldId, org } : null;
      }
      case 'idea': {
        const idea = ideas.find((i) => i.id === id && !i.isDeleted);
        return idea ? { type, worldId, idea } : null;
      }
      case 'plot': {
        const plot = plots.find((p) => p.id === id && !p.isDeleted);
        return plot ? { type, worldId, plot } : null;
      }
      case 'fantastic': {
        const el = fantasticElements.find((f) => f.id === id && !f.isDeleted);
        return el ? { type, worldId, fantastic: el } : null;
      }
      case 'fact': {
        const fact = worldFacts.find((f) => f.id === id && !f.isDeleted);
        return fact ? { type, worldId, fact } : null;
      }
      case 'datum': {
        const datum = worldData.find((d) => d.id === id && !d.isDeleted);
        return datum ? { type, worldId, datum } : null;
      }
      case 'timeline': {
        const timeline = timelines.find((t) => t.id === id);
        return timeline ? { type, worldId, timeline } : null;
      }
      default:
        return null;
    }
  }, [preview, components, organizations, ideas, plots, fantasticElements, worldFacts, worldData, timelines]);

  if (!payload) return null;

  if (payload.type === 'component' && 'component' in payload) {
    const { component, worldId } = payload as { type: 'component'; worldId: string; component: Component };
    return (
      <ComponentDetailModal open onClose={close} component={component} worldId={worldId} readOnly />
    );
  }

  if (payload.type === 'organization' && 'org' in payload) {
    const { org, worldId } = payload as { type: 'organization'; worldId: string; org: Organization };
    return (
      <BaseModal
        open
        onClose={close}
        title={org.name}
        description={ORG_TYPE_LABELS[org.type] ?? org.type}
        footer={
          <button type="button" className="story-btn-secondary text-sm" onClick={close}>
            Cerrar
          </button>
        }
      >
        <div className="space-y-5 text-sm">
          <div>
            <h4 className="mb-1 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Objetivos</h4>
            <p className="leading-relaxed text-[#8B91A7]">{org.goals || '—'}</p>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-mono uppercase tracking-wider text-[#5A6078]">Símbolos</h4>
            <p className="leading-relaxed text-[#8B91A7]">{org.symbols || '—'}</p>
          </div>
          {org.members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {org.members.map((mid) => {
                const ch = getCharacterById(mid);
                if (!ch) return null;
                return (
                  <EntityReference key={mid} type="character" id={ch.id} worldId={worldId} label={ch.name} />
                );
              })}
            </div>
          )}
        </div>
      </BaseModal>
    );
  }

  if (payload.type === 'idea' && 'idea' in payload) {
    const { idea, worldId } = payload as { type: 'idea'; worldId: string; idea: Idea };
    return (
      <BaseModal
        open
        onClose={close}
        title={idea.description.slice(0, 60) || 'Idea'}
        description={IDEA_TYPE_LABELS[idea.type] ?? idea.type}
        maxWidthClass="max-w-xl"
        footer={
          <button type="button" className="story-btn-secondary text-sm" onClick={close}>
            Cerrar
          </button>
        }
      >
        <StoryRichTextDisplay text={idea.description} worldId={worldId} className="text-[#E8E9EB]" />
      </BaseModal>
    );
  }

  if (payload.type === 'plot' && 'plot' in payload) {
    const { plot } = payload as { type: 'plot'; worldId: string; plot: Plot };
    const scenes = getScenesByWorld(plot.worldId);
    const charNames = plot.characters
      .map((cid) => getCharacterById(cid)?.name)
      .filter(Boolean)
      .join(', ');
    return (
      <BaseModal
        open
        onClose={close}
        title={plot.title}
        description={plot.synopsis}
        maxWidthClass="max-w-xl"
        footer={
          <button type="button" className="story-btn-secondary text-sm" onClick={close}>
            Cerrar
          </button>
        }
      >
        <div className="space-y-3 text-sm text-[#8B91A7]">
          <p>
            <span className="text-[#5A6078]">Personajes:</span> {charNames || '—'}
          </p>
          <p>
            <span className="text-[#5A6078]">Escenas:</span>{' '}
            {(plot.relatedScenes ?? [])
              .map((sid) => scenes.find((s) => s.id === sid)?.title)
              .filter(Boolean)
              .join(', ') || '—'}
          </p>
        </div>
      </BaseModal>
    );
  }

  if (payload.type === 'fact' && 'fact' in payload) {
    const { fact, worldId } = payload as { type: 'fact'; worldId: string; fact: { title: string; description: string } };
    return (
      <BaseModal
        open
        onClose={close}
        title={fact.title}
        maxWidthClass="max-w-xl"
        footer={
          <button type="button" className="story-btn-secondary text-sm" onClick={close}>
            Cerrar
          </button>
        }
      >
        <StoryRichTextDisplay text={fact.description} worldId={worldId} className="text-[#E8E9EB]" />
      </BaseModal>
    );
  }

  if (payload.type === 'datum' && 'datum' in payload) {
    const { datum, worldId } = payload as { type: 'datum'; worldId: string; datum: { title: string; content: string } };
    return (
      <BaseModal
        open
        onClose={close}
        title={datum.title}
        maxWidthClass="max-w-xl"
        footer={
          <button type="button" className="story-btn-secondary text-sm" onClick={close}>
            Cerrar
          </button>
        }
      >
        <StoryRichTextDisplay text={datum.content} worldId={worldId} className="text-[#E8E9EB]" />
      </BaseModal>
    );
  }

  if (payload.type === 'timeline' && 'timeline' in payload) {
    const { timeline } = payload as { type: 'timeline'; timeline: { name: string; description: string; color: string } };
    return (
      <BaseModal
        open
        onClose={close}
        title={timeline.name}
        description={timeline.description}
        maxWidthClass="max-w-xl"
        footer={
          <button type="button" className="story-btn-secondary text-sm" onClick={close}>
            Cerrar
          </button>
        }
      >
        <p className="text-sm text-[#8B91A7]">
          Color: <span style={{ color: timeline.color }}>{timeline.color}</span>
        </p>
      </BaseModal>
    );
  }

  if (payload.type === 'fantastic' && 'fantastic' in payload) {
    const { fantastic, worldId } = payload as {
      type: 'fantastic';
      worldId: string;
      fantastic: FantasticElement;
    };
    const catColor = FANTASTIC_COLORS[fantastic.category];
    return (
      <AnimatePresence>
        <motion.div
          key={fantastic.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="story-card max-h-[85vh] w-full max-w-lg overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono uppercase" style={{ color: catColor }}>
                  {FANTASTIC_CATEGORY_LABELS[fantastic.category]}
                </p>
                <h2 className="text-xl font-bold text-[#E8E9EB]">{fantastic.name}</h2>
              </div>
              <button type="button" className="story-btn-secondary text-xs" onClick={close}>
                Cerrar
              </button>
            </div>
            <StoryRichTextDisplay text={fantastic.description} worldId={worldId} />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}
