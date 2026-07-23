import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { trialBalance } from '../accounts.api';
import { money } from '../format';
import { PendingNote } from '../components/PendingNote';

export function TrialBalancePage() {
  const { data } = useQuery({ queryKey: ['trial-balance'], queryFn: trialBalance });

  const totalDebit = (data?.accounts ?? []).reduce((a, x) => a + x.debit, 0);
  const totalCredit = (data?.accounts ?? []).reduce((a, x) => a + x.credit, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Trial Balance"
        description="Debit and credit totals across your payment accounts, with purchase/sale summary."
        breadcrumbs={[{ label: 'Payment Accounts' }, { label: 'Trial Balance' }]}
      />

      {data && <PendingNote items={data.pending} />}

      <Card className="mb-5">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <Summary label="Total Purchases" value={data?.summary.purchase ?? 0} />
          <Summary label="Purchase Paid" value={data?.summary.purchasePaid ?? 0} />
          <Summary label="Purchase Due" value={data?.summary.purchaseDue ?? 0} />
          <Summary label="Total Sales (pending)" value={data?.summary.sell ?? 0} muted />
          <Summary label="Sale Received (pending)" value={data?.summary.sellPaid ?? 0} muted />
          <Summary label="Sale Due (pending)" value={data?.summary.sellDue ?? 0} muted />
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <THead>
            <TR className="bg-muted/40 hover:bg-muted/40">
              <TH>Account</TH>
              <TH className="text-right">Debit</TH>
              <TH className="text-right">Credit</TH>
              <TH className="text-right">Balance</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.accounts ?? []).length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                  No accounts yet.
                </TD>
              </TR>
            ) : (
              <>
                {data!.accounts.map((a) => (
                  <TR key={a.id}>
                    <TD className="font-medium">
                      {a.name} <span className="text-muted-foreground">({a.accountNumber})</span>
                    </TD>
                    <TD className="text-right tabular-nums">{money(a.debit)}</TD>
                    <TD className="text-right tabular-nums">{money(a.credit)}</TD>
                    <TD className="text-right font-medium tabular-nums">{money(a.balance)}</TD>
                  </TR>
                ))}
                <TR className="bg-muted/30 font-semibold hover:bg-muted/30">
                  <TD>Total</TD>
                  <TD className="text-right tabular-nums">{money(totalDebit)}</TD>
                  <TD className="text-right tabular-nums">{money(totalCredit)}</TD>
                  <TD className="text-right tabular-nums">{money(totalCredit - totalDebit)}</TD>
                </TR>
              </>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}

function Summary({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${muted ? 'text-muted-foreground' : ''}`}>{money(value)}</p>
    </div>
  );
}
