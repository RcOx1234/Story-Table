import { useEffect } from 'react';
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            aria-hidden
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-labelledby="modal-title"
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.985 }}
            transition={{ duration: 0.2 }}
            className={`relative w-full ${maxWidthClass} rounded-[24px] border border-white/10 bg-[#0A0A0A] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.65)] max-h-[90vh] flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex flex-shrink-0 items-start justify-between gap-4">
              <div>
                <h2 id="modal-title" className="text-lg font-semibold text-[#F3F1EA]" style={{ fontFamily: 'Montserrat' }}>
                  {title}
                </h2>
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
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">{children}</div>
            {footer && <div className="mt-6 flex flex-shrink-0 justify-end gap-3 border-t border-white/10 pt-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
