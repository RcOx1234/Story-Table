import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useNavigationReturn } from '@/hooks/useNavigationReturn';
import { useStoryDataReady } from '@/hooks/useStoryDataReady';
import { SplashLoader } from '@/components/auth/SplashLoader';
import { useAppStore, useStore } from '@/store';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Heart, Edit2, Trash2, Castle, ScrollText, UserPlus } from 'lucide-react';
import type { NobleRank } from '@/types';
import { GenealogySection } from '@/components/houses/GenealogySection';
import { HouseMembersModal } from '@/components/houses/HouseMembersModal';
import { houseMemberRoleLabel } from '@/lib/houseMemberRoles';
import { HouseFormModal } from '@/components/modals/crud/HouseFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { toast } from 'sonner';
import { StoryRichTextDisplay } from '@/components/common/StoryRichTextDisplay';
import { storyEntityDataAttrs } from '@/lib/storyEntityContext';

const nobleRankLabels: Record<NobleRank, string> = {
  emperor: 'Emperador',
  king: 'Rey',
  duke: 'Duque',
  marquis: 'Marqués',
  count: 'Conde',
  baron: 'Barón',
  knight: 'Caballero',
  commoner: 'Plebeyo',
  other: 'Otro',
};

const tabMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

type TabId = 'info' | 'family';

function InfoBlock({ title, text, worldId }: { title: string; text?: string; worldId: string }) {
  return (
    <motion.div className="story-card p-4" {...tabMotion}>
      <h3 className="mb-2 text-xs font-mono uppercase tracking-wider text-[#5A6078]">{title}</h3>
      <StoryRichTextDisplay text={text ?? ''} worldId={worldId} />
    </motion.div>
  );
}

export function HouseDetail() {
  const { worldId, houseId } = useParams<{ worldId: string; houseId: string }>();
  const dataReady = useStoryDataReady();
  const goBack = useNavigationReturn(`/world/${worldId}?tab=houses`);
  const house = useAppStore((s) => s.houses.find((h) => h.id === houseId && !h.isDeleted));
  const houses = useAppStore((s) => (worldId ? s.getHousesByWorld(worldId) : []));
  const characters = useAppStore((s) => (worldId ? s.getCharactersByWorld(worldId) : []));
  const updateHouse = useAppStore((s) => s.updateHouse);
  const deleteHouse = useAppStore((s) => s.deleteHouse);

  const [tab, setTab] = useState<TabId>('info');
  const [formOpen, setFormOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
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

  if (!dataReady) {
    return <SplashLoader message="Cargando…" submessage="Recuperando datos del mundo" />;
  }

  if (!house || !worldId) {
    return (
      <motion.div className="flex h-[60vh] items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div className="text-center">
          <Castle size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="text-[#5A6078]">Casa no encontrada</p>
        </motion.div>
      </motion.div>
    );
  }

  const parentHouse = houses.find((h) => h.id === house.parentHouseId);
  const members = house.members ?? [];
  const tabs: { id: TabId; label: string }[] = [
    { id: 'info', label: 'Información' },
    { id: 'family', label: 'Familia' },
  ];

  const saveMembers = (nextMembers: typeof members) => {
    const previousIds = members.map((m) => m.characterId);
    const nextIds = nextMembers.map((m) => m.characterId);
    const removedIds = previousIds.filter((id) => !nextIds.includes(id));
    updateHouse(house.id, { members: nextMembers });
    for (const m of nextMembers) {
      useStore.getState().updateCharacter(m.characterId, { houseId: house.id, house: house.name });
    }
    const allChars = useStore.getState().characters;
    for (const id of removedIds) {
      const ch = allChars.find((c) => c.id === id);
      if (ch?.houseId === house.id) {
        useStore.getState().updateCharacter(id, { houseId: undefined, house: '' });
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-4xl"
      {...storyEntityDataAttrs('house', house.id, worldId, house.name)}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button type="button" onClick={goBack} className="rounded-lg p-2 transition-all hover:bg-[#1E2230]">
            <ArrowLeft size={20} className="text-[#8B91A7]" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
                {house.name}
              </h1>
              <span className="rounded-full bg-[#D61E2B]/20 px-2 py-0.5 text-xs font-bold text-[#D61E2B]">
                Influencia {house.influenceLevel}/10
              </span>
            </div>
            {house.motto && <p className="mt-1 text-sm italic text-[#8B91A7]">"{house.motto}"</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] uppercase text-[#8B91A7]">
                {nobleRankLabels[house.nobleRank]}
              </span>
              {parentHouse && (
                <span className="text-xs text-[#5A6078]">Vasalla de {parentHouse.name}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => updateHouse(house.id, { isFavorite: !house.isFavorite })}
            className="rounded-xl p-2.5 hover:bg-[#1E2230]"
          >
            <Heart size={18} className={house.isFavorite ? 'fill-[#D61E2B] text-[#D61E2B]' : 'text-[#5A6078]'} />
          </button>
          <button type="button" onClick={() => setDeleteOpen(true)} className="rounded-xl p-2.5 hover:bg-[#1E2230] hover:text-[#D61E2B]">
            <Trash2 size={18} className="text-[#5A6078]" />
          </button>
          <button type="button" onClick={() => setFormOpen(true)} className="story-btn-secondary text-sm">
            <Edit2 size={14} /> Editar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="story-card overflow-hidden p-0">
            <div className="aspect-square max-h-56 bg-[#111318] lg:max-h-none">
              {house.imageUrl ? (
                <img src={house.imageUrl} alt={house.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center">
                  <Castle size={48} className="text-[#3A4460]" />
                </div>
              )}
            </div>
            <motion.div className="p-4 text-center">
              {house.territory && <p className="text-xs text-[#5A6078]">{house.territory}</p>}
              <p className="mt-1 text-sm text-[#8B91A7]">{members.length} miembros</p>
            </motion.div>
          </div>
          {house.tags?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1">
              {house.tags.map((t) => (
                <span key={t} className="rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] text-[#8B91A7]">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="mb-4 flex gap-1 border-b border-[#1E2230]">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`story-tab ${tab === t.id ? 'active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'info' && (
              <motion.div key="info" className="space-y-3" {...tabMotion}>
                <InfoBlock title="Descripción" text={house.description} worldId={worldId} />
                <InfoBlock title="Linaje" text={house.lineage} worldId={worldId} />
                <InfoBlock title="Símbolos e insignias" text={house.symbols} worldId={worldId} />
              </motion.div>
            )}

            {tab === 'family' && (
              <motion.div key="family" className="space-y-6" {...tabMotion}>
                <div className="story-card p-4">
                  <motion.div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#5A6078]">
                      <ScrollText size={12} /> Miembros ({members.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setMembersOpen(true)}
                      className="story-btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs"
                    >
                      <UserPlus size={14} /> Añadir
                    </button>
                  </motion.div>
                  {members.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[#5A6078]">
                      Aún no hay miembros. Usa «Añadir» para incorporarlos.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {members.map((m) => {
                        const ch = characters.find((c) => c.id === m.characterId);
                        if (!ch) return null;
                        return (
                          <div
                            key={m.characterId}
                            className="flex items-center gap-3 rounded-xl border border-[#2A3045]/80 bg-[#0B0D10]/50 p-2.5"
                          >
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#1E2230]">
                              {ch.images[0] ? (
                                <img src={ch.images[0]} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#8B91A7]">
                                  {ch.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-[#E8E9EB]">{ch.name}</p>
                              <p className="truncate text-[10px] text-[#D61E2B]">{houseMemberRoleLabel(m.role)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {members.length > 0 && (
                  <div className="border-t border-[#1E2230] pt-6">
                    <GenealogySection
                      worldId={worldId!}
                      houseId={house.id}
                      houseName={house.name}
                      members={members}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <HouseMembersModal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        house={house}
        onSave={saveMembers}
      />

      <HouseFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        worldId={worldId}
        initial={house}
        onSubmit={(data) => {
          updateHouse(house.id, data);
          toast.success('Casa actualizada');
        }}
      />

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        message={`¿Enviar «${house.name}» a la papelera?`}
        onConfirm={() => {
          deleteHouse(house.id);
          goBack();
        }}
      />
    </motion.div>
  );
}
