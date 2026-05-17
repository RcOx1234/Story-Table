import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Character, HouseFamilyUnit } from '@/types';
import { MAIN_TIMELINE_ID } from '@/lib/houseGenealogyMigrate';

type Props = {
  characters: Character[];
  peopleIds: string[];
  units: HouseFamilyUnit[];
  timelines: { id: string; name: string }[];
  onChange: (units: HouseFamilyUnit[]) => void;
};

function newUnit(): HouseFamilyUnit {
  return {
    id: crypto.randomUUID(),
    parentIds: [],
    childIds: [],
    relationType: 'biological',
    timelineId: MAIN_TIMELINE_ID,
  };
}

export function FamilyUnitEditor({ characters, peopleIds, units, timelines, onChange }: Props) {
  const [openId, setOpenId] = useState<string | null>(units[0]?.id ?? null);
  const options = peopleIds
    .map((id) => characters.find((c) => c.id === id))
    .filter((c): c is Character => Boolean(c));

  const patchUnit = (id: string, patch: Partial<HouseFamilyUnit>) => {
    onChange(units.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const addChild = (unitId: string, childId: string) => {
    const u = units.find((x) => x.id === unitId);
    if (!u || !childId || u.childIds.includes(childId)) return;
    patchUnit(unitId, { childIds: [...u.childIds, childId] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[#E8E9EB]">Unidades familiares</h4>
        <button
          type="button"
          className="story-btn-secondary flex items-center gap-1 text-xs"
          onClick={() => {
            const u = newUnit();
            onChange([...units, u]);
            setOpenId(u.id);
          }}
        >
          <Plus size={14} /> Crear familia / pareja con hijos
        </button>
      </div>

      {units.length === 0 ? (
        <p className="text-xs text-[#5A6078]">Crea una unidad para vincular padres e hijos sin errores de generación.</p>
      ) : (
        units.map((unit) => {
          const open = openId === unit.id;
          const parentLabel = unit.parentIds
            .map((id) => options.find((c) => c.id === id)?.name ?? '?')
            .join(' + ');
          return (
            <details
              key={unit.id}
              open={open}
              onToggle={(e) => setOpenId((e.target as HTMLDetailsElement).open ? unit.id : null)}
              className="rounded-xl border border-[#2A3045] bg-[#111318]/50"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm text-[#E8E9EB] [&::-webkit-details-marker]:hidden">
                <span className="truncate">
                  {parentLabel || 'Sin padres'} · {unit.childIds.length} hijo(s)
                </span>
                <button
                  type="button"
                  className="text-[#5A6078] hover:text-[#D61E2B]"
                  onClick={(e) => {
                    e.preventDefault();
                    onChange(units.filter((u) => u.id !== unit.id));
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </summary>
              <div className="space-y-3 border-t border-[#2A3045] px-4 py-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] uppercase text-[#5A6078]">Padre / madre A</label>
                    <select
                      className="story-input w-full text-sm"
                      value={unit.parentIds[0] ?? ''}
                      onChange={(e) => {
                        const ids = [...unit.parentIds];
                        if (e.target.value) ids[0] = e.target.value;
                        else ids.shift();
                        patchUnit(unit.id, { parentIds: ids.filter(Boolean) });
                      }}
                    >
                      <option value="">—</option>
                      {options.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] uppercase text-[#5A6078]">Padre / madre B (opcional)</label>
                    <select
                      className="story-input w-full text-sm"
                      value={unit.parentIds[1] ?? ''}
                      onChange={(e) => {
                        const ids = [...unit.parentIds];
                        if (e.target.value) {
                          if (ids.length < 2) ids.push(e.target.value);
                          else ids[1] = e.target.value;
                        } else if (ids.length > 1) ids.splice(1, 1);
                        patchUnit(unit.id, { parentIds: ids.filter(Boolean) });
                      }}
                    >
                      <option value="">—</option>
                      {options.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase text-[#5A6078]">Hijos</label>
                  <div className="flex flex-wrap gap-2">
                    {unit.childIds.map((cid) => (
                      <span
                        key={cid}
                        className="flex items-center gap-1 rounded-full bg-[#1E2230] px-2 py-1 text-xs text-[#E8E9EB]"
                      >
                        {options.find((c) => c.id === cid)?.name}
                        <button
                          type="button"
                          className="text-[#5A6078]"
                          onClick={() =>
                            patchUnit(unit.id, { childIds: unit.childIds.filter((id) => id !== cid) })
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <select
                    className="story-input mt-2 w-full text-sm"
                    value=""
                    onChange={(e) => addChild(unit.id, e.target.value)}
                  >
                    <option value="">+ Agregar hijo</option>
                    {options
                      .filter((c) => !unit.childIds.includes(c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] uppercase text-[#5A6078]">Línea temporal</label>
                    <select
                      className="story-input w-full text-sm"
                      value={unit.timelineId ?? MAIN_TIMELINE_ID}
                      onChange={(e) => patchUnit(unit.id, { timelineId: e.target.value })}
                    >
                      <option value={MAIN_TIMELINE_ID}>Principal</option>
                      {timelines.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] uppercase text-[#5A6078]">Tipo</label>
                    <select
                      className="story-input w-full text-sm"
                      value={unit.relationType}
                      onChange={(e) =>
                        patchUnit(unit.id, {
                          relationType: e.target.value as HouseFamilyUnit['relationType'],
                        })
                      }
                    >
                      <option value="biological">Biológica</option>
                      <option value="adoptive">Adoptiva</option>
                      <option value="alternate">Línea alternativa</option>
                      <option value="unknown">Desconocida</option>
                    </select>
                  </div>
                </div>
              </div>
            </details>
          );
        })
      )}
    </div>
  );
}
