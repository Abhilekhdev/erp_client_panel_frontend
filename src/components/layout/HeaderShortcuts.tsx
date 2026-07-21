import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownCircle,
  BadgeDollarSign,
  CalendarDays,
  Calculator as CalcIcon,
  Hourglass,
  LayoutGrid,
  Plus,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Calculator } from '@/components/common/Calculator';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/features/auth/usePermission';
import { clockIn, clockOut, getClockStatus } from '@/features/hrm/attendance.api';
import { getApiErrorMessage } from '@/lib/api/axios';
import { cn } from '@/lib/utils';

/**
 * The header shortcut row — 1:1 with GOURI's `include/header.blade.php` button strip:
 *
 *   [Clock In ▾/Clock Out] [＋ quick-add] [calculator] [POS] [today's profit]  07/21/2026
 *
 * Same order, same targets, same permission gates. The visual language is ours (rounded pills,
 * tooltips on hover) rather than Bootstrap's flat squares, but every button maps to the legacy one.
 */

/** Shared pill styling so all shortcuts line up like the legacy strip. */
function Shortcut({
  title,
  onClick,
  to,
  tone = 'primary',
  className,
  children,
}: {
  title: string;
  onClick?: () => void;
  to?: string;
  tone?: 'primary' | 'blue' | 'amber';
  className?: string;
  children: ReactNode;
}) {
  const base = cn(
    'group/sc relative inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-white shadow-sm transition-colors',
    tone === 'primary' && 'bg-emerald-600 hover:bg-emerald-700',
    tone === 'blue' && 'bg-blue-600 hover:bg-blue-700',
    tone === 'amber' && 'bg-amber-500 hover:bg-amber-600',
    className,
  );
  const tip = (
    <span className="pointer-events-none invisible absolute top-full left-1/2 z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] text-background opacity-0 transition-opacity group-hover/sc:visible group-hover/sc:opacity-100">
      {title}
    </span>
  );
  if (to) {
    return (
      <Link to={to} className={base} aria-label={title}>
        {children}
        {tip}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={base} aria-label={title}>
      {children}
      {tip}
    </button>
  );
}

export function HeaderShortcuts() {
  const { has } = usePermissions();
  const qc = useQueryClient();

  const [calcOpen, setCalcOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [profitOpen, setProfitOpen] = useState(false);
  const [clockOpen, setClockOpen] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const calcRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLDivElement>(null);

  // GOURI gates the clock buttons on `allow_users_for_attendance_from_web`.
  const canClock = has('essentials.allow_users_for_attendance_from_web');

  const { data: status } = useQuery({
    queryKey: ['clock-status'],
    queryFn: getClockStatus,
    enabled: canClock,
    refetchOnWindowFocus: true,
  });
  const isClockedIn = Boolean(status?.clockedIn);

  const punch = useMutation({
    mutationFn: () => (isClockedIn ? clockOut({ note }) : clockIn({ note })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clock-status'] });
      qc.invalidateQueries({ queryKey: ['attendance'] });
      setClockOpen(false);
      setNote('');
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not record attendance')),
  });

  // Close the popovers on outside click / Escape.
  useEffect(() => {
    if (!calcOpen && !addOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (calcRef.current && !calcRef.current.contains(t)) setCalcOpen(false);
      if (addRef.current && !addRef.current.contains(t)) setAddOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setCalcOpen(false);
      setAddOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [calcOpen, addOpen]);

  const today = new Date().toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="flex items-center gap-1.5">
      {/* 1 — Clock In (blue) / Clock Out (amber, spinning) */}
      {canClock && (
        <Shortcut
          title={isClockedIn ? 'Clock Out' : 'Clock In'}
          tone={isClockedIn ? 'amber' : 'blue'}
          onClick={() => {
            setError('');
            setNote('');
            setClockOpen(true);
          }}
          className="hidden sm:inline-flex"
        >
          {isClockedIn ? (
            <Hourglass className="h-4 w-4 animate-pulse" />
          ) : (
            <ArrowDownCircle className="h-4 w-4" />
          )}
        </Shortcut>
      )}

      {/* 2 — quick-add dropdown (GOURI ships exactly one live item: Calendar) */}
      <div className="relative hidden sm:block" ref={addRef}>
        <Shortcut title="Quick add" onClick={() => setAddOpen((v) => !v)}>
          <Plus className="h-4 w-4" />
        </Shortcut>
        {addOpen && (
          <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border bg-card shadow-lg">
            <Link
              to="/calendar"
              onClick={() => setAddOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-accent"
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Calendar
            </Link>
          </div>
        )}
      </div>

      {/* 3 — calculator popover */}
      <div className="relative hidden md:block" ref={calcRef}>
        <Shortcut title="Calculator" onClick={() => setCalcOpen((v) => !v)}>
          <CalcIcon className="h-4 w-4" />
        </Shortcut>
        {calcOpen && (
          <div className="absolute right-0 z-50 mt-2 rounded-xl border bg-card p-3 shadow-lg">
            <Calculator />
          </div>
        )}
      </div>

      {/* 4 — POS (module + sell.create, exactly like GOURI) */}
      {has('sell.create') && (
        <Shortcut title="POS Sale" to="/pos/create" className="px-3">
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden text-xs font-semibold tracking-wide lg:inline">POS</span>
        </Shortcut>
      )}

      {/* 5 — Today's profit */}
      {has('profit_loss_report.view') && (
        <Shortcut
          title="Today's Profit"
          onClick={() => setProfitOpen(true)}
          className="hidden sm:inline-flex"
        >
          <BadgeDollarSign className="h-4 w-4" />
        </Shortcut>
      )}

      {/* Date — server-agnostic, matches the legacy `format_date('now')` strip */}
      <span className="ml-1 hidden whitespace-nowrap text-sm font-semibold text-muted-foreground lg:inline">
        {today}
      </span>

      {/* Clock in/out confirm modal (GOURI's clock_in_clock_out_modal) */}
      <Modal
        open={clockOpen}
        onClose={() => setClockOpen(false)}
        title={isClockedIn ? 'Clock Out' : 'Clock In'}
        footer={
          <>
            <Button variant="outline" onClick={() => setClockOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => punch.mutate()} isLoading={punch.isPending}>
              {isClockedIn ? 'Clock Out' : 'Clock In'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {isClockedIn && status?.clockInTime && (
            <p className="text-sm text-muted-foreground">
              Clocked in at{' '}
              <span className="font-medium text-foreground">
                {new Date(status.clockInTime).toLocaleTimeString()}
              </span>
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="punch-note">Note</Label>
            <Textarea
              id="punch-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
      </Modal>

      {/* Today's profit modal */}
      <Modal
        open={profitOpen}
        onClose={() => setProfitOpen(false)}
        title="Today's Profit"
        footer={
          <Button variant="outline" onClick={() => setProfitOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-2 py-2 text-center">
          <BadgeDollarSign className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Not available yet</p>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Profit is calculated from sales and purchases. Those modules (the transaction core)
            aren&apos;t built yet, so there is no figure to show — this will light up automatically
            once they land.
          </p>
        </div>
      </Modal>
    </div>
  );
}
