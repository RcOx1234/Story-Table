import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigationReturn } from '@/hooks/useNavigationReturn';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Edit2, Users, Sparkles, Trash2, Plus, Castle } from 'lucide-react';
import { RELATIONSHIP_TYPE_OPTIONS, relationshipTypeLabel } from '@/lib/relationshipTypes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EntityReference } from '@/components/common/EntityReference';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { toast } from 'sonner';
import { CharacterFormModal } from '@/components/modals/crud/CharacterFormModal';

const roleLabels: Record<string, string> = {
  protagonist: 'Protagonista',
  antagonist: 'Antagonista',
  secondary: 'Secundario',
  supporting: 'Apoyo',
  extra: 'Extra',
  king: 'Rey',
  queen: 'Reina',
  assassin: 'Asesino',
  prince: 'Príncipe',
  princess: 'Princesa',
  other: 'Otro',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  alive: { label: 'Vivo', color: '#22C55E' },
  dead: { label: 'Muerto', color: '#6B7280' },
  missing: { label: 'Desaparecido', color: '#EAB308' },
  unknown: { label: 'Desconocido', color: '#5A6078' },
};

type TabType = 'info' | 'relationships' | 'quotes';
type InfoSub = 'physical' | 'personality' | 'story';

function relationshipBucket(type: string): 'family' | 'friends' | 'rivals' | 'other' {
  const t = type.toLowerCase();
  if (/familia|padre|madre|herman|hij[oa]|primo|tío|tia|abuel|consorte|espos|marid|mujer/i.test(t)) return 'family';
  if (/amig|aliad|mentor|compañ|alumno|maestro/i.test(t)) return 'friends';
  if (/enemig|rival|antagon|adversari|odio/i.test(t)) return 'rivals';
  return 'other';
}

const relSectionLabels: Record<string, string> = {
  family: 'Familia y vínculos cercanos',
  friends: 'Amistades y alianzas',
  rivals: 'Rivalidades y tensión',
  other: 'Otros vínculos',
};

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="story-card p-4">
      <h3 className="mb-2 text-xs font-mono uppercase tracking-wider text-[#5A6078]">{title}</h3>
      <div className="text-sm leading-relaxed text-[#8B91A7]">{children}</div>
    </div>
  );
}

export function CharacterDetail() {
  const { worldId, characterId } = useParams<{ worldId: string; characterId: string }>();
  const goBack = useNavigationReturn(`/world/${worldId}`);
  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const toggleFavorite = useAppStore((s) => s.toggleFavoriteCharacter);
  const deleteCharacter = useAppStore((s) => s.deleteCharacter);
  const worldCharacters = useAppStore((s) =>
    worldId ? s.getCharactersByWorld(worldId).filter((ch) => !ch.isDeleted) : []
  );
  const houses = useAppStore((s) => (worldId ? s.getHousesByWorld(worldId) : []));

  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [infoSub, setInfoSub] = useState<InfoSub>('physical');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addRelOpen, setAddRelOpen] = useState(false);
  const [addRelCharId, setAddRelCharId] = useState('');
  const [addRelType, setAddRelType] = useState('');
  const [addRelDesc, setAddRelDesc] = useState('');

  const linkedHouse = character
    ? houses.find((h) => h.id === character.houseId) ?? houses.find((h) => h.name === character.house)
    : undefined;

  if (!character || !worldId) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Users size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="text-[#5A6078]">Personaje no encontrado</p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'info', label: 'Información' },
    { id: 'relationships', label: 'Relaciones' },
    { id: 'quotes', label: 'Citas' },
  ];

  const infoSubTabs: { id: InfoSub; label: string }[] = [
    { id: 'physical', label: 'Física y poder' },
    { id: 'personality', label: 'Personalidad' },
    { id: 'story', label: 'Historia' },
  ];

  const groupedRels = character.relationships.reduce(
    (acc, rel) => {
      const b = relationshipBucket(rel.type);
      acc[b].push(rel);
      return acc;
    },
    { family: [] as typeof character.relationships, friends: [] as typeof character.relationships, rivals: [] as typeof character.relationships, other: [] as typeof character.relationships }
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl">
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
                {character.name}
              </h1>
              {character.alias && <span className="text-sm text-[#8B91A7]">"{character.alias}"</span>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wider"
                style={{
                  backgroundColor: `${character.role === 'protagonist' ? '#22C55E' : character.role === 'antagonist' ? '#D61E2B' : '#3B82F6'}15`,
                  color: character.role === 'protagonist' ? '#22C55E' : character.role === 'antagonist' ? '#D61E2B' : '#3B82F6',
                }}
              >
                {roleLabels[character.role] ?? character.role}
              </span>
              {linkedHouse ? (
                <span className="flex items-center gap-1 rounded-full bg-[#1E2230] px-2 py-0.5 text-xs text-[#8B91A7]">
                  <Castle size={10} className="text-[#EAB308]" />
                  {linkedHouse.name}
                </span>
              ) : character.house ? (
                <span className="text-xs text-[#5A6078]">{character.house}</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => toggleFavorite(character.id)}
            className="rounded-xl p-2.5 transition-all hover:bg-[#1E2230]"
            aria-label="Favorito"
          >
            <Heart size={18} className={character.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="rounded-xl p-2.5 text-[#5A6078] transition-all hover:bg-[#1E2230] hover:text-[#D61E2B]"
            aria-label="Eliminar personaje"
          >
            <Trash2 size={18} />
          </button>
          <button type="button" onClick={() => setFormOpen(true)} className="story-btn-secondary text-sm">
            <Edit2 size={14} /> Editar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="story-card p-6 text-center">
            <div className="mx-auto mb-4 h-32 w-32 overflow-hidden rounded-full bg-[#1E2230]">
              {character.images[0] ? (
                <img src={character.images[0]} alt={character.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-[#8B91A7]">
                  {character.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="mb-2 flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusLabels[character.status].color }} />
              <span className="text-sm text-[#8B91A7]">{statusLabels[character.status].label}</span>
            </div>
            <p className="text-sm text-[#5A6078]">{character.age} años</p>
            {linkedHouse && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-[#8B91A7]">
                <Castle size={12} className="text-[#EAB308]" />
                Casa {linkedHouse.name}
              </p>
            )}
            {character.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1">
                {character.tags.map((t) => (
                  <span key={t} className="rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] text-[#8B91A7]">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {(character.powers || character.goals) && (
            <div className="story-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={14} className="text-[#8B5CF6]" />
                <h3 className="text-sm font-semibold text-[#E8E9EB]">Destacado</h3>
              </div>
              {character.powers ? <p className="text-sm text-[#8B91A7]">{character.powers}</p> : null}
              {character.goals ? (
                <p className="mt-2 text-xs text-[#5A6078]">
                  <span className="font-medium text-[#8B91A7]">Meta: </span>
                  {character.goals}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
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

          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1 border-b border-[#1E2230]/80 pb-2">
                {infoSubTabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setInfoSub(t.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      infoSub === t.id ? 'bg-[#D61E2B] text-white' : 'bg-[#1E2230] text-[#8B91A7] hover:text-[#E8E9EB]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {infoSub === 'physical' && (
                <div className="space-y-3">
                  <InfoBlock title="Apariencia">{character.appearance || 'Sin datos.'}</InfoBlock>
                  <InfoBlock title="Poderes y habilidades">{character.powers || 'Sin datos.'}</InfoBlock>
                </div>
              )}

              {infoSub === 'personality' && (
                <div className="space-y-3">
                  <InfoBlock title="Personalidad">{character.personality || 'Sin datos.'}</InfoBlock>
                  <InfoBlock title="Motivaciones y metas">{character.goals || 'Sin datos.'}</InfoBlock>
                  <InfoBlock title="Miedos">{character.fears || 'Sin datos.'}</InfoBlock>
                  <InfoBlock title="Traumas">{character.traumas || 'Sin datos.'}</InfoBlock>
                  <InfoBlock title="Punto de quiebre">{character.breakingPoint || 'Sin datos.'}</InfoBlock>
                </div>
              )}

              {infoSub === 'story' && (
                <div className="space-y-3">
                  <InfoBlock title="Trasfondo">{character.backstory || 'Sin datos.'}</InfoBlock>
                  <InfoBlock title="Arco narrativo">{character.arc || 'Sin datos.'}</InfoBlock>
                </div>
              )}
            </div>
          )}

          {activeTab === 'relationships' && (
            <div className="space-y-6">
              <motion.div
                className="flex items-center justify-between gap-2"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#5A6078]">Vínculos</h4>
                <DropdownMenu open={addRelOpen} onOpenChange={setAddRelOpen}>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="story-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs">
                      <Plus size={14} /> Agregar
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72 border-[#2A3045] bg-[#111318] p-3 text-[#E8E9EB]">
                    <p className="mb-2 text-[10px] font-mono uppercase text-[#5A6078]">Nuevo vínculo</p>
                    <select
                      className="story-input mb-2 w-full text-sm"
                      value={addRelCharId}
                      onChange={(e) => setAddRelCharId(e.target.value)}
                    >
                      <option value="">Personaje…</option>
                      {worldCharacters
                        .filter((ch) => ch.id !== character.id)
                        .map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            {ch.name}
                          </option>
                        ))}
                    </select>
                    <select
                      className="story-input mb-2 w-full text-sm"
                      value={addRelType}
                      onChange={(e) => setAddRelType(e.target.value)}
                    >
                      <option value="">Tipo de relación…</option>
                      {['Familia', 'Vínculos', 'Tensión', 'Otros'].map((group) => (
                        <optgroup key={group} label={group}>
                          {RELATIONSHIP_TYPE_OPTIONS.filter((o) => o.group === group).map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <input
                      className="story-input mb-2 w-full text-sm"
                      placeholder="Descripción (opcional)"
                      value={addRelDesc}
                      onChange={(e) => setAddRelDesc(e.target.value)}
                    />
                    <button
                      type="button"
                      className="story-btn-primary w-full text-xs"
                      onClick={() => {
                        const ch = worldCharacters.find((x) => x.id === addRelCharId);
                        if (!ch || !addRelType) {
                          toast.error('Elige personaje y tipo de relación');
                          return;
                        }
                        updateCharacter(character.id, {
                          relationships: [
                            ...character.relationships,
                            {
                              characterId: ch.id,
                              characterName: ch.name,
                              type: addRelType,
                              description: addRelDesc.trim(),
                            },
                          ],
                        });
                        setAddRelCharId('');
                        setAddRelType('');
                        setAddRelDesc('');
                        setAddRelOpen(false);
                        toast.success('Relación añadida');
                      }}
                    >
                      Guardar
                    </button>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
              {(['family', 'friends', 'rivals', 'other'] as const).map((bucket) => (
                <div key={bucket}>
                  <h4 className="mb-2 text-xs font-mono uppercase tracking-wider text-[#D61E2B]">{relSectionLabels[bucket]}</h4>
                  {groupedRels[bucket].length === 0 ? (
                    <p className="text-sm text-[#3A4460]">Nada registrado en esta categoría.</p>
                  ) : (
                    <div className="space-y-3">
                      {groupedRels[bucket].map((rel, i) => (
                        <motion.div
                          key={`${rel.characterId}-${i}`}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="story-card flex items-center gap-4 p-4"
                        >
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#D61E2B]/10">
                            <Users size={16} className="text-[#D61E2B]" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <EntityReference
                                type="character"
                                id={rel.characterId}
                                worldId={character.worldId}
                                label={rel.characterName}
                              />
                              <span className="rounded-full bg-[#D61E2B]/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#D61E2B]">
                                {relationshipTypeLabel(rel.type)}
                              </span>
                            </div>
                            <p className="text-xs text-[#8B91A7]">{rel.description}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="space-y-3">
              {character.quotes.length === 0 ? (
                <div className="py-8 text-center text-[#5A6078]">No hay citas registradas</div>
              ) : (
                character.quotes.map((quote, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-l-2 border-[#D61E2B] py-2 pl-4"
                  >
                    <p className="text-sm italic text-[#E8E9EB]">"{quote}"</p>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <CharacterFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        worldId={worldId}
        initial={character}
        onSubmit={(data) => updateCharacter(character.id, data)}
      />

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        message={`¿Enviar a la papelera a «${character.name}»?`}
        onConfirm={() => {
          deleteCharacter(character.id);
          goBack();
        }}
      />
    </motion.div>
  );
}
