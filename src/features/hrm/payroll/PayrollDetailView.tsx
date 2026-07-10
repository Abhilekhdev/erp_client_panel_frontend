import { Badge } from '@/components/ui/badge';
import { money, type PayrollDetail } from '../payroll.api';

const payVariant = (s: string) => (s === 'paid' ? 'success' : s === 'partial' ? 'warning' : 'destructive');

/** Salary breakdown for a single payroll: basic + allowances − deductions = net. */
export function PayrollDetailView({ payroll }: { payroll: PayrollDetail }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <span className="text-muted-foreground">Employee</span>
          <p className="font-medium">{payroll.employee}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Month</span>
          <p className="font-medium">{payroll.month}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Ref No</span>
          <p className="font-medium">{payroll.refNo ?? '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Payment</span>
          <p>
            <Badge variant={payVariant(payroll.paymentStatus)}>{payroll.paymentStatus}</Badge>
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm">
          <span className="font-medium">Basic salary</span>
          <span>{money(payroll.basicSalary)}</span>
        </div>

        {payroll.allowances.length > 0 && (
          <div className="border-b border-border">
            <p className="bg-muted/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Allowances
            </p>
            {payroll.allowances.map((a, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{a.description}</span>
                <span className="text-emerald-600">+ {money(a.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {payroll.deductions.length > 0 && (
          <div className="border-b border-border">
            <p className="bg-muted/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Deductions
            </p>
            {payroll.deductions.map((d, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{d.description}</span>
                <span className="text-destructive">− {money(d.amount)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 text-base font-semibold">
          <span>Net payable</span>
          <span className="text-primary">{money(payroll.finalTotal)}</span>
        </div>
      </div>
    </div>
  );
}
