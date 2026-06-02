import { motion } from 'framer-motion';
import { FolderOpen } from 'lucide-react';
import { EntityCardMenu } from '@/components/common/EntityCardMenu';

type Props = {
  name: string;
  imageUrl?: string;
  subtitle: string;
  index?: number;
  isActive?: boolean;
  entityDataAttrs?: Record<string, string>;
  onOpen: () => void;
  onEdit: () => void;
  onViewDetails?: () => void;
  onDelete?: () => void;
};

export function CollectionCard({
  name,
  imageUrl,
  subtitle,
  index = 0,
  isActive = false,
  entityDataAttrs,
  onOpen,
  onEdit,
  onViewDetails,
  onDelete,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      onClick={onOpen}
      className={`story-card group relative cursor-pointer overflow-hidden p-0 text-left transition-all hover:border-[#D61E2B]/40 ${
        isActive ? 'border-[#D61E2B]/50 ring-1 ring-[#D61E2B]/30' : ''
      }`}
      {...entityDataAttrs}
    >
      <motion.div
        className="aspect-video bg-[#0B0D10]"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <motion.div
            className="flex h-full items-center justify-center"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <FolderOpen size={28} className="text-[#3A4460]" />
          </motion.div>
        )}
      </motion.div>
      <motion.div
        className="p-3 pr-10"
        initial={false}
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15 }}
      >
        <p className="font-medium text-[#E8E9EB]">{name}</p>
        <p className="text-[10px] text-[#5A6078]">{subtitle}</p>
      </motion.div>
      <motion.div className="absolute right-2 top-2 z-10" onClick={(e) => e.stopPropagation()}>
        <EntityCardMenu
          editLabel="Editar colección"
          onEdit={onEdit}
          onViewDetails={onViewDetails}
          viewDetailsLabel="Ver detalles"
          onDelete={onDelete}
        />
      </motion.div>
    </motion.div>
  );
}

