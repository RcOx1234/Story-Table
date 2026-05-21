import { useState } from 'react';
import { Check, ChevronDown, Clock, Star } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Timeline } from '@/types';

type Props = {
  timelines: Timeline[];
  value: string;
  mainTimelineId?: string;
  onChange: (id: string) => void;
};

export function GenealogyTimelinePicker({ timelines, value, mainTimelineId, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const active = timelines.find((t) => t.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto flex max-w-[10.5rem] items-center gap-1.5 rounded-lg border border-[#2A3045] bg-[#111318]/95 px-2 py-1 text-left text-xs text-[#E8E9EB] shadow-sm backdrop-blur-sm transition-colors hover:border-[#3A4460]"
        >
          <Clock size={12} className="shrink-0 text-[#5A6078]" />
          <span className="min-w-0 flex-1 truncate">{active?.name ?? 'Línea'}</span>
          <ChevronDown size={12} className={`shrink-0 text-[#5A6078] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="z-[60] w-[min(14rem,var(--radix-popover-trigger-width))] border-[#2A3045] bg-[#111318] p-1 shadow-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-[#5A6078]">Línea temporal</p>
        <ul className="max-h-48 overflow-y-auto scrollbar-thin">
          {timelines.map((tl) => {
            const selected = tl.id === value;
            const isMain = mainTimelineId === tl.id;
            return (
              <li key={tl.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                    selected ? 'bg-[#D61E2B]/15 text-[#E8E9EB]' : 'text-[#8B91A7] hover:bg-[#1E2230] hover:text-[#E8E9EB]'
                  }`}
                  onClick={() => {
                    onChange(tl.id);
                    setOpen(false);
                  }}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: tl.color || '#D61E2B' }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{tl.name}</span>
                  {isMain && <Star size={10} className="shrink-0 fill-[#EAB308] text-[#EAB308]" />}
                  {selected && <Check size={12} className="shrink-0 text-[#D61E2B]" />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
