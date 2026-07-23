import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { formatMoney } from '@/lib/currency';
import { getContactLedger } from '../contacts.api';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });

/** The contact's running statement — GOURI's ledger (format_1): debit/credit rows + a running balance. */
export function ContactLedgerPage() {
  const { id } = useParams();
  const contactId = Number(id);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contact-ledger', contactId, dateFrom, dateTo],
    queryFn: () => getContactLedger(contactId, { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
  });

  const balanceLabel = (n: number) => {
    if (Math.abs(n) < 0.005) return 'Settled';
    return n > 0 ? `${formatMoney(n)} owed to you` : `${formatMoney(-n)} you owe`;
  };

  return (
    <div>
      <PageHeader
        title="Ledger"
        description={data?.contact.name}
        breadcrumbs={[{ label: 'Contacts' }, { label: 'Ledger' }]}
      />

      <Card className="mb-4 flex flex-wrap items-end gap-4 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-40" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-40" />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Clear</Button>
        )}
      </Card>

      {isLoading || !data ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Opening balance" value={balanceLabel(-data.openingBalance)} />
            <Stat label="Total invoiced / purchased" value={formatMoney(data.totalInvoice + data.totalPurchase)} />
            <Stat label="Total paid" value={formatMoney(data.totalPaid)} />
            <Stat label="Balance due" value={balanceLabel(data.balanceDue)} strong danger={data.balanceDue > 0} />
          </div>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Date</th>
                    <th className="px-4 py-2.5 text-left">Reference</th>
                    <th className="px-4 py-2.5 text-left">Type</th>
                    <th className="px-4 py-2.5 text-left">Location</th>
                    <th className="px-4 py-2.5 text-right">Debit</th>
                    <th className="px-4 py-2.5 text-right">Credit</th>
                    <th className="px-4 py-2.5 text-right">Balance</th>
                    <th className="px-4 py-2.5 text-left">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.rows.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No transactions in this range.</td></tr>
                  ) : (
                    data.rows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(r.date)}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{r.refNo || '—'}</td>
                        <td className="px-4 py-2.5">{r.label}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{r.location || '—'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.debit ? formatMoney(r.debit) : ''}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.credit ? formatMoney(r.credit) : ''}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                          {formatMoney(Math.abs(r.balance))} <span className="text-xs text-muted-foreground">{r.balance < 0 ? 'Dr' : r.balance > 0 ? 'Cr' : ''}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {r.method ? <span className="capitalize">{r.method.replace(/_/g, ' ')}</span> : r.paymentStatus ? <span className="capitalize">{r.paymentStatus}</span> : ''}
                          {r.note ? ` · ${r.note}` : ''}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="text-xs text-muted-foreground">
            Balance is shown as <strong>Dr</strong> (the contact owes you) or <strong>Cr</strong> (you owe them).
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-base ${strong ? 'font-semibold' : 'font-medium'} ${danger ? 'text-destructive' : ''}`}>{value}</div>
    </div>
  );
}
