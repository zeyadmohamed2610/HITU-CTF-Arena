import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AnnouncementBanner } from '../AnnouncementBanner';
import { logActivity } from '@/lib/activityLog';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  useEffect(() => {
    // Log every route change so admins can audit user navigation
    logActivity('page_visit', { path: location.pathname });
  }, [location.pathname]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center border-b border-border px-4 gap-4 bg-card/50 backdrop-blur-sm sticky top-0 z-40" style={{ minHeight: '3.5rem' }}>
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1" />
            <AnnouncementBanner />
          </header>
          <main className="flex-1 p-4 md:p-6 animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
