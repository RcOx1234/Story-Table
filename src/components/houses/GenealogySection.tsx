import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, useStore } from '@/store';
import { GenealogyTree } from '@/components/houses/GenealogyTree';
import { GenealogyEditor } from '@/components/houses/GenealogyEditor';
import { CharacterFormModal } from '@/components/modals/crud/CharacterFormModal';
import { getHouseGenealogyCharacters, pickGenealogyRoot } from '@/lib/characterGenealogy';
import { toast } from 'sonner';
import type { HouseMember } from '@/types';

type Props = {
  worldId: string;
  houseId: string;
  houseName: string;
  members: HouseMember[];
};

export function GenealogySection({ worldId, houseId, houseName, members }: Props) {
  const allCharacters = useAppStore((s) => s.getCharactersByWorld(worldId));
  const addCharacter = useAppStore((s) => s.addCharacter);
  const updateHouse = useAppStore((s) => s.updateHouse);
  const houses = useAppStore((s) => s.houses);

  const memberIds = useMemo(() => members.map((m) => m.characterId), [members]);
  const treeCharacters = useMemo(
    () => getHouseGenealogyCharacters(memberIds, allCharacters),
    [memberIds, allCharacters]
  );

  const headMember = members.find((m) => m.role === 'head') ?? members[0];
  const rootId = useMemo(
    () => pickGenealogyRoot(treeCharacters, headMember?.characterId) ?? memberIds[0] ?? '',
    [treeCharacters, headMember?.characterId, memberIds]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const handleSelectCharacter = (id: string) => {
    setSelectedId(id);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
  };

  const addToHouse = (charId: string) => {
    const house = houses.find((h) => h.id === houseId);
    if (!house) return;
    const existing = house.members ?? [];
    if (existing.some((m) => m.characterId === charId)) return;
    updateHouse(houseId, {
      members: [...existing, { characterId: charId, role: 'blood' }],
    });
  };

  const showEditor = editorOpen && !!selectedId;

  return (
    <motion.div className="space-y-3" layout>
      <div>
        <h3 className="text-sm font-mono uppercase tracking-wider text-[#D61E2B]">Árbol genealógico</h3>
        <p className="mt-1 max-w-lg text-xs text-[#5A6078]">
          Árbol de <span className="text-[#8B91A7]">{houseName}</span>. Toca un personaje para editar sus vínculos.
        </p>
      </div>

      <div className={`grid gap-4 ${showEditor ? 'lg:grid-cols-5' : ''}`}>
        <div className={showEditor ? 'lg:col-span-3' : ''}>
          <GenealogyTree
            characters={treeCharacters}
            rootCharacterId={rootId}
            houseName={houseName}
            selectedId={selectedId}
            onSelectCharacter={handleSelectCharacter}
            onAddCharacter={() => setCreateOpen(true)}
          />
        </div>

        {showEditor && selectedId && (
          <motion.div
            className="hidden lg:col-span-2 lg:block"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <GenealogyEditor
              open
              variant="panel"
              onClose={closeEditor}
              worldId={worldId}
              characterId={selectedId}
              pickerCharacters={allCharacters}
              houseName={houseName}
              onFocusCharacter={(id) => {
                setSelectedId(id);
                setEditorOpen(true);
              }}
            />
          </motion.div>
        )}
      </div>

      {showEditor && selectedId && (
        <div className="lg:hidden">
          <GenealogyEditor
            open
            variant="dialog"
            onClose={closeEditor}
            worldId={worldId}
            characterId={selectedId}
            pickerCharacters={allCharacters}
            houseName={houseName}
            onFocusCharacter={(id) => {
              setSelectedId(id);
              setEditorOpen(true);
            }}
          />
        </div>
      )}

      <CharacterFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        worldId={worldId}
        defaultHouseId={houseId}
        defaultHouseName={houseName}
        onSubmit={(data) => {
          const before = new Set(useStore.getState().getCharactersByWorld(worldId).map((c) => c.id));
          addCharacter({ ...data, houseId, house: houseName });
          const added = useStore.getState().getCharactersByWorld(worldId).find((c) => !before.has(c.id));
          if (added) addToHouse(added.id);
          toast.success('Personaje creado y añadido a la casa');
          setCreateOpen(false);
          setSelectedId(added?.id ?? null);
          if (added) setEditorOpen(true);
        }}
      />
    </motion.div>
  );
}
