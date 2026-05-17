import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { useAppStore } from '@/store';
import { changeAccountPassword } from '@/services/authService';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AccountSettingsModal({ open, onClose }: Props) {
  const user = useAppStore((s) => s.user);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setLoading(false);
  }, [open]);

  const savePassword = async () => {
    if (!isFirebaseConfigured()) {
      toast.error('Firebase no está configurado');
      return;
    }
    if (!currentPw || !newPw) {
      toast.error('Completa todos los campos');
      return;
    }
    if (newPw !== confirmPw) {
      toast.error('Las contraseñas nuevas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await changeAccountPassword(currentPw, newPw);
      toast.success('Contraseña actualizada');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Cuenta"
      description={user?.email ?? ''}
      maxWidthClass="max-w-md"
      footer={
        <>
          <button type="button" className="story-btn-secondary text-sm" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="story-btn-primary text-sm"
            disabled={loading}
            onClick={() => void savePassword()}
          >
            {loading ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-[#5A6078]">
          Para cambiar tu contraseña de Story Table, confirma la actual y elige una nueva (mín. 6 caracteres).
        </p>
        <PwField label="Contraseña actual" value={currentPw} onChange={setCurrentPw} show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} />
        <PwField label="Nueva contraseña" value={newPw} onChange={setNewPw} show={showNew} onToggle={() => setShowNew(!showNew)} />
        <PwField label="Confirmar nueva" value={confirmPw} onChange={setConfirmPw} show={showNew} onToggle={() => setShowNew(!showNew)} />
      </div>
    </BaseModal>
  );
}

function PwField({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs uppercase text-[#5A6078]">{label}</label>
      <motion.div className="relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
        <input
          type={show ? 'text' : 'password'}
          className="story-input w-full pr-10"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
        />
        <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#5A6078]" onClick={onToggle}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </motion.div>
    </div>
  );
}
