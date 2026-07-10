import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { AppSplash } from '@/components/ui/app-splash';
import { usePermissions } from './usePermission';

/** Guards routes: redirects unauthenticated users to /login and enforces optional permission. */
export function ProtectedRoute({ permission }: { permission?: string }) {
  const status = useAppSelector((s) => s.auth.status);
  const location = useLocation();
  const { has } = usePermissions();

  if (status === 'idle' || status === 'authenticating') {
    return <AppSplash />;
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (permission && !has(permission)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
