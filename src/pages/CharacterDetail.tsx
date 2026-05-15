import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Edit2, Save, Users, Sparkles, Trash2 } from 'lucide-react';
import type { Character } from '@/types';
import { EntityReference } from '@/components/common/EntityReference';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';

const roleLabels: Record<string, string> = {
  protagonist: 'Protagonista', antagonist: 'Antagonista', secondary: 'Secundario',
  supporting: 'Apoyo', extra: 'Extra',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  alive: { label: 'Vivo', color: '#22C55E' },
  dead: { label: 'Muerto', color: '#6B7280' },
  missing: { label: 'Desaparecido', color: '#EAB308' },
  unknown: { label: 'Desconocido', color: '#5A6078' },
};

type TabType = 'info' | 'relationships' | 'quotes';

export function CharacterDetail() {
  const { worldId, characterId } = useParams<{ worldId: string; characterId: string }>();
  const navigate = useNavigate();
  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const toggleFavorite = useAppStore((s) => s.toggleFavoriteCharacter);
  const deleteCharacter = useAppStore((s) => s.deleteCharacter);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Character>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!character) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Users size={48} className="text-[#2A3045] mx-auto mb-4" />
          <p className="text-[#5A6078]">Personaje no encontrado</p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    updateCharacter(character.id, editData);
    setIsEditing(false);
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'info', label: 'Información' },
    { id: 'relationships', label: 'Relaciones' },
    { id: 'quotes', label: 'Citas' },
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
              <h1 className="text-2xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>{character.name}</h1>
              {character.alias && <span className="text-sm text-[#8B91A7]">"{character.alias}"</span>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${character.role === 'protagonist' ? '#22C55E' : character.role === 'antagonist' ? '#D61E2B' : '#3B82F6'}15`, color: character.role === 'protagonist' ? '#22C55E' : character.role === 'antagonist' ? '#D61E2B' : '#3B82F6' }}>
                {roleLabels[character.role]}
              </span>
              <span className="text-xs text-[#5A6078]">{character.house}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toggleFavorite(character.id)} className="p-2.5 rounded-xl hover:bg-[#1E2230] transition-all" aria-label="Favorito">
            <Heart size={18} className={character.isFavorite ? 'text-[#D61E2B] fill-[#D61E2B]' : 'text-[#5A6078]'} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="p-2.5 rounded-xl hover:bg-[#1E2230] transition-all text-[#5A6078] hover:text-[#D61E2B]"
            aria-label="Eliminar personaje"
          >
            <Trash2 size={18} />
          </button>
          <button 
            onClick={() => { if (isEditing) handleSave(); setIsEditing(!isEditing); }}
            className="story-btn-secondary text-sm"
          >
            {isEditing ? <><Save size={14} /> Guardar</> : <><Edit2 size={14} /> Editar</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Avatar & Quick Info */}
        <div className="space-y-4">
          <div className="story-card p-6 text-center">
            <div className="w-32 h-32 rounded-full mx-auto mb-4 overflow-hidden bg-[#1E2230]">
              {character.images[0] ? (
                <img src={character.images[0]} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-[#8B91A7]">
                  {character.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusLabels[character.status].color }} />
              <span className="text-sm text-[#8B91A7]">{statusLabels[character.status].label}</span>
            </div>
            <p className="text-sm text-[#5A6078]">{character.age} años</p>
          </div>

          {character.powers && (
            <div className="story-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-[#8B5CF6]" />
                <h3 className="text-sm font-semibold text-[#E8E9EB]">Poderes</h3>
              </div>
              {isEditing ? (
                <textarea value={editData.powers ?? character.powers} onChange={(e) => setEditData({ ...editData, powers: e.target.value })} className="story-input w-full h-24 text-sm" />
              ) : (
                <p className="text-sm text-[#8B91A7]">{character.powers}</p>
              )}
            </div>
          )}
        </div>

        {/* Right - Tabs & Content */}
        <div className="lg:col-span-2">
          <div className="flex gap-1 border-b border-[#1E2230] mb-4">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`story-tab ${activeTab === tab.id ? 'active' : ''}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'info' && (
            <div className="space-y-4">
              {[
                { key: 'appearance', label: 'Apariencia', icon: Users },
                { key: 'personality', label: 'Personalidad', icon: Sparkles },
                { key: 'backstory', label: 'Historia', icon: Users },
                { key: 'goals', label: 'Metas', icon: Sparkles },
                { key: 'fears', label: 'Miedos', icon: Users },
                { key: 'arc', label: 'Arco', icon: Sparkles },
              ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="story-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} className="text-[#D61E2B]" />
                    <h3 className="text-sm font-semibold text-[#E8E9EB] font-mono uppercase tracking-wider">{label}</h3>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={editData[key as keyof Character] as string ?? character[key as keyof Character] as string}
                      onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                      className="story-input w-full h-24 text-sm"
                    />
                  ) : (
                    <p className="text-sm text-[#8B91A7] whitespace-pre-wrap">{(character[key as keyof Character] as string) || <span className="text-[#3A4460]">Sin información</span>}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'relationships' && (
            <div className="space-y-3">
              {character.relationships.length === 0 ? (
                <div className="text-center py-8 text-[#5A6078]">No hay relaciones registradas</div>
              ) : (
                character.relationships.map((rel, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="story-card p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#D61E2B]/10 flex items-center justify-center flex-shrink-0">
                      <Users size={16} className="text-[#D61E2B]" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <EntityReference
                          type="character"
                          id={rel.characterId}
                          worldId={character.worldId}
                          label={rel.characterName}
                        />
                        <span className="text-[10px] uppercase tracking-wider text-[#D61E2B] bg-[#D61E2B]/10 px-2 py-0.5 rounded-full">{rel.type}</span>
                      </div>
                      <p className="text-xs text-[#8B91A7]">{rel.description}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="space-y-3">
              {character.quotes.length === 0 ? (
                <div className="text-center py-8 text-[#5A6078]">No hay citas registradas</div>
              ) : (
                character.quotes.map((quote, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="border-l-2 border-[#D61E2B] pl-4 py-2">
                    <p className="text-sm text-[#E8E9EB] italic">"{quote}"</p>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        message={`¿Enviar a la papelera a «${character.name}»?`}
        onConfirm={() => {
          deleteCharacter(character.id);
          navigate(worldId ? `/world/${worldId}` : '/');
        }}
      />
    </motion.div>
  );
}
