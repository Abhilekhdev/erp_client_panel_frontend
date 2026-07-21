import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Calendar,
  Check,
  Loader2,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  clearAllNotifications,
  listNotifications,
  getUnreadCount,
  timeAgo,
  type AppNotification,
} from './notifications.api';

/** Icon keys emitted by the backend → lucide components. */
const ICONS: Record<string, LucideIcon> = {
  bell: Bell,
  calendar: Calendar,
  check: Check,
  x: X,
  wallet: Wallet,
};

/**
 * Header notification bell — the port of GOURI's `header-notifications.blade.php` +
 * `HomeController@loadMoreNotifications` / `@getTotalUnreadNotifications`.
 *
 * Kept from legacy: a pulsing dot (not a number) on the icon, the unread count inside the dropdown
 * header, an empty list that loads on open, 10-per-page "load more", opening the bell marking
 * everything read, and a background poll for the count.
 *
 * Fixed vs legacy: "Clear all" actually works (it was a dead `href="#"`), the load-more button and
 * count polling are wired to elements that exist (both were orphaned selectors in the current
 * theme), and rows are keyboard reachable.
 */
const POLL_MS = 60_000; // GOURI: config('constants.new_notification_count_interval', 60) * 1000

export function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // Badge count — polls in the background so the dot appears without a reload.
  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: getUnreadCount,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });

  // The list is fetched only while the dropdown is open (legacy loads on click).
  const { data: pageData, isFetching } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => listNotifications(page),
    enabled: open,
  });

  // Page 1 replaces the list; later pages append (the "load more" behaviour).
  useEffect(() => {
    if (!pageData) return;
    setItems((prev) => (pageData.page === 1 ? pageData.data : [...prev, ...pageData.data]));
    // Opening the bell marks everything read server-side — refresh the badge.
    if (pageData.page === 1) qc.invalidateQueries({ queryKey: ['notifications-unread'] });
  }, [pageData, qc]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const clear = useMutation({
    mutationFn: clearAllNotifications,
    onSuccess: () => {
      setItems([]);
      setPage(1);
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      // Re-fetch page 1 on every open, exactly like the legacy click handler.
      setPage(1);
      qc.invalidateQueries({ queryKey: ['notifications', 1] });
    }
  };

  const openNotification = (n: AppNotification) => {
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-2 top-2 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-card shadow-lg sm:w-96"
        >
          {/* Header: unread count on the left, Clear all on the right (mirrors the blade) */}
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">
              {unread > 0 ? `${unread} unread` : 'Notifications'}
            </span>
            <button
              type="button"
              onClick={() => clear.mutate()}
              disabled={clear.isPending || items.length === 0}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Clear all
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isFetching && items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications found
              </p>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.icon] ?? Bell;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openNotification(n)}
                    className={cn(
                      'flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent',
                      !n.readAt && 'bg-primary/5',
                    )}
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn('block text-sm leading-snug', !n.readAt && 'font-semibold')}
                      >
                        {n.msg}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {pageData?.hasMore && (
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={isFetching}
              className="w-full border-t px-4 py-2.5 text-center text-xs font-medium text-primary transition-colors hover:bg-accent disabled:opacity-60"
            >
              {isFetching ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
