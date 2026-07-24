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
import { getProfitLoss } from '@/features/reports/reports.api';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';

/** Today as a local YYYY-MM-DD (not UTC — the profit window must match the user's calendar day). */
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

  // Today's profit — GOURI's header widget; a profit-loss report scoped to today's date only.
  const profitDay = todayIso();
  const {
    data: profit,
    isLoading: profitLoading,
    isError: profitError,
  } = useQuery({
    queryKey: ['today-profit', profitDay],
    queryFn: () => getProfitLoss({ startDate: profitDay, endDate: profitDay }),
    enabled: profitOpen && has('profit_loss_report.view'),
  });

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
        {profitLoading ? (
          <div className="space-y-2 py-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : profitError ? (
          <div className="py-4 text-center text-sm text-destructive">
            Could not load today&apos;s profit. Please try again.
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Headline: gross profit for today (sell revenue − allocated purchase cost). */}
            <div className="rounded-lg border bg-muted/40 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Gross profit today
              </p>
              <p
                className={cn(
                  'mt-1 text-2xl font-semibold tabular-nums',
                  (profit?.grossProfit ?? 0) < 0 ? 'text-destructive' : 'text-emerald-600',
                )}
              >
                {formatMoney(profit?.grossProfit ?? 0)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <ProfitRow label="Total sell" value={profit?.totalSell ?? 0} />
              <ProfitRow label="Sell return" value={profit?.sellReturn ?? 0} />
              <ProfitRow label="Total purchase" value={profit?.totalPurchase ?? 0} />
              <ProfitRow label="Purchase return" value={profit?.purchaseReturn ?? 0} />
              <ProfitRow label="Total expense" value={profit?.totalExpense ?? 0} />
              <ProfitRow label="Net profit" value={profit?.netProfit ?? 0} strong />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Gross profit = sold value − its purchase cost. Net profit also subtracts expenses.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** One label/amount line in the profit breakdown. `strong` highlights the net-profit row. */
function ProfitRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between', strong && 'font-semibold')}>
      <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
      <span
        className={cn('tabular-nums', strong && value < 0 && 'text-destructive')}
      >
        {formatMoney(value)}
      </span>
    </div>
  );
}
