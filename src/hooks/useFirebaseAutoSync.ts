import { useEffect } from 'react';
import { useStore } from '@/store';
import { isFirebaseConfigured } from '@/lib/firebase';
import { pushStoryBundle } from '@/services/storyBundleSync';

/** Sincronización automática en segundo plano (sin UI). */
export function useFirebaseAutoSync() {
  const uid = useStore((s) => s.user?.id ?? null);
  const autoSave = useStore((s) => s.firebaseAutoSaveEnabled);
  const setSyncing = useStore((s) => s.setFirebaseAutoSaveSyncing);

  useEffect(() => {
    if (!isFirebaseConfigured() || !uid || !autoSave) {
      setSyncing(false);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const unsub = useStore.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setSyncing(true);
        void pushStoryBundle(uid)
          .catch(() => {})
          .finally(() => setSyncing(false));
      }, 2500);
    });
    return () => {
      clearTimeout(timer);
      setSyncing(false);
      unsub();
    };
  }, [uid, autoSave, setSyncing]);
}
