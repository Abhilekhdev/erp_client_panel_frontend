import { useEffect, type ReactNode } from 'react';
import { useAppSelector } from '@/app/hooks';
import { store } from '@/app/store';
import { AppSplash } from '@/components/ui/app-splash';
import { meRequest, refreshRequest } from './auth.api';
import { logout, setAccessToken, setUser } from './authSlice';

/**
 * Single-flight session restore.
 *
 * On first load we silently restore the session using the httpOnly refresh cookie:
 * refresh -> access token -> /auth/me. Any failure means "not logged in".
 *
 * CRITICAL: this must fire /auth/refresh **exactly once** per page load. React StrictMode invokes
 * effects twice in dev, and the refresh token rotates on every call — a second call carrying the
 * now-revoked token trips server-side reuse detection (token.service.ts), which revokes the entire
 * session family and bounces the user back to the login screen on every reload. Sharing one
 * module-level promise guarantees a single refresh even across StrictMode double-invokes or
 * multiple AuthBootstrap mounts.
 */
let bootstrapPromise: Promise<void> | null = null;

function bootstrapSession(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        const token = await refreshRequest();
        store.dispatch(setAccessToken(token));
        const user = await meRequest();
        store.dispatch(setUser(user));
      } catch {
        store.dispatch(logout());
      }
    })();
  }
  return bootstrapPromise;
}

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const status = useAppSelector((s) => s.auth.status);

  useEffect(() => {
    void bootstrapSession();
  }, []);

  if (status === 'idle') return <AppSplash />;
  return <>{children}</>;
}
