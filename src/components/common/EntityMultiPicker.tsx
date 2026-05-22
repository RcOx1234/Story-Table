import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type EntityPickerItem = {
  id: string;
  label: string;
  sublabel?: string;
  imageUrl?: string;
};

type Props = {
  label: string;
  items: EntityPickerItem[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
};

function ItemAvatar({ item, size = 'md' }: { item: EntityPickerItem; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'h-5 w-5 text-[10px]' : 'h-8 w-8 text-xs';
  if (item.imageUrl) {
    return <img src={item.imageUrl} alt="" className={`${cls} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-[#1E2230] font-semibold text-[#8B91A7] ${cls}`}>
      {item.label.charAt(0).toUpperCase()}
    </div>
  );
}

export function EntityMultiPicker({
  label,
  items,
  value,
  onChange,
  placeholder = 'Seleccionar…',
  emptyMessage = 'No hay elementos',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = useMemo(() => items.filter((i) => value.includes(i.id)), [items, value]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || (i.sublabel?.toLowerCase().includes(q) ?? false)
    );
  }, [items, search]);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-mono uppercase tracking-wider text-[#5A6078]">{label}</label>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#2A3045] bg-[#111318] px-3 py-2.5 text-left text-sm transition-all hover:border-[#3A4460]"
          >
            <span className={selected.length ? 'text-[#E8E9EB]' : 'text-[#5A6078]'}>
              {selected.length ? `${selected.length} seleccionado${selected.length > 1 ? 's' : ''}` : placeholder}
            </span>
            <ChevronDown size={16} className="shrink-0 text-[#5A6078]" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="z-[60] w-[var(--radix-popover-trigger-width)] border-[#2A3045] bg-[#111318] p-0"
        >
          <div className="relative border-b border-[#2A3045] p-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="w-full border-0 bg-transparent py-2.5 pl-9 pr-3 text-sm text-[#E8E9EB] placeholder:text-[#5A6078] focus:outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1 scrollbar-thin">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-[#5A6078]">{emptyMessage}</p>
            ) : (
              filtered.map((item) => {
                const checked = value.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-all ${
                      checked ? 'bg-[#D61E2B]/15 text-[#E8E9EB]' : 'text-[#8B91A7] hover:bg-[#1E2230]'
                    }`}
                  >
                    <ItemAvatar item={item} />
                    <ItemText item={item} />
                    <Check size={14} className={checked ? 'text-[#D61E2B]' : 'opacity-0'} />
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 rounded-full border border-[#2A3045] bg-[#1E2230] py-0.5 pl-1 pr-1.5 text-xs text-[#E8E9EB]"
            >
              <ItemAvatar item={item} size="sm" />
              <span className="max-w-[120px] truncate">{item.label}</span>
              <button
                type="button"
                aria-label={`Quitar ${item.label}`}
                onClick={() => onChange(value.filter((id) => id !== item.id))}
                className="rounded-full p-0.5 hover:bg-[#2A3045]"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemText({ item }: { item: EntityPickerItem }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate font-medium">{item.label}</p>
      {item.sublabel && <p className="truncate text-[10px] text-[#5A6078]">{item.sublabel}</p>}
    </div>
  );
}
