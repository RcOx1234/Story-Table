import type { PlaceCollectionType } from '@/types';

export const PLACE_COLLECTION_TYPE_OPTIONS: { value: PlaceCollectionType; label: string }[] = [
  { value: 'kingdom', label: 'Reino' },
  { value: 'country', label: 'País' },
  { value: 'city', label: 'Ciudad' },
  { value: 'region', label: 'Región' },
  { value: 'faction', label: 'Facción' },
  { value: 'empire', label: 'Imperio' },
  { value: 'continent', label: 'Continente' },
  { value: 'district', label: 'Distrito' },
  { value: 'custom', label: 'Personalizado' },
];

export function collectionTypeLabel(type?: PlaceCollectionType, custom?: string): string {
  if (!type) return 'Colección';
  if (type === 'custom' && custom?.trim()) return custom.trim();
  return PLACE_COLLECTION_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}
