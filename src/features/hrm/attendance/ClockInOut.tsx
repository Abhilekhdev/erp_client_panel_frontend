import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock, Loader2, LogIn, LogOut, MapPin, MapPinOff, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api/axios';
import { cn } from '@/lib/utils';
import { clockIn, clockOut, getClockStatus } from '../attendance.api';

/** A `Date` that re-renders every second — drives the live wall clock + elapsed timer. */
function useNow(active = true): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/** Time-of-day greeting: morning / afternoon / evening / night. */
function greeting(h: number): string {
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

function elapsedSince(clockInTime: string, now: Date): string {
  const secs = Math.max(0, Math.floor((now.getTime() - new Date(clockInTime).getTime()) / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(secs / 3600))}:${p(Math.floor((secs % 3600) / 60))}:${p(secs % 60)}`;
}

type LocStatus = 'idle' | 'loading' | 'ok' | 'error';
interface LocState {
  status: LocStatus;
  address: string; // reverse-geocoded human address (or coords fallback) — stored with the attendance
  coords: string; // "lat,lng" for the map link
  msg: string;
}
const LOC_INIT: LocState = { status: 'idle', address: '', coords: '', msg: '' };

export function ClockInOut() {
  const qc = useQueryClient();
  const user = useAppSelector((s) => s.auth.user);
  const { data: status } = useQuery({ queryKey: ['clock-status'], queryFn: getClockStatus });
  const clockedIn = Boolean(status?.clockedIn);
  const now = useNow();

  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [loc, setLoc] = useState<LocState>(LOC_INIT);

  /** Capture the device's current location, then reverse-geocode it to an address (GOURI parity). */
  const captureLocation = () => {
    if (!('geolocation' in navigator)) {
      setLoc({ status: 'error', address: '', coords: '', msg: "This browser doesn't support location" });
      return;
    }
    setLoc((l) => ({ ...l, status: 'loading', msg: '' }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coords = `${lat},${lng}`;
        let address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        // Best-effort reverse geocode (free, no key). Falls back to raw coordinates on any failure.
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 5000);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            { signal: ctrl.signal, headers: { Accept: 'application/json' } },
          );
          clearTimeout(timer);
          if (res.ok) {
            const j = (await res.json()) as { display_name?: string };
            if (j?.display_name) address = j.display_name;
          }
        } catch {
          /* keep coordinate fallback */
        }
        setLoc({ status: 'ok', address, coords, msg: '' });
      },
      (err) => {
        setLoc({
          status: 'error',
          address: '',
          coords: '',
          msg:
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied — enable it to record where you clocked in'
              : 'Could not determine your location',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['clock-status'] });
    qc.invalidateQueries({ queryKey: ['attendance'] });
  };
  const inMut = useMutation({
    mutationFn: () => clockIn({ note, location: loc.status === 'ok' ? loc.address : undefined }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not clock in')),
  });
  const outMut = useMutation({
    mutationFn: () => clockOut({ note, location: loc.status === 'ok' ? loc.address : undefined }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not clock out')),
  });

  const openModal = () => {
    setNote('');
    setLoc(LOC_INIT);
    setOpen(true);
    captureLocation();
  };

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const wallTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* ambient gradient + orb */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br',
          clockedIn
            ? 'from-emerald-500/10 via-teal-500/5 to-transparent'
            : 'from-primary/10 via-violet-500/5 to-transparent',
        )}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full blur-3xl',
          clockedIn ? 'bg-emerald-500/20' : 'bg-primary/20',
        )}
      />

      <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left — greeting + live wall clock */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg',
              clockedIn
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30'
                : 'bg-gradient-to-br from-indigo-600 to-violet-600 shadow-primary/30',
            )}
          >
            <Clock className="h-7 w-7" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">
              {greeting(now.getHours())}
              {user?.firstName ? `, ${user.firstName}` : ''}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {dateStr}
              </span>
              <span className="font-mono font-medium tabular-nums text-foreground/80">{wallTime}</span>
            </p>
          </div>
        </div>

        {/* Right — status + timer + CTA */}
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          {clockedIn ? (
            <div className="rounded-xl border bg-background/60 px-5 py-3 text-center backdrop-blur-sm">
              <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                On the clock
              </div>
              <div className="font-mono text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
                {elapsedSince(status!.clockInTime as string, now)}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                since{' '}
                {status?.clockInTime
                  ? new Date(status.clockInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-background/40 px-5 py-3 text-center">
              <p className="text-sm font-medium">You're clocked out</p>
              <p className="text-xs text-muted-foreground">Start your day whenever you're ready</p>
            </div>
          )}

          <button
            type="button"
            onClick={openModal}
            className={cn(
              'group flex items-center justify-center gap-2.5 rounded-xl px-7 py-4 font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0',
              clockedIn
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-rose-500/30'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 shadow-primary/30',
            )}
          >
            {clockedIn ? (
              <LogOut className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            ) : (
              <LogIn className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
            )}
            {clockedIn ? 'Clock Out' : 'Clock In'}
          </button>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={clockedIn ? 'Clock out' : 'Clock in'}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => (clockedIn ? outMut : inMut).mutate()}
              isLoading={inMut.isPending || outMut.isPending}
            >
              Submit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Captured location */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Your location
              </Label>
              {loc.status !== 'loading' && (
                <button
                  type="button"
                  onClick={captureLocation}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
              )}
            </div>

            {loc.status === 'loading' && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Detecting your location…
              </p>
            )}
            {loc.status === 'ok' && (
              <div className="space-y-1">
                <p className="text-sm font-medium leading-snug">{loc.address}</p>
                <a
                  href={`https://www.google.com/maps?q=${loc.coords}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <MapPin className="h-3 w-3" /> View on map
                </a>
              </div>
            )}
            {loc.status === 'error' && (
              <p className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                <MapPinOff className="mt-0.5 h-4 w-4 shrink-0" /> {loc.msg}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{clockedIn ? 'Clock out note' : 'Clock in note'}</Label>
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add an optional note…"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
