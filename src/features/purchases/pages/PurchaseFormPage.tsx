import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { usePermissions } from '@/features/auth/usePermission';
import { getOpenOrders, type OpenOrder } from '@/features/purchase-orders/orders.api';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import { ProductSearchBox } from '../components/ProductSearchBox';
import { PurchaseLinesTable } from '../components/PurchaseLinesTable';
import {
  createPurchase,
  getPurchase,
  getPurchaseMeta,
  searchPurchaseProducts,
  updatePurchase,
  type PurchaseProductHit,
  type PurchaseStatus,
  type SavePurchaseBody,
} from '../purchases.api';
import { usePurchaseForm } from '../usePurchaseForm';

const today = () => new Date().toISOString().slice(0, 10);
const numOrUndef = (v: string): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n : undefined;
};

export function PurchaseFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  // GOURI's "Duplicate Purchase": load a source document into a NEW one. Same loader as edit, but
  // the identity (id, reference no, payments, line ids) is deliberately dropped.
  const duplicateOf = params.get('duplicate');
  const sourceId = id ?? duplicateOf;
  const editing = Boolean(id);
  const duplicating = !editing && Boolean(duplicateOf);
  const navigate = useNavigate();
  const toast = useToast();
  const { has } = usePermissions();
  const canApprove = has('purchase.approve');

  const { data: meta, isLoading: metaLoading } = useQuery({
    queryKey: ['purchase-meta'],
    queryFn: getPurchaseMeta,
  });

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ['purchase', Number(sourceId)],
    queryFn: () => getPurchase(Number(sourceId)),
    enabled: sourceId != null,
  });

  // Document header
  const [contactId, setContactId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [refNo, setRefNo] = useState('');
  const [transactionDate, setTransactionDate] = useState(today());
  const [status, setStatus] = useState<PurchaseStatus>('received');
  const [isApproved, setIsApproved] = useState(true);
  const [payTermNumber, setPayTermNumber] = useState('');
  const [payTermType, setPayTermType] = useState<'' | 'days' | 'months'>('');
  const [exchangeRate, setExchangeRate] = useState('1');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Purchase orders this receipt draws down.
  const [pulledOrderIds, setPulledOrderIds] = useState<number[]>([]);

  // Payment taken at the time of purchase (create only, as in GOURI)
  const [payNow, setPayNow] = useState('0');
  const [payMethod, setPayMethod] = useState('cash');

  const form = usePurchaseForm(meta);

  // One location? Pick it, the way GOURI auto-selects a single-location business.
  useEffect(() => {
    if (!editing && meta?.locations.length === 1) setLocationId(String(meta.locations[0].id));
    if (meta && !editing) setExchangeRate(String(meta.settings.defaultExchangeRate || 1));
    if (meta && !editing && !meta.settings.enablePurchaseStatus) setStatus('received');
  }, [meta, editing]);

  // Rehydrate the edit form. The product hits come along so each row can show its stock and units.
  useEffect(() => {
    if (!existing || !meta) return;
    setContactId(String(existing.contactId ?? ''));
    setLocationId(String(existing.locationId));
    // A duplicate is a NEW document: it gets its own reference number and today's date, and
    // starts unpaid — copying those would silently book a second receipt of the same goods.
    setRefNo(duplicating ? '' : existing.refNo);
    setTransactionDate(duplicating ? today() : existing.transactionDate.slice(0, 10));
    setStatus(existing.status);
    setIsApproved(duplicating ? true : existing.isApproved);
    setPayTermNumber(existing.payTermNumber != null ? String(existing.payTermNumber) : '');
    setPayTermType(existing.payTermType ?? '');
    setExchangeRate(String(existing.exchangeRate));
    setAdditionalNotes(existing.additionalNotes);

    const skus = existing.lines.map((l) => l.sku).filter(Boolean);
    Promise.all(
      skus.map((sku) =>
        searchPurchaseProducts({ search: sku, location_id: existing.locationId }).catch(() => []),
      ),
    ).then((results) => {
      const hits = new Map<number, PurchaseProductHit>();
      for (const list of results) for (const h of list) hits.set(h.variationId, h);
      // Dropping the line ids is what makes a duplicate create rows instead of updating the source's.
      form.loadFrom(
        duplicating ? { ...existing, lines: existing.lines.map((l) => ({ ...l, id: 0 })) } : existing,
        hits,
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, meta]);

  const supplier = meta?.suppliers.find((s) => String(s.id) === contactId);

  // Picking a supplier carries their agreed credit term onto the document (GOURI parity).
  const onSupplierChange = (value: string) => {
    setContactId(value);
    const s = meta?.suppliers.find((x) => String(x.id) === value);
    if (s) {
      setPayTermNumber(s.payTermNumber != null ? String(s.payTermNumber) : '');
      setPayTermType(s.payTermType ?? '');
    }
  };

  // Open orders for this supplier, offered on a fresh receipt only.
  const [selectedOrder, setSelectedOrder] = useState('');
  const { data: openOrders = [] } = useQuery({
    queryKey: ['open-orders', contactId, locationId],
    queryFn: () => getOpenOrders(Number(contactId), locationId ? Number(locationId) : undefined),
    enabled: Boolean(contactId) && Boolean(locationId) && !editing && !duplicating,
  });

  const pullOrder = (order: OpenOrder) => {
    if (pulledOrderIds.includes(order.id)) return;
    setPulledOrderIds((prev) => [...prev, order.id]);
    if (order.shippingDetails) form.setShippingDetails(order.shippingDetails);
    for (const l of order.lines) {
      form.addLine(
        {
          variationId: l.variationId,
          productId: l.productId,
          name: l.product,
          variation: l.variation,
          sku: l.sku,
          enableStock: true,
          currentStock: null,
          taxRateId: l.taxRateId,
          unitId: null,
          unitName: '',
          allowDecimal: true,
          secondaryUnitId: null,
          subUnits: [],
          defaultPurchasePrice: l.ppWithoutDiscount,
          dppIncTax: 0,
          sellPriceIncTax: 0,
          lastPurchase: { price: l.ppWithoutDiscount, discountPercent: l.discountPercent },
        },
        { quantity: l.quantityRemaining, maxQuantity: l.quantityRemaining, purchaseOrderLineId: l.id },
      );
    }
    setSelectedOrder('');
  };

  const save = useMutation({
    mutationFn: (body: SavePurchaseBody) =>
      editing ? updatePurchase(Number(id), body) : createPurchase(body),
    onSuccess: (p) => {
      toast.success(editing ? `Purchase ${p.refNo} updated` : `Purchase ${p.refNo} saved`);
      navigate('/purchases');
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not save purchase')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId) return toast.error('Select a supplier');
    if (!locationId) return toast.error('Select a business location');
    if (form.lines.length === 0) return toast.error('Add at least one product');

    const body: SavePurchaseBody = {
      contact_id: Number(contactId),
      location_id: Number(locationId),
      ref_no: refNo.trim() || undefined,
      transaction_date: transactionDate,
      status,
      is_approved: canApprove ? isApproved : undefined,
      pay_term_number: numOrUndef(payTermNumber),
      pay_term_type: payTermType || undefined,
      discount_type: form.discountType || undefined,
      discount_amount: Number(form.discountAmount) || 0,
      tax_rate_id: form.taxRateId ?? undefined,
      shipping_details: form.shippingDetails || undefined,
      shipping_charges: Number(form.shippingCharges) || 0,
      additional_expenses: form.additionalExpenses
        .filter((x) => x.name.trim() || Number(x.amount))
        .map((x) => ({ name: x.name, amount: Number(x.amount) || 0 })),
      exchange_rate: Number(exchangeRate) || 1,
      additional_notes: additionalNotes || undefined,
      purchase_order_ids: pulledOrderIds.length ? pulledOrderIds : undefined,
      purchases: form.lines.map((l) => ({
        purchase_line_id: l.purchaseLineId,
        purchase_order_line_id: l.purchaseOrderLineId,
        product_id: l.productId,
        variation_id: l.variationId,
        quantity: Number(l.quantity) || 0,
        sub_unit_id: l.subUnitId ?? undefined,
        pp_without_discount: Number(l.ppWithoutDiscount) || 0,
        discount_percent: Number(l.discountPercent) || 0,
        tax_rate_id: l.taxRateId ?? undefined,
        lot_number: l.lotNumber || undefined,
        mfg_date: l.mfgDate || undefined,
        exp_date: l.expDate || undefined,
        default_sell_price: Number(l.defaultSellPrice) || undefined,
      })),
      // Payments are only accepted on create; the edit screen leaves them alone, as GOURI does.
      payment:
        !editing && Number(payNow) > 0
          ? [{ amount: Number(payNow), method: payMethod, paid_on: transactionDate }]
          : undefined,
    };
    save.mutate(body);
  };

  if (metaLoading || (sourceId != null && existingLoading) || !meta) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const s = meta.settings;
  const due = Math.max(0, form.totals.finalTotal - (Number(payNow) || 0));

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={
          editing ? `Edit purchase ${existing?.refNo ?? ''}` : duplicating ? 'Duplicate purchase' : 'Add purchase'
        }
        description={
          duplicating
            ? `Copied from ${existing?.refNo ?? ''}. It saves as a new purchase with its own reference number.`
            : 'Stock is added once the purchase is both received and approved.'
        }
        breadcrumbs={[
          { label: 'Purchases', to: '/purchases' },
          { label: editing ? 'Edit' : 'Add' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate('/purchases')}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Update' : 'Save'}
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        {/* ── Document ───────────────────────────────── */}
        <Card className="p-4">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div>
              <Label htmlFor="supplier">Supplier *</Label>
              <Select id="supplier" value={contactId} onChange={(e) => onSupplierChange(e.target.value)} required>
                <option value="">Select supplier</option>
                {meta.suppliers.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </Select>
              {supplier?.address && (
                <p className="mt-1 text-xs text-muted-foreground">{supplier.address}</p>
              )}
            </div>

            <div>
              <Label htmlFor="location">Business location *</Label>
              <Select
                id="location"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                required
                // Moving a saved purchase between locations would have to unwind stock at one and
                // post it at the other; GOURI disables it and so do we.
                disabled={editing}
              >
                <option value="">Select location</option>
                {meta.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="refNo">Reference no</Label>
              <Input
                id="refNo"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder="Leave empty to auto-generate"
              />
            </div>

            <div>
              <Label htmlFor="date">Purchase date *</Label>
              <Input
                id="date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
              />
            </div>

            {s.enablePurchaseStatus && (
              <div>
                <Label htmlFor="status">Purchase status *</Label>
                <Select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PurchaseStatus)}
                >
                  <option value="received">Received</option>
                  <option value="pending">Pending</option>
                  <option value="ordered">Ordered</option>
                </Select>
                {status !== 'received' && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Stock is only added once the status is Received.
                  </p>
                )}
              </div>
            )}

            {canApprove && (
              <div>
                <Label htmlFor="approval">Approval status *</Label>
                <Select
                  id="approval"
                  value={isApproved ? '1' : '0'}
                  onChange={(e) => setIsApproved(e.target.value === '1')}
                >
                  <option value="1">Approved</option>
                  <option value="0">Pending approval</option>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="payterm">Pay term</Label>
              <div className="flex gap-2">
                <Input
                  id="payterm"
                  type="number"
                  min="0"
                  value={payTermNumber}
                  onChange={(e) => setPayTermNumber(e.target.value)}
                  className="w-24"
                />
                <Select
                  value={payTermType}
                  onChange={(e) => setPayTermType(e.target.value as '' | 'days' | 'months')}
                  className="flex-1"
                >
                  <option value="">—</option>
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </Select>
              </div>
            </div>

            {s.purchaseInDiffCurrency && (
              <div>
                <Label htmlFor="rate">Exchange rate *</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Prices are entered in {s.purchaseCurrency.code} and stored in {s.currency.code}.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* ── Products ───────────────────────────────── */}
        <Card className="space-y-4 p-4">
          {!editing && !duplicating && contactId && locationId && openOrders.length > 0 && (
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-3">
              <div className="flex-1">
                <Label htmlFor="pullOrder">Receive against a purchase order</Label>
                <Select
                  id="pullOrder"
                  value={selectedOrder}
                  onChange={(e) => {
                    const o = openOrders.find((x) => String(x.id) === e.target.value);
                    if (o) pullOrder(o);
                  }}
                >
                  <option value="">Select an open order…</option>
                  {openOrders
                    .filter((o) => !pulledOrderIds.includes(o.id))
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.refNo} ({o.status})
                      </option>
                    ))}
                </Select>
              </div>
              {pulledOrderIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Receiving against {pulledOrderIds.length} order(s). Saving marks those quantities as received.
                </p>
              )}
            </div>
          )}

          <ProductSearchBox
            locationId={locationId ? Number(locationId) : undefined}
            contactId={contactId ? Number(contactId) : undefined}
            disabled={!locationId}
            onPick={form.addLine}
          />

          <PurchaseLinesTable
            lines={form.lines}
            meta={meta}
            onChange={form.updateLine}
            onRemove={form.removeLine}
          />

          <div className="flex justify-end gap-8 text-sm">
            <div>
              <span className="text-muted-foreground">Total items: </span>
              <span className="font-medium tabular-nums">{form.lines.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total quantity: </span>
              <span className="font-medium tabular-nums">{form.totalQuantity}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Net total: </span>
              <span className="font-semibold tabular-nums">{formatMoney(form.totals.lineSubtotal)}</span>
            </div>
          </div>
        </Card>

        {/* ── Discount, tax, shipping, expenses ───────── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="discountType">Discount type</Label>
                <Select
                  id="discountType"
                  value={form.discountType}
                  onChange={(e) => form.setDiscountType(e.target.value as '' | 'fixed' | 'percentage')}
                >
                  <option value="">None</option>
                  <option value="fixed">Fixed</option>
                  <option value="percentage">Percentage</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="discountAmount">Discount amount</Label>
                <Input
                  id="discountAmount"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.discountAmount}
                  onChange={(e) => form.setDiscountAmount(e.target.value)}
                  disabled={!form.discountType}
                />
              </div>
              <div>
                <Label htmlFor="orderTax">Purchase tax</Label>
                <Select
                  id="orderTax"
                  value={form.taxRateId ?? ''}
                  onChange={(e) => form.setTaxRateId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">None</option>
                  {meta.taxRates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.amount}%)
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Charged on the subtotal after the discount.
                </p>
              </div>
              <div>
                <Label htmlFor="shippingCharges">Shipping charges</Label>
                <Input
                  id="shippingCharges"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.shippingCharges}
                  onChange={(e) => form.setShippingCharges(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="shippingDetails">Shipping details</Label>
              <Input
                id="shippingDetails"
                value={form.shippingDetails}
                onChange={(e) => form.setShippingDetails(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Additional expenses</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    form.setAdditionalExpenses([...form.additionalExpenses, { name: '', amount: '0' }])
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
              {form.additionalExpenses.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Landed costs beyond shipping — duty, freight, handling.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.additionalExpenses.map((x, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="Expense name"
                        value={x.name}
                        onChange={(e) => {
                          const next = [...form.additionalExpenses];
                          next[i] = { ...next[i], name: e.target.value };
                          form.setAdditionalExpenses(next);
                        }}
                      />
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        className="w-32"
                        value={x.amount}
                        onChange={(e) => {
                          const next = [...form.additionalExpenses];
                          next[i] = { ...next[i], amount: e.target.value };
                          form.setAdditionalExpenses(next);
                        }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          form.setAdditionalExpenses(form.additionalExpenses.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Additional notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
              />
            </div>
          </Card>

          {/* ── Totals + payment ─────────────────────── */}
          <Card className="space-y-4 p-4">
            <div className="space-y-1 text-sm">
              <Row label="Net total (incl. line tax)" value={formatMoney(form.totals.lineSubtotal)} />
              <Row label="Discount" value={`(−) ${formatMoney(form.totals.discount)}`} />
              <Row label="Purchase tax" value={`(+) ${formatMoney(form.totals.taxAmount)}`} />
              <Row label="Shipping" value={`(+) ${formatMoney(Number(form.shippingCharges) || 0)}`} />
              <Row
                label="Additional expenses"
                value={`(+) ${formatMoney(form.totals.additionalExpenseTotal)}`}
              />
              <div className="mt-2 border-t pt-2">
                <Row label="Purchase total" value={formatMoney(form.totals.finalTotal)} strong />
              </div>
              <p className="pt-1 text-xs text-muted-foreground">
                These figures are recomputed by the server on save — what is stored is never taken
                from this page.
              </p>
            </div>

            {!editing && (
              <div className="space-y-3 border-t pt-4">
                <Label>Payment</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="payNow">Amount paid now</Label>
                    <Input
                      id="payNow"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={payNow}
                      onChange={(e) => setPayNow(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payMethod">Payment method</Label>
                    <Select
                      id="payMethod"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                    >
                      {meta.paymentMethods.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <Row label="Payment due" value={formatMoney(due)} strong danger={due > 0} />
              </div>
            )}
            {editing && (
              <p className="border-t pt-4 text-xs text-muted-foreground">
                Payments are managed from the purchase list — editing a purchase leaves them untouched.
              </p>
            )}
          </Card>
        </div>
      </div>
    </form>
  );
}

function Row({
  label,
  value,
  strong,
  danger,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`tabular-nums ${strong ? 'font-semibold' : ''} ${danger ? 'text-destructive' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
