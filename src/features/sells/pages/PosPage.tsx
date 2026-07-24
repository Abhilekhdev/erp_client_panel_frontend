import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Calculator, Clock, Minus, PauseCircle, Plus, Scale, Trash2, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { useAppSelector } from '@/app/hooks';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import { round4 } from '../sell.calc';
import { SellProductSearchBox } from '../components/SellProductSearchBox';
import { PosProductGrid } from '../components/PosProductGrid';
import { PosSuspendedModal } from '../components/PosSuspendedModal';
import { PosRecentModal } from '../components/PosRecentModal';
import { PosAddCustomerModal } from '../components/PosAddCustomerModal';
import { PosReceiptModal } from '../components/PosReceiptModal';
import { PosWeighingScaleModal } from '../components/PosWeighingScaleModal';
import { PosCalculatorModal } from '../components/PosCalculatorModal';
import { PosRegisterOpenModal, PosRegisterDetailsModal, PosRegisterCloseModal } from '../components/PosRegisterModals';
import { getCurrentRegister } from '../cash-register.api';
import { isFunctionKey, matchShortcut } from '../pos-shortcuts';
import {
  createSell,
  getSell,
  getSellMeta,
  searchSellProducts,
  updateSell,
  type SaveSellBody,
  type SavePaymentBody,
  type SellDetail,
  type SellProductHit,
} from '../sells.api';
import { useSellForm, type SellLineRow } from '../useSellForm';

const today = () => new Date().toISOString().slice(0, 10);

/** One payment row in the multi-pay modal. Numeric fields are strings so half-typed input holds. */
interface PayRow {
  amount: string;
  method: string;
  accountId: string;
  paidOn: string;
  ref: string;
}
const emptyPay = (amount: string, method = 'cash'): PayRow => ({ amount, method, accountId: '', paidOn: today(), ref: '' });

/**
 * The point-of-sale screen — GOURI's `pos.create`. A fast one-page till: pre-selected walk-in
 * customer, barcode/name search that drops straight into the cart, +/- quantity steppers, and
 * express checkout buttons. Everything routes through the same `POST /sells` the Add-Sale form uses,
 * so the arithmetic and stock issue are identical; this is purely a faster shell over it.
 */
export function PosPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { has } = usePermissions();
  const canEditPrice = has('edit_product_price_from_pos_screen');
  const canEditDiscount = has('edit_product_discount_from_pos_screen');
  const businessName = useAppSelector((s) => s.auth.user?.business?.name ?? '');

  const { data: meta, isLoading } = useQuery({ queryKey: ['sell-meta'], queryFn: getSellMeta });

  const [contactId, setContactId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [priceGroupId, setPriceGroupId] = useState('');
  const [gridCategory, setGridCategory] = useState('');
  const [gridBrand, setGridBrand] = useState('');
  const [payModal, setPayModal] = useState<{ status: 'final'; label: string } | null>(null);
  // When a suspended bill is resumed we EDIT it (update) instead of creating a new one.
  const [editId, setEditId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<'suspended' | 'recent' | 'addCustomer' | 'weighing' | 'calculator' | 'registerOpen' | 'registerDetails' | 'registerClose' | null>(null);
  const [receipt, setReceipt] = useState<SellDetail | null>(null);

  // Is a cash register open? GOURI wants one open before selling; we surface it and prompt.
  const { data: register } = useQuery({ queryKey: ['register-current'], queryFn: getCurrentRegister });

  const form = useSellForm(meta);

  // Pre-select the single location and the walk-in default customer, exactly like GOURI's
  // set_default_customer() — so the operator can start scanning immediately.
  useEffect(() => {
    if (!meta) return;
    if (!locationId && meta.locations.length >= 1) setLocationId(String(meta.locations[0].id));
    if (!contactId && meta.defaultCustomerId != null) setContactId(String(meta.defaultCustomerId));
  }, [meta, locationId, contactId]);

  /** Empty the till back to a fresh bill (keeps the location + walk-in selection). */
  const resetTill = () => {
    form.lines.forEach((l) => form.removeLine(l.id));
    form.setDiscountType(''); form.setDiscountAmount('0'); form.setTaxRateId(null); form.setShippingCharges('0');
    setEditId(null); setPriceGroupId('');
    setPayModal(null);
    if (meta?.defaultCustomerId != null) setContactId(String(meta.defaultCustomerId));
  };

  const save = useMutation({
    // Resuming a suspended bill edits it in place; otherwise a new sale is created.
    mutationFn: (body: SaveSellBody) => (editId ? updateSell(editId, body) : createSell(body)),
    onSuccess: (sell) => {
      toast.success(sell.isSuspend ? `Bill ${sell.refNo} suspended` : `Sale ${sell.refNo} ${sell.isDraft ? 'saved' : 'completed'}`);
      qc.invalidateQueries({ queryKey: ['suspended-sells'] });
      qc.invalidateQueries({ queryKey: ['recent-sells'] });
      // A completed (final) sale pops the receipt; drafts/suspends just clear the till.
      if (!sell.isDraft) setReceipt(sell);
      resetTill();
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not complete the sale')),
  });

  const baseBody = (
    status: 'final' | 'draft',
    opts?: { subStatus?: 'quotation'; isSuspend?: boolean },
  ): Omit<SaveSellBody, 'payment'> => ({
    contact_id: Number(contactId),
    location_id: Number(locationId),
    transaction_date: today(),
    status,
    sub_status: opts?.subStatus,
    is_suspend: opts?.isSuspend ?? false,
    discount_type: form.discountType || undefined,
    discount_amount: Number(form.discountAmount) || 0,
    tax_rate_id: form.taxRateId ?? undefined,
    shipping_charges: Number(form.shippingCharges) || 0,
    sells: form.lines.map((l) => ({
      product_id: l.productId,
      variation_id: l.variationId,
      quantity: Number(l.quantity) || 0,
      sub_unit_id: l.subUnitId ?? undefined,
      unit_price: Number(l.unitPrice) || 0,
      line_discount_type: l.lineDiscountType || undefined,
      line_discount_amount: Number(l.lineDiscountAmount) || 0,
      tax_rate_id: l.taxRateId ?? undefined,
    })),
  });

  const guard = (): boolean => {
    if (!contactId) { toast.error('Select a customer'); return false; }
    if (!locationId) { toast.error('Select a business location'); return false; }
    if (form.lines.length === 0) { toast.error('Add at least one product'); return false; }
    return true;
  };

  /** Draft / Quotation — paperwork, no payment, no stock issue. */
  const saveDraft = (subStatus?: 'quotation') => {
    if (!guard()) return;
    save.mutate({ ...baseBody('draft', { subStatus }) });
  };

  /** Suspend — park the current bill as a draft to resume later (GOURI's Suspend). */
  const suspend = () => {
    if (!guard()) return;
    save.mutate({ ...baseBody('draft', { isSuspend: true }) });
  };

  /** Express checkout — one payment for the full payable, no modal. GOURI's express cash/card. */
  const expressCheckout = (method: string) => {
    if (!guard()) return;
    const total = form.totals.finalTotal;
    save.mutate({
      ...baseBody('final'),
      payment: total > 0 ? [{ amount: total, method, paid_on: today() }] : [],
    });
  };

  /** Credit sale — finalise and issue stock, but take no payment (the whole total falls due). */
  const creditSale = () => {
    if (!guard()) return;
    save.mutate({ ...baseBody('final'), payment: [] });
  };

  const openMultiPay = () => { if (guard()) setPayModal({ status: 'final', label: 'Multiple pay' }); };

  const finalizeWithPayments = (payments: SavePaymentBody[]) => {
    save.mutate({ ...baseBody('final'), payment: payments });
  };

  /** Resume a suspended bill — load it into the till so it can be finalised or re-parked. */
  const resume = useMutation({
    mutationFn: async (id: number) => {
      const sell = await getSell(id);
      const skus = sell.lines.map((l) => l.sku).filter(Boolean);
      const results = await Promise.all(skus.map((sku) => searchSellProducts({ search: sku, location_id: sell.locationId }).catch(() => [])));
      const hits = new Map<number, SellProductHit>();
      for (const list of results) for (const h of list) hits.set(h.variationId, h);
      return { sell, hits };
    },
    onSuccess: ({ sell, hits }) => {
      setEditId(sell.id);
      setContactId(String(sell.contactId ?? ''));
      setLocationId(String(sell.locationId));
      form.loadFrom(sell, hits);
      setDialog(null);
      toast.success(`Resumed ${sell.refNo}`);
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not resume the bill')),
  });

  /** Show a receipt for any past sale (from Recent Transactions). */
  const showReceipt = useMutation({
    mutationFn: (id: number) => getSell(id),
    onSuccess: (sell) => { setDialog(null); setReceipt(sell); },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not load the receipt')),
  });

  /** Cancel — empty the till without saving (GOURI's red Cancel button). */
  const clearCart = () => {
    if (form.lines.length && !window.confirm('Clear the cart?')) return;
    form.lines.forEach((l) => form.removeLine(l.id));
    form.setDiscountType(''); form.setDiscountAmount('0'); form.setTaxRateId(null); form.setShippingCharges('0');
  };

  // POS keyboard shortcuts (GOURI's Mousetrap bindings). A ref holds the latest handler so the
  // global listener binds once but always sees current cart/customer state.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    if (!meta || save.isPending) return;
    const sc = meta.settings.keyboardShortcuts ?? {};
    const el = e.target as HTMLElement | null;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName ?? '');
    const focus = (id: string) => document.getElementById(id)?.focus();
    const fire = (combo: string | undefined, fn: () => void): boolean => {
      if (!matchShortcut(e, combo)) return false;
      if (typing && !isFunctionKey(combo)) return false; // don't hijack typing with letter combos
      e.preventDefault();
      fn();
      return true;
    };
    if (fire(sc.add_new_product, () => focus('pos-search'))) return;
    if (fire(sc.express_checkout, () => expressCheckout('cash'))) return;
    if (fire(sc.pay_n_checkout, () => openMultiPay())) return;
    if (fire(sc.draft, () => saveDraft())) return;
    if (fire(sc.cancel, () => clearCart())) return;
    if (fire(sc.edit_discount, () => focus('pos-damt'))) return;
    if (fire(sc.edit_order_tax, () => focus('pos-otax'))) return;
    if (meta.settings.weighingScale && fire(sc.weighing_scale, () => setDialog('weighing'))) return;
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  if (isLoading || !meta) return <div className="flex justify-center py-20"><Spinner /></div>;

  const loc = locationId ? Number(locationId) : undefined;
  const pg = priceGroupId ? Number(priceGroupId) : undefined;

  return (
    // GOURI's POS is a full-page two-column shell: the bill on the left, the product wall on the right.
    // Fills the full-screen PosLayout main (no sidebar/header), so both columns get the whole viewport.
    // `min-h-0` on every flex level is what lets the cart + product wall scroll INTERNALLY instead of
    // pushing the whole page into a scroll (the responsiveness bug GOURI avoids the same way).
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0 lg:flex-row">
      {/* ── Left: the bill ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:min-h-0 lg:overflow-hidden">
        {/* Toolbar — POS-wide actions (GOURI's top-right icons) */}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">Point of Sale</h1>
          {editId && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              Resumed suspended bill — finalising updates it
            </span>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            {register?.open ? (
              <>
                <Button type="button" variant="outline" size="sm" title="Register details" onClick={() => setDialog('registerDetails')}><Briefcase className="h-4 w-4" />Register</Button>
                <Button type="button" variant="outline" size="sm" title="Close register" onClick={() => setDialog('registerClose')}>Close reg.</Button>
              </>
            ) : (
              <Button type="button" variant="outline" size="sm" className="border-amber-500/50 text-amber-700 dark:text-amber-400" onClick={() => setDialog('registerOpen')}><Briefcase className="h-4 w-4" />Open register</Button>
            )}
            {meta.settings.weighingScale && (
              <Button type="button" variant="outline" size="sm" title="Weighing scale" onClick={() => setDialog('weighing')}><Scale className="h-4 w-4" /></Button>
            )}
            <Button type="button" variant="outline" size="sm" title="Calculator" onClick={() => setDialog('calculator')}><Calculator className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setDialog('suspended')}><PauseCircle className="h-4 w-4" />Suspended</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setDialog('recent')}><Clock className="h-4 w-4" />Recent</Button>
          </div>
        </div>
        {!register?.open && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
            No cash register is open — sales won't be tracked in a register drawer.{' '}
            <button type="button" className="font-medium text-amber-700 underline dark:text-amber-400" onClick={() => setDialog('registerOpen')}>Open one</button>.
          </div>
        )}

        {/* Top bar — location, customer, price group, product search */}
        <Card className="p-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <Label htmlFor="pos-loc">Location *</Label>
              <Select id="pos-loc" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">Select location</option>
                {meta.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="pos-cust">Customer *</Label>
              <div className="flex gap-2">
                <Select id="pos-cust" value={contactId} onChange={(e) => setContactId(e.target.value)} className="flex-1">
                  <option value="">Select customer</option>
                  {meta.customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.isDefault ? ' (walk-in)' : ''}</option>)}
                </Select>
                <Button type="button" variant="outline" size="sm" title="Add customer" className="shrink-0 px-2" onClick={() => setDialog('addCustomer')}><UserPlus className="h-4 w-4" /></Button>
              </div>
            </div>
            {meta.priceGroups.length > 0 && (
              <div>
                <Label htmlFor="pos-pg">Price group</Label>
                <Select id="pos-pg" value={priceGroupId} onChange={(e) => setPriceGroupId(e.target.value)}>
                  <option value="">Default selling price</option>
                  {meta.priceGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </Select>
              </div>
            )}
            <div className={meta.priceGroups.length > 0 ? '' : 'md:col-span-1'}>
              <Label>Product</Label>
              <SellProductSearchBox
                inputId="pos-search"
                locationId={loc}
                priceGroupId={pg}
                disabled={!locationId}
                onPick={(hit) => form.addLine(hit)}
              />
            </div>
          </div>
        </Card>

        {/* Cart — scrolls inside its own box; the top bar, totals and action bar stay pinned. */}
        <Card className="min-h-[8rem] flex-1 overflow-auto p-0 lg:min-h-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="sticky top-0 z-10 bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-center w-40">Quantity</th>
                <th className="px-3 py-2 text-right w-28">Price (inc. tax)</th>
                <th className="px-3 py-2 text-right w-28">Subtotal</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {form.lines.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-16 text-center text-muted-foreground">Scan, search, or tap a product to begin.</td></tr>
              )}
              {form.lines.map((l) => (
                <CartRow
                  key={l.id}
                  line={l}
                  canEditPrice={canEditPrice}
                  canEditDiscount={canEditDiscount}
                  onChange={(patch) => form.updateLine(l.id, patch)}
                  onRemove={() => form.removeLine(l.id)}
                />
              ))}
            </tbody>
          </table>
        </Card>

        {/* Totals + adjustments */}
        <Card className="p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="pos-dtype" className="w-20 shrink-0">Discount</Label>
                <Select id="pos-dtype" value={form.discountType} onChange={(e) => form.setDiscountType(e.target.value as never)} className="w-28">
                  <option value="">None</option>
                  <option value="fixed">Fixed</option>
                  <option value="percentage">%</option>
                </Select>
                <Input id="pos-damt" type="number" step="0.0001" min="0" value={form.discountAmount} onChange={(e) => form.setDiscountAmount(e.target.value)} disabled={!form.discountType} />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="pos-otax" className="w-20 shrink-0">Order tax</Label>
                <Select id="pos-otax" value={form.taxRateId ?? ''} onChange={(e) => form.setTaxRateId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">None</option>
                  {meta.taxRates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.amount}%)</option>)}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="pos-ship" className="w-20 shrink-0">Shipping</Label>
                <Input id="pos-ship" type="number" step="0.0001" min="0" value={form.shippingCharges} onChange={(e) => form.setShippingCharges(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <Row label="Items / Qty" value={`${form.lines.length} / ${form.totalQuantity}`} />
              <Row label="Subtotal (inc. tax)" value={formatMoney(form.totals.lineSubtotal)} />
              <Row label="Discount" value={`(−) ${formatMoney(form.totals.discount)}`} />
              <Row label="Order tax" value={`(+) ${formatMoney(form.totals.taxAmount)}`} />
              <Row label="Shipping" value={`(+) ${formatMoney(Number(form.shippingCharges) || 0)}`} />
              <div className="mt-1 border-t pt-1"><Row label="Total payable" value={formatMoney(form.totals.finalTotal)} strong /></div>
            </div>
          </div>
        </Card>

        {/* Action bar — GOURI's POS footer buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={save.isPending} onClick={() => saveDraft()}>Draft</Button>
          <Button type="button" variant="outline" size="sm" disabled={save.isPending} onClick={() => saveDraft('quotation')}>Quote</Button>
          <Button type="button" variant="outline" size="sm" disabled={save.isPending} onClick={suspend}>Suspend</Button>
          <Button type="button" variant="outline" size="sm" disabled={save.isPending} onClick={creditSale}>Credit sale</Button>
          <Button type="button" variant="outline" size="sm" disabled={save.isPending} onClick={() => expressCheckout('card')}>Card</Button>
          <Button type="button" variant="outline" size="sm" disabled={save.isPending} onClick={openMultiPay}>Multiple pay</Button>
          <Button type="button" size="sm" disabled={save.isPending} onClick={() => expressCheckout('cash')}>{save.isPending ? 'Saving…' : 'Cash'}</Button>
          <Button type="button" variant="destructive" size="sm" disabled={save.isPending} onClick={clearCart}>Cancel</Button>
          <div className="ml-auto rounded-lg bg-primary px-4 py-2 text-primary-foreground">
            <span className="text-xs opacity-80">Total payable</span>{' '}
            <span className="text-lg font-bold tabular-nums">{formatMoney(form.totals.finalTotal)}</span>
          </div>
        </div>
      </div>

      {/* ── Right: the product wall (scrolls internally) ── */}
      <Card className="flex min-h-[24rem] flex-col overflow-hidden p-0 lg:h-full lg:min-h-0 lg:w-[42%] lg:min-w-[22rem]">
        <PosProductGrid
          meta={meta}
          locationId={loc}
          priceGroupId={pg}
          category={gridCategory}
          brand={gridBrand}
          onCategory={setGridCategory}
          onBrand={setGridBrand}
          onPick={(hit) => form.addLine(hit)}
        />
      </Card>

      {payModal && (
        <PosPaymentModal
          total={form.totals.finalTotal}
          methods={meta.paymentMethods}
          pending={save.isPending}
          onClose={() => setPayModal(null)}
          onConfirm={finalizeWithPayments}
        />
      )}

      {dialog === 'suspended' && (
        <PosSuspendedModal locationId={loc} onClose={() => setDialog(null)} onResume={(id) => resume.mutate(id)} />
      )}
      {dialog === 'recent' && (
        <PosRecentModal locationId={loc} onClose={() => setDialog(null)} onReceipt={(id) => showReceipt.mutate(id)} />
      )}
      {dialog === 'addCustomer' && (
        <PosAddCustomerModal
          onClose={() => setDialog(null)}
          onCreated={(id) => {
            // Refresh the customer dropdown, then pre-select the newcomer.
            qc.invalidateQueries({ queryKey: ['sell-meta'] }).then(() => setContactId(String(id)));
            setDialog(null);
          }}
        />
      )}
      {dialog === 'weighing' && meta.settings.weighingScale && (
        <PosWeighingScaleModal
          scale={meta.settings.weighingScale}
          locationId={loc}
          priceGroupId={pg}
          onClose={() => setDialog(null)}
          onResolved={(hit, qty) => form.addLine(hit, { quantity: qty })}
        />
      )}
      {dialog === 'calculator' && <PosCalculatorModal onClose={() => setDialog(null)} />}
      {dialog === 'registerOpen' && (
        <PosRegisterOpenModal
          locations={meta.locations}
          defaultLocationId={loc}
          onClose={() => setDialog(null)}
          onOpened={() => { qc.invalidateQueries({ queryKey: ['register-current'] }); setDialog(null); }}
        />
      )}
      {dialog === 'registerDetails' && <PosRegisterDetailsModal onClose={() => setDialog(null)} />}
      {dialog === 'registerClose' && (
        <PosRegisterCloseModal
          onClose={() => setDialog(null)}
          onClosed={() => { qc.invalidateQueries({ queryKey: ['register-current'] }); setDialog(null); }}
        />
      )}
      {receipt && (
        <PosReceiptModal
          sell={receipt}
          businessName={businessName}
          onClose={() => setReceipt(null)}
          onNewSale={() => setReceipt(null)}
        />
      )}
    </div>
  );
}

/** A single cart line — name, +/- quantity stepper, editable inc-tax price, subtotal. */
function CartRow({
  line, canEditPrice, canEditDiscount, onChange, onRemove,
}: {
  line: SellLineRow;
  canEditPrice: boolean;
  canEditDiscount: boolean;
  onChange: (patch: Partial<SellLineRow>) => void;
  onRemove: () => void;
}) {
  const qty = Number(line.quantity) || 0;
  const step = (delta: number) => {
    const next = Math.max(line.allowDecimal ? 0 : 1, round4(qty + delta));
    onChange({ quantity: String(next) });
  };
  return (
    <tr>
      <td className="px-3 py-2">
        <div className="font-medium">{line.name}{line.variation ? ` · ${line.variation}` : ''}</div>
        <div className="text-xs text-muted-foreground">{line.sku}{line.enableStock && line.currentStock != null ? ` · Stock: ${line.currentStock} ${line.unitName}` : ''}</div>
        {canEditDiscount && (
          <div className="mt-1 flex items-center gap-1">
            <Select value={line.lineDiscountType} onChange={(e) => onChange({ lineDiscountType: e.target.value as never })} className="h-7 w-20 text-xs">
              <option value="">No disc.</option>
              <option value="fixed">Fixed</option>
              <option value="percentage">%</option>
            </Select>
            <Input
              type="number" step="0.0001" min="0" value={line.lineDiscountAmount}
              onChange={(e) => onChange({ lineDiscountAmount: e.target.value })}
              disabled={!line.lineDiscountType} className="h-7 w-24 text-xs"
            />
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-center gap-1">
          <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => step(-1)}><Minus className="h-3 w-3" /></Button>
          <Input
            value={line.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
            className="h-7 w-14 text-center"
            inputMode="decimal"
          />
          <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => step(1)}><Plus className="h-3 w-3" /></Button>
        </div>
        {/* Sub-unit picker (GOURI's "Each" dropdown) — only when the product has base+sub units. */}
        {line.subUnits.length > 0 && (
          <Select
            value={line.subUnitId ?? ''}
            onChange={(e) => onChange({ subUnitId: e.target.value ? Number(e.target.value) : null })}
            className="mt-1 h-7 w-full text-xs"
          >
            <option value="">{line.unitName || 'Each'}</option>
            {line.subUnits.map((u) => <option key={u.id} value={u.id}>{u.shortName || u.name}</option>)}
          </Select>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {canEditPrice ? (
          <Input type="number" step="0.0001" min="0" value={line.unitPrice} onChange={(e) => onChange({ unitPrice: e.target.value })} className="h-7 w-28 text-right" />
        ) : (
          <span className="tabular-nums">{formatMoney(line.calc.unitPriceIncTax)}</span>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums font-medium">{formatMoney(line.calc.lineTotal)}</td>
      <td className="px-2 py-2 text-right">
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive" title="Remove"><X className="h-4 w-4" /></button>
      </td>
    </tr>
  );
}

/** Multi-line payment modal with change-return, GOURI's `#modal_payment`. */
function PosPaymentModal({
  total, methods, pending, onClose, onConfirm,
}: {
  total: number;
  methods: { value: string; label: string }[];
  pending: boolean;
  onClose: () => void;
  onConfirm: (payments: SavePaymentBody[]) => void;
}) {
  const [rows, setRows] = useState<PayRow[]>([emptyPay(String(round4(total)))]);

  const paid = useMemo(() => round4(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)), [rows]);
  const change = round4(Math.max(0, paid - total));
  const due = round4(Math.max(0, total - paid));

  const patch = (i: number, p: Partial<PayRow>) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...p } : r)));

  const confirm = () => {
    // The server refuses overpayment, so cap the total sent to the payable and treat the surplus as
    // change handed back (GOURI stores it as a payment line with is_return=1; here it just isn't sent).
    let remaining = total;
    const payments: SavePaymentBody[] = [];
    for (const r of rows) {
      const amt = Number(r.amount) || 0;
      if (amt <= 0) continue;
      const applied = round4(Math.min(amt, remaining));
      if (applied <= 0) break;
      payments.push({
        amount: applied,
        method: r.method,
        account_id: r.accountId ? Number(r.accountId) : undefined,
        paid_on: r.paidOn,
        transaction_no: r.ref || undefined,
      });
      remaining = round4(remaining - applied);
    }
    onConfirm(payments);
  };

  return (
    <Modal open onClose={onClose} title="Payment" description={`Total payable ${formatMoney(total)}`} className="max-w-2xl">
      <div className="space-y-4">
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end rounded-lg border p-3">
              <div>
                <Label>Amount</Label>
                <Input type="number" step="0.0001" min="0" value={r.amount} onChange={(e) => patch(i, { amount: e.target.value })} />
              </div>
              <div>
                <Label>Method</Label>
                <Select value={r.method} onChange={(e) => patch(i, { method: e.target.value })}>
                  {methods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Select>
              </div>
              <div>
                <Label>Reference</Label>
                <Input value={r.ref} onChange={(e) => patch(i, { ref: e.target.value })} placeholder="Optional" />
              </div>
              <Button type="button" variant="destructive" size="sm" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, emptyPay('0')])}><Plus className="h-4 w-4" />Add payment line</Button>
        </div>

        <div className="space-y-1 border-t pt-3 text-sm">
          <Row label="Total payable" value={formatMoney(total)} />
          <Row label="Total paying" value={formatMoney(paid)} />
          <Row label="Change return" value={formatMoney(change)} strong={change > 0} />
          <Row label="Balance due" value={formatMoney(due)} strong={due > 0} danger={due > 0} />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="button" size="sm" disabled={pending || paid <= 0} onClick={confirm}>{pending ? 'Saving…' : 'Finalize'}</Button>
        </div>
      </div>
    </Modal>
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
