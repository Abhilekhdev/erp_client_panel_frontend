import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getCalendarEvents, getCalendarMeta, type CalendarEvent } from '../calendar.api';

/**
 * Calendar — the port of GOURI's `/calendar` (`home/calendar.blade.php` + FullCalendar 3).
 *
 * Same controls: a User select (admins only), a Location select, and one colour-coded checkbox per
 * event type, all filtering SERVER-side exactly like the legacy page. Views mirror FullCalendar's
 * `month / week / day / list`.
 *
 * The grid is hand-rolled rather than pulling FullCalendar in: every event this app can currently
 * produce is all-day, so month/week/day are the same day-cell grid at three widths — far less
 * weight than a calendar engine (the bundle is already ~1 MB). Timed layout can come with the
 * modules that actually emit timed events (bookings/reminders).
 */

type View = 'month' | 'week' | 'day' | 'list';

// ── date helpers (all local-midnight, YYYY-MM-DD keyed) ──
const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const startOfWeek = (d: Date): Date => addDays(d, -d.getDay()); // Sunday, like the legacy grid
const sameDay = (a: Date, b: Date): boolean => iso(a) === iso(b);

/** The inclusive [start,end] the current view shows. */
function visibleRange(view: View, cursor: Date): { from: Date; to: Date } {
  if (view === 'day') return { from: cursor, to: cursor };
  if (view === 'week') {
    const s = startOfWeek(cursor);
    return { from: s, to: addDays(s, 6) };
  }
  if (view === 'list') return { from: cursor, to: addDays(cursor, 30) };
  // month: pad to whole weeks so the grid is always 6 rows
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const s = startOfWeek(first);
  return { from: s, to: addDays(s, 41) };
}

function title(view: View, cursor: Date): string {
  if (view === 'day') return cursor.toLocaleDateString(undefined, { dateStyle: 'full' });
  if (view === 'week') {
    const s = startOfWeek(cursor);
    const e = addDays(s, 6);
    return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  if (view === 'list') return `Next 30 days from ${cursor.toLocaleDateString()}`;
  return cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [userId, setUserId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [disabledTypes, setDisabledTypes] = useState<Set<string>>(new Set());

  const { data: meta } = useQuery({ queryKey: ['calendar-meta'], queryFn: getCalendarMeta });

  // Only types the backend can actually serve AND the user hasn't unticked.
  const activeTypes = useMemo(
    () =>
      (meta?.eventTypes ?? [])
        .filter((t) => t.available && !disabledTypes.has(t.key))
        .map((t) => t.key),
    [meta, disabledTypes],
  );

  const { from, to } = useMemo(() => visibleRange(view, cursor), [view, cursor]);

  const { data: events = [], isFetching } = useQuery({
    queryKey: ['calendar-events', iso(from), iso(to), activeTypes.join(','), userId, locationId],
    queryFn: () =>
      getCalendarEvents({
        start: iso(from),
        end: iso(to),
        events: activeTypes,
        userId: userId ? Number(userId) : undefined,
        locationId: locationId ? Number(locationId) : undefined,
      }),
    enabled: Boolean(meta) && activeTypes.length > 0,
  });

  /** Events overlapping a given day (all events are inclusive date ranges). */
  const eventsOn = (day: Date): CalendarEvent[] => {
    const k = iso(day);
    return events.filter((e) => e.start <= k && k <= e.end);
  };

  const step = (dir: 1 | -1) => {
    if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else if (view === 'week' || view === 'list') setCursor(addDays(cursor, 7 * dir));
    else setCursor(addDays(cursor, dir));
  };

  const days: Date[] = useMemo(() => {
    const out: Date[] = [];
    const n = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
    for (let i = 0; i < n; i++) out.push(addDays(from, i));
    return out;
  }, [from, to]);

  const today = new Date();

  return (
    <div>
      <PageHeader title="Calendar" breadcrumbs={[{ label: 'Calendar' }]} />

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* ── Filters (User / Location / event types) ── */}
        <Card className="lg:w-72 lg:shrink-0">
          <CardContent className="space-y-4 pt-6">
            {meta?.canPickUser && (
              <div className="space-y-1.5">
                <Label htmlFor="cal-user">User</Label>
                <Select id="cal-user" value={userId} onChange={(e) => setUserId(e.target.value)}>
                  <option value="">Me</option>
                  {meta.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cal-loc">Location</Label>
              <Select id="cal-loc" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">All locations</option>
                {(meta?.locations ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2 border-t pt-3">
              {(meta?.eventTypes ?? []).map((t) => {
                const on = t.available && !disabledTypes.has(t.key);
                return (
                  <label
                    key={t.key}
                    className={cn(
                      'flex items-start gap-2 text-sm',
                      t.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                    )}
                    title={t.available ? undefined : `Needs the ${t.requires}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-input"
                      style={{ accentColor: t.color }}
                      checked={on}
                      disabled={!t.available}
                      onChange={(e) =>
                        setDisabledTypes((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.delete(t.key);
                          else next.add(t.key);
                          return next;
                        })
                      }
                    />
                    <span>
                      <span className="font-medium" style={{ color: t.color }}>
                        {t.label}
                      </span>
                      {!t.available && (
                        <span className="block text-[11px] leading-tight text-muted-foreground">
                          {t.requires}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>

            {(meta?.eventTypes ?? []).some((t) => !t.available) && (
              <p className="flex gap-1.5 rounded-md border border-dashed p-2 text-[11px] leading-snug text-muted-foreground">
                <Info className="mt-px h-3.5 w-3.5 shrink-0" />
                Greyed-out types will start showing events automatically once their modules are
                built.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Calendar ── */}
        <Card className="min-w-0 flex-1">
          <CardContent className="pt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => step(-1)} aria-label="Previous">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => step(1)} aria-label="Next">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
                  Today
                </Button>
              </div>

              <h2 className="order-first w-full text-center text-base font-semibold sm:order-none sm:w-auto">
                {title(view, cursor)}
              </h2>

              <div className="flex gap-1 rounded-lg border p-0.5">
                {(['month', 'week', 'day', 'list'] as View[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                      view === v
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {!meta ? (
              <Skeleton className="h-96 rounded-xl" />
            ) : activeTypes.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Select at least one event type to show.
              </p>
            ) : view === 'list' ? (
              <ListView events={events} navigate={navigate} loading={isFetching} />
            ) : (
              <div
                className={cn(
                  'overflow-hidden rounded-lg border',
                  isFetching && 'opacity-60 transition-opacity',
                )}
              >
                {view !== 'day' && (
                  <div className="grid grid-cols-7 border-b bg-muted/50">
                    {WEEKDAYS.map((w) => (
                      <div key={w} className="px-2 py-1.5 text-center text-xs font-medium">
                        {w}
                      </div>
                    ))}
                  </div>
                )}
                <div className={cn('grid', view === 'day' ? 'grid-cols-1' : 'grid-cols-7')}>
                  {days.map((d) => {
                    const inMonth = view !== 'month' || d.getMonth() === cursor.getMonth();
                    const dayEvents = eventsOn(d);
                    return (
                      <div
                        key={iso(d)}
                        className={cn(
                          'min-h-[92px] border-b border-r p-1.5 last:border-r-0',
                          !inMonth && 'bg-muted/30',
                          sameDay(d, today) && 'bg-primary/5',
                          view === 'day' && 'min-h-[320px]',
                        )}
                      >
                        <div
                          className={cn(
                            'mb-1 text-right text-xs',
                            sameDay(d, today)
                              ? 'font-bold text-primary'
                              : inMonth
                                ? 'text-muted-foreground'
                                : 'text-muted-foreground/50',
                          )}
                        >
                          {d.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.map((e) => (
                            <button
                              key={e.id}
                              type="button"
                              onClick={() => e.link && navigate(e.link)}
                              title={`${e.title}${e.subtitle ? ` — ${e.subtitle}` : ''}`}
                              className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white transition-opacity hover:opacity-90"
                              style={{ backgroundColor: e.color }}
                            >
                              {e.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ListView({
  events,
  navigate,
  loading,
}: {
  events: CalendarEvent[];
  navigate: (to: string) => void;
  loading: boolean;
}) {
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
  if (!loading && sorted.length === 0) {
    return (
      <div className="py-16 text-center">
        <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No events in this period.</p>
      </div>
    );
  }
  return (
    <div className={cn('divide-y rounded-lg border', loading && 'opacity-60')}>
      {sorted.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => e.link && navigate(e.link)}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent"
        >
          <span className="h-8 w-1 shrink-0 rounded" style={{ backgroundColor: e.color }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{e.title}</span>
            {e.subtitle && (
              <span className="block truncate text-xs text-muted-foreground">{e.subtitle}</span>
            )}
          </span>
          <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
            {e.start === e.end
              ? new Date(`${e.start}T00:00:00`).toLocaleDateString()
              : `${new Date(`${e.start}T00:00:00`).toLocaleDateString()} – ${new Date(`${e.end}T00:00:00`).toLocaleDateString()}`}
          </span>
        </button>
      ))}
    </div>
  );
}
