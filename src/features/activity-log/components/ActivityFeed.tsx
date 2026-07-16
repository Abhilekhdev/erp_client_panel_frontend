import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import type { ActivityEntry, ActivityLogQuery } from '../activity-log.api';
import { listActivity } from '../activity-log.api';

/** Green for additions, red for removals, amber for edits — the same language as a diff view. */
function actionVariant(action: string): 'success' | 'destructive' | 'warning' | 'secondary' {
  if (action === 'created' || action === 'bulk_created' || action === 'login') return 'success';
  if (action === 'deleted' || action === 'bulk_deleted' || action === 'failed_login') return 'destructive';
  if (action === 'updated' || action === 'bulk_updated') return 'warning';
  return 'secondary';
}

const EMPTY = '—';

/** Values arrive JSON-shaped (null, booleans, ISO dates). Show them the way a user reads them. */
function displayValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return EMPTY;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(v)) return new Date(v).toLocaleString();
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** The before → after list. This is the column GOURI's activity log never manages to fill in. */
function Changes({ entry }: { entry: ActivityEntry }) {
  if (entry.changes.length === 0) {
    return <span className="text-xs text-muted-foreground">{EMPTY}</span>;
  }
  return (
    <div className="space-y-1">
      {entry.changes.map((c) => (
        <div key={c.field} className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-medium text-foreground">{c.label}</span>
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-destructive line-through decoration-destructive/40">
            {displayValue(c.from)}
          </span>
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-emerald-600 dark:text-emerald-400">
            {displayValue(c.to)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface ActivityFeedProps {
  /** Fixed filters for this view — e.g. `{ userId }` for "activity by", `{ subjectType, subjectId }` for "activity on". */
  baseQuery?: ActivityLogQuery;
  /** Hide the "User" column where the causer is implied (the "activity by this user" tab). */
  showUser?: boolean;
  /** Filter controls rendered in the table toolbar (the global report supplies these). */
  toolbar?: ReactNode;
  onResetFilters?: () => void;
  filtersActive?: boolean;
  emptyMessage?: string;
  /** Namespaces the query cache + the column-visibility store, so the two user tabs stay independent. */
  cacheKey: string;
}

/**
 * The one activity renderer, shared by the global report and both user-profile tabs — so an entry
 * reads identically wherever it surfaces, and there is a single place to improve.
 */
export function ActivityFeed({
  baseQuery = {},
  showUser = true,
  toolbar,
  onResetFilters,
  filtersActive,
  emptyMessage = 'No activity recorded yet',
  cacheKey,
}: ActivityFeedProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const query = { ...baseQuery, page, pageSize };

  // Narrowing the filters while on page 3 would otherwise strand the user on an empty page.
  const filterKey = JSON.stringify(baseQuery);
  useEffect(() => setPage(1), [filterKey]);

  const { data, isLoading } = useQuery({
    queryKey: ['activity-log', cacheKey, query],
    queryFn: () => listActivity(query),
    placeholderData: (prev) => prev, // keep rows on screen while paging
  });

  const columns: Column<ActivityEntry>[] = [
    {
      key: 'createdAt',
      header: 'When',
      hideable: false,
      className: 'whitespace-nowrap text-xs text-muted-foreground',
      render: (r) => formatWhen(r.createdAt),
    },
    ...(showUser
      ? [
          {
            key: 'userName',
            header: 'User',
            className: 'whitespace-nowrap text-sm',
            render: (r: ActivityEntry) => r.userName ?? <span className="text-muted-foreground">System</span>,
          },
        ]
      : []),
    {
      key: 'action',
      header: 'Action',
      className: 'whitespace-nowrap',
      render: (r) => <Badge variant={actionVariant(r.action)}>{r.actionLabel}</Badge>,
    },
    {
      key: 'description',
      header: 'What',
      hideable: false,
      className: 'text-sm',
      render: (r) => (
        <div>
          <div className="text-foreground">{r.description}</div>
          {r.subjectTypeLabel && (
            <div className="text-xs text-muted-foreground">
              {r.subjectTypeLabel}
              {r.subjectId ? ` #${r.subjectId}` : ''}
            </div>
          )}
        </div>
      ),
    },
    { key: 'changes', header: 'Changes', render: (r) => <Changes entry={r} /> },
    {
      key: 'ipAddress',
      header: 'IP',
      title: 'IP address',
      className: 'whitespace-nowrap font-mono text-xs text-muted-foreground',
      render: (r) => r.ipAddress ?? EMPTY,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data?.data ?? []}
      rowKey={(r) => r.id}
      loading={isLoading}
      page={page}
      pageSize={pageSize}
      total={data?.total ?? 0}
      onPageChange={setPage}
      onPageSizeChange={(s) => {
        setPageSize(s);
        setPage(1);
      }}
      toolbar={toolbar}
      onResetFilters={onResetFilters}
      filtersActive={filtersActive}
      emptyMessage={emptyMessage}
      columnsStorageKey={`activity-${cacheKey}`}
    />
  );
}
