import type { Character, CharacterDeathInfo, DeathCauseType } from '@/types';

export const STATUS_DOT: Record<Character['status'], string> = {
  alive: '#22C55E',
  dead: '#6B7280',
  missing: '#EAB308',
  unknown: '#5A6078',
};

/** Clases visuales del nodo según estado (árbol genealógico). */
export function genealogyNodeStatusClasses(status: Character['status'], selected: boolean): string {
  if (selected) return '';
  switch (status) {
    case 'dead':
      return 'opacity-80 border-[#4B5563]/80 bg-gradient-to-b from-[#12141a] to-[#0d0f12]';
    case 'missing':
      return 'border-dashed border-[#EAB308]/45 bg-gradient-to-b from-[#161922] to-[#111318]';
    case 'unknown':
      return 'border-[#2A3045]/90 opacity-95';
    default:
      return '';
  }
}

export function genealogyPortraitClasses(status: Character['status']): string {
  switch (status) {
    case 'dead':
      return 'grayscale opacity-70 ring-[#4B5563]';
    case 'missing':
      return 'ring-[#EAB308]/50';
    default:
      return '';
  }
}

/** Marca visual en el retrato según tipo de muerte en la línea activa. */
export function genealogyDeathOverlay(death?: CharacterDeathInfo): {
  show: boolean;
  className: string;
  symbol: string;
} | null {
  if (!death) return null;
  const t = death.causeType as DeathCauseType;
  switch (t) {
    case 'murder':
      return {
        show: true,
        className: 'bg-[#7f1d1d]/90 text-[#fecaca] ring-1 ring-[#D61E2B]/60',
        symbol: '✕',
      };
    case 'suicide':
      return {
        show: true,
        className: 'bg-[#1e1b4b]/85 text-[#c4b5fd] ring-1 ring-[#8B5CF6]/50',
        symbol: '◇',
      };
    case 'execution':
      return {
        show: true,
        className: 'bg-[#422006]/90 text-[#fde68a] ring-1 ring-[#EAB308]/50',
        symbol: '⚔',
      };
    case 'accident':
      return {
        show: true,
        className: 'bg-[#1e3a5f]/85 text-[#93c5fd] ring-1 ring-[#3B82F6]/40',
        symbol: '!',
      };
    case 'natural':
      return {
        show: true,
        className: 'bg-[#111318]/80 text-[#9CA3AF] ring-1 ring-[#4B5563]',
        symbol: '†',
      };
    default:
      return {
        show: true,
        className: 'bg-[#111318]/85 text-[#8B91A7] ring-1 ring-[#2A3045]',
        symbol: '×',
      };
  }
}
