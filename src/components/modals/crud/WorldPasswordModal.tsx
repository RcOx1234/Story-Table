import { useState } from 'react';
import { BaseModal } from '@/components/modals/crud/BaseModal';
import type { World } from '@/types';
import { verifyWorldAccess, markWorldUnlocked } from '@/lib/worldUnlock';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  world: World | null;
  onUnlocked: () => void;
  onCancel: () => void;
};

export function WorldPasswordModal({ open, world, onUnlocked, onCancel }: Props) {
  const [password, setPassword] = useState('');

  const submit = async () => {
    if (!world) return;
    const ok = await verifyWorldAccess(world, password);
    if (!ok) {
      toast.error('Contraseña incorrecta');
      return;
    }
    markWorldUnlocked(world.id);
    toast.success('Mundo desbloqueado');
    setPassword('');
    onUnlocked();
  };

  if (!world) return null;

  return (
    <BaseModal
      open={open}
      onClose={onCancel}
      title="Mundo protegido"
      description={`Introduce la contraseña para acceder a “${world.name}”.`}
      maxWidthClass="max-w-md"
      footer={
        <>
          <button type="button" className="story-btn-secondary text-sm" onClick={onCancel}>
            Volver
          </button>
          <button type="button" className="story-btn-primary text-sm" onClick={() => void submit()}>
            Desbloquear
          </button>
        </>
      }
    >
      <input
        type="password"
        autoFocus
        className="story-input w-full"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit();
        }}
      />
    </BaseModal>
  );
}
