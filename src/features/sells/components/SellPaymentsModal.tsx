import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import { PaymentMethodFields } from '@/components/common/PaymentMethodFields';
import { addSellPayment, deleteSellPayment, getSell, getSellMeta, type SavePaymentBody } from '../sells.api';

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
const EMPTY: SavePaymentBody = { amount: 0, method: 'cash', paid_on: today(), note: '' };

export function SellPaymentsModal({ id, onClose, onChanged }: { id: number | null; onClose: () => void; onChanged?: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { has } = usePermissions();
  const canPay = has('sell.payments');
  const canDelete = has('delete_sell_payment');
  const [form, setForm] = useState<SavePaymentBody>(EMPTY);
  const [adding, setAdding] = useState(false);

  const { data: meta } = useQuery({ queryKey: ['sell-meta'], queryFn: getSellMeta });
  const { data: p, isLoading } = useQuery({ queryKey: ['sell', id], queryFn: () => getSell(id as number), enabled: id != null });

  useEffect(() => {
    if (p) setForm({ ...EMPTY, amount: Math.max(0, p.due), paid_on: today() });
    setAdding(false);
  }, [p?.id, p?.due]);

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['sell', id] }); onChanged?.(); };
  const add = useMutation({
    mutationFn: (body: SavePaymentBody) => addSellPayment(id as number, body),
    onSuccess: () => { toast.success('Payment recorded'); setAdding(false); invalidate(); },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not record payment')),
  });
  const remove = useMutation({
    mutationFn: (pid: number) => deleteSellPayment(pid),
    onSuccess: () => { toast.success('Payment deleted'); invalidate(); },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not delete payment')),
  });

  return (
    <Modal open={id != null} onClose={onClose} title={p ? `Payments — ${p.refNo}` : 'Payments'} description={p ? `${p.customer?.name ?? ''} · ${p.location}` : undefined} className="max-w-3xl">
      {isLoading || !p ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {p.isDraft && <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">This is a draft/quotation — mark it final before taking payment.</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            <Tile label="Total payable" value={formatMoney(p.finalTotal)} />
            <Tile label="Received" value={formatMoney(p.paid)} />
            <Tile label="Due" value={formatMoney(p.due)} danger={p.due > 0} />
          </div>
          {p.payments.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Reference</th><th className="px-3 py-2 text-left">Method</th><th className="px-3 py-2 text-right">Amount</th>{canDelete && <th />}</tr>
                </thead>
                <tbody className="divide-y">
                  {p.payments.map((x) => (
                    <tr key={x.id}>
                      <td className="px-3 py-2">{fmtDate(x.paidOn)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{x.paymentRefNo || '—'}</td>
                      <td className="px-3 py-2 capitalize">{x.method.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(x.amount)}</td>
                      {canDelete && (
                        <td className="px-3 py-2 text-right">
                          <Button variant="destructive" size="sm" title="Delete" onClick={() => window.confirm(`Delete this payment of ${formatMoney(x.amount)}?`) && remove.mutate(x.id)}><Trash2 className="h-4 w-4" /></Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {canPay && !p.isDraft && !adding && p.due > 0 && <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add payment</Button>}
          {canPay && p.due <= 0 && !adding && <p className="text-sm text-muted-foreground">This sale is fully paid.</p>}
          {canPay && adding && (
            <form className="space-y-3 rounded-lg border p-4" onSubmit={(e) => { e.preventDefault(); add.mutate({ ...form, amount: Number(form.amount) }); }}>
              <div className="grid gap-3 sm:grid-cols-3">
                <div><Label htmlFor="amt">Amount *</Label><Input id="amt" type="number" step="0.0001" min="0.0001" required value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
                <div><Label htmlFor="on">Received on</Label><Input id="on" type="date" value={form.paid_on} onChange={(e) => setForm({ ...form, paid_on: e.target.value })} /></div>
                <div><Label htmlFor="m">Method *</Label><Select id="m" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{(meta?.paymentMethods ?? [{ value: 'cash', label: 'Cash' }]).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></div>
              </div>
              <PaymentMethodFields
                idPrefix="sell-pay"
                values={{
                  method: form.method,
                  card_holder_name: form.card_holder_name,
                  card_transaction_number: form.card_transaction_number,
                  card_type: form.card_type,
                  cheque_number: form.cheque_number,
                  bank_account_number: form.bank_account_number,
                  transaction_no: form.transaction_no,
                }}
                onChange={(patch) => setForm({ ...form, ...patch })}
              />
              <div><Label htmlFor="note">Note</Label><Textarea id="note" rows={2} value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" size="sm" disabled={add.isPending}>{add.isPending ? 'Saving…' : 'Save payment'}</Button></div>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}

function Tile({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return <div className="rounded-lg border px-3 py-2"><div className="text-xs text-muted-foreground">{label}</div><div className={`text-base font-semibold tabular-nums ${danger ? 'text-destructive' : ''}`}>{value}</div></div>;
}
