import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PaymentMethodFields } from '@/components/common/PaymentMethodFields';
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
import { addRefund, deleteRefund, getReturn, type SaveRefundBody } from '../returns.api';

const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
];

/** View a return plus its refunds — money the supplier owes us back. */
export function ReturnRefundModal({
  id,
  onClose,
  onChanged,
}: {
  id: number | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { has } = usePermissions();
  const canPay = has('purchase.payments');
  const canDeletePayment = has('delete_purchase_payment');

  const [form, setForm] = useState<SaveRefundBody>({ amount: 0, method: 'cash', paid_on: today() });
  const [adding, setAdding] = useState(false);

  const { data: r, isLoading } = useQuery({
    queryKey: ['purchase-return', id],
    queryFn: () => getReturn(id as number),
    enabled: id != null,
  });

  useEffect(() => {
    if (r) setForm({ amount: Math.max(0, r.due), method: 'cash', paid_on: today() });
    setAdding(false);
  }, [r?.id, r?.due]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['purchase-return', id] });
    onChanged?.();
  };

  const add = useMutation({
    mutationFn: (body: SaveRefundBody) => addRefund(id as number, body),
    onSuccess: () => {
      toast.success('Refund recorded');
      setAdding(false);
      invalidate();
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not record refund')),
  });

  const remove = useMutation({
    mutationFn: (paymentId: number) => deleteRefund(paymentId),
    onSuccess: () => {
      toast.success('Refund deleted');
      invalidate();
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not delete refund')),
  });

  return (
    <Modal
      open={id != null}
      onClose={onClose}
      title={r ? `Return ${r.refNo}` : 'Return'}
      description={r ? `${r.supplier?.name ?? ''} · ${r.location}` : undefined}
      className="max-w-3xl"
    >
      {isLoading || !r ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {r.parentPurchase && (
            <p className="text-xs text-muted-foreground">Against purchase {r.parentPurchase.refNo}</p>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Unit cost</th>
                  <th className="px-3 py-2 text-right">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {r.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{l.product}</div>
                      <div className="text-xs text-muted-foreground">{l.sku}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(l.purchasePriceIncTax)}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{formatMoney(l.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Tile label="Return total" value={formatMoney(r.finalTotal)} />
            <Tile label="Refunded" value={formatMoney(r.refunded)} />
            <Tile label="Due from supplier" value={formatMoney(r.due)} danger={r.due > 0} />
          </div>

          {r.payments.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Reference</th>
                    <th className="px-3 py-2 text-left">Method</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    {canDeletePayment && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {r.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2">{formatDate(p.paidOn)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{p.paymentRefNo || '—'}</td>
                      <td className="px-3 py-2 capitalize">{p.method.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMoney(p.amount)}</td>
                      {canDeletePayment && (
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            title="Delete refund"
                            onClick={() =>
                              window.confirm(`Delete this refund of ${formatMoney(p.amount)}?`) && remove.mutate(p.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canPay && !adding && r.due > 0 && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" />
              Record refund
            </Button>
          )}
          {canPay && r.due <= 0 && !adding && (
            <p className="text-sm text-muted-foreground">This return is fully refunded.</p>
          )}

          {canPay && adding && (
            <form
              className="space-y-3 rounded-lg border p-4"
              onSubmit={(e) => {
                e.preventDefault();
                add.mutate({ ...form, amount: Number(form.amount) });
              }}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="amt">Amount *</Label>
                  <Input
                    id="amt"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="on">Received on</Label>
                  <Input id="on" type="date" value={form.paid_on} onChange={(e) => setForm({ ...form, paid_on: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="method">Method *</Label>
                  <Select id="method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                    {METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <PaymentMethodFields
                idPrefix="preturn-refund"
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
              <div>
                <Label htmlFor="note">Note</Label>
                <Textarea id="note" rows={2} value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={add.isPending}>
                  {add.isPending ? 'Saving…' : 'Save refund'}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}

function Tile({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${danger ? 'text-destructive' : ''}`}>{value}</div>
    </div>
  );
}
