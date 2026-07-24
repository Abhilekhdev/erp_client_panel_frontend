import { ChevronDown, LogOut, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { HeaderShortcuts } from '@/components/layout/HeaderShortcuts';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useAuth } from '@/features/auth/useAuth';
import { cn } from '@/lib/utils';

/**
 * Full-screen shell for the POS till — GOURI's `header-pos` layout: a slim top bar and NO sidebar,
 * so the bill + product wall get the whole viewport. Everything else in the app uses AppLayout.
 */
export function PosLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const fullName = [user?.surname, user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const displayName = fullName || user?.email || 'User';
  const role = user?.isBusinessAdmin ? 'Super Admin' : (user?.roles?.[0] ?? 'Member');

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-muted/30">
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b bg-background px-3 lg:px-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">{user?.business?.name ?? 'Workspace'}</span>
          {/* Leave the till back to the rest of the app. */}
          <Link to="/pos" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent">
            <X className="h-4 w-4" />Exit POS
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <HeaderShortcuts />
          <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
          <ThemeToggle />
          <NotificationBell />
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-accent"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {(user?.firstName?.[0] ?? displayName[0] ?? 'U').toUpperCase()}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight text-foreground">{displayName}</span>
                <span className="block text-[11px] leading-tight text-muted-foreground">{role}</span>
              </span>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', menuOpen && 'rotate-180')} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border bg-card shadow-lg">
                <div className="border-b px-4 py-3">
                  <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); logout.mutate(); }}
                  disabled={logout.isPending}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Desktop: the till owns its own internal scrolling (cart + product wall), so the page itself
          never scrolls. Mobile: fall back to normal page scroll. */}
      <main className="flex-1 overflow-y-auto p-3 lg:min-h-0 lg:overflow-hidden lg:p-4">
        <Outlet />
      </main>
    </div>
  );
}
