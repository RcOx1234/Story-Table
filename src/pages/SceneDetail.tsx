import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Edit2, Save, Flame, MapPin, Users, Music, Quote, Trash2 } from 'lucide-react';
import type { Scene } from '@/types';
import { EntityReference } from '@/components/common/EntityReference';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';

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
  const navigate = useNavigate();
  const scene = useAppStore((s) => s.scenes.find((sc) => sc.id === sceneId));
  const charactersInWorld = useAppStore((s) =>
    scene ? s.characters.filter((c) => c.worldId === scene.worldId && !c.isDeleted) : []
  );
  const updateScene = useAppStore((s) => s.updateScene);
  const toggleFavorite = useAppStore((s) => s.toggleFavoriteScene);
  const deleteScene = useAppStore((s) => s.deleteScene);
  const [activeTab, setActiveTab] = useState<TabType>('content');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Scene>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!scene) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Flame size={48} className="text-[#2A3045] mx-auto mb-4" />
          <p className="text-[#5A6078]">Escena no encontrada</p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    updateScene(scene.id, editData);
    setIsEditing(false);
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'content', label: 'Contenido' },
    { id: 'metadata', label: 'Metadatos' },
    { id: 'dialogues', label: 'Diálogos' },
    { id: 'reveals', label: 'Revelaciones' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/world/${worldId}`)} className="p-2 rounded-lg hover:bg-[#1E2230] transition-all">
            <ArrowLeft size={20} className="text-[#8B91A7]" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>{scene.title}</h1>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${statusLabels[scene.status].color}15`, color: statusLabels[scene.status].color }}>
                {statusLabels[scene.status].label}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-[#5A6078]">
              {scene.placeName && <span className="flex items-center gap-1"><MapPin size={10} /> {scene.placeName}</span>}
              {scene.timelineName && <span className="flex items-center gap-1"><Flame size={10} /> {scene.timelineName}</span>}
              <span className="flex items-center gap-1"><Users size={10} /> {scene.characters.length} personajes</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => toggleFavorite(scene.id)} className="p-2.5 rounded-xl hover:bg-[#1E2230] transition-all" aria-label="Favorito">
            <Heart size={18} className={scene.isFavorite ? 'text-[#D61E2B] fill-[#D61E2B]' : 'text-[#5A6078]'} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="p-2.5 rounded-xl hover:bg-[#1E2230] transition-all text-[#5A6078] hover:text-[#D61E2B]"
            aria-label="Eliminar escena"
          >
            <Trash2 size={18} />
          </button>
          <button type="button" onClick={() => { if (isEditing) handleSave(); setIsEditing(!isEditing); }} className="story-btn-secondary text-sm">
            {isEditing ? <><Save size={14} /> Guardar</> : <><Edit2 size={14} /> Editar</>}
          </button>
        </div>
      </div>

      {/* Intensity bar */}
      <div className="story-card p-4 mb-4 flex items-center gap-3">
        <Flame size={16} className="text-[#D61E2B]" />
        <div className="flex-1 h-2 bg-[#1E2230] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#22C55E] via-[#EAB308] to-[#D61E2B] rounded-full transition-all" style={{ width: `${(scene.emotionalIntensity / 5) * 100}%` }} />
        </div>
        <span className="text-xs text-[#8B91A7] font-mono">{scene.emotionalIntensity}/5</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1E2230] mb-4">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`story-tab ${activeTab === tab.id ? 'active' : ''}`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'content' && (
        <div className="story-card p-6">
          {scene.description && (
            <div className="mb-4 pb-4 border-b border-[#1E2230]">
              <p className="text-sm text-[#8B91A7] italic">{scene.description}</p>
            </div>
          )}
          {isEditing ? (
            <textarea
              value={editData.content ?? scene.content}
              onChange={(e) => setEditData({ ...editData, content: e.target.value })}
              className="story-input w-full min-h-[400px] text-sm font-mono leading-relaxed"
            />
          ) : (
            <div className="prose prose-invert max-w-none">
              {scene.content ? (
                <div className="text-sm text-[#E8E9EB] leading-relaxed whitespace-pre-wrap">{scene.content}</div>
              ) : (
                <p className="text-[#3A4460] text-center py-8">Sin contenido</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'metadata' && (
        <div className="story-card p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-[#5A6078] mb-2">Lugar</p>
              {scene.placeId ? (
                <EntityReference
                  type="place"
                  id={scene.placeId}
                  worldId={scene.worldId}
                  label={scene.placeName || 'Lugar'}
                />
              ) : (
                <p className="text-sm text-[#E8E9EB]">No asignado</p>
              )}
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-[#5A6078] mb-1">Timeline</p>
              <p className="text-sm text-[#E8E9EB]">{scene.timelineName || 'No asignado'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[#5A6078] mb-2 flex items-center gap-1">
              <Users size={10} /> Personajes en escena
            </p>
            <div className="flex flex-wrap gap-2">
              {scene.characters.length === 0 && (
                <p className="text-sm text-[#5A6078]">Ninguno vinculado</p>
              )}
              {scene.characters.map((cid) => {
                const ch = charactersInWorld.find((c) => c.id === cid);
                if (!ch) return null;
                return (
                  <EntityReference key={cid} type="character" id={cid} worldId={scene.worldId} label={ch.name} />
                );
              })}
            </div>
          </div>
          {scene.music && (
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-[#5A6078] mb-1 flex items-center gap-1"><Music size={10} /> Música / Ambiente</p>
              <p className="text-sm text-[#8B91A7]">{scene.music}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'dialogues' && (
        <div className="space-y-3">
          {scene.dialogues.length === 0 ? (
            <div className="text-center py-8 text-[#5A6078]">No hay diálogos registrados</div>
          ) : (
            scene.dialogues.map((dialogue, i) => {
              const dChar = charactersInWorld.find((c) => c.name === dialogue.characterName);
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="story-card p-4">
                  <div className="flex items-start gap-3">
                    <Quote size={14} className="text-[#D61E2B] flex-shrink-0 mt-1" />
                    <div className="min-w-0">
                      {dChar ? (
                        <EntityReference type="character" id={dChar.id} worldId={scene.worldId} label={dialogue.characterName} />
                      ) : (
                        <p className="text-sm font-medium text-[#D61E2B]">{dialogue.characterName}</p>
                      )}
                      <p className="text-sm text-[#E8E9EB] mt-2">{dialogue.text}</p>
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
            <div className="text-center py-8 text-[#5A6078]">No hay revelaciones registradas</div>
          ) : (
            scene.reveals.map((reveal, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="story-card p-4 border-l-2 border-[#8B5CF6]">
                <p className="text-sm text-[#E8E9EB]">{reveal}</p>
              </motion.div>
            ))
          )}
        </div>
      )}

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        message={`¿Enviar a la papelera la escena «${scene.title}»?`}
        onConfirm={() => {
          deleteScene(scene.id);
          navigate(worldId ? `/world/${worldId}` : '/');
        }}
      />
    </motion.div>
  );
}
