import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Cloud,
  KeyRound,
  Lock,
  LockOpen,
  Shield,
  UserX,
  Moon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { isFirebaseConfigured } from '@/lib/firebase';
import {
  changeAccountPassword,
  deleteAccountWithPassword,
  sendAccountPasswordReset,
} from '@/services/authService';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import { StoryToggle } from '@/components/common/StoryToggle';

export function SettingsPage() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const logoutStore = useAppStore((s) => s.logout);
  const autoSave = useAppStore((s) => s.firebaseAutoSaveEnabled);
  const setAutoSave = useAppStore((s) => s.setFirebaseAutoSaveEnabled);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const [dangerArmed, setDangerArmed] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!dangerArmed) return;
    const t = setTimeout(() => setDangerArmed(false), 8000);
    return () => clearTimeout(t);
  }, [dangerArmed]);

  const changePassword = async () => {
    if (newPw !== confirmPw) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (newPw.length < 6) {
      toast.error('Mínimo 6 caracteres');
      return;
    }
    setChangingPw(true);
    try {
      await changeAccountPassword(currentPw, newPw);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      toast.success('Contraseña actualizada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    } finally {
      setChangingPw(false);
    }
  };

  const resetByEmail = async () => {
    if (!user?.email) return;
    try {
      await sendAccountPasswordReset(user.email);
      toast.success('Te enviamos un enlace de recuperación');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleDangerClick = () => {
    if (!dangerArmed) {
      setDangerArmed(true);
      toast.message('Pulsa de nuevo para abrir la eliminación de cuenta', { duration: 4000 });
      return;
    }
    setDangerArmed(false);
    setDeleteOpen(true);
  };

  const confirmDeleteAccount = async () => {
    if (deletePhrase !== 'ELIMINAR MI CUENTA') {
      toast.error('Escribe exactamente: ELIMINAR MI CUENTA');
      return;
    }
    setDeleting(true);
    try {
      await deleteAccountWithPassword(deletePw);
      logoutStore();
      toast.success('Cuenta eliminada');
      navigate('/login');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar la cuenta');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const firebaseOn = isFirebaseConfigured();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
          Ajustes
        </h1>
        <p className="mt-1 text-sm text-[#5A6078]">Preferencias, sincronización y cuenta</p>
      </div>

      <section className="story-card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8E9EB]">
          <Moon size={16} className="text-[#8B5CF6]" /> Interfaz
        </h2>
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#2A3045]/70 bg-[#111318]/60 px-4 py-3">
          <span className="text-sm text-[#8B91A7]">Barra lateral expandida</span>
          <StoryToggle checked={sidebarOpen} onChange={() => toggleSidebar()} aria-label="Barra lateral expandida" />
        </label>
      </section>

      {firebaseOn && (
        <section className="story-card space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8E9EB]">
            <Cloud size={16} className="text-[#3B82F6]" /> Sincronización
          </h2>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#2A3045]/70 bg-[#111318]/60 px-4 py-3">
            <div>
              <p className="text-sm text-[#E8E9EB]">Auto-guardado en Firebase</p>
              <p className="text-[10px] text-[#5A6078]">
                Guarda solo tras cambios, al cambiar de página o cada 30 s como máximo
              </p>
            </div>
            <StoryToggle
              checked={autoSave}
              onChange={setAutoSave}
              aria-label="Auto-guardado en Firebase"
            />
          </label>
        </section>
      )}

      {firebaseOn && user?.isAuthenticated && (
        <section className="story-card space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8E9EB]">
            <KeyRound size={16} className="text-[#EAB308]" /> Seguridad
          </h2>
          <input
            type="password"
            className="story-input w-full"
            placeholder="Contraseña actual"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
          />
          <input
            type="password"
            className="story-input w-full"
            placeholder="Nueva contraseña"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
          <input
            type="password"
            className="story-input w-full"
            placeholder="Confirmar nueva contraseña"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="story-btn-primary text-sm"
              disabled={changingPw}
              onClick={() => void changePassword()}
            >
              Cambiar contraseña
            </button>
            <button type="button" className="story-btn-secondary text-sm" onClick={() => void resetByEmail()}>
              Enviar enlace por email
            </button>
          </div>
        </section>
      )}

      {firebaseOn && user?.isAuthenticated && (
        <section className="story-card space-y-4 border-[#D61E2B]/30 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#D61E2B]">
            <AlertTriangle size={16} /> Zona de peligro
          </h2>
          <p className="text-xs text-[#8B91A7]">
            Protegido con doble clic. Dentro del diálogo necesitarás tu contraseña y la frase{' '}
            <strong className="text-[#E8E9EB]">ELIMINAR MI CUENTA</strong>.
          </p>
          <button
            type="button"
            className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
              dangerArmed
                ? 'border-[#D61E2B] bg-[#D61E2B]/25 text-white shadow-[0_0_20px_rgba(214,30,43,0.25)]'
                : 'border-[#D61E2B]/40 bg-[#D61E2B]/10 text-[#D61E2B] hover:bg-[#D61E2B]/20'
            }`}
            onClick={handleDangerClick}
          >
            {dangerArmed ? <LockOpen size={16} /> : <Lock size={16} />}
            {dangerArmed ? 'Confirmar: eliminar cuenta' : 'Eliminar cuenta permanentemente'}
          </button>
          {dangerArmed && (
            <p className="text-center text-[10px] text-[#D61E2B]">Segundo clic activo · expira en unos segundos</p>
          )}
        </section>
      )}

      <BaseModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Eliminar cuenta"
        description="Esta acción es irreversible. Se borrarán tu biblioteca, archivos y acceso."
        maxWidthClass="max-w-md"
        footer={
          <>
            <button type="button" className="story-btn-secondary text-sm" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="story-btn-primary text-sm bg-[#D61E2B] hover:bg-[#b81824]"
              disabled={deleting}
              onClick={() => void confirmDeleteAccount()}
            >
              <UserX size={14} /> {deleting ? 'Eliminando…' : 'Eliminar definitivamente'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-[#D61E2B]/30 bg-[#D61E2B]/5 p-3 text-xs text-[#8B91A7]">
            <Shield size={14} className="mt-0.5 shrink-0 text-[#D61E2B]" />
            Escribe <strong className="text-[#E8E9EB]">ELIMINAR MI CUENTA</strong> y tu contraseña actual.
          </div>
          <input
            type="password"
            className="story-input w-full"
            placeholder="Contraseña actual"
            value={deletePw}
            onChange={(e) => setDeletePw(e.target.value)}
          />
          <input
            className="story-input w-full"
            placeholder="ELIMINAR MI CUENTA"
            value={deletePhrase}
            onChange={(e) => setDeletePhrase(e.target.value)}
          />
        </div>
      </BaseModal>
    </motion.div>
  );
}
