import type { LucideIcon } from 'lucide-react';
import { insertionMeta } from '@/lib/insertionMeta';

type Props = {
  type: string;
  label: string;
  onClick?: () => void;
  compact?: boolean;
  className?: string;
  /** Estilo legible sobre fondos claros (p. ej. cartas). */
  onLightSurface?: boolean;
};

export function StoryInsertionChip({
  type,
  label,
  onClick,
  compact,
  className = '',
  onLightSurface = false,
}: Props) {
  const meta = insertionMeta(type);
  const Icon = meta.icon as LucideIcon;
  const Tag = onClick ? 'button' : 'span';

  const chipStyle = onLightSurface
    ? {
        borderColor: meta.color,
        backgroundColor: `${meta.color}22`,
        color: '#2c2418',
      }
    : {
        borderColor: `${meta.color}55`,
        backgroundColor: meta.bg,
        color: '#E8E9EB',
      };

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`inline-flex max-w-full items-center gap-1 rounded-md border align-middle font-medium transition-colors ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      } ${onClick ? 'cursor-pointer hover:brightness-110' : ''} ${className}`}
      style={chipStyle}
      title={meta.label}
    >
      <Icon
        size={compact ? 10 : 12}
        style={{ color: onLightSurface ? meta.color : meta.color }}
        className="shrink-0"
      />
      <span className="truncate">{label}</span>
    </Tag>
  );
}
