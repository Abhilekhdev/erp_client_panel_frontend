import { useMutation, useQuery } from '@tanstack/react-query';
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
import { SellLinesTable } from '@/features/sells/components/SellLinesTable';
import { SellProductSearchBox } from '@/features/sells/components/SellProductSearchBox';
import { getSellMeta, searchSellProducts, type SellMeta, type SellProductHit } from '@/features/sells/sells.api';
import { useSellForm } from '@/features/sells/useSellForm';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import { createSalesOrder, getSalesOrder, updateSalesOrder, type SaveSalesOrderBody } from '../orders.api';

const today = () => new Date().toISOString().slice(0, 10);

/** Sales order = a priced sell without the stock or payment. Reuses the sell form building blocks. */
export function SalesOrderFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const { data: baseMeta, isLoading: metaLoading } = useQuery({ queryKey: ['sell-meta'], queryFn: getSellMeta });
  const meta: SellMeta | undefined = useMemo(() => baseMeta && { ...baseMeta, settings: { ...baseMeta.settings, enableSubUnits: false } }, [baseMeta]);
  const { data: existing, isLoading: existingLoading } = useQuery({ queryKey: ['sales-order', Number(id)], queryFn: () => getSalesOrder(Number(id)), enabled: editing });

  const [contactId, setContactId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [refNo, setRefNo] = useState('');
  const [transactionDate, setTransactionDate] = useState(today());
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const form = useSellForm(meta);

  useEffect(() => { if (!editing && meta?.locations.length === 1) setLocationId(String(meta.locations[0].id)); }, [meta, editing]);
  useEffect(() => {
    if (!existing || !meta) return;
    setContactId(String(existing.contactId ?? ''));
    setLocationId(String(existing.locationId));
    setRefNo(existing.refNo);
    setTransactionDate(existing.transactionDate.slice(0, 10));
    setDeliveryDate(existing.deliveryDate ? existing.deliveryDate.slice(0, 10) : '');
    setNotes(existing.additionalNotes);
    const skus = existing.lines.map((l) => l.sku).filter(Boolean);
    Promise.all(skus.map((sku) => searchSellProducts({ search: sku, location_id: existing.locationId }).catch(() => []))).then((results) => {
      const hits = new Map<number, SellProductHit>();
      for (const list of results) for (const h of list) hits.set(h.variationId, h);
      form.loadFrom(
        {
          lines: existing.lines,
          discountType: existing.discountType,
          discountAmount: existing.discountAmount,
          taxRateId: existing.taxRateId,
          shippingDetails: existing.shippingDetails,
          shippingCharges: existing.shippingCharges,
          additionalExpenses: existing.additionalExpenses,
        } as unknown as Parameters<typeof form.loadFrom>[0],
        hits,
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, meta]);

  const customer = meta?.customers.find((c) => String(c.id) === contactId);
  const save = useMutation({
    mutationFn: (body: SaveSalesOrderBody) => (editing ? updateSalesOrder(Number(id), body) : createSalesOrder(body)),
    onSuccess: (o) => { toast.success(editing ? `Order ${o.refNo} updated` : `Order ${o.refNo} saved`); navigate('/sales-orders'); },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not save sales order')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId) return toast.error('Select a customer');
    if (!locationId) return toast.error('Select a business location');
    if (form.lines.length === 0) return toast.error('Add at least one product');
    save.mutate({
      contact_id: Number(contactId), location_id: Number(locationId), ref_no: refNo.trim() || undefined,
      transaction_date: transactionDate, delivery_date: deliveryDate || undefined,
      discount_type: form.discountType || undefined, discount_amount: Number(form.discountAmount) || 0, tax_rate_id: form.taxRateId ?? undefined,
      shipping_details: form.shippingDetails || undefined, shipping_charges: Number(form.shippingCharges) || 0,
      additional_expenses: form.additionalExpenses.filter((x) => x.name.trim() || Number(x.amount)).map((x) => ({ name: x.name, amount: Number(x.amount) || 0 })),
      additional_notes: notes || undefined,
      sells: form.lines.map((l) => ({ sell_line_id: l.sellLineId, product_id: l.productId, variation_id: l.variationId, quantity: Number(l.quantity) || 0, unit_price: Number(l.unitPrice) || 0, line_discount_type: l.lineDiscountType || undefined, line_discount_amount: Number(l.lineDiscountAmount) || 0, tax_rate_id: l.taxRateId ?? undefined })),
    });
  };

  if (metaLoading || (editing && existingLoading) || !meta) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <form onSubmit={submit}>
      <PageHeader title={editing ? `Edit order ${existing?.refNo ?? ''}` : 'Add sales order'} description="A customer's commitment. It does not move stock — invoicing it as a sale does."
        breadcrumbs={[{ label: 'Sell', to: '/sales-orders' }, { label: editing ? 'Edit' : 'Add' }]}
        actions={<div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => navigate('/sales-orders')}>Cancel</Button><Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? 'Saving…' : editing ? 'Update' : 'Save'}</Button></div>} />
      <div className="space-y-4">
        <Card className="p-4">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div><Label htmlFor="customer">Customer *</Label><Select id="customer" value={contactId} onChange={(e) => setContactId(e.target.value)} required><option value="">Select customer</option>{meta.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>{customer?.address && <p className="mt-1 text-xs text-muted-foreground">{customer.address}</p>}</div>
            <div><Label htmlFor="location">Business location *</Label><Select id="location" value={locationId} onChange={(e) => setLocationId(e.target.value)} required disabled={editing}><option value="">Select location</option>{meta.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></div>
            <div><Label htmlFor="refNo">Reference no</Label><Input id="refNo" value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Leave empty to auto-generate" /></div>
            <div><Label htmlFor="date">Order date *</Label><Input id="date" type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required /></div>
            <div><Label htmlFor="delivery">Delivery date</Label><Input id="delivery" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></div>
          </div>
        </Card>
        <Card className="space-y-4 p-4">
          <SellProductSearchBox locationId={locationId ? Number(locationId) : undefined} disabled={!locationId} onPick={(hit) => form.addLine(hit)} />
          <SellLinesTable lines={form.lines} meta={meta} onChange={form.updateLine} onRemove={form.removeLine} />
          <div className="flex justify-end gap-8 text-sm"><div><span className="text-muted-foreground">Total items: </span><span className="font-medium tabular-nums">{form.lines.length}</span></div><div><span className="text-muted-foreground">Order total: </span><span className="font-semibold tabular-nums">{formatMoney(form.totals.finalTotal)}</span></div></div>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="dt">Discount type</Label><Select id="dt" value={form.discountType} onChange={(e) => form.setDiscountType(e.target.value as never)}><option value="">None</option><option value="fixed">Fixed</option><option value="percentage">Percentage</option></Select></div>
              <div><Label htmlFor="da">Discount amount</Label><Input id="da" type="number" step="0.0001" min="0" value={form.discountAmount} onChange={(e) => form.setDiscountAmount(e.target.value)} disabled={!form.discountType} /></div>
              <div><Label htmlFor="ot">Order tax</Label><Select id="ot" value={form.taxRateId ?? ''} onChange={(e) => form.setTaxRateId(e.target.value ? Number(e.target.value) : null)}><option value="">None</option>{meta.taxRates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.amount}%)</option>)}</Select></div>
              <div><Label htmlFor="sc">Shipping charges</Label><Input id="sc" type="number" step="0.0001" min="0" value={form.shippingCharges} onChange={(e) => form.setShippingCharges(e.target.value)} /></div>
            </div>
            <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </Card>
          <Card className="space-y-1 p-4 text-sm">
            <Row label="Subtotal (incl. line tax)" value={formatMoney(form.totals.lineSubtotal)} />
            <Row label="Order discount" value={`(−) ${formatMoney(form.totals.discount)}`} />
            <Row label="Order tax" value={`(+) ${formatMoney(form.totals.taxAmount)}`} />
            <Row label="Shipping" value={`(+) ${formatMoney(Number(form.shippingCharges) || 0)}`} />
            <div className="mt-2 border-t pt-2"><Row label="Order total" value={formatMoney(form.totals.finalTotal)} strong /></div>
          </Card>
        </div>
      </div>
    </form>
  );
}
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex justify-between gap-3 py-0.5"><span className="text-muted-foreground">{label}</span><span className={`tabular-nums ${strong ? 'font-semibold' : ''}`}>{value}</span></div>;
}
