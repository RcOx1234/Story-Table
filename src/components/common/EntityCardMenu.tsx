import { MoreVertical, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Props = {
  onEdit: () => void;
  onDelete?: () => void;
  onViewDetails?: () => void;
  editLabel?: string;
  viewDetailsLabel?: string;
  className?: string;
};

export function EntityCardMenu({
  onEdit,
  onDelete,
  onViewDetails,
  editLabel = 'Editar',
  viewDetailsLabel = 'Ver detalles',
  className = '',
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menú"
          onClick={(e) => e.stopPropagation()}
          className={`rounded-lg p-1.5 text-[#5A6078] transition-all hover:bg-[#1E2230] hover:text-[#E8E9EB] ${className}`}
        >
          <MoreVertical size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-[#2A3045] bg-[#111318] text-[#E8E9EB]">
        {onViewDetails ? (
          <DropdownMenuItem
            className="cursor-pointer focus:bg-[#1E2230]"
            onSelect={(e) => {
              e.preventDefault();
              onViewDetails();
            }}
          >
            {viewDetailsLabel}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          className="cursor-pointer focus:bg-[#1E2230]"
          onSelect={(e) => {
            e.preventDefault();
            onEdit();
          }}
        >
          {editLabel}
        </DropdownMenuItem>
        {onDelete ? (
          <DropdownMenuItem
            className="cursor-pointer text-[#D61E2B] focus:bg-[#D61E2B]/10"
            onSelect={(e) => {
              e.preventDefault();
              onDelete();
            }}
          >
            <Trash2 size={12} className="mr-2 inline" /> Eliminar
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
