import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { BookOpen, Feather, Eye, EyeOff, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { isFirebaseConfigured } from '@/lib/firebase';
import { loginWithEmail, registerWithEmail, sendAccountPasswordReset } from '@/services/authService';
import { hydrateStoryBundleFromFirebase } from '@/services/storyBundleSync';

type AuthMode = 'login' | 'register';

export function LoginPage() {
  const user = useAppStore((s) => s.user);
  const login = useAppStore((s) => s.login);
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  if (user?.isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D10]">
        <Navigate to="/" replace />
      </div>
    );
  }

  const finishAuth = async (fbUser: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }) => {
    await hydrateStoryBundleFromFirebase(fbUser.uid);
    login({
      id: fbUser.uid,
      email: fbUser.email ?? email,
      displayName: fbUser.displayName ?? displayName.trim() ?? email.split('@')[0] ?? 'Usuario',
      photoURL: fbUser.photoURL ?? '',
      isAuthenticated: true,
    });
    toast.success(mode === 'register' ? 'Cuenta creada. Bienvenido/a' : 'Bienvenido/a');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Completa email y contraseña');
      return;
    }
    if (mode === 'register' && !displayName.trim()) {
      toast.error('Indica tu nombre o alias');
      return;
    }
    if (!isFirebaseConfigured()) {
      toast.error('Firebase no está configurado en este entorno');
      return;
    }
    setLoading(true);
    try {
      const fbUser =
        mode === 'register'
          ? await registerWithEmail(email.trim(), password, displayName.trim())
          : await loginWithEmail(email.trim(), password);
      await finishAuth(fbUser);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0D10]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D61E2B] shadow-lg shadow-[#D61E2B]/20">
            <Feather size={28} className="text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
            Story Table
          </h1>
          <p className="text-sm text-[#5A6078]">Tu biblioteca privada por cuenta</p>
        </div>

        <div className="story-card p-6 sm:p-7">
          <div className="mb-5 flex justify-center gap-6 border-b border-[#2A3045]">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`-mb-px pb-2 text-xs font-medium transition-colors ${
                mode === 'login'
                  ? 'border-b-2 border-[#D61E2B] text-[#E8E9EB]'
                  : 'text-[#5A6078] hover:text-[#8B91A7]'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`-mb-px pb-2 text-xs font-medium transition-colors ${
                mode === 'register'
                  ? 'border-b-2 border-[#D61E2B] text-[#E8E9EB]'
                  : 'text-[#5A6078] hover:text-[#8B91A7]'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">
                  Nombre
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="story-input w-full"
                  placeholder="Tu nombre"
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="story-input w-full"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••'}
                  className="story-input w-full pr-10"
                  required
                  minLength={mode === 'register' ? 6 : undefined}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6078] hover:text-[#E8E9EB]"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="story-btn-primary mt-2 w-full justify-center disabled:opacity-50">
              {mode === 'login' ? <BookOpen size={16} /> : <UserPlus size={16} />}
              {loading
                ? mode === 'register'
                  ? 'Creando cuenta…'
                  : 'Entrando…'
                : mode === 'register'
                  ? 'Crear cuenta'
                  : 'Entrar'}
            </button>

            {mode === 'login' && isFirebaseConfigured() && (
              <button
                type="button"
                disabled={resetLoading || !email.trim()}
                className="w-full text-center text-xs text-[#8B91A7] underline-offset-2 hover:text-[#D61E2B] hover:underline disabled:opacity-50"
                onClick={async () => {
                  if (!email.trim()) {
                    toast.error('Escribe tu email primero');
                    return;
                  }
                  setResetLoading(true);
                  try {
                    await sendAccountPasswordReset(email.trim());
                    toast.success('Revisa tu correo para restablecer la contraseña');
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'No se pudo enviar el correo');
                  } finally {
                    setResetLoading(false);
                  }
                }}
              >
                {resetLoading ? 'Enviando…' : '¿Olvidaste tu contraseña?'}
              </button>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
}
