import { useAppStore } from '@/store';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useFirebaseAutoSync } from '@/hooks/useFirebaseAutoSync';
import type { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  useFirebaseAutoSync();

  return (
    <div className="flex h-screen w-full bg-[#0B0D10] overflow-hidden">
      <Sidebar />
      <div 
        className="flex-1 flex flex-col min-w-0 transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? 0 : 0 }}
      >
        <TopBar />
        <main id="main-scroll" className="flex-1 overflow-y-auto scrollbar-thin ambient-bg">
          <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
