import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore } from '@/store';
import { isFirebaseConfigured } from '@/lib/firebase';
import { pushStoryBundle } from '@/services/storyBundleSync';
import { storyContentFingerprint } from '@/lib/storyFingerprint';
import { formatFirestoreSaveError } from '@/lib/firestorePayload';

const DEBOUNCE_MS = 8_000;

export function useFirebaseAutoSync() {
  const uid = useStore((s) => s.user?.id ?? null);
  const autoSave = useStore((s) => s.firebaseAutoSaveEnabled);
  const { pathname } = useLocation();
  const flushRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured() || !uid || !autoSave) return;
    let disposed = false;
    let saving = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clearTimer = () => { if (timer) clearTimeout(timer); timer = null; };
    const dirty = () => {
      const state = useStore.getState();
      return state.user?.id === uid && !state.storyDataLoading &&
        storyContentFingerprint(state) !== state.lastFirebaseSyncFingerprint;
    };
    const schedule = () => {
      if (disposed || saving) return;
      clearTimer();
      if (dirty()) timer = setTimeout(() => { timer = null; void flush(); }, DEBOUNCE_MS);
    };
    const flush = async () => {
      if (disposed || saving || !dirty()) return;
      clearTimer();
      saving = true;
      useStore.getState().setFirebaseAutoSaveSyncing(true);
      let succeeded = false;
      try {
        await pushStoryBundle(uid);
        succeeded = true;
      } catch (error) {
        if (!disposed) toast.error(formatFirestoreSaveError(error), { id: 'firebase-autosave-error' });
      } finally {
        saving = false;
        if (!disposed) {
          useStore.getState().setFirebaseAutoSaveSyncing(false);
          // Only the sent snapshot was acknowledged. Later edits remain dirty.
          if (succeeded) schedule();
          else clearTimer(); // Retry on an edit, reconnect, or visible tab; no tight failure loop.
        }
      }
    };
    const flushNow = () => { void flush(); };
    flushRef.current = flushNow;
    const unsubscribe = useStore.subscribe(schedule);
    const onVisibility = () => {
      // Local persistence is the recovery source; do not depend on an async unload write.
      if (document.visibilityState === 'visible') schedule();
    };
    window.addEventListener('online', schedule);
    document.addEventListener('visibilitychange', onVisibility);
    schedule();
    return () => {
      disposed = true;
      clearTimer();
      unsubscribe();
      window.removeEventListener('online', schedule);
      document.removeEventListener('visibilitychange', onVisibility);
      if (flushRef.current === flushNow) flushRef.current = null;
      useStore.getState().setFirebaseAutoSaveSyncing(false);
    };
  }, [uid, autoSave]);

  useEffect(() => { flushRef.current?.(); }, [pathname]);
}
