import { Navigate } from 'react-router-dom';
import { useAuthStore, type AppRole } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
  requiredRoles?: AppRole[];
}

export function ProtectedRoute({ children, requiredRole, requiredRoles }: ProtectedRouteProps) {
  const { user, loading, initialized, hasRole, profile } = useAuthStore();

  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profile?.is_banned) {
    return <Navigate to="/banned" replace />;
  }

  if (requiredRole && !hasRole(requiredRole) && !hasRole('admin')) {
    return <Navigate to="/" replace />;
  }

  if (requiredRoles && !requiredRoles.some((r) => hasRole(r)) && !hasRole('admin')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
