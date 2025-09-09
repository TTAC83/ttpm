import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: string;
  redirectTo?: string;
}

export const AuthGuard = ({ 
  children, 
  requireAuth = true, 
  requiredRole,
  redirectTo = '/auth'
}: AuthGuardProps) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    // If authentication is required but user is not logged in
    if (requireAuth && !user) {
      navigate(redirectTo, { 
        state: { from: location.pathname },
        replace: true 
      });
      return;
    }

    // If specific role is required but user doesn't have it
    if (requiredRole && (!profile || profile.role !== requiredRole)) {
      navigate('/app', { replace: true });
      return;
    }

    // If user is authenticated but trying to access auth page, redirect to app
    if (!requireAuth && user && location.pathname === '/auth') {
      const from = location.state?.from || '/app';
      navigate(from, { replace: true });
      return;
    }
  }, [user, profile, loading, requireAuth, requiredRole, navigate, location, redirectTo]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not logged in, don't render children
  if (requireAuth && !user) {
    return null;
  }

  // If specific role is required but user doesn't have it, don't render children
  if (requiredRole && (!profile || profile.role !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
};