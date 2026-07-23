import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import { PaymentBadge, SellStatusBadge } from '../components/SellBadges';
import { SellPaymentsModal } from '../components/SellPaymentsModal';
import { SellViewModal } from '../components/SellViewModal';
import { deleteSell, getSellMeta, listSells, updateSellStatus, type SellListItem } from '../sells.api';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });

export function SalesListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('');
  const [contactId, setContactId] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);
  const [paymentsId, setPaymentsId] = useState<number | null>(null);

  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { hasAny } = usePermissions();
  const canCreate = hasAny(['sell.create', 'direct_sell.access']);
  const canUpdate = hasAny(['sell.update', 'direct_sell.update']);
  const canDelete = hasAny(['sell.delete', 'direct_sell.delete']);
  const canPay = hasAny(['sell.payments', 'delete_sell_payment']);

  const { data: meta } = useQuery({ queryKey: ['sell-meta'], queryFn: getSellMeta });
  const { data, isLoading } = useQuery({
    queryKey: ['sells', page, pageSize, search, locationId, contactId, status, paymentStatus, dateFrom, dateTo],
    queryFn: () => listSells({ page, pageSize, search, locationId: locationId ? Number(locationId) : undefined, contactId: contactId ? Number(contactId) : undefined, status: (status || undefined) as never, paymentStatus: (paymentStatus || undefined) as never, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['sells'] });
  const remove = useMutation({ mutationFn: (id: number) => deleteSell(id), onSuccess: () => { toast.success('Sale deleted; stock restored'); refresh(); }, onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not delete sale')) });
  const setFinal = useMutation({ mutationFn: (id: number) => updateSellStatus(id, 'final'), onSuccess: () => { toast.success('Marked final; stock issued'); refresh(); }, onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not update status')) });

  const columns: Column<SellListItem>[] = useMemo(() => [
    { key: 'date', header: 'Date', hideable: false, render: (p) => <span className="whitespace-nowrap">{fmtDate(p.transactionDate)}</span> },
    { key: 'refNo', header: 'Invoice No', hideable: false, render: (p) => <button type="button" className="font-mono text-xs font-medium text-primary hover:underline" onClick={() => setViewId(p.id)}>{p.refNo}</button> },
    { key: 'customer', header: 'Customer', render: (p) => <span className="font-medium">{p.customer || '—'}</span> },
    { key: 'location', header: 'Location', render: (p) => p.location },
    { key: 'status', header: 'Status', render: (p) => <SellStatusBadge status={p.status} /> },
    { key: 'payment', header: 'Payment', render: (p) => <PaymentBadge status={p.paymentStatus} overdue={p.isOverdue} /> },
    { key: 'items', header: 'Items', className: 'text-right tabular-nums', headerClassName: 'text-right', render: (p) => p.items },
    { key: 'total', header: 'Total', className: 'text-right tabular-nums', headerClassName: 'text-right', render: (p) => formatMoney(p.finalTotal) },
    { key: 'due', header: 'Due', className: 'text-right tabular-nums', headerClassName: 'text-right', render: (p) => <span className={p.due > 0 ? 'text-destructive' : 'text-muted-foreground'}>{formatMoney(p.due)}</span> },
    {
      key: 'actions', header: 'Action', hideable: false, headerClassName: 'text-right', className: 'text-right',
      render: (p) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="outline" size="sm" title="View" onClick={() => setViewId(p.id)}><Eye className="h-4 w-4" /></Button>
          {canPay && p.status === 'final' && <Button variant="outline" size="sm" title={p.paymentStatus === 'paid' ? 'View payments' : 'Add payment'} onClick={() => setPaymentsId(p.id)}><Wallet className="h-4 w-4" /></Button>}
          {canUpdate && p.status !== 'final' && <Button variant="outline" size="sm" title="Mark final (issue stock)" onClick={() => setFinal.mutate(p.id)}><CheckCircle2 className="h-4 w-4" /></Button>}
          {canUpdate && <Button variant="outline" size="sm" title="Edit" onClick={() => navigate(`/sales/${p.id}/edit`)}><Pencil className="h-4 w-4" /></Button>}
          {canDelete && <Button variant="destructive" size="sm" title="Delete" onClick={() => window.confirm(`Delete sale ${p.refNo}?\n\nAny stock it issued will be restored.`) && remove.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      ),
    },
  ], [canPay, canUpdate, canDelete, navigate, remove, setFinal]);

  const filtersActive = Boolean(search || locationId || contactId || status || paymentStatus || dateFrom || dateTo);

  return (
    <div>
      <PageHeader title="All Sales" description="Sales to customers. A final sale issues stock; a draft or quotation does not." breadcrumbs={[{ label: 'Sell' }, { label: 'All Sales' }]}
        actions={canCreate && <Button size="sm" onClick={() => navigate('/sales/create')}><Plus className="h-4 w-4" />Add Sale</Button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Tile label="Sales" value={String(data?.total ?? 0)} />
        <Tile label="Total sold" value={formatMoney(data?.totals.finalTotal ?? 0)} />
        <Tile label="Due (this page)" value={formatMoney(data?.totals.due ?? 0)} tone={(data?.totals.due ?? 0) > 0 ? 'danger' : undefined} />
      </div>
      <DataTable columns={columns} data={data?.data ?? []} rowKey={(p) => p.id} loading={isLoading} page={page} pageSize={pageSize} total={data?.total ?? 0} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search invoice no or customer…" columnsStorageKey="sells" emptyMessage="No sales yet." filtersActive={filtersActive} onResetFilters={() => { setSearch(''); setLocationId(''); setContactId(''); setStatus(''); setPaymentStatus(''); setDateFrom(''); setDateTo(''); setPage(1); }}
        toolbar={<>
          <Select value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(1); }} className="h-9 w-40"><option value="">All locations</option>{(meta?.locations ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
          <Select value={contactId} onChange={(e) => { setContactId(e.target.value); setPage(1); }} className="h-9 w-44"><option value="">All customers</option>{(meta?.customers ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-9 w-36"><option value="">All statuses</option><option value="final">Final</option><option value="draft">Draft</option><option value="quotation">Quotation</option></Select>
          <Select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className="h-9 w-36"><option value="">All payments</option><option value="paid">Paid</option><option value="due">Due</option><option value="partial">Partial</option><option value="overdue">Overdue</option></Select>
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="h-9 w-36" title="From date" />
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="h-9 w-36" title="To date" />
        </>} />
      <SellViewModal id={viewId} onClose={() => setViewId(null)} />
      <SellPaymentsModal id={paymentsId} onClose={() => setPaymentsId(null)} onChanged={refresh} />
    </div>
  );
}
function Tile({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return <div className="rounded-lg border bg-card px-4 py-3"><div className="text-xs text-muted-foreground">{label}</div><div className={`mt-0.5 text-lg font-semibold tabular-nums ${tone === 'danger' ? 'text-destructive' : ''}`}>{value}</div></div>;
}
