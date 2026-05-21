import { Zap, Hand, Wand2, Swords, PawPrint, type LucideIcon } from 'lucide-react';
import type { FantasticElementCategory } from '@/types';

export const FANTASTIC_CATEGORY_ICONS: Record<FantasticElementCategory, LucideIcon> = {
  power: Zap,
  ability: Hand,
  spell: Wand2,
  technique: Swords,
  animal: PawPrint,
};

type IconProps = {
  category: FantasticElementCategory;
  size?: number;
  color?: string;
  className?: string;
};

export function FantasticCategoryIcon({ category, size = 18, color, className = '' }: IconProps) {
  const Icon = FANTASTIC_CATEGORY_ICONS[category];
  return <Icon size={size} style={color ? { color } : undefined} className={className} aria-hidden />;
}
