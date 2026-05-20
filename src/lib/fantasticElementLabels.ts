import type { FantasticElementCategory } from '@/types';

export const FANTASTIC_CATEGORY_OPTIONS: { value: FantasticElementCategory; label: string }[] = [
  { value: 'power', label: 'Poder' },
  { value: 'ability', label: 'Habilidad' },
  { value: 'spell', label: 'Hechizo' },
  { value: 'technique', label: 'Técnica' },
  { value: 'animal', label: 'Animal / criatura' },
];

export const FANTASTIC_CATEGORY_LABELS: Record<FantasticElementCategory, string> = {
  power: 'Poder',
  ability: 'Habilidad',
  spell: 'Hechizo',
  technique: 'Técnica',
  animal: 'Animal / criatura',
};
