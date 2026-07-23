import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { getSellMeta } from '@/features/sells/sells.api';
import { round4 } from '@/features/sells/sell.calc';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import { createSellReturn, getReturnable, getReturnableSells, type ReturnableLines, type SaveSellReturnBody } from '../returns.api';

const today = () => new Date().toISOString().slice(0, 10);

/** A sell return is always against a specific sale: pick the customer, pick a sale, enter return qtys. */
export function SellReturnFormPage() {


  const navigate = useNavigate();
  const toast = useToast();

  const { data: meta, isLoading: metaLoading } = useQuery({ queryKey: ['sell-meta'], queryFn: getSellMeta });
  const [contactId, setContactId] = useState('');
  const [sellId, setSellId] = useState('');
  const [refNo, setRefNo] = useState('');
  const [transactionDate, setTransactionDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [returnable, setReturnable] = useState<ReturnableLines | null>(null);
  const [qty, setQty] = useState<Record<number, string>>({});

  const { data: sells = [] } = useQuery({ queryKey: ['returnable-sells', contactId], queryFn: () => getReturnableSells(Number(contactId)), enabled: Boolean(contactId) });
  const load = useMutation({ mutationFn: (sid: number) => getReturnable(sid), onSuccess: (data) => { setReturnable(data); setQty({}); }, onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not load the sale')) });

  const totals = useMemo(() => {
    const lines = returnable?.lines ?? [];
    const subtotal = lines.reduce((s, l) => s + (Number(qty[l.parentLineId]) || 0) * l.unitPriceIncTax, 0);
    return { total: round4(subtotal) };
  }, [returnable, qty]);

  const save = useMutation({
    mutationFn: (body: SaveSellReturnBody) => createSellReturn(body),
    onSuccess: (r) => { toast.success(`Return ${r.refNo} saved`); navigate('/sell-returns'); },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not save return')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellId) return toast.error('Select the sale being returned');
    const returns = (returnable?.lines ?? []).map((l) => ({ parent_line_id: l.parentLineId, quantity: Number(qty[l.parentLineId]) || 0 })).filter((r) => r.quantity > 0);
    if (returns.length === 0) return toast.error('Enter a return quantity on at least one line');
    save.mutate({ sell_id: Number(sellId), ref_no: refNo.trim() || undefined, transaction_date: transactionDate, additional_notes: notes || undefined, returns });
  };

  useEffect(() => {}, []);
  if (metaLoading || !meta) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <form onSubmit={submit}>
      <PageHeader title="Add sell return" description="Take goods back from a customer. Stock is restored for a sale that actually issued it."
        breadcrumbs={[{ label: 'Sell', to: '/sell-returns' }, { label: 'Add' }]}
        actions={<div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => navigate('/sell-returns')}>Cancel</Button><Button type="submit" size="sm" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button></div>} />
      <div className="space-y-4">
        <Card className="p-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div><Label htmlFor="customer">Customer *</Label><Select id="customer" value={contactId} onChange={(e) => { setContactId(e.target.value); setSellId(''); setReturnable(null); setQty({}); }} required><option value="">Select customer</option>{meta.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
            <div><Label htmlFor="sale">Sale *</Label><Select id="sale" value={sellId} onChange={(e) => { setSellId(e.target.value); if (e.target.value) load.mutate(Number(e.target.value)); else setReturnable(null); }} required disabled={!contactId}><option value="">Select sale</option>{sells.map((sl) => <option key={sl.id} value={sl.id}>{sl.refNo} — {sl.returnable} returnable</option>)}</Select></div>
            <div><Label htmlFor="refNo">Reference no</Label><Input id="refNo" value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Auto-generate" /></div>
            <div><Label htmlFor="date">Return date *</Label><Input id="date" type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required /></div>
          </div>
        </Card>
        <Card className="space-y-4 p-4">
          {load.isPending ? <div className="flex justify-center py-8"><Spinner /></div> : !returnable ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">Pick a customer and one of their sales to load its lines.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-right">Sold</th><th className="px-3 py-2 text-right">Returnable</th><th className="px-3 py-2 text-right">Unit price</th><th className="px-3 py-2 text-right">Return qty</th><th className="px-3 py-2 text-right">Subtotal</th></tr></thead>
                <tbody className="divide-y">
                  {returnable.lines.map((l) => {
                    const q = Number(qty[l.parentLineId]) || 0;
                    return (
                      <tr key={l.parentLineId}>
                        <td className="px-3 py-2 font-medium">{l.product}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.returnable}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(l.unitPriceIncTax)}</td>
                        <td className="px-3 py-2 text-right"><Input type="number" min="0" max={l.returnable} step="0.0001" value={qty[l.parentLineId] ?? ''} disabled={l.returnable <= 0} onChange={(e) => setQty((prev) => ({ ...prev, [l.parentLineId]: e.target.value }))} className="h-9 w-24 text-right tabular-nums" placeholder="0" /></td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">{formatMoney(q * l.unitPriceIncTax)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <div><Label htmlFor="notes">Reason for return</Label><Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <div className="space-y-1 rounded-lg border p-3 text-sm"><div className="flex justify-between font-semibold"><span>Return total</span><span className="tabular-nums">{formatMoney(totals.total)}</span></div></div>
          </div>
        </Card>
      </div>
    </form>
  );
}
