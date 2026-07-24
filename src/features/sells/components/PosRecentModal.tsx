import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Pencil, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { formatMoney } from '@/lib/currency';
import { listSells } from '../sells.api';

const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

/** GOURI's "Recent Transactions" — the last handful of sales at this location, with receipt + edit. */
export function PosRecentModal({ locationId, onClose, onReceipt }: {
  locationId?: number;
  onClose: () => void;
  onReceipt: (id: number) => void;
}) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['recent-sells', locationId],
    queryFn: () => listSells({ page: 1, pageSize: 15, search: '', locationId, status: 'final' }),
  });
  const rows = data?.data ?? [];

  return (
    <Modal open onClose={onClose} title="Recent transactions" description="The latest sales at this location." className="max-w-2xl">
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No recent sales.</p>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Invoice</th>
                <th className="px-3 py-2 text-left">Customer</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Due</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs">{r.refNo}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(r.transactionDate)}</div>
                  </td>
                  <td className="px-3 py-2">{r.customer || 'Walk-In Customer'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(r.finalTotal)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${r.due > 0 ? 'text-destructive' : ''}`}>{formatMoney(r.due)}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="outline" size="sm" title="Receipt" onClick={() => onReceipt(r.id)}><Receipt className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="sm" title="Edit" onClick={() => navigate(`/sales/${r.id}/edit`)}><Pencil className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
