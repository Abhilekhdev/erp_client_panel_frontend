import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { usePermissions } from '@/features/auth/usePermission';
import { getPurchaseMeta } from '@/features/purchases/purchases.api';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import { PurchaseOrderViewModal } from '../components/PurchaseOrderViewModal';
import { ShippingModal } from '../components/ShippingModal';
import {
  deletePurchaseOrder,
  listPurchaseOrders,
  type OrderStatus,
  type PurchaseOrderListItem,
} from '../orders.api';

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '—';

const STATUS_VARIANT: Record<OrderStatus, 'default' | 'warning' | 'success'> = {
  ordered: 'default',
  partial: 'warning',
  completed: 'success',
};

export function PurchaseOrdersListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('');
  const [contactId, setContactId] = useState('');
  const [status, setStatus] = useState('');
  const [shippingStatus, setShippingStatus] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);
  const [shippingFor, setShippingFor] = useState<PurchaseOrderListItem | null>(null);

  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { has } = usePermissions();
  const canCreate = has('purchase_order.create');
  const canUpdate = has('purchase_order.update');
  const canDelete = has('purchase_order.delete');

  const { data: meta } = useQuery({ queryKey: ['purchase-meta'], queryFn: getPurchaseMeta });

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', page, pageSize, search, locationId, contactId, status, shippingStatus],
    queryFn: () =>
      listPurchaseOrders({
        page,
        pageSize,
        search,
        locationId: locationId ? Number(locationId) : undefined,
        contactId: contactId ? Number(contactId) : undefined,
        status: (status || undefined) as OrderStatus | undefined,
        shippingStatus: (shippingStatus || undefined) as never,
      }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deletePurchaseOrder(id),
    onSuccess: () => {
      toast.success('Purchase order deleted');
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not delete purchase order')),
  });

  const columns: Column<PurchaseOrderListItem>[] = useMemo(
    () => [
      {
        key: 'date',
        header: 'Date',
        hideable: false,
        render: (p) => <span className="whitespace-nowrap">{formatDate(p.transactionDate)}</span>,
      },
      {
        key: 'refNo',
        header: 'Reference No',
        hideable: false,
        render: (p) => (
          <button
            type="button"
            className="font-mono text-xs font-medium text-primary hover:underline"
            onClick={() => setViewId(p.id)}
          >
            {p.refNo}
          </button>
        ),
      },
      { key: 'location', header: 'Location', render: (p) => p.location },
      { key: 'supplier', header: 'Supplier', render: (p) => <span className="font-medium">{p.supplier || '—'}</span> },
      {
        key: 'status',
        header: 'Status',
        render: (p) => <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>,
      },
      {
        key: 'shipping',
        header: 'Shipping',
        render: (p) => (p.shippingStatus ? <Badge variant="secondary">{p.shippingStatus}</Badge> : '—'),
      },
      {
        key: 'remaining',
        header: 'Qty remaining',
        className: 'text-right tabular-nums',
        headerClassName: 'text-right',
        render: (p) => `${p.quantityRemaining} / ${p.quantityOrdered}`,
      },
      {
        key: 'finalTotal',
        header: 'Grand Total',
        className: 'text-right tabular-nums',
        headerClassName: 'text-right',
        render: (p) => formatMoney(p.finalTotal),
      },
      {
        key: 'actions',
        header: 'Action',
        hideable: false,
        headerClassName: 'text-right',
        className: 'text-right',
        render: (p) => (
          <div className="flex justify-end gap-1.5">
            <Button variant="outline" size="sm" title="View" onClick={() => setViewId(p.id)}>
              <Eye className="h-4 w-4" />
            </Button>
            {canUpdate && (
              <Button variant="outline" size="sm" title="Edit shipping" onClick={() => setShippingFor(p)}>
                <Truck className="h-4 w-4" />
              </Button>
            )}
            {canUpdate && (
              <Button
                variant="outline"
                size="sm"
                title="Edit"
                onClick={() => navigate(`/purchase-orders/${p.id}/edit`)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                title="Delete"
                onClick={() => window.confirm(`Delete order ${p.refNo}?`) && remove.mutate(p.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canUpdate, canDelete, navigate, remove],
  );

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Priced commitments to suppliers. Receiving one as a purchase is what moves stock."
        breadcrumbs={[{ label: 'Purchases' }, { label: 'Purchase Orders' }]}
        actions={
          canCreate && (
            <Button size="sm" onClick={() => navigate('/purchase-orders/create')}>
              <Plus className="h-4 w-4" />
              Add Purchase Order
            </Button>
          )
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <SummaryTile label="Orders" value={String(data?.total ?? 0)} />
        <SummaryTile label="Total ordered" value={formatMoney(data?.totals.finalTotal ?? 0)} />
      </div>

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
        searchPlaceholder="Search reference no or supplier…"
        columnsStorageKey="purchase-orders"
        emptyMessage="No purchase orders yet."
        filtersActive={Boolean(search || locationId || contactId || status || shippingStatus)}
        onResetFilters={() => {
          setSearch('');
          setLocationId('');
          setContactId('');
          setStatus('');
          setShippingStatus('');
          setPage(1);
        }}
        toolbar={
          <>
            <Select value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(1); }} className="h-9 w-40">
              <option value="">All locations</option>
              {(meta?.locations ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
            <Select value={contactId} onChange={(e) => { setContactId(e.target.value); setPage(1); }} className="h-9 w-44">
              <option value="">All suppliers</option>
              {(meta?.suppliers ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-9 w-36">
              <option value="">All statuses</option>
              <option value="ordered">Ordered</option>
              <option value="partial">Partial</option>
              <option value="completed">Completed</option>
            </Select>
            <Select value={shippingStatus} onChange={(e) => { setShippingStatus(e.target.value); setPage(1); }} className="h-9 w-36">
              <option value="">All shipping</option>
              <option value="ordered">Ordered</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </>
        }
      />

      <PurchaseOrderViewModal id={viewId} onClose={() => setViewId(null)} />
      <ShippingModal order={shippingFor} onClose={() => setShippingFor(null)} />
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
