import type { Character } from '@/types';

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
