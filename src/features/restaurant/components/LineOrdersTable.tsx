import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import type { LineOrder } from '../restaurant.api';

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
const STATUS_VARIANT: Record<LineOrder['status'], 'secondary' | 'warning' | 'success'> = {
  received: 'secondary',
  cooked: 'warning',
  served: 'success',
};

/** Shared kitchen/orders line list — one row per sell line with its status + a contextual action. */
export function LineOrdersTable({ rows, loading, emptyMessage, action }: {
  rows: LineOrder[];
  loading: boolean;
  emptyMessage: string;
  action: (row: LineOrder) => ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <THead>
          <TR className="bg-muted/40 hover:bg-muted/40">
            <TH>Product</TH>
            <TH>Qty</TH>
            <TH>Table</TH>
            <TH>Invoice</TH>
            <TH>Customer</TH>
            <TH>Status</TH>
            <TH className="text-right">Action</TH>
          </TR>
        </THead>
        <TBody>
          {loading ? (
            <TR><TD colSpan={7} className="py-10 text-center text-muted-foreground">Loading…</TD></TR>
          ) : rows.length === 0 ? (
            <TR className="hover:bg-transparent"><TD colSpan={7} className="py-12 text-center text-sm text-muted-foreground">{emptyMessage}</TD></TR>
          ) : (
            rows.map((r) => (
              <TR key={r.lineId}>
                <TD className="font-medium">{r.product}{r.note ? <span className="block text-xs text-muted-foreground">{r.note}</span> : null}</TD>
                <TD className="tabular-nums">{r.quantity}</TD>
                <TD>{r.table ?? '—'}</TD>
                <TD className="font-mono text-xs">{r.refNo}<span className="block text-muted-foreground">{fmt(r.date)}</span></TD>
                <TD>{r.customer || '—'}</TD>
                <TD><Badge variant={STATUS_VARIANT[r.status]} className="capitalize">{r.status}</Badge></TD>
                <TD className="text-right">{action(r)}</TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
