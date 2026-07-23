import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { accountsDropdown, cashFlow } from '../accounts.api';
import { money, subTypeLabel } from '../format';
import { useReportFilters } from '../components/useReportFilters';

export function CashFlowPage() {
  const { data: accounts } = useQuery({ queryKey: ['accounts-dropdown'], queryFn: accountsDropdown });
  const { filters, controls } = useReportFilters(accounts ?? []);
  const { data } = useQuery({
    queryKey: ['cash-flow', filters],
    queryFn: () => cashFlow(filters),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Cash Flow"
        description="Every movement across your payment accounts, with a running balance."
        breadcrumbs={[{ label: 'Payment Accounts' }, { label: 'Cash Flow' }]}
      />
      {controls}

      {data && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Total In (Credit)</p>
              <p className="text-xl font-semibold tabular-nums text-emerald-600">{money(data.totals.totalCredit)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Total Out (Debit)</p>
              <p className="text-xl font-semibold tabular-nums text-destructive">{money(data.totals.totalDebit)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Net Balance</p>
              <p className="text-xl font-semibold tabular-nums">{money(data.totals.balance)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <THead>
            <TR className="bg-muted/40 hover:bg-muted/40">
              <TH>Date</TH>
              <TH>Account</TH>
              <TH>Type</TH>
              <TH>Ref</TH>
              <TH className="text-right">Debit</TH>
              <TH className="text-right">Credit</TH>
              <TH className="text-right">Balance</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.data ?? []).length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No account movements for this filter.
                </TD>
              </TR>
            ) : (
              data!.data.map((r) => (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</TD>
                  <TD className="font-medium">{r.account}</TD>
                  <TD className="text-muted-foreground">{subTypeLabel(r.subType)}</TD>
                  <TD className="text-muted-foreground">{r.refNo ?? '—'}</TD>
                  <TD className="text-right tabular-nums">{r.debit ? money(r.debit) : '—'}</TD>
                  <TD className="text-right tabular-nums">{r.credit ? money(r.credit) : '—'}</TD>
                  <TD className="text-right font-medium tabular-nums">{money(r.balance)}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
