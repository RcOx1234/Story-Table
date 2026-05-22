import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '@/store';
import { isFirebaseConfigured } from '@/lib/firebase';
import { pushStoryBundle } from '@/services/storyBundleSync';
import { storyContentFingerprint } from '@/lib/storyFingerprint';

const DEBOUNCE_MS = 30_000;

/** Auto-guardado: solo si hubo cambios reales; al cambiar de ruta; máx. cada 30s en reposo. */
export function useFirebaseAutoSync() {
  const uid = useStore((s) => s.user?.id ?? null);
  const autoSave = useStore((s) => s.firebaseAutoSaveEnabled);
  const setSyncing = useStore((s) => s.setFirebaseAutoSaveSyncing);
  const { pathname } = useLocation();

  const lastSavedFp = useRef<string | null>(null);
  const pendingFp = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const flushSave = async (uid: string) => {
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
    } catch {
      /* reintento en el próximo cambio o navegación */
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
    lastSavedFp.current = bootFp;

    const unsub = useStore.subscribe((state) => {
      const fp = storyContentFingerprint(state);
      if (fp === lastSavedFp.current || fp === pendingFp.current) return;
      pendingFp.current = fp;
      scheduleSave(uid);
    });

    return () => {
      unsub();
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
