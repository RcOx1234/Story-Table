import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Castle, ChevronLeft, ChevronRight, Plus, Search, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { BaseModal } from './BaseModal';
import { useAppStore } from '@/store';
import type {
  House,
  HouseFamilyPerson,
  HouseMember,
  HouseMemberRole,
  NobleRank,
} from '@/types';
import { ImageInputField } from '@/components/common/ImageInputField';
import { FamilyTree } from '@/components/houses/FamilyTree';
import { FamilyUnitEditor } from '@/components/houses/FamilyUnitEditor';
import { HOUSE_MEMBER_ROLE_OPTIONS } from '@/lib/houseMemberRoles';
import { migrateHouseGenealogy, ensureFamilyPeople, MAIN_TIMELINE_ID } from '@/lib/houseGenealogyMigrate';
import { validateHouseFamilyGraph } from '@/lib/houseFamilyValidation';

const STEPS = ['Casa', 'Miembros oficiales', 'ùrbol familiar', 'Lùneas temporales', 'Vista previa'] as const;

const NOBLE_RANKS: { value: NobleRank; label: string }[] = [
  { value: 'emperor', label: 'Emperador' },
  { value: 'king', label: 'Rey' },
  { value: 'duke', label: 'Duque' },
  { value: 'marquis', label: 'Marquùs' },
  { value: 'count', label: 'Conde' },
  { value: 'baron', label: 'Barùn' },
  { value: 'knight', label: 'Caballero' },
  { value: 'commoner', label: 'Plebeyo' },
  { value: 'other', label: 'Otro' },
];

const CONNECTION_OPTIONS: { value: HouseFamilyPerson['connectionType']; label: string }[] = [
  { value: 'blood', label: 'Miembro oficial de la casa' },
  { value: 'marriage', label: 'Consorte externo' },
  { value: 'external', label: 'Hijo/a o pariente externo' },
  { value: 'alternate_timeline', label: 'Lùnea alternativa' },
  { value: 'unknown', label: 'Otro' },
];

type HouseFormData = Omit<House, 'id' | 'createdAt' | 'updatedAt'>;

type Props = {
  open: boolean;
  onClose: () => void;
  worldId: string;
  initial?: House | null;
  onSubmit: (data: HouseFormData) => void;
};

function empty(worldId: string): HouseFormData {
  return {
    worldId,
    name: '',
    motto: '',
    description: '',
    imageUrl: '',
    nobleRank: 'baron',
    influenceLevel: 5,
    parentHouseId: undefined,
    lineage: '',
    symbols: '',
    territory: '',
    members: [],
    familyPeople: [],
    familyRelations: [],
    familyUnits: [],
    isFavorite: false,
    isDeleted: false,
    tags: [],
  };
}

export function HouseFormModal({ open, onClose, worldId, initial, onSubmit }: Props) {
  const allHouses = useAppStore((s) => s.getHousesByWorld(worldId));
  const characters = useAppStore((s) => s.getCharactersByWorld(worldId));
  const timelines = useAppStore((s) => s.timelines.filter((t) => t.worldId === worldId));
  const parentOptions = useMemo(() => allHouses.filter((h) => h.id !== initial?.id), [allHouses, initial?.id]);

  const [form, setForm] = useState(() => empty(worldId));
  const [step, setStep] = useState(0);
  const [tagsRaw, setTagsRaw] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [treeSearch, setTreeSearch] = useState('');
  const [addAsOfficial, setAddAsOfficial] = useState(true);
  const [addConnection, setAddConnection] = useState<HouseFamilyPerson['connectionType']>('blood');
  const [previewTimeline, setPreviewTimeline] = useState(MAIN_TIMELINE_ID);

  useEffect(() => {
    if (!open) return;
    const base = initial ? { ...empty(worldId), ...initial, worldId } : empty(worldId);
    const migrated = migrateHouseGenealogy(ensureFamilyPeople(base));
    setForm(migrated as HouseFormData);
    setTagsRaw((initial?.tags ?? []).join(', '));
    setStep(0);
    setValidationErrors([]);
    setMemberSearch('');
    setTreeSearch('');
  }, [open, worldId, initial?.id, initial?.updatedAt]);

  const patch = (p: Partial<HouseFormData>) =>
    setForm((f) => migrateHouseGenealogy(ensureFamilyPeople({ ...f, ...p })) as HouseFormData);

  const peopleIds = useMemo(
    () => (form.familyPeople ?? []).map((p) => p.characterId),
    [form.familyPeople]
  );

  const addToTree = (characterId: string, asOfficial: boolean, connectionType: HouseFamilyPerson['connectionType']) => {
    const people = [...(form.familyPeople ?? [])];
    if (!people.some((p) => p.characterId === characterId)) {
      people.push({
        characterId,
        isHouseMember: asOfficial,
        connectionType,
      });
    }
    let members = [...(form.members ?? [])];
    if (asOfficial && !members.some((m) => m.characterId === characterId)) {
      members.push({ characterId, role: 'blood' as HouseMemberRole });
    }
    patch({ familyPeople: people, members });
  };

  const removeFromTree = (characterId: string) => {
    patch({
      members: (form.members ?? []).filter((m) => m.characterId !== characterId),
      familyPeople: (form.familyPeople ?? []).filter((p) => p.characterId !== characterId),
      familyRelations: (form.familyRelations ?? []).filter(
        (r) => r.fromCharacterId !== characterId && r.toCharacterId !== characterId
      ),
      familyUnits: (form.familyUnits ?? []).map((u) => ({
        ...u,
        parentIds: u.parentIds.filter((id) => id !== characterId),
        childIds: u.childIds.filter((id) => id !== characterId),
      })),
    });
  };

  const updateMember = (characterId: string, data: Partial<HouseMember>) => {
    patch({
      members: (form.members ?? []).map((m) => (m.characterId === characterId ? { ...m, ...data } : m)),
    });
  };

  const availableForOfficial = characters.filter(
    (c) =>
      !memberSearch ||
      c.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (c.role ?? '').toLowerCase().includes(memberSearch.toLowerCase())
  ).filter((c) => !(form.members ?? []).some((m) => m.characterId === c.id));

  const availableForTree = characters.filter(
    (c) =>
      !treeSearch ||
      c.name.toLowerCase().includes(treeSearch.toLowerCase())
  ).filter((c) => !peopleIds.includes(c.id));

  const save = () => {
    if (!form.name.trim()) {
      setStep(0);
      toast.error('El nombre es obligatorio');
      return;
    }
    const payload = migrateHouseGenealogy(ensureFamilyPeople(form));
    const { errors } = validateHouseFamilyGraph(payload);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setStep(2);
      toast.error('Revisa las relaciones familiares antes de guardar');
      return;
    }
    const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
    onSubmit({
      ...(payload as HouseFormData),
      name: form.name.trim(),
      motto: form.motto.trim(),
      tags,
      parentHouseId: form.parentHouseId || undefined,
      influenceLevel: Math.min(10, Math.max(1, form.influenceLevel)),
    });
    onClose();
  };

  const next = () => {
    if (step === 0 && !form.name.trim()) {
      toast.error('Indica el nombre de la casa');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const housePreview = form;

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={initial ? 'Editar casa noble' : 'Nueva casa noble'}
      maxWidthClass="max-w-5xl w-[96vw]"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
            Cancelar
          </button>
          <div className="flex flex-wrap gap-2">
            {step > 0 && (
              <button type="button" className="story-btn-secondary flex items-center gap-1 text-sm" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft size={14} /> Atrùs
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" className="story-btn-primary flex items-center gap-1 text-sm" onClick={next}>
                Siguiente <ChevronRight size={14} />
              </button>
            ) : (
              <button type="button" className="story-btn-primary text-sm" onClick={save}>
                Guardar casa
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="scrollbar-thin -mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              step === i ? 'bg-[#D61E2B]/20 text-[#D61E2B] ring-1 ring-[#D61E2B]/40' : 'bg-[#1E2230] text-[#8B91A7]'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <motion.div className="max-h-[calc(90vh-220px)] overflow-y-auto pr-1 scrollbar-thin">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            {step === 0 && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-[#2A3045] bg-[#111318]">
                    {form.imageUrl ? (
                      <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Castle size={36} className="text-[#5A6078]" />
                    )}
                  </div>
                  <ImageInputField label="Escudo (URL)" value={form.imageUrl} onChange={(url) => patch({ imageUrl: url })} />
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs uppercase text-[#5A6078]">Nombre *</label>
                    <input className="story-input w-full" value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Casa Thunderbolt" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase text-[#5A6078]">Lema</label>
                    <input className="story-input w-full italic" value={form.motto} onChange={(e) => patch({ motto: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase text-[#5A6078]">Descripciùn</label>
                    <textarea className="story-input h-20 w-full resize-none" value={form.description} onChange={(e) => patch({ description: e.target.value })} />
                  </div>
                  <select className="story-input w-full text-sm" value={form.nobleRank} onChange={(e) => patch({ nobleRank: e.target.value as NobleRank })}>
                    {NOBLE_RANKS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <div>
                    <label className="mb-1 flex justify-between text-xs text-[#5A6078]">
                      <span>Influencia</span>
                      <span>{form.influenceLevel}/10</span>
                    </label>
                    <input type="range" min={1} max={10} className="w-full accent-[#D61E2B]" value={form.influenceLevel} onChange={(e) => patch({ influenceLevel: Number(e.target.value) })} />
                  </div>
                  <select className="story-input w-full text-sm" value={form.parentHouseId ?? ''} onChange={(e) => patch({ parentHouseId: e.target.value || undefined })}>
                    <option value="">Casa independiente</option>
                    {parentOptions.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-[#E8E9EB]">
                    <input type="checkbox" checked={form.isFavorite} onChange={(e) => patch({ isFavorite: e.target.checked })} className="accent-[#D61E2B]" />
                    Favorita
                  </label>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-[#5A6078]">Solo miembros oficiales de la casa (polùticos / legales).</p>
                <motion.div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
                  <input className="story-input w-full pl-9" placeholder="Buscar personajeù" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
                </motion.div>
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {availableForOfficial.slice(0, 8).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-[#1E2230]"
                      onClick={() => addToTree(c.id, true, 'blood')}
                    >
                      <span className="text-[#E8E9EB]">{c.name}</span>
                      <Plus size={14} className="text-[#D61E2B]" />
                    </button>
                  ))}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase text-[#5A6078]">
                      <th className="pb-2">Persona</th>
                      <th>Rol</th>
                      <th>Tùtulo</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(form.members ?? []).map((m) => {
                      const ch = characters.find((c) => c.id === m.characterId);
                      if (!ch) return null;
                      return (
                        <tr key={m.characterId} className="border-t border-[#2A3045]/60">
                          <td className="py-2 pr-2 text-[#E8E9EB]">{ch.name}</td>
                          <td className="py-2 pr-2">
                            <select className="story-input py-1 text-xs" value={String(m.role)} onChange={(e) => updateMember(m.characterId, { role: e.target.value as HouseMemberRole })}>
                              {HOUSE_MEMBER_ROLE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 pr-2">
                            <input className="story-input py-1 text-xs" value={m.title ?? ''} onChange={(e) => updateMember(m.characterId, { title: e.target.value || undefined })} placeholder="Tùtulo" />
                          </td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              className="text-[#5A6078] hover:text-[#D61E2B]"
                              onClick={() => {
                                patch({
                                  members: (form.members ?? []).filter((x) => x.characterId !== m.characterId),
                                  familyPeople: (form.familyPeople ?? []).map((p) =>
                                    p.characterId === m.characterId
                                      ? { ...p, isHouseMember: false, connectionType: 'external' as const }
                                      : p
                                  ),
                                });
                              }}
                            >
                              <UserMinus size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                {validationErrors.length > 0 && (
                  <div className="rounded-xl border border-[#D61E2B]/40 bg-[#D61E2B]/10 p-3 text-xs text-[#E8E9EB]">
                    {validationErrors.map((e) => (
                      <p key={e}>{e}</p>
                    ))}
                  </div>
                )}
                <div className="rounded-xl border border-[#2A3045] p-3">
                  <p className="mb-2 text-xs text-[#5A6078]">Agregar persona al ùrbol (puede ser externa)</p>
                  <input className="story-input mb-2 w-full" placeholder="Buscarù" value={treeSearch} onChange={(e) => setTreeSearch(e.target.value)} />
                  <select className="story-input mb-2 w-full text-sm" value={addConnection} onChange={(e) => setAddConnection(e.target.value as HouseFamilyPerson['connectionType'])}>
                    {CONNECTION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <label className="mb-2 flex items-center gap-2 text-xs text-[#8B91A7]">
                    <input type="checkbox" checked={addAsOfficial} onChange={(e) => setAddAsOfficial(e.target.checked)} className="accent-[#D61E2B]" />
                    Tambiùn es miembro oficial de la casa
                  </label>
                  <motion.div className="max-h-28 space-y-1 overflow-y-auto">
                    {availableForTree.slice(0, 6).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex w-full justify-between rounded px-2 py-1.5 text-sm hover:bg-[#1E2230]"
                        onClick={() => addToTree(c.id, addAsOfficial || addConnection === 'blood', addConnection)}
                      >
                        <span>{c.name}</span>
                        <Plus size={14} />
                      </button>
                    ))}
                  </motion.div>
                </div>
                {(form.familyPeople ?? []).length > 0 && (
                  <div className="rounded-xl border border-[#2A3045] p-3">
                    <p className="mb-2 text-xs uppercase text-[#5A6078]">Personas en el ·rbol</p>
                    <ul className="space-y-1">
                      {(form.familyPeople ?? []).map((p) => {
                        const ch = characters.find((c) => c.id === p.characterId);
                        if (!ch) return null;
                        return (
                          <li key={p.characterId} className="flex items-center justify-between text-sm">
                            <span className="text-[#E8E9EB]">
                              {ch.name}
                              {!p.isHouseMember && (
                                <span className="ml-2 text-[10px] text-[#5A6078]">(externo)</span>
                              )}
                            </span>
                            <button type="button" className="text-[#5A6078] hover:text-[#D61E2B]" onClick={() => removeFromTree(p.characterId)}>
                              <UserMinus size={14} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <FamilyUnitEditor
                  characters={characters}
                  peopleIds={peopleIds}
                  units={form.familyUnits ?? []}
                  timelines={timelines.map((t) => ({ id: t.id, name: t.name }))}
                  onChange={(familyUnits) => patch({ familyUnits })}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 text-sm text-[#8B91A7]">
                <p>Las lùneas temporales del mundo se usan al crear unidades familiares en el paso ùùrbol familiarù.</p>
                <ul className="list-inside list-disc space-y-1">
                  {timelines.length === 0 ? (
                    <li>No hay lùneas temporales en este mundo (solo ùPrincipalù).</li>
                  ) : (
                    timelines.map((t) => (
                      <li key={t.id}>{t.name}</li>
                    ))
                  )}
                </ul>
              </div>
            )}

            {step === 4 && (
              <div>
                <FamilyTree
                  worldId={worldId}
                  house={housePreview}
                  characters={characters}
                  timelines={timelines}
                  selectedTimelineId={previewTimeline}
                  onTimelineChange={setPreviewTimeline}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </BaseModal>
  );
}
