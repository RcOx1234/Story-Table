import { Outlet } from 'react-router-dom';
import { MainLayout } from './MainLayout';
import { QuickCaptureModal } from '@/components/modals/QuickCaptureModal';
import { SearchModal } from '@/components/modals/SearchModal';
import { useAppStore } from '@/store';
import { isFirebaseConfigured } from '@/lib/firebase';
import { SplashLoader } from '@/components/auth/SplashLoader';
import { useStoryNavigationHistory } from '@/hooks/useStoryNavigationHistory';

/** Layout principal de la app (auth desactivado temporalmente). */
export function AuthLayout() {
  useStoryNavigationHistory();
  const storyDataLoading = useAppStore((s) => s.storyDataLoading);

  if (isFirebaseConfigured() && storyDataLoading) {
    return (
      <SplashLoader
        message="Story Table"
        submessage="Cargando tu biblioteca…"
      />
    );
  }

  return (
    <>
      <MainLayout>
        <Outlet />
      </MainLayout>
      <QuickCaptureModal />
      <SearchModal />
    </>
  );
}
