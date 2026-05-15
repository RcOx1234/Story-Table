import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { User as FirebaseUser } from 'firebase/auth';
import { subscribeToAuth } from '@/services/authService';
import { isFirebaseConfigured } from '@/lib/firebase';
import { useStore } from '@/store';
import { SplashLoader } from './SplashLoader';

/** Rutas privadas: con Firebase obliga sesión; sin Firebase la app sigue en modo local. */
export function ProtectedRoute() {
  const [ready, setReady] = useState(!isFirebaseConfigured());
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const login = useStore((s) => s.login);
  const logoutStore = useStore((s) => s.logout);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setReady(true);
      return;
    }
    return subscribeToAuth((u) => {
      setUser(u);
      if (u) {
        login({
          id: u.uid,
          email: u.email ?? '',
          displayName: u.displayName ?? u.email?.split('@')[0] ?? 'Usuario',
          photoURL: u.photoURL ?? '',
          isAuthenticated: true,
        });
      } else {
        logoutStore();
      }
      setReady(true);
    });
  }, [login, logoutStore]);

  if (!isFirebaseConfigured()) {
    return <Outlet />;
  }

  if (!ready) {
    return <SplashLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
