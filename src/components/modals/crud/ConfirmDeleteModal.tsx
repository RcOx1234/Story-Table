import { BaseModal } from './BaseModal';

type ConfirmDeleteModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
};

export function ConfirmDeleteModal({
  open,
  onClose,
  title = 'Enviar a la papelera',
  message,
  onConfirm,
  confirmLabel = 'Eliminar',
}: ConfirmDeleteModalProps) {
  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      maxWidthClass="max-w-md"
      footer={
        <>
          <button type="button" onClick={onClose} className="story-btn-secondary text-sm">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="story-btn-primary bg-[#B51823] text-sm hover:bg-[#96131C]"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-[#8B91A7]">Podrás restaurar este elemento desde la papelera.</p>
    </BaseModal>
  );
}
