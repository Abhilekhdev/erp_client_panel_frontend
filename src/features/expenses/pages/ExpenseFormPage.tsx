import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { expenseSubCategories } from '@/features/expense-categories/expense-categories.api';
import { getApiErrorMessage } from '@/lib/api/axios';
import { cn } from '@/lib/utils';
import {
  createExpense,
  getExpense,
  getExpenseMeta,
  updateExpense,
  type ExpenseDetail,
  type ExpenseFormBody,
} from '../expenses.api';

interface FormState {
  refNo: string;
  transactionDate: string;
  locationId: string;
  expenseCategoryId: string;
  expenseSubCategoryId: string;
  expenseFor: string;
  taxRateId: string;
  finalTotal: string;
  isRefund: boolean;
  additionalNotes: string;
  isRecurring: boolean;
  recurInterval: string;
  recurIntervalType: string;
  recurRepetitions: string;
  // single payment row
  payAmount: string;
  payMethod: string;
  payAccountId: string;
  payPaidOn: string;
  payNote: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY: FormState = {
  refNo: '', transactionDate: today(), locationId: '', expenseCategoryId: '', expenseSubCategoryId: '',
  expenseFor: '', taxRateId: '', finalTotal: '', isRefund: false, additionalNotes: '',
  isRecurring: false, recurInterval: '1', recurIntervalType: 'months', recurRepetitions: '',
  payAmount: '', payMethod: 'cash', payAccountId: '', payPaidOn: today(), payNote: '',
};

function hydrate(e: ExpenseDetail): FormState {
  const p = e.payments[0];
  return {
    refNo: e.refNo,
    transactionDate: e.transactionDate,
    locationId: String(e.locationId),
    expenseCategoryId: e.expenseCategoryId ? String(e.expenseCategoryId) : '',
    expenseSubCategoryId: e.expenseSubCategoryId ? String(e.expenseSubCategoryId) : '',
    expenseFor: e.expenseFor ? String(e.expenseFor) : '',
    taxRateId: e.taxRateId ? String(e.taxRateId) : '',
    finalTotal: String(e.finalTotal),
    isRefund: e.isRefund,
    additionalNotes: e.additionalNotes,
    isRecurring: e.isRecurring,
    recurInterval: e.recurInterval != null ? String(e.recurInterval) : '1',
    recurIntervalType: e.recurIntervalType || 'months',
    recurRepetitions: e.recurRepetitions != null ? String(e.recurRepetitions) : '',
    payAmount: p ? String(p.amount) : '',
    payMethod: p ? p.method : 'cash',
    payAccountId: p?.accountId ? String(p.accountId) : '',
    payPaidOn: p ? p.paidOn : today(),
    payNote: p ? p.note : '',
  };
}

function toBody(f: FormState): ExpenseFormBody {
  const payment =
    f.payAmount && Number(f.payAmount) > 0
      ? [
          {
            amount: Number(f.payAmount),
            method: f.payMethod,
            account_id: f.payAccountId ? Number(f.payAccountId) : null,
            paid_on: f.payPaidOn || undefined,
            note: f.payNote || undefined,
          },
        ]
      : [];
  return {
    location_id: Number(f.locationId),
    transaction_date: f.transactionDate,
    ref_no: f.refNo || undefined,
    expense_category_id: f.expenseCategoryId ? Number(f.expenseCategoryId) : null,
    expense_sub_category_id: f.expenseSubCategoryId ? Number(f.expenseSubCategoryId) : null,
    expense_for: f.expenseFor ? Number(f.expenseFor) : null,
    tax_rate_id: f.taxRateId ? Number(f.taxRateId) : null,
    final_total: Number(f.finalTotal) || 0,
    additional_notes: f.additionalNotes,
    is_refund: f.isRefund,
    is_recurring: f.isRecurring,
    recur_interval: f.isRecurring ? Number(f.recurInterval) || 1 : undefined,
    recur_interval_type: f.isRecurring ? f.recurIntervalType : undefined,
    recur_repetitions: f.isRecurring && f.recurRepetitions ? Number(f.recurRepetitions) : undefined,
    payment,
  };
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

const textareaCls =
  'flex min-h-[76px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export function ExpenseFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const expenseId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: meta } = useQuery({ queryKey: ['expense-meta'], queryFn: getExpenseMeta });
  const { data: expense } = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: () => getExpense(expenseId as number),
    enabled: isEdit,
  });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState('');
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (isEdit && expense) setForm(hydrate(expense));
  }, [isEdit, expense]);

  // Sub-categories cascade off the selected category.
  const { data: subCategories } = useQuery({
    queryKey: ['expense-sub-categories', form.expenseCategoryId],
    queryFn: () => expenseSubCategories(Number(form.expenseCategoryId)),
    enabled: Boolean(form.expenseCategoryId),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = toBody(form);
      return isEdit ? updateExpense(expenseId as number, body) : createExpense(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      navigate('/expenses');
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save expense')),
  });

  const onSubmit = () => {
    if (!form.locationId) return setError('Please select a location');
    if (!form.transactionDate) return setError('Date is required');
    if (form.finalTotal === '' || Number(form.finalTotal) < 0) return setError('Enter a valid total amount');
    setError('');
    save.mutate();
  };

  const loading = !meta || (isEdit && !expense);
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title={isEdit ? 'Edit Expense' : 'Add Expense'}
          breadcrumbs={[{ label: 'Expenses', to: '/expenses' }, { label: isEdit ? 'Edit' : 'Add' }]}
        />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={isEdit ? 'Edit Expense' : 'Add Expense'}
        description="Record a business expense, who it's for, and any payment made."
        breadcrumbs={[{ label: 'Expenses', to: '/expenses' }, { label: isEdit ? 'Edit' : 'Add' }]}
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="whitespace-pre-line">{error}</span>
        </div>
      )}

      <Card className="mb-5">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Expense details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Location" required>
            <Select value={form.locationId} onChange={(e) => set('locationId', e.target.value)}>
              <option value="">Select location…</option>
              {meta.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference no.">
            <Input value={form.refNo} onChange={(e) => set('refNo', e.target.value)} placeholder="Auto-generated if blank" />
          </Field>
          <Field label="Date" required>
            <Input type="date" value={form.transactionDate} onChange={(e) => set('transactionDate', e.target.value)} />
          </Field>

          <Field label="Expense category">
            <Select
              value={form.expenseCategoryId}
              onChange={(e) => setForm((f) => ({ ...f, expenseCategoryId: e.target.value, expenseSubCategoryId: '' }))}
            >
              <option value="">None</option>
              {meta.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sub category">
            <Select
              value={form.expenseSubCategoryId}
              onChange={(e) => set('expenseSubCategoryId', e.target.value)}
              disabled={!form.expenseCategoryId}
            >
              <option value="">None</option>
              {(subCategories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Expense for">
            <Select value={form.expenseFor} onChange={(e) => set('expenseFor', e.target.value)}>
              <option value="">None</option>
              {meta.expenseForUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Applicable tax">
            <Select value={form.taxRateId} onChange={(e) => set('taxRateId', e.target.value)}>
              <option value="">None</option>
              {meta.taxRates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.amount}%)
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Total amount" required>
            <Input type="number" step="0.01" value={form.finalTotal} onChange={(e) => set('finalTotal', e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={form.isRefund}
              onChange={(e) => set('isRefund', e.target.checked)}
            />
            Is refund
          </label>

          <Field label="Additional notes" className="sm:col-span-2 lg:col-span-3">
            <textarea
              className={textareaCls}
              value={form.additionalNotes}
              onChange={(e) => set('additionalNotes', e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Recurring</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={form.isRecurring}
              onChange={(e) => set('isRecurring', e.target.checked)}
            />
            This is a recurring expense
          </label>
          {form.isRecurring && (
            <>
              <Field label="Repeat every">
                <Input type="number" min="1" value={form.recurInterval} onChange={(e) => set('recurInterval', e.target.value)} />
              </Field>
              <Field label="Interval">
                <Select value={form.recurIntervalType} onChange={(e) => set('recurIntervalType', e.target.value)}>
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </Select>
              </Field>
              <Field label="No. of repetitions">
                <Input
                  type="number"
                  min="0"
                  value={form.recurRepetitions}
                  onChange={(e) => set('recurRepetitions', e.target.value)}
                  placeholder="Blank = no limit"
                />
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Payment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Amount paid">
            <Input type="number" step="0.01" value={form.payAmount} onChange={(e) => set('payAmount', e.target.value)} placeholder="Leave blank for none" />
          </Field>
          <Field label="Payment method">
            <Select value={form.payMethod} onChange={(e) => set('payMethod', e.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Paid on">
            <Input type="date" value={form.payPaidOn} onChange={(e) => set('payPaidOn', e.target.value)} />
          </Field>
          <Field label="Payment account">
            <Select value={form.payAccountId} onChange={(e) => set('payAccountId', e.target.value)}>
              <option value="">None</option>
              {meta.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Payment note" className="sm:col-span-2">
            <Input value={form.payNote} onChange={(e) => set('payNote', e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/expenses')}>
          Cancel
        </Button>
        <Button onClick={onSubmit} isLoading={save.isPending}>
          {isEdit ? 'Update Expense' : 'Save Expense'}
        </Button>
      </div>
    </div>
  );
}
