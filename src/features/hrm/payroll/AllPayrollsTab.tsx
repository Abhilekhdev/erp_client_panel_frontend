import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Plus } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import {
  getPayroll,
  getPayrollMeta,
  listPayrolls,
  money,
  type PayrollRow,
} from '../payroll.api';
import { GenerateModal } from './GenerateModal';
import { PayrollDetailView } from './PayrollDetailView';

const payVariant = (s: string) => (s === 'paid' ? 'success' : s === 'partial' ? 'warning' : 'destructive');
const EMPTY = { employeeId: '' as number | '', departmentId: '' as number | '', designationId: '' as number | '', locationId: '' as number | '', month: '' };

export function AllPayrollsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY);
  const [genOpen, setGenOpen] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);

  const { data: meta } = useQuery({ queryKey: ['payroll-meta'], queryFn: getPayrollMeta });
  const { data, isLoading } = useQuery({
    queryKey: ['payrolls', page, pageSize, search, filters],
    queryFn: () => listPayrolls({ page, pageSize, search, ...filters }),
  });
  const { data: detail } = useQuery({
    queryKey: ['payroll', viewId],
    queryFn: () => getPayroll(viewId as number),
    enabled: viewId != null,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['payrolls'] });
    qc.invalidateQueries({ queryKey: ['payroll-groups'] });
  };

  const columns: Column<PayrollRow>[] = [
    { key: 'refNo', header: 'Ref No', render: (p) => <span className="font-medium">{p.refNo}</span> },
    { key: 'employee', header: 'Employee' },
    { key: 'department', header: 'Department', render: (p) => p.department || '—' },
    { key: 'designation', header: 'Designation', render: (p) => p.designation || '—' },
    { key: 'month', header: 'Month' },
    { key: 'total', header: 'Net amount', render: (p) => <span className="font-medium">{money(p.total)}</span> },
    {
      key: 'paymentStatus',
      header: 'Payment status',
      render: (p) => <Badge variant={payVariant(p.paymentStatus)}>{p.paymentStatus}</Badge>,
    },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (p) => (
        <Button variant="outline" size="sm" onClick={() => setViewId(p.id)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const set = (k: keyof typeof filters, v: string | number) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-1.5">
            <Label>Employee</Label>
            <Select className="w-40" value={String(filters.employeeId)} onChange={(e) => set('employeeId', e.target.value ? Number(e.target.value) : '')}>
              <option value="">All</option>
              {meta?.employees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select className="w-40" value={String(filters.departmentId)} onChange={(e) => set('departmentId', e.target.value ? Number(e.target.value) : '')}>
              <option value="">All</option>
              {meta?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Designation</Label>
            <Select className="w-40" value={String(filters.designationId)} onChange={(e) => set('designationId', e.target.value ? Number(e.target.value) : '')}>
              <option value="">All</option>
              {meta?.designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <Select className="w-40" value={String(filters.locationId)} onChange={(e) => set('locationId', e.target.value ? Number(e.target.value) : '')}>
              <option value="">All</option>
              {meta?.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Month</Label>
            <Input type="month" className="w-40" value={filters.month} onChange={(e) => set('month', e.target.value)} />
          </div>
          <div className="ml-auto flex items-end">
            <Button size="sm" onClick={() => setGenOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Payroll
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(p) => p.id}
        loading={isLoading}
        page={page}
        pageSize={pageSize}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search ref no…"
      />

      <GenerateModal
        open={genOpen}
        onClose={() => setGenOpen(false)}
        onGenerated={invalidate}
        meta={meta}
      />

      <Modal
        open={viewId != null}
        onClose={() => setViewId(null)}
        title={detail ? `Payroll ${detail.refNo ?? ''}` : 'Payroll'}
        className="max-w-2xl"
        footer={
          <Button variant="outline" onClick={() => setViewId(null)}>
            Close
          </Button>
        }
      >
        {detail ? <PayrollDetailView payroll={detail} /> : <p className="text-sm text-muted-foreground">Loading…</p>}
      </Modal>
    </div>
  );
}
