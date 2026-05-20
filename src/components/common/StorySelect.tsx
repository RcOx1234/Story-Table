import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { CharacterGender } from '@/types';
import { normalizeGender } from '@/lib/characterGender';

export type StorySelectOption = {
  value: string;
  label: string;
  sublabel?: string;
  imageUrl?: string;
  disabled?: boolean;
  gender?: CharacterGender;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: StorySelectOption[];
  placeholder?: string;
  emptyLabel?: string;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  /** Ancho mínimo del menú desplegable (puede ser mayor que el trigger). */
  popoverMinWidth?: string;
  /** Solo opciones con este sexo (excluye «sin definir»). */
  genderFilter?: 'male' | 'female';
  'aria-label'?: string;
};

function OptionAvatar({ opt }: { opt: StorySelectOption }) {
  if (opt.imageUrl) {
    return <img src={opt.imageUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1E2230] text-[10px] font-semibold text-[#8B91A7]">
      {opt.label.charAt(0).toUpperCase()}
    </span>
  );
}

export function StorySelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar…',
  emptyLabel = 'Sin opciones',
  searchable,
  clearable = true,
  disabled = false,
  className = '',
  popoverMinWidth = '16rem',
  genderFilter,
  'aria-label': ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);

  const genderScoped = useMemo(() => {
    if (!genderFilter) return options;
    return options.filter((o) => normalizeGender(o.gender) === genderFilter);
  }, [options, genderFilter]);

  const showSearch = searchable === true || (searchable !== false && genderScoped.length > 2);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return genderScoped;
    return genderScoped.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel?.toLowerCase().includes(q) ?? false)
    );
  }, [genderScoped, search]);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  useEffect(() => {
    if (!open || !showSearch) return;
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, showSearch]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          className={`inline-flex max-w-[220px] min-w-[7.5rem] items-center justify-between gap-2 rounded-xl border border-[#2A3045] bg-[#111318] px-3 py-2 text-left text-sm transition-all hover:border-[#3A4460] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected ? (
              <>
                <OptionAvatar opt={selected} />
                <span className="truncate text-[#E8E9EB]">{selected.label}</span>
              </>
            ) : (
              <span className="truncate text-[#5A6078]">{placeholder}</span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-0.5">
            {clearable && value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                className="rounded p-0.5 text-[#5A6078] hover:bg-[#1E2230] hover:text-[#E8E9EB]"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    onChange('');
                  }
                }}
                aria-label="Limpiar"
              >
                <X size={14} />
              </span>
            )}
            <ChevronDown size={16} className="text-[#5A6078]" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
        className="z-[60] flex max-h-[min(320px,70vh)] max-w-[min(24rem,92vw)] flex-col overflow-hidden border-[#2A3045] bg-[#111318] p-0 shadow-xl"
        style={{ minWidth: popoverMinWidth, width: 'max-content' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
      >
        {showSearch && (
          <div className="relative shrink-0 border-b border-[#2A3045] p-2">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6078]" />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…"
              autoComplete="off"
              className="w-full min-w-0 border-0 bg-transparent py-2 pl-9 pr-3 text-sm text-[#E8E9EB] placeholder:text-[#5A6078] focus:outline-none"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        )}
        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 scrollbar-thin"
          style={{ maxHeight: 'min(14rem, 50vh)' }}
          role="listbox"
          onWheel={(e) => e.stopPropagation()}
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-[#5A6078]">{emptyLabel}</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                role="option"
                aria-selected={value === opt.value}
                className={`flex w-full min-w-[14rem] items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-[#1E2230] disabled:opacity-40 ${
                  value === opt.value ? 'bg-[#D61E2B]/10 text-[#E8E9EB]' : 'text-[#8B91A7]'
                }`}
                onClick={() => !opt.disabled && pick(opt.value)}
              >
                <OptionAvatar opt={opt} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="block truncate text-[10px] text-[#5A6078]">{opt.sublabel}</span>
                  )}
                </span>
                {value === opt.value && <Check size={14} className="shrink-0 text-[#D61E2B]" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
