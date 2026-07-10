import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeDollarSign, Eye, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  deletePayrollGroup,
  getPayrollGroup,
  listPayrollGroups,
  money,
  payPayrollGroup,
  type PayrollGroupRow,
} from '../payroll.api';
import { PayrollDetailView } from './PayrollDetailView';

const payVariant = (s: string) => (s === 'paid' ? 'success' : s === 'partial' ? 'warning' : 'destructive');

export function PayrollGroupsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-groups', page, pageSize, search],
    queryFn: () => listPayrollGroups({ page, pageSize, search }),
  });
  const { data: detail } = useQuery({
    queryKey: ['payroll-group', viewId],
    queryFn: () => getPayrollGroup(viewId as number),
    enabled: viewId != null,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['payroll-groups'] });
    qc.invalidateQueries({ queryKey: ['payrolls'] });
    qc.invalidateQueries({ queryKey: ['payroll-group'] });
  };

  const pay = useMutation({
    mutationFn: (id: number) => payPayrollGroup(id),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not mark as paid')),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deletePayrollGroup(id),
    onSuccess: () => {
      invalidate();
      setViewId(null);
    },
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });

  const columns: Column<PayrollGroupRow>[] = [
    { key: 'name', header: 'Group name', render: (g) => <span className="font-medium">{g.name}</span> },
    { key: 'month', header: 'Month' },
    { key: 'employees', header: 'Employees', render: (g) => `${g.employees}` },
    { key: 'grossTotal', header: 'Gross total', render: (g) => <span className="font-medium">{money(g.grossTotal)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (g) => <Badge variant={g.status === 'final' ? 'success' : 'secondary'}>{g.status}</Badge>,
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (g) => <Badge variant={payVariant(g.paymentStatus)}>{g.paymentStatus}</Badge>,
    },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (g) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewId(g.id)} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          {g.paymentStatus !== 'paid' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.confirm(`Mark "${g.name}" as fully paid?`) && pay.mutate(g.id)}
              title="Mark paid"
            >
              <BadgeDollarSign className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => window.confirm(`Delete payroll group "${g.name}"?`) && remove.mutate(g.id)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(g) => g.id}
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
        searchPlaceholder="Search group name…"
      />

      <Modal
        open={viewId != null}
        onClose={() => setViewId(null)}
        title={detail ? detail.name : 'Payroll group'}
        className="max-w-3xl"
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="text-sm">
              Gross total: <span className="font-semibold text-primary">{detail ? money(detail.grossTotal) : '—'}</span>
            </span>
            <div className="flex gap-2">
              {detail && detail.paymentStatus !== 'paid' && (
                <Button variant="outline" onClick={() => pay.mutate(detail.id)} isLoading={pay.isPending}>
                  <BadgeDollarSign className="h-4 w-4" />
                  Mark paid
                </Button>
              )}
              <Button variant="outline" onClick={() => setViewId(null)}>
                Close
              </Button>
            </div>
          </div>
        }
      >
        {detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                <span className="text-muted-foreground">Month:</span> {detail.month}
              </span>
              <span>
                <span className="text-muted-foreground">Status:</span>{' '}
                <Badge variant={detail.status === 'final' ? 'success' : 'secondary'}>{detail.status}</Badge>
              </span>
              <span>
                <span className="text-muted-foreground">Payment:</span>{' '}
                <Badge variant={payVariant(detail.paymentStatus)}>{detail.paymentStatus}</Badge>
              </span>
            </div>
            <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
              {detail.payrolls.map((p) => (
                <PayrollDetailView key={p.id} payroll={p} />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
      </Modal>
    </div>
  );
}
