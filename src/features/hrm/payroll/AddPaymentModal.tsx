import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  addPayrollPayments,
  getGroupPaymentForm,
  money,
  PAYMENT_METHODS,
  type PaymentInput,
} from '../payroll.api';

interface RowState {
  include: boolean;
  amount: string;
  method: string;
  paidOn: string;
  note: string;
  chequeNumber: string;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Record payments for every employee in a payroll group — the port of GOURI's
 * `pay_payroll_group` screen (PayrollController@addPayment / @postAddPayment).
 * Rows already settled are shown but not payable; each payable row defaults to the amount due.
 */
export function AddPaymentModal({
  open,
  onClose,
  groupId,
}: {
  open: boolean;
  onClose: () => void;
  groupId: number | null;
}) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [error, setError] = useState('');

  const { data: form, isLoading } = useQuery({
    queryKey: ['payroll-payment-form', groupId],
    queryFn: () => getGroupPaymentForm(groupId as number),
    enabled: open && groupId != null,
  });

  useEffect(() => {
    if (!form) return;
    const next: Record<number, RowState> = {};
    form.payrolls.forEach((p) => {
      next[p.payrollId] = {
        include: p.due > 0,
        amount: p.due > 0 ? String(p.due) : '',
        method: 'cash',
        paidOn: today(),
        note: '',
        chequeNumber: '',
      };
    });
    setRows(next);
    setError('');
  }, [form]);

  const set = (id: number, patch: Partial<RowState>) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

  const save = useMutation({
    mutationFn: () => {
      const payments: PaymentInput[] = (form?.payrolls ?? [])
        .filter((p) => p.due > 0 && rows[p.payrollId]?.include && Number(rows[p.payrollId].amount) > 0)
        .map((p) => {
          const r = rows[p.payrollId];
          return {
            payroll_id: p.payrollId,
            amount: Number(r.amount),
            method: r.method,
            paid_on: r.paidOn,
            note: r.note || null,
            cheque_number: r.method === 'cheque' ? r.chequeNumber || null : null,
          };
        });
      return addPayrollPayments(payments);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-groups'] });
      qc.invalidateQueries({ queryKey: ['payrolls'] });
      qc.invalidateQueries({ queryKey: ['payroll-payment-form'] });
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not record payment')),
  });

  const onSubmit = () => {
    const payable = (form?.payrolls ?? []).filter(
      (p) => p.due > 0 && rows[p.payrollId]?.include && Number(rows[p.payrollId].amount) > 0,
    );
    if (payable.length === 0) return setError('Enter an amount for at least one employee');
    const over = payable.find((p) => Number(rows[p.payrollId].amount) > p.due);
    if (over) return setError(`Amount for ${over.employee} exceeds the due of ${money(over.due)}`);
    setError('');
    save.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-3xl"
      title={form ? `Add Payment — ${form.name} (${form.month})` : 'Add Payment'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onSubmit} isLoading={save.isPending} disabled={isLoading || !form}>
            Save Payment
          </Button>
        </>
      }
    >
      {isLoading || !form ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {form.payrolls.map((p) => {
            const r = rows[p.payrollId];
            const settled = p.due <= 0;
            if (!r) return null;
            return (
              <div key={p.payrollId} className={`rounded-lg border p-3 ${settled ? 'opacity-60' : ''}`}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {!settled && (
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input accent-primary"
                        checked={r.include}
                        onChange={(e) => set(p.payrollId, { include: e.target.checked })}
                      />
                    )}
                    <span className="font-medium">{p.employee}</span>
                    <span className="font-mono text-xs text-muted-foreground">{p.refNo}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total {money(p.finalTotal)} · Paid {money(p.paid)} ·{' '}
                    <span className={settled ? 'text-emerald-600' : 'font-semibold text-foreground'}>
                      Due {money(p.due)}
                    </span>
                  </div>
                </div>

                {settled ? (
                  <p className="text-xs text-emerald-600">Fully paid</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={`amt-${p.payrollId}`}>Amount</Label>
                      <Input
                        id={`amt-${p.payrollId}`}
                        type="number"
                        min={0}
                        max={p.due}
                        step="0.01"
                        value={r.amount}
                        disabled={!r.include}
                        onChange={(e) => set(p.payrollId, { amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`m-${p.payrollId}`}>Method</Label>
                      <Select
                        id={`m-${p.payrollId}`}
                        value={r.method}
                        disabled={!r.include}
                        onChange={(e) => set(p.payrollId, { method: e.target.value })}
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`d-${p.payrollId}`}>Paid on</Label>
                      <Input
                        id={`d-${p.payrollId}`}
                        type="date"
                        value={r.paidOn}
                        disabled={!r.include}
                        onChange={(e) => set(p.payrollId, { paidOn: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`n-${p.payrollId}`}>
                        {r.method === 'cheque' ? 'Cheque number' : 'Note'}
                      </Label>
                      <Input
                        id={`n-${p.payrollId}`}
                        value={r.method === 'cheque' ? r.chequeNumber : r.note}
                        disabled={!r.include}
                        onChange={(e) =>
                          set(
                            p.payrollId,
                            r.method === 'cheque'
                              ? { chequeNumber: e.target.value }
                              : { note: e.target.value },
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
