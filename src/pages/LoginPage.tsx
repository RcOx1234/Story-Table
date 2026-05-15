import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { BookOpen, Feather, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { isFirebaseConfigured } from '@/lib/firebase';
import { loginWithEmail, registerWithEmail } from '@/services/authService';

export function LoginPage() {
  const user = useAppStore((s) => s.user);
  const login = useAppStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (user?.isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D10]">
        <Navigate to="/" replace />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Completa todos los campos');
      return;
    }
    setLoading(true);
    try {
      if (isFirebaseConfigured()) {
        const fbUser = isRegister ? await registerWithEmail(email, password, name || email.split('@')[0]!) : await loginWithEmail(email, password);
        login({
          id: fbUser.uid,
          email: fbUser.email ?? email,
          displayName: fbUser.displayName ?? (name || email.split('@')[0] || 'Usuario'),
          photoURL: fbUser.photoURL ?? '',
          isAuthenticated: true,
        });
        toast.success(isRegister ? 'Cuenta creada' : 'Bienvenido');
      } else {
        login({
          id: crypto.randomUUID(),
          email,
          displayName: name || email.split('@')[0] || 'Local',
          photoURL: '',
          isAuthenticated: true,
        });
        toast.success('Modo local: Firebase no está configurado en .env');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0D10]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-[#D61E2B]/5 blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-[#3B82F6]/5 blur-[128px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D61E2B] shadow-lg shadow-[#D61E2B]/20">
            <Feather size={28} className="text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
            Story Table
          </h1>
          <p className="text-sm text-[#5A6078]">Tu mesa de trabajo creativa</p>
        </div>

        <div className="story-card p-8">
          <h2 className="mb-6 text-center text-xl font-semibold text-[#E8E9EB]">{isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {isRegister && (
              <div>
                <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">Nombre</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="story-input w-full" />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="story-input w-full" required />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="story-input w-full pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6078] hover:text-[#E8E9EB]">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="story-btn-primary mt-2 w-full justify-center disabled:opacity-50">
              <BookOpen size={16} />
              {loading ? '…' : isRegister ? 'Crear Cuenta' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-sm text-[#8B91A7] transition-colors hover:text-[#D61E2B]">
              {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>
          {!isFirebaseConfigured() && (
            <p className="mt-4 text-center text-xs text-[#5A6078]">
              Sin variables <code className="text-[#8B91A7]">VITE_FIREBASE_*</code> la app usa sesión local de demostración.
            </p>
          )}
          <div className="mt-4 text-center">
            <Link to="/" className="text-xs text-[#5A6078] hover:text-[#D61E2B]">
              Volver al inicio
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
