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
import { getSellMeta } from '@/features/sells/sells.api';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import { SalesOrderViewModal } from '../components/SalesOrderViewModal';
import { SoShippingModal } from '../components/SoShippingModal';
import { deleteSalesOrder, listSalesOrders, type SalesOrderListItem, type SoStatus } from '../orders.api';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '—');
const VARIANT: Record<SoStatus, 'default' | 'warning' | 'success'> = { ordered: 'default', partial: 'warning', completed: 'success' };

export function SalesOrdersListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('');
  const [contactId, setContactId] = useState('');
  const [status, setStatus] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);
  const [shippingFor, setShippingFor] = useState<SalesOrderListItem | null>(null);

  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { has } = usePermissions();
  const canCreate = has('so.create');
  const canUpdate = has('so.update');
  const canDelete = has('so.delete');

  const { data: meta } = useQuery({ queryKey: ['sell-meta'], queryFn: getSellMeta });
  const { data, isLoading } = useQuery({
    queryKey: ['sales-orders', page, pageSize, search, locationId, contactId, status],
    queryFn: () => listSalesOrders({ page, pageSize, search, locationId: locationId ? Number(locationId) : undefined, contactId: contactId ? Number(contactId) : undefined, status: (status || undefined) as SoStatus | undefined }),
  });
  const remove = useMutation({ mutationFn: (id: number) => deleteSalesOrder(id), onSuccess: () => { toast.success('Sales order deleted'); qc.invalidateQueries({ queryKey: ['sales-orders'] }); }, onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not delete sales order')) });

  const columns: Column<SalesOrderListItem>[] = useMemo(() => [
    { key: 'date', header: 'Date', hideable: false, render: (p) => <span className="whitespace-nowrap">{fmtDate(p.transactionDate)}</span> },
    { key: 'refNo', header: 'Order No', hideable: false, render: (p) => <button type="button" className="font-mono text-xs font-medium text-primary hover:underline" onClick={() => setViewId(p.id)}>{p.refNo}</button> },
    { key: 'customer', header: 'Customer', render: (p) => <span className="font-medium">{p.customer || '—'}</span> },
    { key: 'location', header: 'Location', render: (p) => p.location },
    { key: 'status', header: 'Status', render: (p) => <Badge variant={VARIANT[p.status]}>{p.status}</Badge> },
    { key: 'shipping', header: 'Shipping', render: (p) => (p.shippingStatus ? <Badge variant="secondary">{p.shippingStatus}</Badge> : '—') },
    { key: 'remaining', header: 'Qty remaining', className: 'text-right tabular-nums', headerClassName: 'text-right', render: (p) => `${p.quantityRemaining} / ${p.quantityOrdered}` },
    { key: 'total', header: 'Total', className: 'text-right tabular-nums', headerClassName: 'text-right', render: (p) => formatMoney(p.finalTotal) },
    {
      key: 'actions', header: 'Action', hideable: false, headerClassName: 'text-right', className: 'text-right',
      render: (p) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="outline" size="sm" title="View" onClick={() => setViewId(p.id)}><Eye className="h-4 w-4" /></Button>
          {canUpdate && <Button variant="outline" size="sm" title="Edit shipping" onClick={() => setShippingFor(p)}><Truck className="h-4 w-4" /></Button>}
          {canUpdate && <Button variant="outline" size="sm" title="Edit" onClick={() => navigate(`/sales-orders/${p.id}/edit`)}><Pencil className="h-4 w-4" /></Button>}
          {canDelete && <Button variant="destructive" size="sm" title="Delete" onClick={() => window.confirm(`Delete order ${p.refNo}?`) && remove.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      ),
    },
  ], [canUpdate, canDelete, navigate, remove]);

  return (
    <div>
      <PageHeader title="Sales Orders" description="Customer commitments. Invoicing one as a sale is what moves stock." breadcrumbs={[{ label: 'Sell' }, { label: 'Sales Orders' }]}
        actions={canCreate && <Button size="sm" onClick={() => navigate('/sales-orders/create')}><Plus className="h-4 w-4" />Add Sales Order</Button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-card px-4 py-3"><div className="text-xs text-muted-foreground">Orders</div><div className="mt-0.5 text-lg font-semibold tabular-nums">{data?.total ?? 0}</div></div>
        <div className="rounded-lg border bg-card px-4 py-3"><div className="text-xs text-muted-foreground">Total ordered</div><div className="mt-0.5 text-lg font-semibold tabular-nums">{formatMoney(data?.totals.finalTotal ?? 0)}</div></div>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} rowKey={(p) => p.id} loading={isLoading} page={page} pageSize={pageSize} total={data?.total ?? 0} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search order no or customer…" columnsStorageKey="sales-orders" emptyMessage="No sales orders yet." filtersActive={Boolean(search || locationId || contactId || status)} onResetFilters={() => { setSearch(''); setLocationId(''); setContactId(''); setStatus(''); setPage(1); }}
        toolbar={<>
          <Select value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(1); }} className="h-9 w-40"><option value="">All locations</option>{(meta?.locations ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
          <Select value={contactId} onChange={(e) => { setContactId(e.target.value); setPage(1); }} className="h-9 w-44"><option value="">All customers</option>{(meta?.customers ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-9 w-36"><option value="">All statuses</option><option value="ordered">Ordered</option><option value="partial">Partial</option><option value="completed">Completed</option></Select>
        </>} />
      <SalesOrderViewModal id={viewId} onClose={() => setViewId(null)} />
      <SoShippingModal order={shippingFor} onClose={() => setShippingFor(null)} />
    </div>
  );
}
