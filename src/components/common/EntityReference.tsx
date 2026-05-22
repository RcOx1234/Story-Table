import { useNavigateWithReturn } from '@/hooks/useNavigationReturn';
import {
  Users,
  FileText,
  MapPin,
  Route,
  Box,
  Building2,
  Lightbulb,
  Globe,
  Castle,
} from 'lucide-react';

export type EntityRefType =
  | 'character'
  | 'scene'
  | 'place'
  | 'plot'
  | 'component'
  | 'organization'
  | 'idea'
  | 'map'
  | 'house';

export type EntityReferenceProps = {
  type: EntityRefType;
  id: string;
  worldId: string;
  label: string;
};

const iconFor = (t: EntityRefType) => {
  switch (t) {
    case 'character':
      return Users;
    case 'scene':
      return FileText;
    case 'place':
      return MapPin;
    case 'plot':
      return Route;
    case 'component':
      return Box;
    case 'organization':
      return Building2;
    case 'idea':
      return Lightbulb;
    case 'map':
      return Globe;
    case 'house':
      return Castle;
    default:
      return Globe;
  }
};

export function EntityReference({ type, id, worldId, label }: EntityReferenceProps) {
  const navigateWithReturn = useNavigateWithReturn();
  const Icon = iconFor(type);

  const go = () => {
    switch (type) {
      case 'character':
        navigateWithReturn(`/world/${worldId}/character/${id}`);
        break;
      case 'scene':
        navigateWithReturn(`/world/${worldId}/scene/${id}`);
        break;
      case 'place':
        navigateWithReturn(`/world/${worldId}/place/${id}`);
        break;
      case 'map':
        navigateWithReturn(`/world/${worldId}/map/${id}`);
        break;
      case 'plot':
        navigateWithReturn(`/world/${worldId}?tab=plots`);
        break;
      case 'component':
        navigateWithReturn(`/world/${worldId}?tab=components`);
        break;
      case 'organization':
        navigateWithReturn(`/world/${worldId}?tab=organizations`);
        break;
      case 'idea':
        navigateWithReturn('/ideas');
        break;
      case 'house':
        navigateWithReturn(`/world/${worldId}/house/${id}`);
        break;
      default:
        navigateWithReturn(`/world/${worldId}`);
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        go();
      }}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#D61E2B]/30 bg-[#D61E2B]/10 px-2.5 py-1 text-left text-xs font-medium text-[#F3F1EA] transition-colors hover:bg-[#D61E2B]/20"
    >
      <Icon size={12} className="flex-shrink-0 text-[#D61E2B]" />
      <span className="truncate">{label}</span>
    </button>
  );
}
