import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
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
import { ReturnRefundModal } from '../components/ReturnRefundModal';
import { deleteReturn, listReturns, type ReturnListItem, type ReturnPaymentStatus } from '../returns.api';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });

/** On a return, "paid" means the supplier has refunded us. */
function RefundBadge({ status }: { status: ReturnPaymentStatus }) {
  if (status === 'paid') return <Badge variant="success">Refunded</Badge>;
  if (status === 'partial') return <Badge variant="default">Partial</Badge>;
  return <Badge variant="warning">Due</Badge>;
}

export function ReturnsListPage() {
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
  const canCreate = has('purchase.update');
  const canDelete = has('purchase.delete');
  const canPay = has('purchase.payments');

  const { data: meta } = useQuery({ queryKey: ['purchase-meta'], queryFn: getPurchaseMeta });

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-returns', page, pageSize, search, locationId, contactId, paymentStatus],
    queryFn: () =>
      listReturns({
        page,
        pageSize,
        search,
        locationId: locationId ? Number(locationId) : undefined,
        contactId: contactId ? Number(contactId) : undefined,
        paymentStatus: (paymentStatus || undefined) as ReturnPaymentStatus | undefined,
      }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteReturn(id),
    onSuccess: () => {
      toast.success('Return deleted; any stock it removed has been restored');
      qc.invalidateQueries({ queryKey: ['purchase-returns'] });
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not delete return')),
  });

  const columns: Column<ReturnListItem>[] = useMemo(
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
      {
        key: 'parent',
        header: 'Parent purchase',
        render: (r) => (r.parentPurchase ? <span className="font-mono text-xs">{r.parentPurchase.refNo}</span> : '—'),
      },
      { key: 'location', header: 'Location', render: (r) => r.location },
      { key: 'supplier', header: 'Supplier', render: (r) => <span className="font-medium">{r.supplier || '—'}</span> },
      {
        key: 'paymentStatus',
        header: 'Refund status',
        render: (r) => <RefundBadge status={r.paymentStatus} />,
      },
      {
        key: 'finalTotal',
        header: 'Grand Total',
        className: 'text-right tabular-nums',
        headerClassName: 'text-right',
        render: (r) => formatMoney(r.finalTotal),
      },
      {
        key: 'due',
        header: 'Refund due',
        className: 'text-right tabular-nums',
        headerClassName: 'text-right',
        render: (r) => (
          <span className={r.due > 0 ? 'text-destructive' : 'text-muted-foreground'}>{formatMoney(r.due)}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Action',
        hideable: false,
        headerClassName: 'text-right',
        className: 'text-right',
        render: (r) => (
          <div className="flex justify-end gap-1.5">
            {canPay && (
              <Button variant="outline" size="sm" title="View / refund" onClick={() => setViewId(r.id)}>
                <Wallet className="h-4 w-4" />
              </Button>
            )}
            {canCreate && (
              <Button variant="outline" size="sm" title="Edit" onClick={() => navigate(`/purchase-returns/${r.id}/edit`)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                title="Delete"
                onClick={() =>
                  window.confirm(`Delete return ${r.refNo}?\n\nAny stock it removed will be restored.`) &&
                  remove.mutate(r.id)
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canPay, canCreate, canDelete, navigate, remove],
  );

  return (
    <div>
      <PageHeader
        title="Purchase Returns"
        description="Goods sent back to suppliers, and the refunds owed back to you."
        breadcrumbs={[{ label: 'Purchases' }, { label: 'Purchase Returns' }]}
        actions={
          canCreate && (
            <Button size="sm" onClick={() => navigate('/purchase-returns/create')}>
              <Plus className="h-4 w-4" />
              Add Return
            </Button>
          )
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <SummaryTile label="Total returned" value={formatMoney(data?.totals.finalTotal ?? 0)} />
        <SummaryTile
          label="Refund due (this page)"
          value={formatMoney(data?.totals.due ?? 0)}
          tone={(data?.totals.due ?? 0) > 0 ? 'danger' : undefined}
        />
      </div>

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
        searchPlaceholder="Search return or parent purchase…"
        columnsStorageKey="purchase-returns"
        emptyMessage="No purchase returns yet."
        filtersActive={Boolean(search || locationId || contactId || paymentStatus)}
        onResetFilters={() => {
          setSearch('');
          setLocationId('');
          setContactId('');
          setPaymentStatus('');
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
            <Select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className="h-9 w-36">
              <option value="">All refunds</option>
              <option value="paid">Refunded</option>
              <option value="partial">Partial</option>
              <option value="due">Due</option>
            </Select>
          </>
        }
      />

      <ReturnRefundModal
        id={viewId}
        onClose={() => setViewId(null)}
        onChanged={() => qc.invalidateQueries({ queryKey: ['purchase-returns'] })}
      />
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${tone === 'danger' ? 'text-destructive' : ''}`}>
        {value}
      </div>
    </div>
  );
}
