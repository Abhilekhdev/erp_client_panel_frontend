import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import { deleteAdjustment, listAdjustments, type AdjustmentRow } from '../stock-adjustments.api';

export function AdjustmentsListPage() {
  const qc = useQueryClient();
  const { has } = usePermissions();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['adjustments', page, pageSize, search],
    queryFn: () => listAdjustments({ page, pageSize, search }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteAdjustment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adjustments'] }),
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });

  const columns: Column<AdjustmentRow>[] = [
    { key: 'transactionDate', header: 'Date', render: (r) => new Date(r.transactionDate).toLocaleDateString() },
    { key: 'refNo', header: 'Reference No', render: (r) => <span className="font-medium">{r.refNo}</span> },
    { key: 'location', header: 'Location' },
    { key: 'adjustmentType', header: 'Type', render: (r) => r.adjustmentType ?? '—' },
    { key: 'lineCount', header: 'Items' },
    {
      key: 'totalAmount',
      header: 'Total',
      className: 'text-right tabular-nums',
      headerClassName: 'text-right',
      render: (r) => formatMoney(r.totalAmount),
    },
    {
      key: 'totalAmountRecovered',
      header: 'Recovered',
      className: 'text-right tabular-nums',
      headerClassName: 'text-right',
      render: (r) => formatMoney(r.totalAmountRecovered),
    },
    ...(has('purchase.delete')
      ? [
          {
            key: 'actions',
            header: 'Action',
            className: 'text-right',
            headerClassName: 'text-right',
            render: (r: AdjustmentRow) => (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => window.confirm(`Delete "${r.refNo}"? Stock will be added back.`) && remove.mutate(r.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Stock Adjustments"
        description="Write-offs of damaged, expired or lost stock."
        breadcrumbs={[{ label: 'Stock Adjustment' }]}
        actions={
          has('purchase.create') && (
            <Link to="/stock-adjustments/create" className={cn(buttonVariants({ size: 'sm' }))}>
              <Plus className="h-4 w-4" /> Add Adjustment
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
        emptyMessage="No stock adjustments yet."
      />
    </div>
  );
}
