import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useNavigationReturn } from '@/hooks/useNavigationReturn';
import { useStoryDataReady } from '@/hooks/useStoryDataReady';
import { SplashLoader } from '@/components/auth/SplashLoader';
import { validateRelationshipAdd } from '@/lib/relationshipLimits';
import { useAppStore, useStore } from '@/store';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Edit2, Users, Sparkles, Trash2, Plus, Castle, Calendar, Skull } from 'lucide-react';
import { deathCauseLabel } from '@/lib/deathCause';
import { characterStatusForTimeline, characterDeathForTimeline } from '@/lib/characterTimelineAge';
import { RELATIONSHIP_TYPE_OPTIONS } from '@/lib/relationshipTypes';
import { groupRelationships, RELATIONSHIP_GROUP_LABELS, type RelationshipGroupId } from '@/lib/relationshipGroups';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RelationshipChip } from '@/components/common/RelationshipChip';
import { StorySelect } from '@/components/common/StorySelect';
import { relationSlot, type RelationSlot } from '@/lib/characterGenealogy';
import { useNavigate } from 'react-router-dom';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { toast } from 'sonner';
import { CharacterFormModal } from '@/components/modals/crud/CharacterFormModal';
import { CharacterTimelineDetailModal } from '@/components/characters/CharacterTimelineDetailModal';
import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';
import { storyEntityDataAttrs } from '@/lib/storyEntityContext';

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

const REL_GROUPS: RelationshipGroupId[] = [
  'core_family',
  'extended_family',
  'house',
  'friends',
  'conflicts',
  'other',
];

const CORE_SUB_LABELS: Record<RelationSlot, string> = {
  father: 'Padre',
  mother: 'Madre',
  spouse: 'Pareja / cónyuge',
  child: 'Hijos',
  sibling: 'Hermanos',
  extended: 'Otros',
};

function InfoBlock({ title, text, worldId }: { title: string; text?: string; worldId: string }) {
  return (
    <div className="story-card p-4">
      <h3 className="mb-2 text-xs font-mono uppercase tracking-wider text-[#5A6078]">{title}</h3>
      <StoryRichTextDisplay text={text ?? ''} worldId={worldId} />
    </div>
  );
}

function OrphanRelationChip({
  rel,
  onRemove,
}: {
  rel: { characterId: string; characterName: string; type: string };
  onRemove?: () => void;
}) {
  return (
    <div className="flex max-w-full items-center gap-2 rounded-xl border border-[#2A3045] bg-[#111318] py-1.5 pl-2 pr-2">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-[#E8E9EB]">{rel.characterName || 'Personaje'}</span>
        <span className="block truncate text-[10px] text-[#5A6078]">{rel.type}</span>
      </span>
      {onRemove && (
        <button type="button" className="text-[10px] text-[#D61E2B] hover:underline" onClick={onRemove}>
          Quitar
        </button>
      )}
    </div>
  );
}

export function CharacterDetail() {
  const { worldId, characterId } = useParams<{ worldId: string; characterId: string }>();
  const dataReady = useStoryDataReady();
  const navigate = useNavigate();
  const goBack = useNavigationReturn(`/world/${worldId}`);
  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const updateCharacter = useAppStore((s) => s.updateCharacter);
  const syncCharacterRelationship = useAppStore((s) => s.syncCharacterRelationship);
  const toggleFavorite = useAppStore((s) => s.toggleFavoriteCharacter);
  const deleteCharacter = useAppStore((s) => s.deleteCharacter);
  const worldCharacters = useAppStore((s) =>
    worldId ? s.getCharactersByWorld(worldId).filter((ch) => !ch.isDeleted) : []
  );
  const houses = useAppStore((s) => (worldId ? s.getHousesByWorld(worldId) : []));
  const world = useAppStore((s) => s.worlds.find((w) => w.id === worldId));
  const timelines = useAppStore((s) => (worldId ? s.getTimelinesByWorld(worldId) : []));

  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [infoSub, setInfoSub] = useState<InfoSub>('physical');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addRelOpen, setAddRelOpen] = useState(false);
  const [addRelCharId, setAddRelCharId] = useState('');
  const [addRelType, setAddRelType] = useState('');
  const [addRelDesc, setAddRelDesc] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [identityModalOpen, setIdentityModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('edit') === '1') {
      setFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const linkedHouse = character
    ? houses.find((h) => h.id === character.houseId) ?? houses.find((h) => h.name === character.house)
    : undefined;

  if (!dataReady) {
    return <SplashLoader message="Cargando…" submessage="Recuperando datos del mundo" />;
  }

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

  const groupedRels = groupRelationships(character.relationships);

  const mainTimelineId =
    world?.mainTimelineId && timelines.some((t) => t.id === world.mainTimelineId)
      ? world.mainTimelineId
      : timelines[0]?.id;
  const timelineStatus = mainTimelineId
    ? characterStatusForTimeline(character, mainTimelineId, timelines)
    : character.status;
  const deathInfo = mainTimelineId ? characterDeathForTimeline(character, mainTimelineId, timelines) : undefined;
  const mainTimeline = timelines.find((t) => t.id === mainTimelineId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-4xl"
      {...storyEntityDataAttrs('character', character.id, worldId, character.name)}
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
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: statusLabels[timelineStatus ?? character.status].color }}
              />
              <span className="text-sm text-[#8B91A7]">
                {statusLabels[timelineStatus ?? character.status].label}
              </span>
            </div>
            <p className="text-sm text-[#5A6078]">
              {mainTimelineId && character.ageByTimeline?.[mainTimelineId] != null
                ? `${character.ageByTimeline[mainTimelineId]} años`
                : character.age > 0
                  ? `${character.age} años`
                  : 'Edad sin definir'}
            </p>
            {(character.birthDateLabel || character.birthYear) && (
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-[#8B91A7]">
                <Calendar size={11} className="shrink-0" />
                {character.birthDateLabel ||
                  (character.birthYear != null ? `Nac. año ${character.birthYear}` : null)}
              </p>
            )}
            {timelineStatus === 'dead' && (
              <div className="mt-3 rounded-lg border border-[#D61E2B]/25 bg-[#D61E2B]/8 px-3 py-2 text-left text-xs">
                <p className="flex items-center gap-1 font-medium text-[#E8E9EB]">
                  <Skull size={12} className="text-[#D61E2B]" />
                  {deathInfo
                    ? deathCauseLabel(deathInfo.causeType, deathInfo.customCause)
                    : 'Muerto'}
                </p>
                {deathInfo?.dateLabel && (
                  <p className="mt-0.5 text-[10px] text-[#8B91A7]">{deathInfo.dateLabel}</p>
                )}
                {deathInfo?.notes && (
                  <div className="mt-1.5 border-t border-[#2A3045]/50 pt-1.5">
                    <StoryRichTextDisplay text={deathInfo.notes} worldId={worldId} className="text-[10px]" />
                  </div>
                )}
              </div>
            )}
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
              {character.powers ? (
                <StoryRichTextDisplay text={character.powers} worldId={worldId} className="text-sm" />
              ) : null}
              {character.goals ? (
                <div className="mt-2 text-xs">
                  <span className="font-medium text-[#8B91A7]">Meta: </span>
                  <StoryRichTextDisplay text={character.goals} worldId={worldId} className="inline text-[#5A6078]" />
                </div>
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
              <div className="story-card flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#5A6078]">
                    Línea principal
                    {mainTimeline ? ` · ${mainTimeline.name}` : ''}
                  </p>
                  <p className="mt-0.5 text-sm text-[#E8E9EB]">
                    {statusLabels[timelineStatus ?? character.status].label}
                    {mainTimelineId && character.ageByTimeline?.[mainTimelineId] != null
                      ? ` · ${character.ageByTimeline[mainTimelineId]} años`
                      : character.age > 0
                        ? ` · ${character.age} años`
                        : ''}
                  </p>
                  {timelineStatus === 'dead' && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[#8B91A7]">
                      <Skull size={11} className="text-[#D61E2B]" />
                      {deathInfo
                        ? deathCauseLabel(deathInfo.causeType, deathInfo.customCause)
                        : 'Muerto'}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="story-btn-secondary shrink-0 px-3 py-1.5 text-xs"
                  onClick={() => setIdentityModalOpen(true)}
                >
                  Ver más
                </button>
              </div>

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
                  <InfoBlock title="Apariencia" text={character.appearance} worldId={worldId} />
                  <InfoBlock title="Poderes y habilidades" text={character.powers} worldId={worldId} />
                </div>
              )}

              {infoSub === 'personality' && (
                <div className="space-y-3">
                  <InfoBlock title="Personalidad" text={character.personality} worldId={worldId} />
                  <InfoBlock title="Motivaciones y metas" text={character.goals} worldId={worldId} />
                  <InfoBlock title="Miedos" text={character.fears} worldId={worldId} />
                  <InfoBlock title="Traumas" text={character.traumas} worldId={worldId} />
                  <InfoBlock title="Punto de quiebre" text={character.breakingPoint} worldId={worldId} />
                </div>
              )}

              {infoSub === 'story' && (
                <div className="space-y-3">
                  <InfoBlock title="Trasfondo" text={character.backstory} worldId={worldId} />
                  <InfoBlock title="Arco narrativo" text={character.arc} worldId={worldId} />
                  {(character.extraFields?.length ?? 0) > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-mono uppercase tracking-wider text-[#5A6078]">Datos extra</h3>
                      {character.extraFields!.map((field) => (
                        <div key={field.id} className="story-card p-4">
                          <h4 className="mb-2 text-sm font-medium text-[#E8E9EB]">{field.label || 'Sin nombre'}</h4>
                          <StoryRichTextDisplay text={field.value} worldId={worldId} />
                        </div>
                      ))}
                    </div>
                  )}
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
                  <DropdownMenuContent align="end" className="w-80 border-[#2A3045] bg-[#111318] p-3 text-[#E8E9EB]">
                    <p className="mb-2 text-[10px] font-mono uppercase text-[#5A6078]">Nuevo vínculo</p>
                    <StorySelect
                      value={addRelCharId}
                      onChange={setAddRelCharId}
                      options={worldCharacters
                        .filter((ch) => ch.id !== character.id)
                        .map((ch) => ({
                          value: ch.id,
                          label: ch.name,
                          imageUrl: ch.images[0],
                        }))}
                      placeholder="Personaje…"
                      className="mb-2"
                    />
                    <StorySelect
                      value={addRelType}
                      onChange={setAddRelType}
                      options={RELATIONSHIP_TYPE_OPTIONS.map((o) => ({
                        value: o.value,
                        label: o.label,
                        sublabel: o.group,
                      }))}
                      placeholder="Tipo de relación…"
                      className="mb-2"
                    />
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
                        const limitErr = validateRelationshipAdd(character, ch, addRelType);
                        if (limitErr) {
                          toast.error(limitErr);
                          return;
                        }
                        syncCharacterRelationship(character.id, {
                          characterId: ch.id,
                          characterName: ch.name,
                          type: addRelType,
                          description: addRelDesc.trim(),
                          action: 'add',
                        });
                        const fresh = useStore.getState().getCharacterById(character.id);
                        const ok = fresh?.relationships.some(
                          (r) => r.characterId === ch.id && r.type === addRelType
                        );
                        if (!ok) {
                          toast.error('No se guardó la relación. Puede que ya exista padre/madre u otro conflicto.');
                          return;
                        }
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
              {REL_GROUPS.map((bucket) =>
                groupedRels[bucket].length === 0 ? null : (
                <Collapsible key={bucket} defaultOpen>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-[#1E2230] px-3 py-2 text-left text-xs font-mono uppercase tracking-wider text-[#8B91A7]">
                    {RELATIONSHIP_GROUP_LABELS[bucket]}
                    <span className="rounded-full bg-[#111318] px-2 py-0.5 text-[10px] text-[#5A6078]">
                      {groupedRels[bucket].length}
                    </span>
                    <ChevronDown size={14} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-3">
                    {bucket === 'core_family' ? (
                      <>
                        {(['father', 'mother', 'spouse', 'child', 'sibling'] as RelationSlot[]).map((sub) => {
                          const items = groupedRels.core_family.filter((r) => relationSlot(r.type) === sub);
                          if (items.length === 0) return null;
                          return (
                            <div key={sub}>
                              <p className="mb-1.5 text-[10px] uppercase text-[#5A6078]">{CORE_SUB_LABELS[sub]}</p>
                              <div className="flex flex-wrap gap-2">
                                {items.map((rel) => {
                                  const other = worldCharacters.find((c) => c.id === rel.characterId);
                                  const remove = () =>
                                    syncCharacterRelationship(character.id, {
                                      characterId: rel.characterId,
                                      characterName: rel.characterName,
                                      type: rel.type,
                                      action: 'remove',
                                    });
                                  if (!other) {
                                    return (
                                      <OrphanRelationChip key={`${rel.characterId}-${rel.type}`} rel={rel} onRemove={remove} />
                                    );
                                  }
                                  return (
                                    <RelationshipChip
                                      key={`${rel.characterId}-${rel.type}`}
                                      character={other}
                                      relationType={rel.type}
                                      worldId={character.worldId}
                                      onOpen={(id) => navigate(`/world/${worldId}/character/${id}`)}
                                      onRemove={remove}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        {(() => {
                          const orphans = groupedRels.core_family.filter(
                            (r) => !(['father', 'mother', 'spouse', 'child', 'sibling'] as RelationSlot[]).includes(relationSlot(r.type))
                          );
                          if (orphans.length === 0) return null;
                          return (
                            <div>
                              <p className="mb-1.5 text-[10px] uppercase text-[#5A6078]">Otros (familia)</p>
                              <div className="flex flex-wrap gap-2">
                                {orphans.map((rel) => {
                                  const other = worldCharacters.find((c) => c.id === rel.characterId);
                                  const remove = () =>
                                    syncCharacterRelationship(character.id, {
                                      characterId: rel.characterId,
                                      characterName: rel.characterName,
                                      type: rel.type,
                                      action: 'remove',
                                    });
                                  if (!other) {
                                    return <OrphanRelationChip key={`${rel.characterId}-${rel.type}`} rel={rel} onRemove={remove} />;
                                  }
                                  return (
                                    <RelationshipChip
                                      key={`${rel.characterId}-${rel.type}`}
                                      character={other}
                                      relationType={rel.type}
                                      worldId={character.worldId}
                                      onOpen={(id) => navigate(`/world/${worldId}/character/${id}`)}
                                      onRemove={remove}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {groupedRels[bucket].map((rel) => {
                          const other = worldCharacters.find((c) => c.id === rel.characterId);
                          const remove = () =>
                            syncCharacterRelationship(character.id, {
                              characterId: rel.characterId,
                              characterName: rel.characterName,
                              type: rel.type,
                              action: 'remove',
                            });
                          if (!other) {
                            return <OrphanRelationChip key={`${rel.characterId}-${rel.type}`} rel={rel} onRemove={remove} />;
                          }
                          return (
                            <RelationshipChip
                              key={`${rel.characterId}-${rel.type}`}
                              character={other}
                              relationType={rel.type}
                              worldId={character.worldId}
                              onOpen={(id) => navigate(`/world/${worldId}/character/${id}`)}
                              onRemove={remove}
                            />
                          );
                        })}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
                )
              )}
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
                    <StoryRichTextDisplay text={quote} worldId={worldId} className="italic text-[#E8E9EB]" />
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <CharacterTimelineDetailModal
        open={identityModalOpen}
        onClose={() => setIdentityModalOpen(false)}
        character={character}
        worldId={worldId}
        timelines={timelines}
        mainTimelineId={mainTimelineId}
        worldCharacters={worldCharacters}
      />

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
