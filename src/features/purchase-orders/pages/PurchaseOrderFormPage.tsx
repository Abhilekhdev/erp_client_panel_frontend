import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { ProductSearchBox } from '@/features/purchases/components/ProductSearchBox';
import { PurchaseLinesTable } from '@/features/purchases/components/PurchaseLinesTable';
import {
  getPurchaseMeta,
  searchPurchaseProducts,
  type PurchaseMeta,
  type PurchaseProductHit,
} from '@/features/purchases/purchases.api';
import { usePurchaseForm } from '@/features/purchases/usePurchaseForm';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import {
  createPurchaseOrder,
  getOpenRequisitions,
  getPurchaseOrder,
  updatePurchaseOrder,
  type OpenRequisition,
  type SaveOrderBody,
  type ShippingStatus,
} from '../orders.api';

const today = () => new Date().toISOString().slice(0, 10);
const SHIPPING: ShippingStatus[] = ['ordered', 'packed', 'shipped', 'delivered', 'cancelled'];

/**
 * A purchase order is a priced document like a purchase, minus the stock — so it reuses the
 * purchase line table and calculator. The extra piece is pulling lines in from open requisitions,
 * which tags each line with the requisition line it fulfils.
 */
export function PurchaseOrderFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const { data: baseMeta, isLoading: metaLoading } = useQuery({
    queryKey: ['purchase-meta'],
    queryFn: getPurchaseMeta,
  });

  // A PO has no lot, expiry, sub-unit or sell-price columns — those belong to the receipt.
  const meta: PurchaseMeta | undefined = useMemo(
    () =>
      baseMeta && {
        ...baseMeta,
        settings: {
          ...baseMeta.settings,
          enableLotNumber: false,
          enableProductExpiry: false,
          enableSubUnits: false,
          enableEditingProductFromPurchase: false,
        },
      },
    [baseMeta],
  );

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ['purchase-order', Number(id)],
    queryFn: () => getPurchaseOrder(Number(id)),
    enabled: editing,
  });

  const [contactId, setContactId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [refNo, setRefNo] = useState('');
  const [transactionDate, setTransactionDate] = useState(today());
  const [deliveryDate, setDeliveryDate] = useState('');
  const [payTermNumber, setPayTermNumber] = useState('');
  const [payTermType, setPayTermType] = useState<'' | 'days' | 'months'>('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingStatus, setShippingStatus] = useState<'' | ShippingStatus>('');
  const [deliveredTo, setDeliveredTo] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [pulledReqIds, setPulledReqIds] = useState<number[]>([]);
  const [selectedReq, setSelectedReq] = useState('');

  const form = usePurchaseForm(meta);

  useEffect(() => {
    if (!editing && meta?.locations.length === 1) setLocationId(String(meta.locations[0].id));
  }, [meta, editing]);

  useEffect(() => {
    if (!existing || !meta) return;
    setContactId(String(existing.contactId ?? ''));
    setLocationId(String(existing.locationId));
    setRefNo(existing.refNo);
    setTransactionDate(existing.transactionDate.slice(0, 10));
    setDeliveryDate(existing.deliveryDate ? existing.deliveryDate.slice(0, 10) : '');
    setPayTermNumber(existing.payTermNumber != null ? String(existing.payTermNumber) : '');
    setPayTermType(existing.payTermType ?? '');
    setShippingAddress(existing.shippingAddress);
    setShippingStatus(existing.shippingStatus ?? '');
    setDeliveredTo(existing.deliveredTo);
    setAdditionalNotes(existing.additionalNotes);
    setPulledReqIds(existing.requisitions.map((r) => r.id));

    const skus = existing.lines.map((l) => l.sku).filter(Boolean);
    Promise.all(
      skus.map((sku) =>
        searchPurchaseProducts({ search: sku, location_id: existing.locationId }).catch(() => []),
      ),
    ).then((results) => {
      const hits = new Map<number, PurchaseProductHit>();
      for (const list of results) for (const h of list) hits.set(h.variationId, h);
      // Reuse the purchase loader; a PO detail line carries everything it reads (lot/expiry absent
      // is fine — those columns are off for a PO anyway).
      form.loadFrom(
        {
          discountType: existing.discountType,
          discountAmount: existing.discountAmount,
          taxRateId: existing.taxRateId,
          shippingDetails: existing.shippingDetails,
          shippingCharges: existing.shippingCharges,
          additionalExpenses: existing.additionalExpenses,
          lines: existing.lines.map((l) => ({ ...l, lotNumber: '', mfgDate: null, expDate: null })),
        } as unknown as Parameters<typeof form.loadFrom>[0],
        hits,
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, meta]);

  const supplier = meta?.suppliers.find((s) => String(s.id) === contactId);

  const onSupplierChange = (value: string) => {
    setContactId(value);
    const s = meta?.suppliers.find((x) => String(x.id) === value);
    if (s) {
      setPayTermNumber(s.payTermNumber != null ? String(s.payTermNumber) : '');
      setPayTermType(s.payTermType ?? '');
    }
  };

  const { data: openReqs = [] } = useQuery({
    queryKey: ['open-requisitions', locationId],
    queryFn: () => getOpenRequisitions(Number(locationId)),
    enabled: Boolean(locationId) && !editing,
  });

  const pullRequisition = (req: OpenRequisition) => {
    if (pulledReqIds.includes(req.id)) return;
    setPulledReqIds((prev) => [...prev, req.id]);
    for (const l of req.lines) {
      // One order line per requisition line, tagged so the draw-down counter can move.
      form.addLine(
        {
          variationId: l.variationId,
          productId: l.productId,
          name: l.product,
          variation: l.variation,
          sku: l.sku,
          enableStock: true,
          currentStock: null,
          taxRateId: null,
          unitId: null,
          unitName: '',
          allowDecimal: true,
          secondaryUnitId: null,
          subUnits: [],
          defaultPurchasePrice: l.defaultPurchasePrice,
          dppIncTax: 0,
          sellPriceIncTax: 0,
          lastPurchase: null,
        },
        { quantity: l.quantityRemaining, maxQuantity: l.quantityRemaining, purchaseRequisitionLineId: l.id },
      );
    }
    setSelectedReq('');
  };

  const save = useMutation({
    mutationFn: (body: SaveOrderBody) =>
      editing ? updatePurchaseOrder(Number(id), body) : createPurchaseOrder(body),
    onSuccess: (o) => {
      toast.success(editing ? `Order ${o.refNo} updated` : `Order ${o.refNo} saved`);
      navigate('/purchase-orders');
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not save purchase order')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId) return toast.error('Select a supplier');
    if (!locationId) return toast.error('Select a business location');
    if (form.lines.length === 0) return toast.error('Add at least one product');

    save.mutate({
      contact_id: Number(contactId),
      location_id: Number(locationId),
      ref_no: refNo.trim() || undefined,
      transaction_date: transactionDate,
      delivery_date: deliveryDate || undefined,
      pay_term_number: payTermNumber ? Number(payTermNumber) : undefined,
      pay_term_type: payTermType || undefined,
      discount_type: form.discountType || undefined,
      discount_amount: Number(form.discountAmount) || 0,
      tax_rate_id: form.taxRateId ?? undefined,
      shipping_details: form.shippingDetails || undefined,
      shipping_address: shippingAddress || undefined,
      shipping_charges: Number(form.shippingCharges) || 0,
      shipping_status: shippingStatus || undefined,
      delivered_to: deliveredTo || undefined,
      additional_expenses: form.additionalExpenses
        .filter((x) => x.name.trim() || Number(x.amount))
        .map((x) => ({ name: x.name, amount: Number(x.amount) || 0 })),
      additional_notes: additionalNotes || undefined,
      purchase_requisition_ids: pulledReqIds.length ? pulledReqIds : undefined,
      purchases: form.lines.map((l) => ({
        purchase_line_id: l.purchaseLineId,
        purchase_requisition_line_id: l.purchaseRequisitionLineId,
        product_id: l.productId,
        variation_id: l.variationId,
        quantity: Number(l.quantity) || 0,
        pp_without_discount: Number(l.ppWithoutDiscount) || 0,
        discount_percent: Number(l.discountPercent) || 0,
        tax_rate_id: l.taxRateId ?? undefined,
      })),
    });
  };

  if (metaLoading || (editing && existingLoading) || !meta) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={editing ? `Edit order ${existing?.refNo ?? ''}` : 'Add purchase order'}
        description="A commitment to a supplier. It does not move stock — receiving it as a purchase does."
        breadcrumbs={[{ label: 'Purchases', to: '/purchase-orders' }, { label: editing ? 'Edit' : 'Add' }]}
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate('/purchase-orders')}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : editing ? 'Update' : 'Save'}
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
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
              {supplier?.address && <p className="mt-1 text-xs text-muted-foreground">{supplier.address}</p>}
            </div>
            <div>
              <Label htmlFor="location">Business location *</Label>
              <Select
                id="location"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                required
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
              <Label htmlFor="date">Order date *</Label>
              <Input id="date" type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="delivery">Delivery date</Label>
              <Input id="delivery" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
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
                <Select value={payTermType} onChange={(e) => setPayTermType(e.target.value as never)} className="flex-1">
                  <option value="">—</option>
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </Select>
              </div>
            </div>

            {!editing && locationId && openReqs.length > 0 && (
              <div>
                <Label htmlFor="req">Pull from requisition</Label>
                <Select
                  id="req"
                  value={selectedReq}
                  onChange={(e) => {
                    const req = openReqs.find((r) => String(r.id) === e.target.value);
                    if (req) pullRequisition(req);
                  }}
                >
                  <option value="">Select a requisition…</option>
                  {openReqs
                    .filter((r) => !pulledReqIds.includes(r.id))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.refNo} ({r.status})
                      </option>
                    ))}
                </Select>
              </div>
            )}
          </div>
          {pulledReqIds.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Drawing from {pulledReqIds.length} requisition(s). Saving this order marks those quantities as ordered.
            </p>
          )}
        </Card>

        <Card className="space-y-4 p-4">
          <ProductSearchBox
            locationId={locationId ? Number(locationId) : undefined}
            contactId={contactId ? Number(contactId) : undefined}
            disabled={!locationId}
            onPick={(hit) => form.addLine(hit)}
          />
          <PurchaseLinesTable lines={form.lines} meta={meta} onChange={form.updateLine} onRemove={form.removeLine} />
          <div className="flex justify-end gap-8 text-sm">
            <div>
              <span className="text-muted-foreground">Total items: </span>
              <span className="font-medium tabular-nums">{form.lines.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total quantity: </span>
              <span className="font-medium tabular-nums">{form.totalQuantity}</span>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="discountType">Discount type</Label>
                <Select
                  id="discountType"
                  value={form.discountType}
                  onChange={(e) => form.setDiscountType(e.target.value as never)}
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
              <Input id="shippingDetails" value={form.shippingDetails} onChange={(e) => form.setShippingDetails(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="shippingAddress">Shipping address</Label>
              <Textarea id="shippingAddress" rows={2} value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="shippingStatus">Shipping status</Label>
                <Select id="shippingStatus" value={shippingStatus} onChange={(e) => setShippingStatus(e.target.value as never)}>
                  <option value="">—</option>
                  {SHIPPING.map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="deliveredTo">Delivered to</Label>
                <Input id="deliveredTo" value={deliveredTo} onChange={(e) => setDeliveredTo(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Additional expenses</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => form.setAdditionalExpenses([...form.additionalExpenses, { name: '', amount: '0' }])}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
              {form.additionalExpenses.map((x, i) => (
                <div key={i} className="mb-2 flex gap-2">
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
                    onClick={() => form.setAdditionalExpenses(form.additionalExpenses.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <Label htmlFor="notes">Additional notes</Label>
              <Textarea id="notes" rows={2} value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} />
            </div>
          </Card>

          <Card className="space-y-1 p-4 text-sm">
            <Row label="Net total (incl. line tax)" value={formatMoney(form.totals.lineSubtotal)} />
            <Row label="Discount" value={`(−) ${formatMoney(form.totals.discount)}`} />
            <Row label="Purchase tax" value={`(+) ${formatMoney(form.totals.taxAmount)}`} />
            <Row label="Shipping" value={`(+) ${formatMoney(Number(form.shippingCharges) || 0)}`} />
            <Row label="Additional expenses" value={`(+) ${formatMoney(form.totals.additionalExpenseTotal)}`} />
            <div className="mt-2 border-t pt-2">
              <Row label="Order total" value={formatMoney(form.totals.finalTotal)} strong />
            </div>
            <p className="pt-1 text-xs text-muted-foreground">
              Recomputed by the server on save — nothing here is trusted as the stored total.
            </p>
          </Card>
        </div>
      </div>
    </form>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}
