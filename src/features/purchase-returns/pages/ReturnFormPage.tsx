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
import { getPurchaseMeta } from '@/features/purchases/purchases.api';
import { round4 } from '@/features/purchases/purchase.calc';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import {
  createReturn,
  getReturn,
  getReturnable,
  getReturnablePurchases,
  updateReturn,
  type ReturnableLines,
  type SaveReturnBody,
} from '../returns.api';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * A purchase return is always against a specific purchase: pick the supplier, pick one of their
 * purchases, and the form fills with that purchase's lines and the per-line cap. Return quantities
 * are entered against those caps — the server enforces the same cap, unlike GOURI.
 */
export function ReturnFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const { data: meta, isLoading: metaLoading } = useQuery({ queryKey: ['purchase-meta'], queryFn: getPurchaseMeta });
  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ['purchase-return', Number(id)],
    queryFn: () => getReturn(Number(id)),
    enabled: editing,
  });

  const [contactId, setContactId] = useState('');
  const [purchaseId, setPurchaseId] = useState('');
  const [refNo, setRefNo] = useState('');
  const [transactionDate, setTransactionDate] = useState(today());
  const [taxRateId, setTaxRateId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [returnable, setReturnable] = useState<ReturnableLines | null>(null);
  /** parentLineId → quantity string */
  const [qty, setQty] = useState<Record<number, string>>({});

  const { data: purchases = [] } = useQuery({
    queryKey: ['returnable-purchases', contactId],
    queryFn: () => getReturnablePurchases(Number(contactId)),
    enabled: Boolean(contactId) && !editing,
  });

  // When a purchase is chosen, pull its lines and the caps.
  const loadReturnable = useMutation({
    mutationFn: (pid: number) => getReturnable(pid, editing ? Number(id) : undefined),
    onSuccess: (data) => {
      setReturnable(data);
      setQty({});
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not load the purchase')),
  });

  // Rehydrate an edit: load the parent's returnable lines (excluding this return), then set qtys.
  useEffect(() => {
    if (!existing || !meta) return;
    setContactId(String(existing.contactId ?? ''));
    setPurchaseId(String(existing.purchaseId ?? ''));
    setRefNo(existing.refNo);
    setTransactionDate(existing.transactionDate.slice(0, 10));
    setTaxRateId(existing.taxRateId);
    setNotes(existing.additionalNotes);
    if (existing.purchaseId) {
      getReturnable(existing.purchaseId, existing.id).then((data) => {
        setReturnable(data);
        const q: Record<number, string> = {};
        for (const l of existing.lines) if (l.parentLineId) q[l.parentLineId] = String(l.quantity);
        setQty(q);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, meta]);

  const totals = useMemo(() => {
    const lines = returnable?.lines ?? [];
    const subtotal = lines.reduce((sum, l) => sum + (Number(qty[l.parentLineId]) || 0) * l.purchasePriceIncTax, 0);
    const pct = taxRateId ? (meta?.taxRates.find((t) => t.id === taxRateId)?.amount ?? 0) : 0;
    const tax = (pct / 100) * subtotal;
    return { subtotal: round4(subtotal), tax: round4(tax), total: round4(subtotal + tax) };
  }, [returnable, qty, taxRateId, meta]);

  const save = useMutation({
    mutationFn: (body: SaveReturnBody) => (editing ? updateReturn(Number(id), body) : createReturn(body)),
    onSuccess: (r) => {
      toast.success(editing ? `Return ${r.refNo} updated` : `Return ${r.refNo} saved`);
      navigate('/purchase-returns');
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not save return')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseId) return toast.error('Select the purchase being returned');
    const returns = (returnable?.lines ?? [])
      .map((l) => ({ parent_line_id: l.parentLineId, quantity: Number(qty[l.parentLineId]) || 0 }))
      .filter((r) => r.quantity > 0);
    if (returns.length === 0) return toast.error('Enter a return quantity on at least one line');

    save.mutate({
      purchase_id: Number(purchaseId),
      ref_no: refNo.trim() || undefined,
      transaction_date: transactionDate,
      tax_rate_id: taxRateId ?? undefined,
      additional_notes: notes || undefined,
      returns,
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
        title={editing ? `Edit return ${existing?.refNo ?? ''}` : 'Add purchase return'}
        description="Send goods back to a supplier. Stock is reduced only for a purchase that actually received it."
        breadcrumbs={[{ label: 'Purchases', to: '/purchase-returns' }, { label: editing ? 'Edit' : 'Add' }]}
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate('/purchase-returns')}>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="supplier">Supplier *</Label>
              <Select
                id="supplier"
                value={contactId}
                onChange={(e) => {
                  setContactId(e.target.value);
                  setPurchaseId('');
                  setReturnable(null);
                  setQty({});
                }}
                required
                disabled={editing}
              >
                <option value="">Select supplier</option>
                {meta.suppliers.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="purchase">Purchase *</Label>
              <Select
                id="purchase"
                value={purchaseId}
                onChange={(e) => {
                  setPurchaseId(e.target.value);
                  if (e.target.value) loadReturnable.mutate(Number(e.target.value));
                  else setReturnable(null);
                }}
                required
                disabled={editing || !contactId}
              >
                <option value="">Select purchase</option>
                {purchases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.refNo} — {p.returnable} returnable
                  </option>
                ))}
              </Select>
              {editing && existing?.parentPurchase && (
                <p className="mt-1 text-xs text-muted-foreground">Against {existing.parentPurchase.refNo}</p>
              )}
            </div>
            <div>
              <Label htmlFor="refNo">Reference no</Label>
              <Input id="refNo" value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Auto-generate" />
            </div>
            <div>
              <Label htmlFor="date">Return date *</Label>
              <Input id="date" type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required />
            </div>
          </div>
          {returnable && !returnable.purchase.postedStock && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              This purchase has not received stock (pending or unapproved), so this return records the
              document but moves no stock.
            </p>
          )}
        </Card>

        <Card className="space-y-4 p-4">
          {loadReturnable.isPending ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : !returnable ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              Pick a supplier and one of their purchases to load its lines.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-right">Purchased</th>
                    <th className="px-3 py-2 text-right" title="Sold, adjusted or already returned">
                      Unavailable
                    </th>
                    <th className="px-3 py-2 text-right">Returnable</th>
                    <th className="px-3 py-2 text-right">Unit cost</th>
                    <th className="px-3 py-2 text-right">Return qty</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {returnable.lines.map((l) => {
                    const q = Number(qty[l.parentLineId]) || 0;
                    const unavailable = round4(l.quantity - l.returnable - l.alreadyOnThisReturn);
                    return (
                      <tr key={l.parentLineId}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{l.product}</div>
                          <div className="text-xs text-muted-foreground">{l.sku}</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{unavailable}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.returnable}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(l.purchasePriceIncTax)}</td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="number"
                            min="0"
                            max={l.returnable}
                            step="0.0001"
                            value={qty[l.parentLineId] ?? ''}
                            disabled={l.returnable <= 0}
                            onChange={(e) => setQty((prev) => ({ ...prev, [l.parentLineId]: e.target.value }))}
                            className="h-9 w-24 text-right tabular-nums"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">
                          {formatMoney(q * l.purchasePriceIncTax)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <Label htmlFor="notes">Reason for return</Label>
              <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="tax">Return tax</Label>
                <Select
                  id="tax"
                  value={taxRateId ?? ''}
                  onChange={(e) => setTaxRateId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">None</option>
                  {meta.taxRates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.amount}%)
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1 rounded-lg border p-3 text-sm">
                <Row label="Return subtotal" value={formatMoney(totals.subtotal)} />
                <Row label="Tax" value={`(+) ${formatMoney(totals.tax)}`} />
                <div className="mt-1 border-t pt-1">
                  <Row label="Return total" value={formatMoney(totals.total)} strong />
                </div>
              </div>
            </div>
          </div>
        </Card>
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
