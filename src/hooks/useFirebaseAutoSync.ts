import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore } from '@/store';
import { isFirebaseConfigured } from '@/lib/firebase';
import { pushStoryBundle } from '@/services/storyBundleSync';
import { storyContentFingerprint } from '@/lib/storyFingerprint';
import { formatFirestoreSaveError } from '@/lib/firestorePayload';

const DEBOUNCE_MS = 8_000;

/** Auto-guardado: cambios reales, al cambiar de ruta, al cerrar pestaña; máx. cada 8s en reposo. */
export function useFirebaseAutoSync() {
  const uid = useStore((s) => s.user?.id ?? null);
  const autoSave = useStore((s) => s.firebaseAutoSaveEnabled);
  const setSyncing = useStore((s) => s.setFirebaseAutoSaveSyncing);
  const { pathname } = useLocation();

  const lastSavedFp = useRef<string | null>(null);
  const pendingFp = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const uidRef = useRef(uid);
  uidRef.current = uid;

  const flushSave = async (uid: string, opts?: { silent?: boolean }) => {
    if (savingRef.current || !pendingFp.current) return;
    if (pendingFp.current === lastSavedFp.current) {
      pendingFp.current = null;
      return;
    }
    savingRef.current = true;
    setSyncing(true);
    try {
      await pushStoryBundle(uid);
      lastSavedFp.current = pendingFp.current;
      pendingFp.current = null;
    } catch (err) {
      if (!opts?.silent) {
        toast.error(formatFirestoreSaveError(err), { id: 'firebase-autosave-error' });
      }
    } finally {
      savingRef.current = false;
      setSyncing(false);
    }
  };

  const scheduleSave = (uid: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flushSave(uid);
    }, DEBOUNCE_MS);
  };

  useEffect(() => {
    if (!isFirebaseConfigured() || !uid || !autoSave) {
      if (timerRef.current) clearTimeout(timerRef.current);
      lastSavedFp.current = null;
      pendingFp.current = null;
      setSyncing(false);
      return;
    }

    const bootFp = storyContentFingerprint(useStore.getState());
    const syncedFp = useStore.getState().lastFirebaseSyncFingerprint;
    lastSavedFp.current = syncedFp ?? bootFp;

    const unsub = useStore.subscribe((state) => {
      const fp = storyContentFingerprint(state);
      if (fp === lastSavedFp.current || fp === pendingFp.current) return;
      pendingFp.current = fp;
      scheduleSave(uid);
    });

    const onPageHide = () => {
      const currentUid = uidRef.current;
      if (!currentUid || !pendingFp.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      void flushSave(currentUid, { silent: true });
    };

    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onPageHide();
    });

    return () => {
      unsub();
      window.removeEventListener('pagehide', onPageHide);
      if (timerRef.current) clearTimeout(timerRef.current);
      setSyncing(false);
    };
  }, [uid, autoSave, setSyncing]);

  useEffect(() => {
    if (!isFirebaseConfigured() || !uid || !autoSave || !pendingFp.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    void flushSave(uid);
  }, [pathname, uid, autoSave]);
}
