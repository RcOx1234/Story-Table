import { Outlet } from 'react-router-dom';
import { MainLayout } from './MainLayout';
import { QuickCaptureModal } from '@/components/modals/QuickCaptureModal';
import { SearchModal } from '@/components/modals/SearchModal';

/** Layout principal de la app (auth desactivado temporalmente). */
export function AuthLayout() {
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
