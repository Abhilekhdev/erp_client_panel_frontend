import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/axios';
import { HrmTabs } from '../components/HrmTabs';
import { getHrmSettings, updateHrmSettings, type HrmSettings } from '../hrm-settings.api';

const EMPTY: HrmSettings = {
  leaveRefNoPrefix: '',
  leaveInstructions: '',
  payrollRefNoPrefix: '',
  isLocationRequired: false,
  graceBeforeCheckin: '',
  graceAfterCheckin: '',
  graceBeforeCheckout: '',
  graceAfterCheckout: '',
  calculateSalesTargetCommissionWithoutTax: false,
  essentialsTodosPrefix: '',
};

const MENU = [
  { key: 'leave', label: 'Leave' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'sales_target', label: 'Sales Target' },
  { key: 'essentials', label: 'Essentials' },
];

export function HrmSettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['hrm-settings'], queryFn: getHrmSettings });
  const [form, setForm] = useState<HrmSettings>(EMPTY);
  const [tab, setTab] = useState('leave');

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const set = <K extends keyof HrmSettings>(k: K, v: HrmSettings[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: () => updateHrmSettings(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hrm-settings'] }),
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not save settings')),
  });

  return (
    <div>
      <PageHeader
        title="Essentials & HRM Settings"
        breadcrumbs={[{ label: 'HRM', to: '/hrm' }, { label: 'Settings' }]}
        actions={
          <Button size="sm" onClick={() => save.mutate()} isLoading={save.isPending}>
            Update
          </Button>
        }
      />
      <HrmTabs />

      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[220px_1fr]">
          <nav className="border-b border-border bg-muted/30 p-2 md:border-b-0 md:border-r">
            {MENU.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setTab(m.key)}
                className={cn(
                  'w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                  tab === m.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {m.label}
              </button>
            ))}
          </nav>

          <div className="max-w-xl space-y-4 p-6">
            {tab === 'leave' && (
              <>
                <Field label="Leave ref no prefix">
                  <Input value={form.leaveRefNoPrefix} onChange={(e) => set('leaveRefNoPrefix', e.target.value)} />
                </Field>
                <Field label="Leave instructions">
                  <Textarea rows={5} value={form.leaveInstructions} onChange={(e) => set('leaveInstructions', e.target.value)} />
                </Field>
              </>
            )}
            {tab === 'payroll' && (
              <Field label="Payroll ref no prefix">
                <Input value={form.payrollRefNoPrefix} onChange={(e) => set('payrollRefNoPrefix', e.target.value)} />
              </Field>
            )}
            {tab === 'attendance' && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={form.isLocationRequired}
                    onChange={(e) => set('isLocationRequired', e.target.checked)}
                  />
                  Is location required
                </label>
                <p className="pt-2 text-sm font-semibold">Grace time (minutes)</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Grace before check-in">
                    <Input type="number" min="0" value={form.graceBeforeCheckin} onChange={(e) => set('graceBeforeCheckin', e.target.value)} />
                  </Field>
                  <Field label="Grace after check-in">
                    <Input type="number" min="0" value={form.graceAfterCheckin} onChange={(e) => set('graceAfterCheckin', e.target.value)} />
                  </Field>
                  <Field label="Grace before check-out">
                    <Input type="number" min="0" value={form.graceBeforeCheckout} onChange={(e) => set('graceBeforeCheckout', e.target.value)} />
                  </Field>
                  <Field label="Grace after check-out">
                    <Input type="number" min="0" value={form.graceAfterCheckout} onChange={(e) => set('graceAfterCheckout', e.target.value)} />
                  </Field>
                </div>
              </>
            )}
            {tab === 'sales_target' && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  checked={form.calculateSalesTargetCommissionWithoutTax}
                  onChange={(e) => set('calculateSalesTargetCommissionWithoutTax', e.target.checked)}
                />
                Calculate sales target commission without tax
              </label>
            )}
            {tab === 'essentials' && (
              <Field label="To-dos prefix">
                <Input value={form.essentialsTodosPrefix} onChange={(e) => set('essentialsTodosPrefix', e.target.value)} />
              </Field>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
