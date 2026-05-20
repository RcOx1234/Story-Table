import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Baby, GitBranch, Plus, Users, X } from 'lucide-react';
import { useAppStore } from '@/store';
import { StorySelect } from '@/components/common/StorySelect';
import { RelationshipChip } from '@/components/common/RelationshipChip';
import {
  collectGenealogyIssues,
  getCharacterRelationsBySlot,
  getSpouseIds,
  type RelationSlot,
} from '@/lib/characterGenealogy';
import { GenealogyIssuesPanel } from '@/components/houses/GenealogyIssuesPanel';
import {
  encodeRelationshipDescription,
  getBirthOrder,
  parseRelationshipDescription,
} from '@/lib/relationshipMeta';
import {
  childRelationType,
  genderSublabel,
  normalizeGender,
  siblingRelationTypeFor,
  spouseRelationTypeFor,
} from '@/lib/characterGender';
import { useStore } from '@/store';
import { validateRelationshipAdd } from '@/lib/relationshipLimits';
import { normalizeKey } from '@/lib/normalizeLabels';
import { inverseRelationshipType, isChildRelationType, isParentRelationType } from '@/lib/relationshipSync';
import { relationshipTypeLabel } from '@/lib/relationshipTypes';

const SPOUSE_SLOT_TYPES = /^(espos[oa]|consorte|pareja|marido|mujer)$/;
import { toast } from 'sonner';
import type { Character } from '@/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const TYPE_OPTIONS: Partial<Record<RelationSlot, { value: string; label: string }[]>> = {
  spouse: [
    { value: 'esposo', label: 'Esposo' },
    { value: 'esposa', label: 'Esposa' },
    { value: 'pareja', label: 'Pareja' },
    { value: 'consorte', label: 'Consorte' },
  ],
  extended: [
    { value: 'abuelo', label: 'Abuelo' },
    { value: 'abuela', label: 'Abuela' },
    { value: 'tío', label: 'Tío' },
    { value: 'tía', label: 'Tía' },
    { value: 'primo', label: 'Primo' },
    { value: 'prima', label: 'Prima' },
    { value: 'sobrino', label: 'Sobrino' },
    { value: 'sobrina', label: 'Sobrina' },
  ],
};

const SLOT_CONFIG: {
  slot: RelationSlot;
  title: string;
  icon: typeof Users;
  addType: string;
  addLabel: string;
}[] = [
  { slot: 'father', title: 'Padre', icon: Users, addType: 'padre', addLabel: 'Añadir' },
  { slot: 'mother', title: 'Madre', icon: Users, addType: 'madre', addLabel: 'Añadir' },
  { slot: 'spouse', title: 'Pareja', icon: GitBranch, addType: 'esposo', addLabel: 'Añadir' },
  { slot: 'child', title: 'Hijos', icon: Baby, addType: 'hijo', addLabel: 'Añadir' },
  { slot: 'sibling', title: 'Hermanos', icon: Users, addType: 'hermano', addLabel: 'Añadir' },
  { slot: 'extended', title: 'Extendida', icon: GitBranch, addType: 'abuelo', addLabel: 'Añadir' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  characterId: string;
  pickerCharacters: Character[];
  houseName?: string;
  variant?: 'dialog' | 'panel';
  onFocusCharacter?: (characterId: string) => void;
};

function SectionHeader({ title, icon: Icon, count }: { title: string; icon: typeof Users; count: number }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <Icon size={14} className="text-[#D61E2B]" />
      <h4 className="text-xs font-medium text-[#E8E9EB]">{title}</h4>
      {count > 0 && (
        <span className="ml-auto rounded-full bg-[#1E2230] px-2 py-0.5 text-[10px] text-[#5A6078]">{count}</span>
      )}
    </div>
  );
}

function RelationSection({
  title,
  icon,
  entries,
  worldId,
  addLabel,
  addType,
  slot,
  showTypePicker = false,
  typeOptions,
  characterOptions,
  allCharacters,
  excludeKeys,
  spouses,
  rootId,
  rootGender,
  onAdd,
  onAddChild,
  onRemove,
  onUpdateBirthOrder,
}: {
  title: string;
  icon: typeof Users;
  entries: { rel: { type: string; description: string }; character: Character }[];
  worldId: string;
  addLabel: string;
  addType: string;
  slot: RelationSlot;
  showTypePicker?: boolean;
  typeOptions?: { value: string; label: string }[];
  characterOptions: { value: string; label: string; sublabel?: string; imageUrl?: string }[];
  allCharacters: Character[];
  excludeKeys: Set<string>;
  spouses: Character[];
  rootId: string;
  rootGender?: Character['gender'];
  onAdd: (targetId: string, type: string, inverseType?: string) => void;
  onAddChild: (opts: { childId: string; isMother: boolean; coParentId?: string; birthOrder: number }) => void;
  onRemove: (targetId: string, type: string, inverseType?: string) => void;
  onUpdateBirthOrder: (targetId: string, type: string, order: number) => void;
}) {
  const [pickId, setPickId] = useState('');
  const [pickType, setPickType] = useState(addType);
  const [isMother, setIsMother] = useState(
    () => normalizeGender(rootGender) === 'female' || slot === 'mother'
  );
  const [coParentId, setCoParentId] = useState('');
  const [birthOrder, setBirthOrder] = useState('1');

  const genderFilter: 'male' | 'female' | undefined =
    slot === 'spouse'
      ? normalizeGender(rootGender) === 'male'
        ? 'female'
        : normalizeGender(rootGender) === 'female'
          ? 'male'
          : undefined
      : slot === 'father'
        ? 'male'
        : slot === 'mother'
          ? 'female'
          : undefined;

  const available = useMemo(() => {
    return characterOptions.filter((o) => {
      if (!o.value) return false;
      if (slot === 'spouse' || slot === 'sibling') {
        if (excludeKeys.has(o.value)) return false;
      }
      return (
        !excludeKeys.has(`${o.value}|${addType}`) &&
        !excludeKeys.has(`${o.value}|hijo`) &&
        !excludeKeys.has(`${o.value}|hija`)
      );
    });
  }, [characterOptions, excludeKeys, addType, slot]);

  const spouseOptions = spouses.map((s) => ({
    value: s.id,
    label: s.name,
    sublabel: s.house || undefined,
    imageUrl: s.images[0],
  }));

  const handleAdd = () => {
    if (!pickId) {
      toast.error('Elige un personaje');
      return;
    }
    if (slot === 'child') {
      onAddChild({
        childId: pickId,
        isMother,
        coParentId: coParentId || undefined,
        birthOrder: Math.max(1, parseInt(birthOrder, 10) || 1),
      });
    } else if (slot === 'father') {
      onAdd(pickId, 'padre', childRelationType(rootGender));
    } else if (slot === 'mother') {
      onAdd(pickId, 'madre', childRelationType(rootGender));
    } else if (slot === 'spouse') {
      const targetChar = allCharacters.find((c) => c.id === pickId) ?? null;
      if (!targetChar) return;
      const t = spouseRelationTypeFor(normalizeGender(rootGender), targetChar.gender);
      const inv = spouseRelationTypeFor(normalizeGender(targetChar.gender), rootGender);
      onAdd(pickId, t, inv);
    } else if (slot === 'sibling') {
      const targetChar = allCharacters.find((c) => c.id === pickId);
      if (!targetChar) return;
      const t = siblingRelationTypeFor(targetChar.gender);
      const inv = siblingRelationTypeFor(rootGender);
      onAdd(pickId, t, inv);
    } else {
      onAdd(pickId, pickType);
    }
    setPickId('');
    setCoParentId('');
  };

  return (
    <section className="rounded-xl border border-[#2A3045]/80 bg-gradient-to-b from-[#13161c] to-[#0B0D10]/60 p-3.5">
      <SectionHeader title={title} icon={icon} count={entries.length} />
      {entries.length > 0 ? (
        <div className="mb-3 space-y-2">
          {entries.map(({ rel, character }) => {
            const order = slot === 'child' ? getBirthOrder(rel.description) : null;
            return (
              <motion.div
                key={`${slot}-${character.id}`}
                className="flex flex-wrap items-center gap-2"
              >
                <RelationshipChip
                  character={character}
                  relationType={rel.type}
                  worldId={worldId}
                  onRemove={() => {
                    const onChild = character.relationships.find((r) => r.characterId === rootId);
                    const inv = onChild?.type ?? inverseRelationshipType(rel.type);
                    onRemove(character.id, rel.type, inv);
                  }}
                />
                {slot === 'child' && order != null && order < 999 && (
                  <label className="ml-auto flex items-center gap-1.5 text-[10px] text-[#5A6078]">
                    Orden
                    <input
                      type="number"
                      min={1}
                      max={99}
                      defaultValue={order}
                      className="w-12 rounded-md border border-[#2A3045] bg-[#111318] px-1.5 py-0.5 text-center text-xs text-[#E8E9EB]"
                      onBlur={(e) => {
                        const n = Math.max(1, parseInt(e.target.value, 10) || 1);
                        onUpdateBirthOrder(character.id, rel.type, n);
                      }}
                    />
                  </label>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <p className="mb-3 text-xs text-[#5A6078]">Sin vínculos</p>
      )}
      <div className="flex flex-wrap gap-2">
        <StorySelect
          value={pickId}
          onChange={setPickId}
          options={available}
          genderFilter={genderFilter}
          searchable
          placeholder="Buscar personaje…"
          className="min-w-[140px] flex-1"
          popoverMinWidth="20rem"
        />
        {showTypePicker && typeOptions && normalizeGender(rootGender) === 'unspecified' && (
          <StorySelect
            value={pickType}
            onChange={setPickType}
            options={typeOptions}
            clearable={false}
            className="w-28 shrink-0"
            popoverMinWidth="10rem"
          />
        )}
        {slot === 'child' && (
          <>
            <label className="flex shrink-0 items-center gap-2 rounded-xl border border-[#2A3045] bg-[#111318] px-3 py-2 text-xs text-[#8B91A7]">
              <input
                type="checkbox"
                checked={isMother}
                onChange={(e) => setIsMother(e.target.checked)}
                className="accent-[#D61E2B]"
              />
              Es la madre
            </label>
            {spouseOptions.length > 0 && (
              <StorySelect
                value={coParentId}
                onChange={setCoParentId}
                options={[{ value: '', label: 'Otro progenitor (opcional)' }, ...spouseOptions]}
                placeholder="Con quién…"
                className="min-w-[130px] shrink-0"
                popoverMinWidth="18rem"
              />
            )}
            <input
              type="number"
              min={1}
              max={99}
              value={birthOrder}
              onChange={(e) => setBirthOrder(e.target.value)}
              title="Orden (1 = mayor)"
              className="w-14 shrink-0 rounded-xl border border-[#2A3045] bg-[#111318] px-2 py-2 text-center text-sm text-[#E8E9EB]"
            />
          </>
        )}
        <button type="button" className="story-btn-secondary flex shrink-0 items-center gap-1 px-3 text-xs" onClick={handleAdd}>
          <Plus size={14} /> {addLabel}
        </button>
      </div>
    </section>
  );
}

export function GenealogyEditor({
  open,
  onClose,
  worldId,
  characterId,
  pickerCharacters,
  houseName,
  variant = 'dialog',
  onFocusCharacter,
}: Props) {
  const syncCharacterRelationship = useAppStore((s) => s.syncCharacterRelationship);
  const syncChildRelationship = useAppStore((s) => s.syncChildRelationship);
  const updateCharacter = useAppStore((s) => s.updateCharacter);

  const root = useAppStore((s) => s.getCharacterById(characterId));
  const worldCharacters = useAppStore((s) => s.getCharactersByWorld(worldId));
  const resolveCharacter = useCallback(
    (id: string) => worldCharacters.find((c) => c.id === id),
    [worldCharacters]
  );
  const slots = useMemo(
    () => (root ? getCharacterRelationsBySlot(root, worldCharacters, resolveCharacter) : null),
    [root, worldCharacters, resolveCharacter, characterId]
  );
  const genealogyIssues = useMemo(
    () => (root ? collectGenealogyIssues(worldCharacters, characterId) : []),
    [root, worldCharacters, characterId]
  );

  const characterOptions = useMemo(
    () =>
      pickerCharacters
        .filter((c) => c.id !== characterId)
        .map((c) => ({
          value: c.id,
          label: c.name,
          sublabel: genderSublabel(c),
          imageUrl: c.images[0],
          gender: c.gender,
        })),
    [pickerCharacters, characterId]
  );

  const excludeKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!slots) return keys;
    const add = (slot: RelationSlot, id: string, type: string) => {
      if (slot === 'spouse' || slot === 'sibling') keys.add(id);
      else keys.add(`${id}|${type}`);
    };
    for (const [slotName, list] of Object.entries(slots) as [RelationSlot, typeof slots.father][]) {
      for (const e of list) add(slotName, e.character.id, e.rel.type);
    }
    return keys;
  }, [slots]);

  const spouses = useMemo(() => {
    if (!root) return [];
    return getSpouseIds(root)
      .map((id) => pickerCharacters.find((c) => c.id === id))
      .filter((c): c is Character => !!c);
  }, [root, pickerCharacters]);

  const addLink = (targetId: string, type: string, inverseType?: string) => {
    const target = pickerCharacters.find((c) => c.id === targetId);
    if (!root || !target) return;
    const typeKey = normalizeKey(type);
    const spouseDup = SPOUSE_SLOT_TYPES.test(typeKey) && excludeKeys.has(targetId);
    if (spouseDup || excludeKeys.has(`${targetId}|${typeKey}`)) {
      toast.error('Esa relación ya existe');
      return;
    }
    if ((typeKey === 'padre' && slots?.father.length) || (typeKey === 'madre' && slots?.mother.length)) {
      const existing = typeKey === 'padre' ? slots!.father[0] : slots!.mother[0];
      if (existing.character.id !== target.id) {
        toast.error(`Ya hay un/a ${typeKey === 'padre' ? 'padre' : 'madre'} registrado/a (${existing.character.name}). Elimínalo antes de añadir otro.`);
        return;
      }
    }
    const limitErr = validateRelationshipAdd(root, target, type, inverseType);
    if (limitErr) {
      toast.error(limitErr);
      return;
    }
    syncCharacterRelationship(root.id, {
      characterId: target.id,
      characterName: target.name,
      type,
      inverseType,
      action: 'add',
    });
    const updated = useStore.getState().getCharacterById(root.id);
    const ok = updated?.relationships.some(
      (r) => r.characterId === target.id && normalizeKey(r.type) === typeKey
    );
    if (!ok) {
      toast.error('No se guardó la relación. Revisa si ya hay padre/madre o datos inconsistentes.');
      return;
    }
    toast.success(`Relación añadida: ${relationshipTypeLabel(type)}`);
  };

  const addChild = (opts: { childId: string; isMother: boolean; coParentId?: string; birthOrder: number }) => {
    if (!root) return;
    if (opts.childId === root.id) {
      toast.error('Un personaje no puede ser hijo de sí mismo');
      return;
    }
    const child = pickerCharacters.find((c) => c.id === opts.childId);
    if (!child) {
      toast.error('Personaje no encontrado');
      return;
    }
    syncChildRelationship(root.id, opts.childId, {
      isMother: opts.isMother,
      coParentId: opts.coParentId,
      birthOrder: opts.birthOrder,
    });
    const afterParent = useStore.getState().getCharacterById(root.id);
    const afterChild = useStore.getState().getCharacterById(opts.childId);
    const ok =
      afterParent?.relationships.some(
        (r) => r.characterId === opts.childId && isChildRelationType(r.type)
      ) &&
      afterChild?.relationships.some(
        (r) => r.characterId === root.id && isParentRelationType(r.type)
      );
    if (!ok) {
      const hint = collectGenealogyIssues(
        [afterParent, afterChild].filter(Boolean) as Character[],
        root.id
      )[0];
      toast.error(
        hint?.message ??
          'No se guardó el vínculo. Puede haber padre/madre duplicado o un conflicto de género.'
      );
      return;
    }
    toast.success('Vínculo guardado en todas las fichas involucradas');
  };

  const removeLink = (targetId: string, type: string, inverseType?: string) => {
    const target = pickerCharacters.find((c) => c.id === targetId);
    if (!root || !target) return;
    syncCharacterRelationship(root.id, {
      characterId: target.id,
      characterName: target.name,
      type,
      inverseType,
      action: 'remove',
    });
    toast.success('Relación eliminada');
  };

  const updateBirthOrder = (targetId: string, type: string, order: number) => {
    if (!root) return;
    const rel = root.relationships.find(
      (r) => r.characterId === targetId && normalizeKey(r.type) === normalizeKey(type)
    );
    if (!rel) return;
    const { note } = parseRelationshipDescription(rel.description);
    const description = encodeRelationshipDescription({ birthOrder: order }, note);
    const nextRels = root.relationships.map((r) =>
      r.characterId === targetId && r.type === type ? { ...r, description } : r
    );
    updateCharacter(root.id, { relationships: nextRels }, { syncRelationships: false });
  };

  if (!root || !open) return null;

  const editorBody = (
    <>
      <div className="mb-4 flex shrink-0 items-start justify-between gap-3 border-b border-[#2A3045]/60 pb-4">
          <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#D61E2B]">Relaciones</p>
          <h2 className="text-lg font-semibold text-[#E8E9EB]">{root.name}</h2>
          {houseName && (
            <p className="mt-0.5 text-xs text-[#5A6078]">
              Casa {houseName} · Cambios sincronizados al instante.
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Cerrar"
          className="rounded-lg p-2 text-[#5A6078] hover:bg-[#1E2230] hover:text-[#E8E9EB]"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      <GenealogyIssuesPanel
        issues={genealogyIssues}
        onGoToCharacter={onFocusCharacter}
      />

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain scrollbar-thin pr-1">
        {slots &&
          SLOT_CONFIG.map(({ slot, title, icon, addType, addLabel }) => (
            <RelationSection
              key={`${characterId}-${slot}`}
              slot={slot}
              title={title}
              icon={icon}
              entries={slots[slot]}
              worldId={worldId}
              addLabel={addLabel}
              addType={addType}
              showTypePicker={!!TYPE_OPTIONS[slot]}
              typeOptions={TYPE_OPTIONS[slot]}
              characterOptions={characterOptions}
              allCharacters={pickerCharacters}
              excludeKeys={excludeKeys}
              spouses={spouses}
              rootId={characterId}
              rootGender={root.gender}
              onAdd={addLink}
              onAddChild={addChild}
              onRemove={removeLink}
              onUpdateBirthOrder={updateBirthOrder}
            />
          ))}
      </div>
    </>
  );

  if (variant === 'panel') {
    return (
      <div className="flex h-full max-h-[min(72vh,640px)] flex-col rounded-xl border border-[#2A3045] bg-[#111318] p-4 shadow-xl">
        {editorBody}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden border-[#2A3045] bg-[#111318] p-0 text-[#E8E9EB] sm:max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex max-h-[90vh] flex-col overflow-hidden p-5"
        >
          {editorBody}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
