import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Copy, Download, Eye, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
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
import { ApprovalBadge, PaymentBadge, StatusBadge } from '../components/PurchaseBadges';
import { PurchasePaymentsModal } from '../components/PurchasePaymentsModal';
import { PurchaseViewModal } from '../components/PurchaseViewModal';
import {
  deletePurchase,
  exportPurchases,
  getPurchaseMeta,
  listPurchases,
  updatePurchaseApproval,
  updatePurchaseStatus,
  type PurchaseListItem,
  type PurchaseStatus,
} from '../purchases.api';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });

export function PurchasesListPage() {
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
  const { has, hasAny } = usePermissions();

  const canCreate = has('purchase.create');
  const canUpdate = has('purchase.update');
  const canDelete = has('purchase.delete');
  const canApprove = has('purchase.approve');
  const canDuplicate = has('purchase.duplicate');
  const canPay = hasAny(['purchase.payments', 'delete_purchase_payment']);

  /** The active filter set, shared by the table query and the export. */
  const filters = {
    search,
    locationId: locationId ? Number(locationId) : undefined,
    contactId: contactId ? Number(contactId) : undefined,
    status: (status || undefined) as PurchaseStatus | undefined,
    paymentStatus: (paymentStatus || undefined) as never,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data: meta } = useQuery({ queryKey: ['purchase-meta'], queryFn: getPurchaseMeta });

  const { data, isLoading } = useQuery({
    queryKey: [
      'purchases',
      page,
      pageSize,
      search,
      locationId,
      contactId,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
    ],
    queryFn: () => listPurchases({ page, pageSize, ...filters }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['purchases'] });

  const remove = useMutation({
    mutationFn: (id: number) => deletePurchase(id),
    onSuccess: () => {
      toast.success('Purchase deleted; any stock it added has been reversed');
      refresh();
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not delete purchase')),
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ id, next }: { id: number; next: PurchaseStatus }) => updatePurchaseStatus(id, next),
    onSuccess: () => {
      toast.success('Status updated');
      refresh();
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not update status')),
  });

  const approve = useMutation({
    mutationFn: ({ id, next }: { id: number; next: boolean }) => updatePurchaseApproval(id, next),
    onSuccess: (_d, v) => {
      // Approval is what posts the stock in this build — say so, because GOURI's never did.
      toast.success(v.next ? 'Approved; stock has been added' : 'Approval revoked; stock reversed');
      refresh();
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not update approval')),
  });

  const columns: Column<PurchaseListItem>[] = useMemo(
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
      {
        key: 'supplier',
        header: 'Supplier',
        render: (p) => <span className="font-medium">{p.supplier || '—'}</span>,
      },
      {
        key: 'status',
        header: 'Purchase Status',
        render: (p) =>
          canUpdate ? (
            // GOURI makes the status label itself the control; same here, no extra modal.
            <Select
              value={p.status}
              onChange={(e) =>
                setStatusMutation.mutate({ id: p.id, next: e.target.value as PurchaseStatus })
              }
              className="h-7 w-32 text-xs"
            >
              <option value="received">Received</option>
              <option value="pending">Pending</option>
              <option value="ordered">Ordered</option>
            </Select>
          ) : (
            <StatusBadge status={p.status} />
          ),
      },
      {
        key: 'paymentStatus',
        header: 'Payment Status',
        render: (p) => <PaymentBadge status={p.paymentStatus} overdue={p.isOverdue} />,
      },
      {
        key: 'approved',
        header: 'Approved',
        render: (p) =>
          canApprove ? (
            <button
              type="button"
              title={p.isApproved ? 'Revoke approval' : 'Approve — this adds the stock'}
              onClick={() => approve.mutate({ id: p.id, next: !p.isApproved })}
            >
              <ApprovalBadge isApproved={p.isApproved} />
            </button>
          ) : (
            <ApprovalBadge isApproved={p.isApproved} />
          ),
      },
      {
        key: 'items',
        header: 'Items',
        className: 'text-right tabular-nums',
        headerClassName: 'text-right',
        render: (p) => p.items,
      },
      {
        key: 'finalTotal',
        header: 'Grand Total',
        className: 'text-right tabular-nums',
        headerClassName: 'text-right',
        render: (p) => formatMoney(p.finalTotal),
      },
      {
        key: 'due',
        header: 'Payment Due',
        className: 'text-right tabular-nums',
        headerClassName: 'text-right',
        render: (p) => (
          <span className={p.due > 0 ? 'text-destructive' : 'text-muted-foreground'}>
            {formatMoney(p.due)}
          </span>
        ),
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
            {canPay && (
              <Button
                variant="outline"
                size="sm"
                title={p.paymentStatus === 'paid' ? 'View payments' : 'Add payment'}
                onClick={() => setPaymentsId(p.id)}
              >
                <Wallet className="h-4 w-4" />
              </Button>
            )}
            {canUpdate && (
              <Button
                variant="outline"
                size="sm"
                title="Edit"
                onClick={() => navigate(`/purchases/${p.id}/edit`)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDuplicate && (
              // GOURI's "Duplicate Purchase": the create form loads the source and drops its identity.
              <Button
                variant="outline"
                size="sm"
                title="Duplicate"
                onClick={() => navigate(`/purchases/create?duplicate=${p.id}`)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            {canApprove && !p.isApproved && (
              <Button
                variant="outline"
                size="sm"
                title="Approve — this adds the stock"
                onClick={() => approve.mutate({ id: p.id, next: true })}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                title="Delete"
                onClick={() =>
                  window.confirm(
                    `Delete purchase ${p.refNo}?\n\nAny stock it added will be reversed.`,
                  ) && remove.mutate(p.id)
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canUpdate, canApprove, canDuplicate, canPay, canDelete, navigate, remove, approve, setStatusMutation],
  );

  const filtersActive = Boolean(
    search || locationId || contactId || status || paymentStatus || dateFrom || dateTo,
  );

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="Goods received from suppliers. A purchase adds stock once it is received and approved."
        breadcrumbs={[{ label: 'Purchases' }, { label: 'All Purchases' }]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportPurchases(filters).catch((e) =>
                  toast.error(getApiErrorMessage(e, 'Could not export purchases')),
                )
              }
            >
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
            {canCreate && (
              <Button size="sm" onClick={() => navigate('/purchases/create')}>
                <Plus className="h-4 w-4" />
                Add Purchase
              </Button>
            )}
          </div>
        }
      />

      {/* GOURI puts these under the table as a footer row; a strip above reads better and does not
          scroll away horizontally with the columns. */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <SummaryTile label="Purchases" value={String(data?.total ?? 0)} />
        <SummaryTile label="Total purchased" value={formatMoney(data?.totals.finalTotal ?? 0)} />
        <SummaryTile
          label="Payment due (this page)"
          value={formatMoney(data?.totals.due ?? 0)}
          tone={(data?.totals.due ?? 0) > 0 ? 'danger' : undefined}
        />
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
        columnsStorageKey="purchases"
        emptyMessage="No purchases yet."
        filtersActive={filtersActive}
        onResetFilters={() => {
          setSearch('');
          setLocationId('');
          setContactId('');
          setStatus('');
          setPaymentStatus('');
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
              value={contactId}
              onChange={(e) => {
                setContactId(e.target.value);
                setPage(1);
              }}
              className="h-9 w-44"
            >
              <option value="">All suppliers</option>
              {(meta?.suppliers ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
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
              <option value="received">Received</option>
              <option value="pending">Pending</option>
              <option value="ordered">Ordered</option>
            </Select>
            <Select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
              className="h-9 w-36"
            >
              <option value="">All payments</option>
              <option value="paid">Paid</option>
              <option value="due">Due</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
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

      <PurchaseViewModal id={viewId} onClose={() => setViewId(null)} />
      <PurchasePaymentsModal
        id={paymentsId}
        onClose={() => setPaymentsId(null)}
        onChanged={refresh}
      />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'danger';
}) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`mt-0.5 text-lg font-semibold tabular-nums ${tone === 'danger' ? 'text-destructive' : ''}`}
      >
        {value}
      </div>
    </div>
  );
}
