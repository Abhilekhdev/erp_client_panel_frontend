import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, Plus, Trash2, Truck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { TransferViewModal } from '../components/TransferViewModal';
import {
  deleteTransfer,
  listTransfers,
  updateTransferStatus,
  type TransferRow,
  type TransferStatus,
} from '../stock-transfers.api';

const STATUS_BADGE: Record<TransferStatus, { label: string; variant: 'secondary' | 'warning' | 'success' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  in_transit: { label: 'In transit', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
};

export function TransfersListPage() {
  const qc = useQueryClient();
  const { has } = usePermissions();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['transfers', page, pageSize, search],
    queryFn: () => listTransfers({ page, pageSize, search }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['transfers'] });
  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TransferStatus }) => updateTransferStatus(id, status),
    onSuccess: invalidate,
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not update status')),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteTransfer(id),
    onSuccess: invalidate,
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });

  const columns: Column<TransferRow>[] = [
    { key: 'transactionDate', header: 'Date', render: (r) => new Date(r.transactionDate).toLocaleDateString() },
    { key: 'refNo', header: 'Reference No', render: (r) => <span className="font-medium">{r.refNo}</span> },
    { key: 'fromLocation', header: 'From' },
    { key: 'toLocation', header: 'To', render: (r) => r.toLocation ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const s = STATUS_BADGE[r.status];
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    { key: 'lineCount', header: 'Items' },
    {
      key: 'totalAmount',
      header: 'Total',
      className: 'text-right tabular-nums',
      headerClassName: 'text-right',
      render: (r) => formatMoney(r.totalAmount),
    },
    {
      key: 'actions',
      header: 'Action',
      className: 'text-right',
      headerClassName: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="outline" size="sm" title="View" onClick={() => setViewId(r.id)}>
            <Eye className="h-4 w-4" />
          </Button>
          {has('purchase.update') && r.status !== 'completed' && (
            <>
              {r.status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  title="Mark in transit"
                  onClick={() => changeStatus.mutate({ id: r.id, status: 'in_transit' })}
                >
                  <Truck className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                title="Mark completed (posts stock)"
                onClick={() =>
                  window.confirm('Complete this transfer? Stock will move from the source to the destination.') &&
                  changeStatus.mutate({ id: r.id, status: 'completed' })
                }
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {has('purchase.delete') && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => window.confirm(`Delete "${r.refNo}"?`) && remove.mutate(r.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Stock Transfers"
        description="Move stock between your locations."
        breadcrumbs={[{ label: 'Stock Transfers' }]}
        actions={
          has('purchase.create') && (
            <Link to="/stock-transfers/create" className={cn(buttonVariants({ size: 'sm' }))}>
              <Plus className="h-4 w-4" /> Add Transfer
            </Link>
          )
        }
      />
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(r) => r.id}
        loading={isFetching}
        page={page}
        pageSize={pageSize}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by reference no…"
        emptyMessage="No stock transfers yet."
      />
      <TransferViewModal id={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}
