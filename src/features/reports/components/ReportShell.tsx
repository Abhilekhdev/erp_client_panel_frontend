import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { getReportMeta, type ReportFilters, type ReportMeta } from '../reports.api';

/** Which optional filter controls a report wants beyond the always-present location + date range. */
export interface FilterConfig {
  category?: boolean;
  brand?: boolean;
  unit?: boolean;
  user?: boolean;
  /** 'supplier' | 'customer' toggle for the Customer & Supplier report. */
  contactType?: boolean;
  /** Hide the location + date range (e.g. Stock report location only). */
  hideDate?: boolean;
}

/**
 * Shared report page: title, a filter bar (location + date range + configured extras), an Export
 * CSV button, and the report body. Every report screen renders through this so the filter bar,
 * spacing and export button stay identical — mirroring GOURI's report toolbar.
 */
export function ReportShell({
  title,
  description,
  filterConfig = {},
  onExport,
  children,
}: {
  title: string;
  description?: string;
  filterConfig?: FilterConfig;
  /** Returns [filename, headers, rows] for the CSV export, or null when there's nothing to export. */
  onExport?: () => { filename: string; headers: string[]; rows: (string | number)[][] } | null;
  children: (filters: ReportFilters, meta: ReportMeta | undefined) => ReactNode;
}) {
  const { data: meta } = useQuery({ queryKey: ['report-meta'], queryFn: getReportMeta });

  const [locationId, setLocationId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [userId, setUserId] = useState('');
  const [contactType, setContactType] = useState<'supplier' | 'customer'>('customer');

  const filters: ReportFilters = useMemo(
    () => ({
      locationId: locationId ? Number(locationId) : undefined,
      startDate: filterConfig.hideDate ? undefined : startDate || undefined,
      endDate: filterConfig.hideDate ? undefined : endDate || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      brandId: brandId ? Number(brandId) : undefined,
      unitId: unitId ? Number(unitId) : undefined,
      userId: userId ? Number(userId) : undefined,
      contactType: filterConfig.contactType ? contactType : undefined,
    }),
    [locationId, startDate, endDate, categoryId, brandId, unitId, userId, contactType, filterConfig],
  );

  const doExport = () => {
    const payload = onExport?.();
    if (!payload) return;
    // Lazy import keeps the util out of the initial chunk.
    import('@/lib/exportCsv').then((m) => m.exportCsv(payload.filename, payload.headers, payload.rows));
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: 'Reports' }, { label: title }]}
        actions={
          onExport && (
            <Button variant="outline" size="sm" onClick={doExport}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )
        }
      />

      <Card className="mb-5">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">All locations</option>
              {(meta?.locations ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>

          {!filterConfig.hideDate && (
            <>
              <div className="space-y-1.5">
                <Label>From</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          )}

          {filterConfig.category && (
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">All categories</option>
                {(meta?.categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {filterConfig.brand && (
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">All brands</option>
                {(meta?.brands ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {filterConfig.unit && (
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">All units</option>
                {(meta?.units ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {filterConfig.user && (
            <div className="space-y-1.5">
              <Label>User</Label>
              <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">All users</option>
                {(meta?.users ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {filterConfig.contactType && (
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={contactType}
                onChange={(e) => setContactType(e.target.value as 'supplier' | 'customer')}
              >
                <option value="customer">Customers</option>
                <option value="supplier">Suppliers</option>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {children(filters, meta)}
    </div>
  );
}
