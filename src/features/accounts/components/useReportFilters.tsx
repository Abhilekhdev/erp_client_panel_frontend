import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

/** Shared account + date-range filter bar for the account reports (Cash Flow, Payment Report). */
export function useReportFilters(accounts: { id: number; name: string }[]) {
  const [accountId, setAccountId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filters = useMemo(
    () => ({
      accountId: accountId ? Number(accountId) : undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [accountId, from, to],
  );

  const controls = (
    <Card className="mb-4">
      <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Account</Label>
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </CardContent>
    </Card>
  );

  return { filters, controls };
}
