import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { balanceSheet } from '../accounts.api';
import { money } from '../format';
import { PendingNote } from '../components/PendingNote';

export function BalanceSheetPage() {
  const { data } = useQuery({ queryKey: ['balance-sheet'], queryFn: balanceSheet });

  const assets = data
    ? data.assets.paymentAccounts + data.assets.closingStock + data.assets.customerDue
    : 0;
  const liabilities = data ? data.liabilities.supplierDue : 0;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Balance Sheet"
        description="Assets and liabilities at a glance."
        breadcrumbs={[{ label: 'Payment Accounts' }, { label: 'Balance Sheet' }]}
      />

      {data && <PendingNote items={data.pending} />}

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Row label="Payment accounts" value={data?.assets.paymentAccounts ?? 0} />
            <Row label="Closing stock (pending)" value={data?.assets.closingStock ?? 0} muted />
            <Row label="Customer receivables (pending)" value={data?.assets.customerDue ?? 0} muted />
            <div className="mt-2 border-t pt-2">
              <Row label="Total assets" value={assets} bold />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Liabilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Row label="Supplier payables" value={data?.liabilities.supplierDue ?? 0} />
            <div className="mt-2 border-t pt-2">
              <Row label="Total liabilities" value={liabilities} bold />
            </div>
            <div className="mt-4 rounded-lg bg-muted/40 p-3">
              <Row label="Net worth" value={assets - liabilities} bold />
            </div>
          </CardContent>
        </Card>
      </div>

      {data && data.assets.accounts.length > 0 && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">Account balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.assets.accounts.map((a) => (
              <Row key={a.id} label={`${a.name} (${a.accountNumber})`} value={a.balance} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={muted ? 'text-muted-foreground' : ''}>{label}</span>
      <span className={`tabular-nums ${bold ? 'font-semibold' : ''} ${muted ? 'text-muted-foreground' : ''}`}>
        {money(value)}
      </span>
    </div>
  );
}
