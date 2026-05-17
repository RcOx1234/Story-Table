import { useState, useEffect } from 'react';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import type { World } from '@/types';
import { verifyWorldAccess, markWorldUnlocked } from '@/lib/worldUnlock';
import {
  clearWorldAttempts,
  getWorldAttemptState,
  recordFailedWorldAttempt,
  WORLD_PASSWORD_MAX_ATTEMPTS,
} from '@/lib/worldPasswordAttempts';
import { verifyAccountPassword } from '@/services/authService';
import { useAppStore } from '@/store';
import { sha256Hex } from '@/lib/password';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  world: World | null;
  onUnlocked: () => void;
  onCancel: () => void;
};

export function WorldPasswordModal({ open, world, onUnlocked, onCancel }: Props) {
  const updateWorld = useAppStore((s) => s.updateWorld);
  const user = useAppStore((s) => s.user);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState<'unlock' | 'reset'>('unlock');
  const [accountPw, setAccountPw] = useState('');
  const [newWorldPw, setNewWorldPw] = useState('');
  const [showAccountPw, setShowAccountPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [attemptState, setAttemptState] = useState({ remaining: WORLD_PASSWORD_MAX_ATTEMPTS, locked: false });

  useEffect(() => {
    if (!open || !world) return;
    setPassword('');
    setAccountPw('');
    setNewWorldPw('');
    setMode('unlock');
    setAttemptState(getWorldAttemptState(world.id));
  }, [open, world?.id]);

  const submitUnlock = async () => {
    if (!world) return;
    const state = getWorldAttemptState(world.id);
    if (state.locked) {
      toast.error('Demasiados intentos. Espera unos minutos.');
      return;
    }
    const ok = await verifyWorldAccess(world, password);
    if (!ok) {
      const next = recordFailedWorldAttempt(world.id);
      setAttemptState(getWorldAttemptState(world.id));
      if (next.locked) {
        toast.error(`Bloqueado tras ${WORLD_PASSWORD_MAX_ATTEMPTS} intentos. Vuelve en 15 minutos.`);
      } else {
        toast.error(`Contraseña incorrecta (${next.remaining} intentos restantes)`);
      }
      return;
    }
    clearWorldAttempts(world.id);
    markWorldUnlocked(world.id);
    toast.success('Mundo desbloqueado');
    setPassword('');
    onUnlocked();
  };

  const submitReset = async () => {
    if (!world) return;
    if (!isFirebaseConfigured() || !user?.email) {
      toast.error('Inicia sesión para restablecer la contraseña del mundo');
      return;
    }
    if (!newWorldPw.trim() || newWorldPw.length < 4) {
      toast.error('La nueva contraseña debe tener al menos 4 caracteres');
      return;
    }
    const accountOk = await verifyAccountPassword(accountPw);
    if (!accountOk) {
      toast.error('Contraseña de tu cuenta incorrecta');
      return;
    }
    const passwordHash = await sha256Hex(newWorldPw);
    updateWorld(world.id, { passwordHash, password: undefined, protected: true });
    clearWorldAttempts(world.id);
    markWorldUnlocked(world.id);
    toast.success('Contraseña del mundo actualizada');
    setAccountPw('');
    setNewWorldPw('');
    onUnlocked();
  };

  if (!world) return null;

  const locked = attemptState.locked;

  return (
    <BaseModal
      open={open}
      onClose={onCancel}
      title={mode === 'unlock' ? 'Mundo protegido' : 'Restablecer contraseña'}
      description={
        mode === 'unlock'
          ? `Introduce la contraseña para acceder a “${world.name}”.`
          : 'Confirma con la contraseña de tu cuenta de Story Table.'
      }
      maxWidthClass="max-w-md"
      footer={
        mode === 'unlock' ? (
          <>
            <button type="button" className="story-btn-secondary text-sm" onClick={onCancel}>
              Volver
            </button>
            <button
              type="button"
              className="story-btn-primary text-sm"
              disabled={locked}
              onClick={() => void submitUnlock()}
            >
              Desbloquear
            </button>
          </>
        ) : (
          <>
            <button type="button" className="story-btn-secondary text-sm" onClick={() => setMode('unlock')}>
              Cancelar
            </button>
            <button type="button" className="story-btn-primary text-sm" onClick={() => void submitReset()}>
              Guardar nueva contraseña
            </button>
          </>
        )
      }
    >
      {mode === 'unlock' ? (
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              autoFocus
              disabled={locked}
              className="story-input w-full pr-10"
              placeholder="Contraseña del mundo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !locked) void submitUnlock();
              }}
            />
            <button
              type="button"
              aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#5A6078] hover:text-[#E8E9EB]"
              onClick={() => setShowPw((v) => !v)}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {!locked && (
            <p className="text-xs text-[#5A6078]">
              Intentos restantes: {attemptState.remaining} de {WORLD_PASSWORD_MAX_ATTEMPTS}
            </p>
          )}
          {locked && (
            <p className="text-xs text-[#D61E2B]">
              Bloqueado temporalmente por demasiados intentos fallidos.
            </p>
          )}
          {isFirebaseConfigured() && user && (
            <button
              type="button"
              className="text-xs text-[#8B91A7] underline-offset-2 hover:text-[#D61E2B] hover:underline"
              onClick={() => setMode('reset')}
            >
              ¿Olvidaste la contraseña del mundo?
            </button>
          )}
        </div>
      ) : (
        <ResetForm
          accountPw={accountPw}
          setAccountPw={setAccountPw}
          newWorldPw={newWorldPw}
          setNewWorldPw={setNewWorldPw}
          showAccountPw={showAccountPw}
          setShowAccountPw={setShowAccountPw}
          showNewPw={showNewPw}
          setShowNewPw={setShowNewPw}
        />
      )}
    </BaseModal>
  );
}

function ResetForm({
  accountPw,
  setAccountPw,
  newWorldPw,
  setNewWorldPw,
  showAccountPw,
  setShowAccountPw,
  showNewPw,
  setShowNewPw,
}: {
  accountPw: string;
  setAccountPw: (v: string) => void;
  newWorldPw: string;
  setNewWorldPw: (v: string) => void;
  showAccountPw: boolean;
  setShowAccountPw: (v: boolean) => void;
  showNewPw: boolean;
  setShowNewPw: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs uppercase text-[#5A6078]">Contraseña de tu cuenta</label>
        <div className="relative">
          <input
            type={showAccountPw ? 'text' : 'password'}
            className="story-input w-full pr-10"
            value={accountPw}
            onChange={(e) => setAccountPw(e.target.value)}
            placeholder="Con la que iniciaste sesión"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#5A6078]"
            onClick={() => setShowAccountPw(!showAccountPw)}
          >
            {showAccountPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase text-[#5A6078]">Nueva contraseña del mundo</label>
        <NewPwField
          showNewPw={showNewPw}
          setShowNewPw={setShowNewPw}
          newWorldPw={newWorldPw}
          setNewWorldPw={setNewWorldPw}
        />
      </div>
    </div>
  );
}

function NewPwField({
  showNewPw,
  setShowNewPw,
  newWorldPw,
  setNewWorldPw,
}: {
  showNewPw: boolean;
  setShowNewPw: (v: boolean) => void;
  newWorldPw: string;
  setNewWorldPw: (v: string) => void;
}) {
  return (
    <div className="relative">
      <input
        type={showNewPw ? 'text' : 'password'}
        className="story-input w-full pr-10"
        value={newWorldPw}
        onChange={(e) => setNewWorldPw(e.target.value)}
        placeholder="Nueva contraseña"
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#5A6078]"
        onClick={() => setShowNewPw(!showNewPw)}
      >
        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
