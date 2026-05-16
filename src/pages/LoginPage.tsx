import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { motion } from 'framer-motion';
import { BookOpen, Feather, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { isFirebaseConfigured } from '@/lib/firebase';
import { loginWithEmail } from '@/services/authService';

export function LoginPage() {
  const user = useAppStore((s) => s.user);
  const login = useAppStore((s) => s.login);
  const [email, setEmail] = useState('obamarst@gmail.com');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user?.isAuthenticated) {
    return (
      <motion.div className="flex min-h-screen items-center justify-center bg-[#0B0D10]">
        <Navigate to="/" replace />
      </motion.div>
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
        const fbUser = await loginWithEmail(email, password);
        login({
          id: fbUser.uid,
          email: fbUser.email ?? email,
          displayName: fbUser.displayName ?? email.split('@')[0] ?? 'Usuario',
          photoURL: fbUser.photoURL ?? '',
          isAuthenticated: true,
        });
        toast.success('Bienvenido');
      } else {
        toast.error('Firebase no está configurado');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0D10]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md px-6">
        <motion.div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D61E2B] shadow-lg shadow-[#D61E2B]/20">
            <Feather size={28} className="text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-[#E8E9EB]" style={{ fontFamily: 'Montserrat' }}>
            Story Table
          </h1>
          <p className="text-sm text-[#5A6078]">Acceso personal</p>
        </motion.div>

        <div className="story-card p-8">
          <h2 className="mb-6 text-center text-xl font-semibold text-[#E8E9EB]">Iniciar sesión</h2>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
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
              <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-[#5A6078]">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="story-input w-full pr-10"
                  required
                  autoComplete="current-password"
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
              <BookOpen size={16} />
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
