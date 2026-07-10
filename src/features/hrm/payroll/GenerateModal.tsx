import { useMutation } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { MultiSelect } from '@/components/ui/multi-select';
import { Select } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  generatePayroll,
  money,
  preparePayroll,
  type EditableLine,
  type PayrollMeta,
} from '../payroll.api';

interface EmpForm {
  userId: number;
  name: string;
  basicSalary: string;
  lines: { type: 'allowance' | 'deduction'; description: string; amountType: 'fixed' | 'percent'; amount: string }[];
}

const computeLine = (basic: number, amountType: string, amount: number) =>
  amountType === 'percent' ? (amount / 100) * basic : amount;

const netOf = (e: EmpForm): number => {
  const basic = Number(e.basicSalary || 0);
  let allow = 0;
  let deduct = 0;
  for (const l of e.lines) {
    const c = computeLine(basic, l.amountType, Number(l.amount || 0));
    if (l.type === 'allowance') allow += c;
    else deduct += c;
  }
  return basic + allow - deduct;
};

export function GenerateModal({
  open,
  onClose,
  onGenerated,
  meta,
}: {
  open: boolean;
  onClose: () => void;
  onGenerated: () => void;
  meta?: PayrollMeta;
}) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [step1, setStep1] = useState({
    name: '',
    month: '',
    locationId: '' as number | '',
    status: 'final' as 'draft' | 'final',
    employeeIds: [] as number[],
  });
  const [employees, setEmployees] = useState<EmpForm[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);

  const reset = () => {
    setStep(1);
    setError('');
    setStep1({ name: '', month: '', locationId: '', status: 'final', employeeIds: [] });
    setEmployees([]);
    setSkipped([]);
  };
  const close = () => {
    reset();
    onClose();
  };

  const prepare = useMutation({
    mutationFn: () => preparePayroll({ month: step1.month, employeeIds: step1.employeeIds }),
    onSuccess: (res) => {
      setSkipped(res.skipped);
      setEmployees(
        res.employees.map((e) => ({
          userId: e.userId,
          name: e.name,
          basicSalary: String(e.basicSalary),
          lines: e.lines.map((l) => ({
            type: l.type,
            description: l.description,
            amountType: l.amountType,
            amount: String(l.amount),
          })),
        })),
      );
      if (!res.employees.length) {
        setError('All selected employees already have a payroll for this month.');
        return;
      }
      setError('');
      setStep(2);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not prepare payroll')),
  });

  const generate = useMutation({
    mutationFn: () =>
      generatePayroll({
        name: step1.name.trim(),
        status: step1.status,
        locationId: step1.locationId ? Number(step1.locationId) : null,
        month: step1.month,
        employees: employees.map((e) => ({
          userId: e.userId,
          basicSalary: Number(e.basicSalary || 0),
          lines: e.lines
            .filter((l) => l.description.trim())
            .map(
              (l): EditableLine => ({
                type: l.type,
                description: l.description.trim(),
                amountType: l.amountType,
                amount: Number(l.amount || 0),
              }),
            ),
        })),
      }),
    onSuccess: () => {
      onGenerated();
      close();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not generate payroll')),
  });

  const onProceed = () => {
    if (!step1.name.trim()) return setError('Enter a group name');
    if (!step1.month) return setError('Pick a month');
    if (!step1.employeeIds.length) return setError('Select at least one employee');
    setError('');
    prepare.mutate();
  };

  const patchEmp = (i: number, patch: Partial<EmpForm>) =>
    setEmployees((rows) => rows.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const addLine = (i: number, type: 'allowance' | 'deduction') =>
    patchEmp(i, {
      lines: [...employees[i].lines, { type, description: '', amountType: 'fixed', amount: '' }],
    });
  const patchLine = (i: number, li: number, patch: Partial<EmpForm['lines'][number]>) =>
    patchEmp(i, { lines: employees[i].lines.map((l, k) => (k === li ? { ...l, ...patch } : l)) });
  const removeLine = (i: number, li: number) =>
    patchEmp(i, { lines: employees[i].lines.filter((_, k) => k !== li) });

  const grandTotal = employees.reduce((s, e) => s + netOf(e), 0);

  const employeeOptions = (meta?.employees ?? []).map((u) => ({ value: u.id, label: u.name }));

  return (
    <Modal
      open={open}
      onClose={close}
      title={step === 1 ? 'Add Payroll' : `Payroll details — ${step1.month}`}
      className={step === 1 ? 'max-w-xl' : 'max-w-4xl'}
      footer={
        step === 1 ? (
          <>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={onProceed} isLoading={prepare.isPending}>
              Proceed
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => generate.mutate()} isLoading={generate.isPending} disabled={!employees.length}>
              Generate payroll
            </Button>
          </>
        )
      }
    >
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === 1 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              Group name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={step1.name}
              onChange={(e) => setStep1((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. August 2026 Payroll"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>
                Month <span className="text-destructive">*</span>
              </Label>
              <Input
                type="month"
                value={step1.month}
                onChange={(e) => setStep1((f) => ({ ...f, month: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={step1.status}
                onChange={(e) => setStep1((f) => ({ ...f, status: e.target.value as 'draft' | 'final' }))}
              >
                <option value="final">Final</option>
                <option value="draft">Draft</option>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Select
              value={String(step1.locationId)}
              onChange={(e) => setStep1((f) => ({ ...f, locationId: e.target.value ? Number(e.target.value) : '' }))}
            >
              <option value="">All locations</option>
              {meta?.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>
              Employees <span className="text-destructive">*</span>
            </Label>
            <MultiSelect
              options={employeeOptions}
              value={step1.employeeIds}
              onChange={(v) => setStep1((f) => ({ ...f, employeeIds: v }))}
              placeholder="Select employees…"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {skipped.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Skipped (already have a payroll this month): {skipped.join(', ')}
            </div>
          )}
          <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
            {employees.map((emp, i) => (
              <div key={emp.userId} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold">{emp.name}</h4>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Net payable</span>
                    <p className="text-lg font-semibold text-primary">{money(netOf(emp))}</p>
                  </div>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>Basic salary</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={emp.basicSalary}
                      onChange={(e) => patchEmp(i, { basicSalary: e.target.value })}
                    />
                  </div>
                </div>

                {emp.lines.length > 0 && (
                  <div className="space-y-2">
                    {emp.lines.map((l, li) => {
                      const computed = computeLine(Number(emp.basicSalary || 0), l.amountType, Number(l.amount || 0));
                      return (
                        <div key={li} className="grid grid-cols-12 items-end gap-2">
                          <div className="col-span-3 space-y-1">
                            <Label className="text-xs">Type</Label>
                            <Select
                              value={l.type}
                              onChange={(e) =>
                                patchLine(i, li, { type: e.target.value as 'allowance' | 'deduction' })
                              }
                            >
                              <option value="allowance">Allowance</option>
                              <option value="deduction">Deduction</option>
                            </Select>
                          </div>
                          <div className="col-span-4 space-y-1">
                            <Label className="text-xs">Description</Label>
                            <Input
                              value={l.description}
                              onChange={(e) => patchLine(i, li, { description: e.target.value })}
                              placeholder="e.g. HRA"
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Amount type</Label>
                            <Select
                              value={l.amountType}
                              onChange={(e) =>
                                patchLine(i, li, { amountType: e.target.value as 'fixed' | 'percent' })
                              }
                            >
                              <option value="fixed">Fixed</option>
                              <option value="percent">%</option>
                            </Select>
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Amount</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={l.amount}
                              onChange={(e) => patchLine(i, li, { amount: e.target.value })}
                            />
                          </div>
                          <div className="col-span-1 flex items-center gap-1 pb-1">
                            <span className="flex-1 text-right text-xs text-muted-foreground" title="Computed">
                              {l.amountType === 'percent' ? money(computed) : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeLine(i, li)}
                              className="text-destructive hover:text-destructive/70"
                              title="Remove line"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addLine(i, 'allowance')}>
                    <Plus className="h-3.5 w-3.5" />
                    Allowance
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addLine(i, 'deduction')}>
                    <Plus className="h-3.5 w-3.5" />
                    Deduction
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">
              {employees.length} employee{employees.length > 1 ? 's' : ''}
            </span>
            <span className="text-base font-semibold">
              Gross total: <span className="text-primary">{money(grandTotal)}</span>
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
}
