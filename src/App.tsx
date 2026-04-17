import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { TeamGate } from '@/components/TeamGate';
import { CTFGate } from '@/components/CTFGate';

import AuthPage from '@/pages/AuthPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import ChallengesPage from '@/pages/ChallengesPage';
import CtfRegistrationPage from '@/pages/CtfRegistrationPage';
import CtfSettingsPage from '@/pages/CtfSettingsPage';
import ScoreboardPage from '@/pages/ScoreboardPage';
import RulesPage from '@/pages/RulesPage';
import InfoPage from '@/pages/InfoPage';
import AnnouncementsPage from '@/pages/AnnouncementsPage';
import TicketsPage from '@/pages/TicketsPage';
import ProfilePage from '@/pages/ProfilePage';
import UserProfilePage from '@/pages/UserProfilePage';
import TeamProfilePage from '@/pages/TeamProfilePage';
import MyTeamPage from '@/pages/MyTeamPage';
import AllUsersPage from '@/pages/AllUsersPage';
import AllTeamsPage from '@/pages/AllTeamsPage';
import BannedPage from '@/pages/BannedPage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';
import AdminTeamsPage from '@/pages/admin/AdminTeamsPage';
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage';
import AdminAnnouncementsPage from '@/pages/admin/AdminAnnouncementsPage';
import AdminLogsPage from '@/pages/admin/AdminLogsPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AuthorChallengesPage from '@/pages/author/AuthorChallengesPage';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

function ProtectedLayout({ children, requiredRole, requiredRoles }: { children: React.ReactNode; requiredRole?: any; requiredRoles?: any[] }) {
  return (
    <ProtectedRoute requiredRole={requiredRole} requiredRoles={requiredRoles}>
      <TeamGate>
        <AppLayout>{children}</AppLayout>
      </TeamGate>
    </ProtectedRoute>
  );
}

// Wraps challenges page with CTF start gate
function CTFProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <TeamGate>
        <AppLayout>
          <CTFGate>{children}</CTFGate>
        </AppLayout>
      </TeamGate>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/banned" element={<BannedPage />} />

      <Route path="/" element={<CTFProtectedLayout><DashboardPage /></CTFProtectedLayout>} />
      <Route path="/challenges" element={<CTFProtectedLayout><ChallengesPage /></CTFProtectedLayout>} />
      <Route path="/ctf-registration" element={<ProtectedLayout><CtfRegistrationPage /></ProtectedLayout>} />
      <Route path="/ctf-settings" element={<ProtectedLayout requiredRole="admin"><CtfSettingsPage /></ProtectedLayout>} />

      {/* These are accessible even before CTF starts */}
      <Route path="/scoreboard" element={<ProtectedLayout><ScoreboardPage /></ProtectedLayout>} />
      <Route path="/rules" element={<ProtectedLayout><RulesPage /></ProtectedLayout>} />
      <Route path="/info" element={<ProtectedLayout><InfoPage /></ProtectedLayout>} />
      <Route path="/announcements" element={<ProtectedLayout><AnnouncementsPage /></ProtectedLayout>} />
      <Route path="/tickets" element={<ProtectedLayout><TicketsPage /></ProtectedLayout>} />
      <Route path="/profile" element={<ProtectedLayout><ProfilePage /></ProtectedLayout>} />
      <Route path="/my-team" element={<ProtectedLayout><MyTeamPage /></ProtectedLayout>} />
      <Route path="/users" element={<ProtectedLayout><AllUsersPage /></ProtectedLayout>} />
      <Route path="/teams" element={<ProtectedLayout><AllTeamsPage /></ProtectedLayout>} />
      <Route path="/user/:userId" element={<ProtectedLayout><UserProfilePage /></ProtectedLayout>} />
      <Route path="/team/:teamId" element={<ProtectedLayout><TeamProfilePage /></ProtectedLayout>} />

      {/* Author */}
      <Route path="/author/challenges" element={<ProtectedLayout requiredRoles={['ctf_author', 'admin']}><AuthorChallengesPage /></ProtectedLayout>} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedLayout requiredRole="admin"><AdminDashboard /></ProtectedLayout>} />
      <Route path="/admin/users" element={<ProtectedLayout requiredRole="admin"><AdminUsersPage /></ProtectedLayout>} />
      <Route path="/admin/teams" element={<ProtectedLayout requiredRole="admin"><AdminTeamsPage /></ProtectedLayout>} />
      <Route path="/admin/categories" element={<ProtectedLayout requiredRole="admin"><AdminCategoriesPage /></ProtectedLayout>} />
      <Route path="/admin/announcements" element={<ProtectedLayout requiredRole="admin"><AdminAnnouncementsPage /></ProtectedLayout>} />
      <Route path="/admin/logs" element={<ProtectedLayout requiredRole="admin"><AdminLogsPage /></ProtectedLayout>} />
      <Route path="/admin/settings" element={<ProtectedLayout requiredRole="admin"><AdminSettingsPage /></ProtectedLayout>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
