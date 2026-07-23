import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { accountsDropdown, paymentReport } from '../accounts.api';
import { money } from '../format';
import { useReportFilters } from '../components/useReportFilters';

export function PaymentReportPage() {
  const { data: accounts } = useQuery({ queryKey: ['accounts-dropdown'], queryFn: accountsDropdown });
  const { filters, controls } = useReportFilters(accounts ?? []);
  const { data } = useQuery({ queryKey: ['payment-report', filters], queryFn: () => paymentReport(filters) });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Payment Account Report"
        description="Every payment recorded against your documents."
        breadcrumbs={[{ label: 'Payment Accounts' }, { label: 'Payment Report' }]}
      />
      {controls}

      <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
        Showing purchase-side payments. Sell payments appear here automatically once the Sells module is built.
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <THead>
            <TR className="bg-muted/40 hover:bg-muted/40">
              <TH>Date</TH>
              <TH>Payment Ref</TH>
              <TH>Document</TH>
              <TH>Account</TH>
              <TH>Method</TH>
              <TH className="text-right">Amount</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.data ?? []).length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  No payments for this filter.
                </TD>
              </TR>
            ) : (
              data!.data.map((r) => (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</TD>
                  <TD className="text-muted-foreground">{r.paymentRefNo}</TD>
                  <TD>
                    {r.transactionRefNo ?? '—'}
                    {r.isReturn && <Badge variant="secondary" className="ml-2">Refund</Badge>}
                  </TD>
                  <TD className="text-muted-foreground">{r.account ?? <span className="text-amber-600">Unlinked</span>}</TD>
                  <TD className="capitalize text-muted-foreground">{r.method.replace(/_/g, ' ')}</TD>
                  <TD className="text-right font-medium tabular-nums">{money(r.amount)}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
