import { useAppStore } from '@/store';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useFirebaseAutoSync } from '@/hooks/useFirebaseAutoSync';
import { StoryTableContextMenu } from '@/components/common/StoryTableContextMenu';
import { StoryInsertionHost } from '@/components/common/StoryInsertionHost';
import { StoryEntityActionHost } from '@/components/common/StoryEntityActionHost';
import type { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  useFirebaseAutoSync();

  return (
    <div className="story-app flex h-screen w-full bg-[#0B0D10] overflow-hidden">
      <StoryTableContextMenu />
      <StoryInsertionHost />
      <StoryEntityActionHost />
      <div className="hidden h-full md:flex"><Sidebar /></div>
      <div 
        className="flex-1 flex flex-col min-w-0 transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? 0 : 0 }}
      >
        <div className="preview-banner" role="status">Vista de prueba · Datos ficticios · Sin conexión a tu biblioteca</div>
        <TopBar />
        <main id="main-scroll" className="min-h-0 flex-1 overflow-y-auto scrollbar-thin ambient-bg">
          <div className="story-content p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
