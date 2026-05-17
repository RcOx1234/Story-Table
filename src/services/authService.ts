import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
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
    'auth/requires-recent-login': 'Vuelve a iniciar sesión y prueba de nuevo',
    'auth/missing-email': 'Indica un email válido',
  };
  return messages[code] ?? 'Error al autenticar';
}

function wrapAuthError(err: unknown): Error {
  const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
  return new Error(authErrorMessage(code));
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  if (!auth) throw new Error('Firebase no está configurado');
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (err: unknown) {
    throw wrapAuthError(err);
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
    throw wrapAuthError(err);
  }
}

export async function sendAccountPasswordReset(email: string): Promise<void> {
  if (!auth) throw new Error('Firebase no está configurado');
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (err: unknown) {
    throw wrapAuthError(err);
  }
}

export async function changeAccountPassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!auth?.currentUser?.email) throw new Error('Debes iniciar sesión');
  if (newPassword.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
  try {
    const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, cred);
    await updatePassword(auth.currentUser, newPassword);
  } catch (err: unknown) {
    throw wrapAuthError(err);
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
