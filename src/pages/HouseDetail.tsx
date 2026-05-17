import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigationReturn } from '@/hooks/useNavigationReturn';
import { useAppStore, useStore } from '@/store';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Edit2, Trash2, Castle, Users, ScrollText } from 'lucide-react';
import type { NobleRank } from '@/types';
import { FamilyTree } from '@/components/houses/FamilyTree';
import { EntityReference } from '@/components/common/EntityReference';
import { houseMemberRoleLabel } from '@/lib/houseMemberRoles';
import { migrateHouseGenealogy } from '@/lib/houseGenealogyMigrate';
import { HouseFormModal } from '@/components/modals/crud/HouseFormModal';
import { ConfirmDeleteModal } from '@/components/modals/crud/ConfirmDeleteModal';
import { toast } from 'sonner';

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

type TabId = 'info' | 'family';

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="story-card p-4">
      <h3 className="mb-2 text-xs font-mono uppercase tracking-wider text-[#5A6078]">{title}</h3>
      <motion.div className="text-sm leading-relaxed text-[#8B91A7]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {children}
      </motion.div>
    </div>
  );
}

export function HouseDetail() {
  const { worldId, houseId } = useParams<{ worldId: string; houseId: string }>();
  const goBack = useNavigationReturn(`/world/${worldId}?tab=houses`);
  const house = useAppStore((s) => s.houses.find((h) => h.id === houseId && !h.isDeleted));
  const houses = useAppStore((s) => (worldId ? s.getHousesByWorld(worldId) : []));
  const characters = useAppStore((s) => (worldId ? s.getCharactersByWorld(worldId) : []));
  const timelines = useAppStore((s) => s.timelines.filter((t) => t.worldId === worldId));
  const houseGenealogy = useMemo(() => (house ? migrateHouseGenealogy(house) : null), [house]);
  const updateHouse = useAppStore((s) => s.updateHouse);
  const deleteHouse = useAppStore((s) => s.deleteHouse);

  const [tab, setTab] = useState<TabId>('info');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!house || !worldId) {
    return (
      <motion.div className="flex h-[60vh] items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="text-center">
          <Castle size={48} className="mx-auto mb-4 text-[#2A3045]" />
          <p className="text-[#5A6078]">Casa no encontrada</p>
        </div>
      </motion.div>
    );
  }

  const parentHouse = houses.find((h) => h.id === house.parentHouseId);
  const members = house.members ?? [];
  const tabs: { id: TabId; label: string }[] = [
    { id: 'info', label: 'Información' },
    { id: 'family', label: 'Familia' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl">
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
            <div className="p-4 text-center">
              {house.territory && <p className="text-xs text-[#5A6078]">{house.territory}</p>}
              <p className="mt-1 text-sm text-[#8B91A7]">{members.length} miembros</p>
            </div>
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

        <motion.div className="lg:col-span-2" layout>
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

          {tab === 'info' && (
            <motion.div className="space-y-3" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <InfoBlock title="Descripción">{house.description || 'Sin descripción.'}</InfoBlock>
              <InfoBlock title="Linaje">{house.lineage || 'Sin datos.'}</InfoBlock>
              <InfoBlock title="Símbolos e insignias">{house.symbols || 'Sin datos.'}</InfoBlock>
            </motion.div>
          )}

          {tab === 'family' && (
            <motion.div className="space-y-6" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              {members.length === 0 ? (
                <div className="story-card py-10 text-center text-sm text-[#5A6078]">
                  <Users size={32} className="mx-auto mb-3 text-[#2A3045]" />
                  <p>No hay miembros registrados.</p>
                  <p className="mt-1 text-xs">Añádelos desde Editar casa.</p>
                </div>
              ) : (
                <>
                  <div className="story-card p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#5A6078]">
                      <ScrollText size={12} /> Miembros
                    </h3>
                    <div className="space-y-2">
                      {members.map((m) => {
                        const ch = characters.find((c) => c.id === m.characterId);
                        if (!ch) return null;
                        return (
                          <div
                            key={m.characterId}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#1E2230] px-3 py-2"
                          >
                            <EntityReference type="character" id={ch.id} worldId={worldId} label={ch.name} />
                            <span className="rounded-full bg-[#D61E2B]/15 px-2 py-0.5 text-[10px] text-[#D61E2B]">
                              {houseMemberRoleLabel(m.role)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <p className="mb-3 text-xs text-[#5A6078]">
                    Miembros oficiales: {members.length} · Personas en el árbol:{' '}
                    {houseGenealogy?.familyPeople?.length ?? members.length}
                  </p>
                  <FamilyTree
                    worldId={worldId!}
                    house={houseGenealogy ?? house}
                    characters={characters}
                    timelines={timelines}
                  />
                </>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      <HouseFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        worldId={worldId}
        initial={house}
        onSubmit={(data) => {
          const previousIds = (house.members ?? []).map((m) => m.characterId);
          const nextIds = (data.members ?? []).map((m) => m.characterId);
          const removedIds = previousIds.filter((id) => !nextIds.includes(id));
          updateHouse(house.id, data);
          for (const m of data.members ?? []) {
            useStore.getState().updateCharacter(m.characterId, { houseId: house.id, house: data.name });
          }
          const allChars = useStore.getState().characters;
          for (const id of removedIds) {
            const ch = allChars.find((c) => c.id === id);
            if (ch?.houseId === house.id) {
              useStore.getState().updateCharacter(id, { houseId: undefined, house: '' });
            }
          }
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
