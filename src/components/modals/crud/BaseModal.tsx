import { useId } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

type BaseModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
};

/** Panel modal con overlay, animación y cierre con Escape. */
export function BaseModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidthClass = 'max-w-3xl',
}: BaseModalProps) {
  const titleId = useId();

  return (
    <Dialog.Root open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
    <AnimatePresence>
      {open && (
        <Dialog.Portal forceMount>
        <div className="story-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            aria-hidden
            onClick={onClose}
          />
          <Dialog.Content asChild aria-describedby={undefined}>
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className={`story-modal-panel relative w-full ${maxWidthClass} rounded-[24px] border border-white/10 bg-gradient-to-b from-[#12141a] to-[#0A0A0A] p-0 shadow-[0_40px_100px_rgba(0,0,0,0.65)] max-h-[90vh] flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 shrink-0 border-b border-white/5 bg-[#0A0A0A]/80">
            <div className="flex flex-shrink-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <Dialog.Title asChild><h2 id={titleId} className="text-lg font-semibold text-[#F3F1EA]" style={{ fontFamily: 'Montserrat' }}>
                  {title}
                </h2></Dialog.Title>
                {description && <p className="mt-1 text-sm text-[#8B91A7]">{description}</p>}
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={onClose}
                className="rounded-xl p-2 text-[#5A6078] transition-colors hover:bg-[#1E2230] hover:text-[#E8E9EB]"
              >
                <X size={20} />
              </button>
            </div>
            </div>
            <div className="story-modal-body min-h-0 flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">{children}</div>
            {footer && <div className="story-modal-footer mt-0 flex flex-shrink-0 justify-end gap-3 border-t border-white/10 bg-[#0A0A0A]/90 px-6 py-4">{footer}</div>}
          </motion.div>
          </Dialog.Content>
        </div>
        </Dialog.Portal>
      )}
    </AnimatePresence>
    </Dialog.Root>
  );
}
