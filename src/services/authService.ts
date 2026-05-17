import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';

export type AuthUser = User;

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured() || !auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

function authErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'Email o contraseña incorrectos',
    'auth/user-not-found': 'No existe una cuenta con ese email',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/email-already-in-use': 'Ese email ya está registrado',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
    'auth/invalid-email': 'Email no válido',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento',
  };
  return messages[code] ?? 'Error al autenticar';
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  if (!auth) throw new Error('Firebase no está configurado');
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
    throw new Error(authErrorMessage(code));
  }
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  if (!auth) throw new Error('Firebase no está configurado');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    return cred.user;
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
    throw new Error(authErrorMessage(code));
  }
}

export async function logout(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

/** Verifica la contraseña de la cuenta actual (p. ej. antes de cambiar contraseña de un mundo). */
export async function verifyAccountPassword(password: string): Promise<boolean> {
  if (!auth?.currentUser?.email) return false;
  try {
    const cred = EmailAuthProvider.credential(auth.currentUser.email, password);
    await reauthenticateWithCredential(auth.currentUser, cred);
    return true;
  } catch {
    return false;
  }
}
