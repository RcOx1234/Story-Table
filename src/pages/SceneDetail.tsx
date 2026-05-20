import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useNavigationReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Edit2, Flame, MapPin, Users, Music, Quote, Trash2 } from 'lucide-react';
import { EntityReference } from '@/components/common/EntityReference';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';
import { SceneFormModal } from '@/components/modals/crud/SceneFormModal';
import { toast } from 'sonner';
import { storyEntityDataAttrs } from '@/lib/storyEntityContext';

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: '#EAB308' },
  confirmed: { label: 'Confirmado', color: '#22C55E' },
  revision: { label: 'En Revisión', color: '#3B82F6' },
  discarded: { label: 'Descartado', color: '#6B7280' },
  important: { label: 'Importante', color: '#D61E2B' },
  secret: { label: 'Secreto', color: '#8B5CF6' },
  canon: { label: 'Canon', color: '#22C55E' },
  noncanon: { label: 'No Canon', color: '#6B7280' },
};

type TabType = 'content' | 'metadata' | 'dialogues' | 'reveals';

export function SceneDetail() {
  const { worldId, sceneId } = useParams<{ worldId: string; sceneId: string }>();
  const goBack = useNavigationReturn(`/world/${worldId}`);
  const scene = useAppStore((s) => s.scenes.find((sc) => sc.id === sceneId));
  const charactersInWorld = useAppStore((s) =>
    scene ? s.characters.filter((c) => c.worldId === scene.worldId && !c.isDeleted) : []
  );
  const updateScene = useAppStore((s) => s.updateScene);
  const toggleFavorite = useAppStore((s) => s.toggleFavoriteScene);
  const deleteScene = useAppStore((s) => s.deleteScene);
  const [activeTab, setActiveTab] = useState<TabType>('content');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('edit') === '1') {
      setFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (!scene || !worldId) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Flame size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="text-[#5A6078]">Escena no encontrada</p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'content', label: 'Contenido' },
    { id: 'metadata', label: 'Metadatos' },
    { id: 'dialogues', label: 'Diálogos' },
    { id: 'reveals', label: 'Revelaciones' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-4xl"
      {...storyEntityDataAttrs('scene', scene.id, worldId, scene.title)}
    >
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={goBack}
            className="rounded-lg p-2 transition-all hover:bg-[#1E2230]"
          >
            <ArrowLeft size={20} className="text-[#8B91A7]" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
                {scene.title}
              </h1>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                style={{
                  backgroundColor: `${statusLabels[scene.status].color}15`,
                  color: statusLabels[scene.status].color,
                }}
              >
                {statusLabels[scene.status].label}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-[#5A6078]">
              {scene.placeName && (
                <span className="flex items-center gap-1">
                  <MapPin size={10} /> {scene.placeName}
                </span>
              )}
              {scene.timelineName && (
                <span className="flex items-center gap-1">
                  <Flame size={10} /> {scene.timelineName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users size={10} /> {scene.characters.length} personajes
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => toggleFavorite(scene.id)}
            className="rounded-xl p-2.5 transition-all hover:bg-[#1E2230]"
            aria-label="Favorito"
          >
            <Heart size={18} className={scene.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="rounded-xl p-2.5 text-[#5A6078] transition-all hover:bg-[#1E2230] hover:text-[#D61E2B]"
            aria-label="Eliminar escena"
          >
            <Trash2 size={18} />
          </button>
          <button type="button" onClick={() => setFormOpen(true)} className="story-btn-secondary text-sm">
            <Edit2 size={14} /> Editar
          </button>
        </div>
      </div>

      <div className="story-card mb-4 flex items-center gap-3 p-4">
        <Flame size={16} className="text-[#D61E2B]" />
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1E2230]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#22C55E] via-[#EAB308] to-[#D61E2B] transition-all"
            style={{ width: `${(scene.emotionalIntensity / 5) * 100}%` }}
          />
        </div>
        <span className="font-mono text-xs text-[#8B91A7]">{scene.emotionalIntensity}/5</span>
      </div>

      <div className="mb-4 flex gap-1 border-b border-[#1E2230]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`story-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'content' && (
        <div className="story-card p-6">
          {scene.description && (
            <div className="mb-4 border-b border-[#1E2230] pb-4">
              <StoryRichTextDisplay text={scene.description} worldId={worldId} className="italic" />
            </div>
          )}
          {scene.images.length > 0 && (
            <motion.div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {scene.images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="aspect-video w-full rounded-lg border border-[#2A3045] object-cover"
                />
              ))}
            </motion.div>
          )}
          <div className="prose prose-invert max-w-none">
            {scene.content ? (
              <StoryRichTextDisplay text={scene.content} worldId={worldId} className="text-[#E8E9EB]" />
            ) : (
              <p className="py-8 text-center text-[#3A4460]">Sin contenido</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'metadata' && (
        <div className="story-card space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[#5A6078]">Lugar</p>
              {scene.placeId ? (
                <EntityReference type="place" id={scene.placeId} worldId={scene.worldId} label={scene.placeName || 'Lugar'} />
              ) : (
                <p className="text-sm text-[#E8E9EB]">No asignado</p>
              )}
            </div>
            <div>
              <p className="mb-1 font-mono text-xs uppercase tracking-wider text-[#5A6078]">Timeline</p>
              <p className="text-sm text-[#E8E9EB]">{scene.timelineName || 'No asignado'}</p>
            </div>
          </div>
          {(scene.mood || scene.importance || scene.draft) && (
            <div className="flex flex-wrap gap-3 text-xs text-[#8B91A7]">
              {scene.mood && <span className="rounded-full bg-[#1E2230] px-2 py-1">Estado de ánimo: {scene.mood}</span>}
              {scene.importance && <span className="rounded-full bg-[#1E2230] px-2 py-1">Importancia: {scene.importance}</span>}
              {scene.draft && <span className="rounded-full bg-[#EAB308]/20 px-2 py-1 text-[#EAB308]">Borrador</span>}
            </div>
          )}
          <div>
            <p className="mb-2 flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-[#5A6078]">
              <Users size={10} /> Personajes en escena
            </p>
            <div className="flex flex-wrap gap-2">
              {scene.characters.length === 0 && <p className="text-sm text-[#5A6078]">Ninguno vinculado</p>}
              {scene.characters.map((cid) => {
                const ch = charactersInWorld.find((c) => c.id === cid);
                if (!ch) return null;
                return <EntityReference key={cid} type="character" id={cid} worldId={scene.worldId} label={ch.name} />;
              })}
            </div>
          </div>
          {scene.music && (
            <div>
              <p className="mb-1 flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-[#5A6078]">
                <Music size={10} /> Música / Ambiente
              </p>
              <p className="text-sm text-[#8B91A7]">{scene.music}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'dialogues' && (
        <div className="space-y-3">
          {scene.dialogues.length === 0 ? (
            <div className="py-8 text-center text-[#5A6078]">No hay diálogos registrados</div>
          ) : (
            scene.dialogues.map((dialogue, i) => {
              const dChar = charactersInWorld.find((c) => c.name === dialogue.characterName);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="story-card p-4"
                >
                  <div className="flex items-start gap-3">
                    <Quote size={14} className="mt-1 flex-shrink-0 text-[#D61E2B]" />
                    <div className="min-w-0">
                      {dChar ? (
                        <EntityReference type="character" id={dChar.id} worldId={scene.worldId} label={dialogue.characterName} />
                      ) : (
                        <p className="text-sm font-medium text-[#D61E2B]">{dialogue.characterName}</p>
                      )}
                      <p className="mt-2 text-sm text-[#E8E9EB]">{dialogue.text}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'reveals' && (
        <div className="space-y-3">
          {scene.reveals.length === 0 ? (
            <div className="py-8 text-center text-[#5A6078]">No hay revelaciones registradas</div>
          ) : (
            scene.reveals.map((reveal, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="story-card border-l-2 border-[#8B5CF6] p-4"
              >
                <p className="text-sm text-[#E8E9EB]">{reveal}</p>
              </motion.div>
            ))
          )}
        </div>
      )}

      <SceneFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        worldId={worldId}
        initial={scene}
        onSubmit={(data) => {
          updateScene(scene.id, data);
          toast.success('Escena actualizada');
        }}
      />

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        message={`¿Enviar a la papelera la escena «${scene.title}»?`}
        onConfirm={() => {
          deleteScene(scene.id);
          goBack();
        }}
      />
    </motion.div>
  );
}
