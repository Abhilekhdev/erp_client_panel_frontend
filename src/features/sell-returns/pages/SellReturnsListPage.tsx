import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Wallet } from 'lucide-react';
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
import { SellReturnRefundModal } from '../components/SellReturnRefundModal';
import { deleteSellReturn, listSellReturns, type ReturnPaymentStatus, type SellReturnListItem } from '../returns.api';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
function RefundBadge({ status }: { status: ReturnPaymentStatus }) {
  if (status === 'paid') return <Badge variant="success">Refunded</Badge>;
  if (status === 'partial') return <Badge variant="default">Partial</Badge>;
  return <Badge variant="warning">Due</Badge>;
}

export function SellReturnsListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [locationId, setLocationId] = useState('');
  const [contactId, setContactId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);

  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { has } = usePermissions();
  const canCreate = has('access_sell_return');
  const canPay = has('sell.payments');

  const { data: meta } = useQuery({ queryKey: ['sell-meta'], queryFn: getSellMeta });
  const { data, isLoading } = useQuery({
    queryKey: ['sell-returns', page, pageSize, search, locationId, contactId, paymentStatus],
    queryFn: () => listSellReturns({ page, pageSize, search, locationId: locationId ? Number(locationId) : undefined, contactId: contactId ? Number(contactId) : undefined, paymentStatus: (paymentStatus || undefined) as ReturnPaymentStatus | undefined }),
  });
  const remove = useMutation({ mutationFn: (id: number) => deleteSellReturn(id), onSuccess: () => { toast.success('Return deleted; stock re-taken'); qc.invalidateQueries({ queryKey: ['sell-returns'] }); }, onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not delete return')) });

  const columns: Column<SellReturnListItem>[] = useMemo(() => [
    { key: 'date', header: 'Date', hideable: false, render: (r) => <span className="whitespace-nowrap">{fmtDate(r.transactionDate)}</span> },
    { key: 'refNo', header: 'Reference No', hideable: false, render: (r) => <button type="button" className="font-mono text-xs font-medium text-primary hover:underline" onClick={() => setViewId(r.id)}>{r.refNo}</button> },
    { key: 'parent', header: 'Parent sale', render: (r) => (r.parentSell ? <span className="font-mono text-xs">{r.parentSell.refNo}</span> : '—') },
    { key: 'customer', header: 'Customer', render: (r) => <span className="font-medium">{r.customer || '—'}</span> },
    { key: 'location', header: 'Location', render: (r) => r.location },
    { key: 'refund', header: 'Refund status', render: (r) => <RefundBadge status={r.paymentStatus} /> },
    { key: 'total', header: 'Total', className: 'text-right tabular-nums', headerClassName: 'text-right', render: (r) => formatMoney(r.finalTotal) },
    { key: 'due', header: 'Refund due', className: 'text-right tabular-nums', headerClassName: 'text-right', render: (r) => <span className={r.due > 0 ? 'text-destructive' : 'text-muted-foreground'}>{formatMoney(r.due)}</span> },
    {
      key: 'actions', header: 'Action', hideable: false, headerClassName: 'text-right', className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          {canPay && <Button variant="outline" size="sm" title="View / refund" onClick={() => setViewId(r.id)}><Wallet className="h-4 w-4" /></Button>}
          {canCreate && <Button variant="destructive" size="sm" title="Delete" onClick={() => window.confirm(`Delete return ${r.refNo}?\n\nAny stock it restored will be re-taken.`) && remove.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>}
        </div>
      ),
    },
  ], [canPay, canCreate, remove]);

  return (
    <div>
      <PageHeader title="Sell Returns" description="Goods returned by customers, and the refunds owed to them." breadcrumbs={[{ label: 'Sell' }, { label: 'Sell Returns' }]}
        actions={canCreate && <Button size="sm" onClick={() => navigate('/sell-returns/create')}><Plus className="h-4 w-4" />Add Return</Button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-card px-4 py-3"><div className="text-xs text-muted-foreground">Total returned</div><div className="mt-0.5 text-lg font-semibold tabular-nums">{formatMoney(data?.totals.finalTotal ?? 0)}</div></div>
        <div className="rounded-lg border bg-card px-4 py-3"><div className="text-xs text-muted-foreground">Refund due (this page)</div><div className={`mt-0.5 text-lg font-semibold tabular-nums ${(data?.totals.due ?? 0) > 0 ? 'text-destructive' : ''}`}>{formatMoney(data?.totals.due ?? 0)}</div></div>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} rowKey={(r) => r.id} loading={isLoading} page={page} pageSize={pageSize} total={data?.total ?? 0} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search return or parent sale…" columnsStorageKey="sell-returns" emptyMessage="No sell returns yet." filtersActive={Boolean(search || locationId || contactId || paymentStatus)} onResetFilters={() => { setSearch(''); setLocationId(''); setContactId(''); setPaymentStatus(''); setPage(1); }}
        toolbar={<>
          <Select value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(1); }} className="h-9 w-40"><option value="">All locations</option>{(meta?.locations ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
          <Select value={contactId} onChange={(e) => { setContactId(e.target.value); setPage(1); }} className="h-9 w-44"><option value="">All customers</option>{(meta?.customers ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className="h-9 w-36"><option value="">All refunds</option><option value="paid">Refunded</option><option value="partial">Partial</option><option value="due">Due</option></Select>
        </>} />
      <SellReturnRefundModal id={viewId} onClose={() => setViewId(null)} onChanged={() => qc.invalidateQueries({ queryKey: ['sell-returns'] })} />
    </div>
  );
}
