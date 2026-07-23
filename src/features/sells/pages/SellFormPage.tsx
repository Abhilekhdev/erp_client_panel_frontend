import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { getOpenSalesOrders, type OpenSalesOrder } from '@/features/sales-orders/orders.api';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import { SellLinesTable } from '../components/SellLinesTable';
import { SellProductSearchBox } from '../components/SellProductSearchBox';
import {
  createSell,
  getSell,
  getSellMeta,
  searchSellProducts,
  updateSell,
  type SaveSellBody,
  type SellProductHit,
} from '../sells.api';
import { useSellForm } from '../useSellForm';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Add / edit a sale — the sell-side mirror of the purchase form. A FINAL sale issues stock; a
 * DRAFT or QUOTATION is just paperwork. Sales orders can be pulled in to invoice them.
 */
export function SellFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const { data: meta, isLoading: metaLoading } = useQuery({ queryKey: ['sell-meta'], queryFn: getSellMeta });
  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ['sell', Number(id)],
    queryFn: () => getSell(Number(id)),
    enabled: editing,
  });

  const [contactId, setContactId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [refNo, setRefNo] = useState('');
  const [transactionDate, setTransactionDate] = useState(today());
  const [status, setStatus] = useState<'final' | 'draft' | 'quotation'>('final');
  const [payTermNumber, setPayTermNumber] = useState('');
  const [payTermType, setPayTermType] = useState<'' | 'days' | 'months'>('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [pulledOrderIds, setPulledOrderIds] = useState<number[]>([]);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [payNow, setPayNow] = useState('0');
  const [payMethod, setPayMethod] = useState('cash');

  const form = useSellForm(meta);

  useEffect(() => {
    if (!editing && meta?.locations.length === 1) setLocationId(String(meta.locations[0].id));
  }, [meta, editing]);

  useEffect(() => {
    if (!existing || !meta) return;
    setContactId(String(existing.contactId ?? ''));
    setLocationId(String(existing.locationId));
    setRefNo(existing.refNo);
    setTransactionDate(existing.transactionDate.slice(0, 10));
    setStatus(existing.status === 'proforma' ? 'draft' : (existing.status as 'final' | 'draft' | 'quotation'));
    setPayTermNumber(existing.payTermNumber != null ? String(existing.payTermNumber) : '');
    setPayTermType(existing.payTermType ?? '');
    setAdditionalNotes(existing.additionalNotes);
    const skus = existing.lines.map((l) => l.sku).filter(Boolean);
    Promise.all(skus.map((sku) => searchSellProducts({ search: sku, location_id: existing.locationId }).catch(() => []))).then((results) => {
      const hits = new Map<number, SellProductHit>();
      for (const list of results) for (const h of list) hits.set(h.variationId, h);
      form.loadFrom(existing, hits);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, meta]);

  const customer = meta?.customers.find((c) => String(c.id) === contactId);
  const onCustomerChange = (v: string) => {
    setContactId(v);
    const c = meta?.customers.find((x) => String(x.id) === v);
    if (c) {
      setPayTermNumber(c.payTermNumber != null ? String(c.payTermNumber) : '');
      setPayTermType(c.payTermType ?? '');
    }
  };

  const { data: openOrders = [] } = useQuery({
    queryKey: ['open-sales-orders', contactId, locationId],
    queryFn: () => getOpenSalesOrders(Number(contactId), locationId ? Number(locationId) : undefined),
    enabled: Boolean(contactId) && Boolean(locationId) && !editing,
  });

  const pullOrder = (order: OpenSalesOrder) => {
    if (pulledOrderIds.includes(order.id)) return;
    setPulledOrderIds((prev) => [...prev, order.id]);
    for (const l of order.lines) {
      form.addLine(
        {
          variationId: l.variationId, productId: l.productId, name: l.product, variation: l.variation, sku: l.sku,
          enableStock: true, currentStock: null, taxRateId: l.taxRateId, unitId: null, unitName: '',
          allowDecimal: true, subUnits: [], defaultSellPrice: l.unitPrice, sellPriceIncTax: 0,
        },
        { quantity: l.quantityRemaining, maxQuantity: l.quantityRemaining, soLineId: l.id, unitPrice: l.unitPrice },
      );
    }
    setSelectedOrder('');
  };

  const save = useMutation({
    mutationFn: (body: SaveSellBody) => (editing ? updateSell(Number(id), body) : createSell(body)),
    onSuccess: (sell) => {
      toast.success(editing ? `Sale ${sell.refNo} updated` : `Sale ${sell.refNo} saved`);
      navigate('/sales');
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not save sale')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId) return toast.error('Select a customer');
    if (!locationId) return toast.error('Select a business location');
    if (form.lines.length === 0) return toast.error('Add at least one product');

    save.mutate({
      contact_id: Number(contactId),
      location_id: Number(locationId),
      ref_no: refNo.trim() || undefined,
      transaction_date: transactionDate,
      status: status === 'quotation' ? 'draft' : status,
      sub_status: status === 'quotation' ? 'quotation' : undefined,
      pay_term_number: payTermNumber ? Number(payTermNumber) : undefined,
      pay_term_type: payTermType || undefined,
      discount_type: form.discountType || undefined,
      discount_amount: Number(form.discountAmount) || 0,
      tax_rate_id: form.taxRateId ?? undefined,
      shipping_details: form.shippingDetails || undefined,
      shipping_charges: Number(form.shippingCharges) || 0,
      additional_expenses: form.additionalExpenses.filter((x) => x.name.trim() || Number(x.amount)).map((x) => ({ name: x.name, amount: Number(x.amount) || 0 })),
      additional_notes: additionalNotes || undefined,
      sales_order_ids: pulledOrderIds.length ? pulledOrderIds : undefined,
      sells: form.lines.map((l) => ({
        sell_line_id: l.sellLineId,
        so_line_id: l.soLineId,
        product_id: l.productId,
        variation_id: l.variationId,
        quantity: Number(l.quantity) || 0,
        sub_unit_id: l.subUnitId ?? undefined,
        unit_price: Number(l.unitPrice) || 0,
        line_discount_type: l.lineDiscountType || undefined,
        line_discount_amount: Number(l.lineDiscountAmount) || 0,
        tax_rate_id: l.taxRateId ?? undefined,
      })),
      payment: !editing && status === 'final' && Number(payNow) > 0 ? [{ amount: Number(payNow), method: payMethod, paid_on: transactionDate }] : undefined,
    });
  };

  if (metaLoading || (editing && existingLoading) || !meta) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }
  const due = Math.max(0, form.totals.finalTotal - (status === 'final' ? Number(payNow) || 0 : 0));

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={editing ? `Edit sale ${existing?.refNo ?? ''}` : 'Add sale'}
        description="A final sale issues stock; a draft or quotation does not."
        breadcrumbs={[{ label: 'Sell', to: '/sales' }, { label: editing ? 'Edit' : 'Add' }]}
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate('/sales')}>Cancel</Button>
            <Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? 'Saving…' : editing ? 'Update' : 'Save'}</Button>
          </div>
        }
      />

      <div className="space-y-4">
        <Card className="p-4">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div>
              <Label htmlFor="customer">Customer *</Label>
              <Select id="customer" value={contactId} onChange={(e) => onCustomerChange(e.target.value)} required>
                <option value="">Select customer</option>
                {meta.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              {customer?.address && <p className="mt-1 text-xs text-muted-foreground">{customer.address}</p>}
            </div>
            <div>
              <Label htmlFor="location">Business location *</Label>
              <Select id="location" value={locationId} onChange={(e) => setLocationId(e.target.value)} required disabled={editing}>
                <option value="">Select location</option>
                {meta.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="refNo">Invoice / reference no</Label>
              <Input id="refNo" value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Leave empty to auto-generate" />
            </div>
            <div>
              <Label htmlFor="date">Sale date *</Label>
              <Input id="date" type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as never)}>
                <option value="final">Final</option>
                <option value="draft">Draft</option>
                <option value="quotation">Quotation</option>
              </Select>
              {status !== 'final' && <p className="mt-1 text-xs text-muted-foreground">No stock is issued until it is final.</p>}
            </div>
            <div>
              <Label htmlFor="payterm">Pay term</Label>
              <div className="flex gap-2">
                <Input id="payterm" type="number" min="0" value={payTermNumber} onChange={(e) => setPayTermNumber(e.target.value)} className="w-24" />
                <Select value={payTermType} onChange={(e) => setPayTermType(e.target.value as never)} className="flex-1">
                  <option value="">—</option>
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </Select>
              </div>
            </div>
            {!editing && locationId && contactId && openOrders.length > 0 && (
              <div>
                <Label htmlFor="so">Invoice a sales order</Label>
                <Select id="so" value={selectedOrder} onChange={(e) => { const o = openOrders.find((x) => String(x.id) === e.target.value); if (o) pullOrder(o); }}>
                  <option value="">Select an open order…</option>
                  {openOrders.filter((o) => !pulledOrderIds.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.refNo} ({o.status})</option>)}
                </Select>
              </div>
            )}
          </div>
          {pulledOrderIds.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">Invoicing {pulledOrderIds.length} sales order(s). Saving marks those quantities as invoiced.</p>
          )}
        </Card>

        <Card className="space-y-4 p-4">
          <SellProductSearchBox locationId={locationId ? Number(locationId) : undefined} disabled={!locationId} onPick={(hit) => form.addLine(hit)} />
          <SellLinesTable lines={form.lines} meta={meta} onChange={form.updateLine} onRemove={form.removeLine} />
          <div className="flex justify-end gap-8 text-sm">
            <div><span className="text-muted-foreground">Total items: </span><span className="font-medium tabular-nums">{form.lines.length}</span></div>
            <div><span className="text-muted-foreground">Total quantity: </span><span className="font-medium tabular-nums">{form.totalQuantity}</span></div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="dtype">Order discount type</Label>
                <Select id="dtype" value={form.discountType} onChange={(e) => form.setDiscountType(e.target.value as never)}>
                  <option value="">None</option>
                  <option value="fixed">Fixed</option>
                  <option value="percentage">Percentage</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="damt">Discount amount</Label>
                <Input id="damt" type="number" step="0.0001" min="0" value={form.discountAmount} onChange={(e) => form.setDiscountAmount(e.target.value)} disabled={!form.discountType} />
              </div>
              <div>
                <Label htmlFor="otax">Order tax</Label>
                <Select id="otax" value={form.taxRateId ?? ''} onChange={(e) => form.setTaxRateId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">None</option>
                  {meta.taxRates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.amount}%)</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="ship">Shipping charges</Label>
                <Input id="ship" type="number" step="0.0001" min="0" value={form.shippingCharges} onChange={(e) => form.setShippingCharges(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="shipd">Shipping details</Label>
              <Input id="shipd" value={form.shippingDetails} onChange={(e) => form.setShippingDetails(e.target.value)} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Additional charges</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => form.setAdditionalExpenses([...form.additionalExpenses, { name: '', amount: '0' }])}>
                  <Plus className="h-4 w-4" />Add
                </Button>
              </div>
              {form.additionalExpenses.map((x, i) => (
                <div key={i} className="mb-2 flex gap-2">
                  <Input placeholder="Charge name" value={x.name} onChange={(e) => { const n = [...form.additionalExpenses]; n[i] = { ...n[i], name: e.target.value }; form.setAdditionalExpenses(n); }} />
                  <Input type="number" step="0.0001" min="0" className="w-32" value={x.amount} onChange={(e) => { const n = [...form.additionalExpenses]; n[i] = { ...n[i], amount: e.target.value }; form.setAdditionalExpenses(n); }} />
                  <Button type="button" variant="destructive" size="sm" onClick={() => form.setAdditionalExpenses(form.additionalExpenses.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <div>
              <Label htmlFor="notes">Sale note</Label>
              <Textarea id="notes" rows={2} value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} />
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <div className="space-y-1 text-sm">
              <Row label="Subtotal (incl. line tax)" value={formatMoney(form.totals.lineSubtotal)} />
              <Row label="Order discount" value={`(−) ${formatMoney(form.totals.discount)}`} />
              <Row label="Order tax" value={`(+) ${formatMoney(form.totals.taxAmount)}`} />
              <Row label="Shipping" value={`(+) ${formatMoney(Number(form.shippingCharges) || 0)}`} />
              <Row label="Additional charges" value={`(+) ${formatMoney(form.totals.additionalExpenseTotal)}`} />
              <div className="mt-2 border-t pt-2"><Row label="Total payable" value={formatMoney(form.totals.finalTotal)} strong /></div>
              <p className="pt-1 text-xs text-muted-foreground">Recomputed by the server on save — nothing here is trusted as the stored total.</p>
            </div>
            {!editing && status === 'final' && (
              <div className="space-y-3 border-t pt-4">
                <Label>Payment</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="payNow">Amount received now</Label>
                    <Input id="payNow" type="number" step="0.0001" min="0" value={payNow} onChange={(e) => setPayNow(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="payMethod">Payment method</Label>
                    <Select id="payMethod" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                      {meta.paymentMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </Select>
                  </div>
                </div>
                <Row label="Balance due" value={formatMoney(due)} strong danger={due > 0} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </form>
  );
}

function Row({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold' : ''} ${danger ? 'text-destructive' : ''}`}>{value}</span>
    </div>
  );
}
