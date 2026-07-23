import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { usePermissions } from '@/features/auth/usePermission';
import { getProductMeta } from '@/features/products/products.api';
import { getApiErrorMessage } from '@/lib/api/axios';
import { RequisitionViewModal } from '../components/RequisitionViewModal';
import {
  deleteRequisition,
  listRequisitions,
  type RequisitionListItem,
  type RequisitionStatus,
} from '../requisitions.api';

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '—';

/** Ordered blue, partial amber, completed green — the draw-down statuses shared with orders. */
const STATUS_VARIANT: Record<RequisitionStatus, 'default' | 'warning' | 'success'> = {
  ordered: 'default',
  partial: 'warning',
  completed: 'success',
};

export function RequisitionsListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);

  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { has } = usePermissions();
  const canCreate = has('purchase_requisition.create');
  const canDelete = has('purchase_requisition.delete');

  const { data: meta } = useQuery({ queryKey: ['product-meta'], queryFn: getProductMeta });

  const { data, isLoading } = useQuery({
    queryKey: ['requisitions', page, pageSize, search, locationId, status, dateFrom, dateTo],
    queryFn: () =>
      listRequisitions({
        page,
        pageSize,
        search,
        locationId: locationId ? Number(locationId) : undefined,
        status: (status || undefined) as RequisitionStatus | undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteRequisition(id),
    onSuccess: () => {
      toast.success('Requisition deleted');
      qc.invalidateQueries({ queryKey: ['requisitions'] });
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not delete requisition')),
  });

  const columns: Column<RequisitionListItem>[] = useMemo(
    () => [
      {
        key: 'date',
        header: 'Date',
        hideable: false,
        render: (r) => <span className="whitespace-nowrap">{formatDate(r.transactionDate)}</span>,
      },
      {
        key: 'refNo',
        header: 'Reference No',
        hideable: false,
        render: (r) => (
          <button
            type="button"
            className="font-mono text-xs font-medium text-primary hover:underline"
            onClick={() => setViewId(r.id)}
          >
            {r.refNo}
          </button>
        ),
      },
      { key: 'location', header: 'Location', render: (r) => r.location },
      {
        key: 'requiredBy',
        header: 'Required by',
        render: (r) => <span className="whitespace-nowrap">{formatDate(r.deliveryDate)}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>,
      },
      {
        key: 'remaining',
        header: 'Qty remaining',
        className: 'text-right tabular-nums',
        headerClassName: 'text-right',
        render: (r) => `${r.quantityRemaining} / ${r.quantityOrdered}`,
      },
      { key: 'addedBy', header: 'Added by', render: (r) => r.addedBy || '—' },
      {
        key: 'actions',
        header: 'Action',
        hideable: false,
        headerClassName: 'text-right',
        className: 'text-right',
        render: (r) => (
          <div className="flex justify-end gap-1.5">
            <Button variant="outline" size="sm" title="View" onClick={() => setViewId(r.id)}>
              <Eye className="h-4 w-4" />
            </Button>
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                title="Delete"
                onClick={() =>
                  window.confirm(`Delete requisition ${r.refNo}?`) && remove.mutate(r.id)
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canDelete, remove],
  );

  return (
    <div>
      <PageHeader
        title="Purchase Requisitions"
        description="What a location needs restocked — a requisition becomes a purchase order."
        breadcrumbs={[{ label: 'Purchases' }, { label: 'Requisitions' }]}
        actions={
          canCreate && (
            <Button size="sm" onClick={() => navigate('/purchase-requisitions/create')}>
              <Plus className="h-4 w-4" />
              Add Requisition
            </Button>
          )
        }
      />

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
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search reference no…"
        columnsStorageKey="requisitions"
        emptyMessage="No requisitions yet."
        filtersActive={Boolean(search || locationId || status || dateFrom || dateTo)}
        onResetFilters={() => {
          setSearch('');
          setLocationId('');
          setStatus('');
          setDateFrom('');
          setDateTo('');
          setPage(1);
        }}
        toolbar={
          <>
            <Select
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value);
                setPage(1);
              }}
              className="h-9 w-40"
            >
              <option value="">All locations</option>
              {(meta?.locations ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-9 w-36"
            >
              <option value="">All statuses</option>
              <option value="ordered">Ordered</option>
              <option value="partial">Partial</option>
              <option value="completed">Completed</option>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-9 w-36"
              title="From date"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-9 w-36"
              title="To date"
            />
          </>
        }
      />

      <RequisitionViewModal id={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}
