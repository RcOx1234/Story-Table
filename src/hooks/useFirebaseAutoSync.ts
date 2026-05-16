import { useEffect } from 'react';
import { useStore } from '@/store';
import { isFirebaseConfigured } from '@/lib/firebase';
import { pushStoryBundle } from '@/services/storyBundleSync';

/** Sincronización automática en segundo plano (sin UI). */
export function useFirebaseAutoSync() {
  const uid = useStore((s) => s.user?.id ?? null);

  useEffect(() => {
    if (!isFirebaseConfigured() || !uid) return;
    let timer: ReturnType<typeof setTimeout>;
    const unsub = useStore.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void pushStoryBundle(uid).catch(() => {});
      }, 2500);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [uid]);
}
