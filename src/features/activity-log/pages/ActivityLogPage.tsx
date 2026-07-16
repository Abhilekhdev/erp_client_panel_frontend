import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { getActivityMeta, type ActivityLogQuery } from '../activity-log.api';
import { ActivityFeed } from '../components/ActivityFeed';

const BLANK = { userId: '', action: '', subjectType: '', dateFrom: '', dateTo: '' };

/**
 * Reports → Activity Log: who changed what, and when, across the whole business.
 *
 * Unlike GOURI's version this route is permission-gated (`activity_log.view_all` /
 * `activity_log.view_own`); a user with only "view own" lands here too and simply sees their own
 * trail, with the user filter hidden.
 */
export function ActivityLogPage() {
  const [filters, setFilters] = useState(BLANK);
  const { data: meta } = useQuery({ queryKey: ['activity-log-meta'], queryFn: getActivityMeta });

  const set = (key: keyof typeof BLANK) => (e: { target: { value: string } }) =>
    setFilters((f) => ({ ...f, [key]: e.target.value }));

  const baseQuery: ActivityLogQuery = {
    ...(filters.userId ? { userId: Number(filters.userId) } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.subjectType ? { subjectType: filters.subjectType } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
  };
  const filtersActive = Object.values(filters).some(Boolean);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {meta?.canViewAll && (
        <Select className="h-9 w-44" value={filters.userId} onChange={set('userId')} aria-label="User">
          <option value="">All users</option>
          {meta.users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      )}
      <Select className="h-9 w-40" value={filters.action} onChange={set('action')} aria-label="Action">
        <option value="">All actions</option>
        {(meta?.actions ?? []).map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </Select>
      <Select className="h-9 w-44" value={filters.subjectType} onChange={set('subjectType')} aria-label="Module">
        <option value="">All modules</option>
        {(meta?.subjectTypes ?? []).map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>
      <Input type="date" className="h-9 w-40" value={filters.dateFrom} onChange={set('dateFrom')} aria-label="From date" />
      <Input type="date" className="h-9 w-40" value={filters.dateTo} onChange={set('dateTo')} aria-label="To date" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Activity Log"
        description="Every create, edit and delete across the business — with what changed, by whom, and when."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Reports' }, { label: 'Activity Log' }]}
      />
      <ActivityFeed
        cacheKey="report"
        baseQuery={baseQuery}
        toolbar={toolbar}
        filtersActive={filtersActive}
        onResetFilters={() => setFilters(BLANK)}
        emptyMessage="No activity matches these filters"
      />
    </div>
  );
}
