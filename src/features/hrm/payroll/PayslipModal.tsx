import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Mail, Printer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  deletePayrollPayment,
  downloadPayslipPdf,
  getPayslip,
  money,
  sendPayslipEmail,
} from '../payroll.api';

/**
 * Printable payslip — the port of GOURI's `essentials::payroll.slip` blade.
 * GOURI renders that blade to PDF server-side with mpdf; this stack has no PDF engine, so the
 * slip is rendered here and "Print / Save as PDF" hands off to the browser's print dialog
 * (`@media print` hides everything except `#payslip-print`).
 */
export function PayslipModal({
  open,
  onClose,
  payrollId,
}: {
  open: boolean;
  onClose: () => void;
  payrollId: number | null;
}) {
  const qc = useQueryClient();
  const [banner, setBanner] = useState<{ ok: boolean; msg: string } | null>(null);

  const { data: slip, isLoading } = useQuery({
    queryKey: ['payslip', payrollId],
    queryFn: () => getPayslip(payrollId as number),
    enabled: open && payrollId != null,
  });

  const download = useMutation({
    mutationFn: () => downloadPayslipPdf(payrollId as number, slip?.refNo ?? null),
    onError: (e) => setBanner({ ok: false, msg: getApiErrorMessage(e, 'Could not download PDF') }),
  });

  const email = useMutation({
    mutationFn: () => sendPayslipEmail(payrollId as number),
    onSuccess: (r) => setBanner({ ok: true, msg: r.msg }),
    onError: (e) => setBanner({ ok: false, msg: getApiErrorMessage(e, 'Could not send email') }),
  });

  // Deleting a payment re-derives both the payslip and the parent group status server-side,
  // so refresh the lists that render those badges alongside the slip itself.
  const removePayment = useMutation({
    mutationFn: (id: number) => deletePayrollPayment(id),
    onSuccess: () => {
      setBanner({ ok: true, msg: 'Payment deleted' });
      qc.invalidateQueries({ queryKey: ['payslip', payrollId] });
      qc.invalidateQueries({ queryKey: ['payrolls'] });
      qc.invalidateQueries({ queryKey: ['payroll-groups'] });
      qc.invalidateQueries({ queryKey: ['payroll-group'] });
    },
    onError: (e) => setBanner({ ok: false, msg: getApiErrorMessage(e, 'Could not delete payment') }),
  });

  const cur = slip?.business.currencySymbol ?? '';
  const bank = (slip?.employee.bankDetails ?? {}) as Record<string, string>;
  const hasBank = Object.values(bank).some((v) => v);

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-3xl"
      title="Payslip"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" onClick={() => window.print()} disabled={!slip}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            variant="outline"
            onClick={() => email.mutate()}
            isLoading={email.isPending}
            disabled={!slip}
            title="Email this payslip to the employee with the PDF attached"
          >
            <Mail className="h-4 w-4" />
            Send Email
          </Button>
          <Button onClick={() => download.mutate()} isLoading={download.isPending} disabled={!slip}>
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </>
      }
    >
      {isLoading || !slip ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <div className="max-h-[70vh] overflow-y-auto text-sm">
          {banner && (
            <div
              className={`mb-3 rounded-md border px-3 py-2 text-sm print:hidden ${
                banner.ok
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'border-destructive/40 bg-destructive/10 text-destructive'
              }`}
            >
              {banner.msg}
            </div>
          )}
          <div id="payslip-print">
          {/* Header */}
          <div className="mb-4 border-b pb-3 text-center">
            <h2 className="text-lg font-semibold">{slip.business.name}</h2>
            <p className="text-muted-foreground">
              Payslip for {slip.monthName} {slip.year}
            </p>
            <p className="mt-1 font-mono text-xs">{slip.refNo}</p>
          </div>

          {/* Employee */}
          <div className="mb-4 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            <Row label="Employee" value={slip.employee.name} />
            <Row label="Email" value={slip.employee.email} />
            <Row label="Department" value={slip.employee.department ?? '—'} />
            <Row label="Designation" value={slip.employee.designation ?? '—'} />
            <Row label="Location" value={slip.employee.location ?? '—'} />
            <Row label="Payroll group" value={slip.groupName ?? '—'} />
          </div>

          {/* Attendance summary */}
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-3 sm:grid-cols-4">
            <Stat label="Days in month" value={String(slip.attendance.daysInMonth)} />
            <Stat label="Days worked" value={String(slip.attendance.daysPresent)} />
            <Stat label="Leaves" value={String(slip.attendance.totalLeaves)} />
            <Stat label="Work hours" value={String(slip.attendance.workHours)} />
          </div>

          {/* Earnings / deductions */}
          <div className="mb-4 overflow-hidden rounded-lg border">
            <table className="w-full">
              <tbody>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Earnings</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2">Basic salary</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {cur} {money(slip.basicSalary)}
                  </td>
                </tr>
                {slip.allowances.map((a, i) => (
                  <tr key={`a${i}`} className="border-b">
                    <td className="px-3 py-2">{a.description}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {cur} {money(a.amount)}
                    </td>
                  </tr>
                ))}
                {slip.deductions.length > 0 && (
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">Deductions</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                )}
                {slip.deductions.map((d, i) => (
                  <tr key={`d${i}`} className="border-b">
                    <td className="px-3 py-2">{d.description}</td>
                    <td className="px-3 py-2 text-right font-mono text-destructive">
                      − {cur} {money(d.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-primary/5">
                  <td className="px-3 py-2.5 font-semibold">Net payable</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold">
                    {cur} {money(slip.finalTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payments */}
          <div className="mb-4 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            <Row label="Paid" value={`${cur} ${money(slip.totalPaid)}`} />
            <Row label="Due" value={`${cur} ${money(slip.totalDue)}`} />
            <Row label="Payment status" value={slip.paymentStatus} />
            <Row label="YTD payroll" value={`${cur} ${money(slip.ytdPayroll)}`} />
          </div>

          {slip.payments.length > 0 && (
            <div className="mb-4">
              <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                Payments
              </p>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Ref No</th>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Method</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="w-10 px-3 py-2 print:hidden" />
                    </tr>
                  </thead>
                  <tbody>
                    {slip.payments.map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="px-3 py-2 font-mono">{p.paymentRefNo ?? '—'}</td>
                        <td className="px-3 py-2">{new Date(p.paidOn).toLocaleDateString()}</td>
                        <td className="px-3 py-2 capitalize">{p.method.replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {cur} {money(p.amount)}
                        </td>
                        <td className="px-3 py-2 print:hidden">
                          <Button
                            variant="destructive"
                            size="sm"
                            isLoading={removePayment.isPending && removePayment.variables === p.id}
                            onClick={() =>
                              window.confirm(
                                `Delete this payment of ${cur} ${money(p.amount)}? The payment status will be recalculated.`,
                              ) && removePayment.mutate(p.id)
                            }
                            title="Delete payment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {hasBank && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                Bank details
              </p>
              <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {Object.entries(bank)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <Row key={k} label={humanizeKey(k)} value={String(v)} />
                  ))}
              </div>
            </div>
          )}
          </div>
        </div>
      )}
    </Modal>
  );
}

/** "accountHolderName" / "account_holder_name" -> "Account holder name". */
function humanizeKey(k: string): string {
  const spaced = k
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed py-1">
      <span className="capitalize text-muted-foreground">{label}</span>
      <span className="text-right font-medium capitalize">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
