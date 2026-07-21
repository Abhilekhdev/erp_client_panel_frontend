import { ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { HeaderShortcuts } from '@/components/layout/HeaderShortcuts';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/useAuth';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const fullName = [user?.surname, user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const displayName = fullName || user?.email || 'User';
  const role = user?.isBusinessAdmin ? 'Super Admin' : (user?.roles?.[0] ?? 'Member');

  // Close the user dropdown on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  return (
    // Full-height frame; global page scroll is disabled so each pane scrolls on its own.
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 -translate-x-full transition-transform lg:static lg:translate-x-0',
          open && 'translate-x-0',
        )}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden />
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b bg-background px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <span className="text-sm font-semibold text-foreground">
              {user?.business?.name ?? 'Workspace'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* GOURI header shortcut strip: clock in/out · quick add · calculator · POS · profit · date */}
            <HeaderShortcuts />

            <span className="mx-1 hidden h-6 w-px bg-border sm:block" />

            <ThemeToggle />

            <NotificationBell />

            {/* User dropdown */}
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
                <ChevronDown
                  className={cn('h-4 w-4 text-muted-foreground transition-transform', menuOpen && 'rotate-180')}
                />
              </button>

              {menuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border bg-card shadow-lg">
                  <div className="border-b px-4 py-3">
                    <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      logout.mutate();
                    }}
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

        {/* Content pane: scrolls independently of the sidebar */}
        <main className="scroll-light flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
