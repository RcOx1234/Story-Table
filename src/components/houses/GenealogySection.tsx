import { useEffect, useMemo, useState } from 'react';
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
  const updateCharacter = useAppStore((s) => s.updateCharacter);
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
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editCharacterId, setEditCharacterId] = useState<string | null>(null);
  const [treeFocusId, setTreeFocusId] = useState<string | null>(null);

  const handleSelectCharacter = (id: string) => {
    setSelectedId(id);
    setEditorOpen(true);
  };

  const focusTreeOnly = (id: string) => {
    setSelectedId(id);
    setTreeFocusId(id);
  };

  const openEditForm = (id: string) => {
    setEditCharacterId(id);
    setEditFormOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
  };

  useEffect(() => {
    if (!treeFocusId) return;
    const t = window.setTimeout(() => setTreeFocusId(null), 50);
    return () => window.clearTimeout(t);
  }, [treeFocusId]);

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
  const editCharacter = editCharacterId ? allCharacters.find((c) => c.id === editCharacterId) : undefined;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-mono uppercase tracking-wider text-[#D61E2B]">Árbol genealógico</h3>
        <p className="mt-1 max-w-lg text-xs text-[#5A6078]">
          Árbol de <span className="text-[#8B91A7]">{houseName}</span>. Toca un personaje para editar sus vínculos.
          Clic derecho: menú del personaje.
        </p>
      </div>

      <div className="relative">
        <GenealogyTree
          worldId={worldId}
          characters={treeCharacters}
          rootCharacterId={rootId}
          houseName={houseName}
          selectedId={selectedId}
          scrollToCharacterId={treeFocusId}
          onSelectCharacter={handleSelectCharacter}
          onFocusTree={focusTreeOnly}
          onEditCharacter={openEditForm}
          onAddCharacter={() => setCreateOpen(true)}
        />

        {showEditor && selectedId && (
          <div className="absolute right-0 top-0 z-20 hidden h-full w-full max-w-[min(100%,20rem)] border-l border-[#2A3045] bg-[#0B0D10]/95 shadow-[-12px_0_32px_rgba(0,0,0,0.45)] backdrop-blur-sm lg:block">
            <GenealogyEditor
              open
              variant="panel"
              onClose={closeEditor}
              worldId={worldId}
              characterId={selectedId}
              pickerCharacters={allCharacters}
              houseName={houseName}
              onFocusCharacter={focusTreeOnly}
            />
          </div>
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
            onFocusCharacter={focusTreeOnly}
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

      {editCharacter && (
        <CharacterFormModal
          open={editFormOpen}
          onClose={() => {
            setEditFormOpen(false);
            setEditCharacterId(null);
          }}
          worldId={worldId}
          initial={editCharacter}
          onSubmit={(data) => {
            updateCharacter(editCharacter.id, data);
            toast.success('Personaje actualizado');
            setEditFormOpen(false);
            setEditCharacterId(null);
          }}
        />
      )}
    </div>
  );
}
