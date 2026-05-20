import { useAppStore } from '@/store';
import { isFirebaseConfigured } from '@/lib/firebase';

/** True cuando la biblioteca ya está lista (o no hay Firebase). */
export function useStoryDataReady(): boolean {
  const loading = useAppStore((s) => s.storyDataLoading);
  if (!isFirebaseConfigured()) return true;
  return !loading;
}
