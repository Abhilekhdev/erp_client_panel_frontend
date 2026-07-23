import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { formatMoney } from '@/lib/currency';
import { getSalesOrder } from '../orders.api';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '—');

export function SalesOrderViewModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data: p, isLoading } = useQuery({ queryKey: ['sales-order', id], queryFn: () => getSalesOrder(id as number), enabled: id != null });
  return (
    <Modal open={id != null} onClose={onClose} title={p ? `Sales order ${p.refNo}` : 'Sales order'} description={p ? `${p.customer?.name ?? ''} · ${p.location}` : undefined} className="max-w-4xl">
      {isLoading || !p ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={p.status === 'completed' ? 'success' : p.status === 'partial' ? 'warning' : 'default'}>{p.status}</Badge>
            {p.shippingStatus && <Badge variant="secondary">Shipping: {p.shippingStatus}</Badge>}
            <span className="text-muted-foreground">Ordered {fmtDate(p.transactionDate)} · delivery {fmtDate(p.deliveryDate)}</span>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-right">Ordered</th><th className="px-3 py-2 text-right">Invoiced</th><th className="px-3 py-2 text-right">Remaining</th><th className="px-3 py-2 text-right">Unit price</th><th className="px-3 py-2 text-right">Line total</th></tr></thead>
              <tbody className="divide-y">
                {p.lines.map((l, i) => (
                  <tr key={l.id}><td className="px-3 py-2 text-muted-foreground">{i + 1}</td><td className="px-3 py-2"><div className="font-medium">{l.product}</div>{l.variation && <div className="text-xs text-muted-foreground">{l.variation}</div>}<div className="text-xs text-muted-foreground">{l.sku}</div></td><td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td><td className="px-3 py-2 text-right tabular-nums">{l.quantityInvoiced}</td><td className="px-3 py-2 text-right tabular-nums">{l.quantityRemaining}</td><td className="px-3 py-2 text-right tabular-nums">{formatMoney(l.unitPriceIncTax)}</td><td className="px-3 py-2 text-right font-medium tabular-nums">{formatMoney(l.lineTotal)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ml-auto max-w-xs space-y-1 rounded-lg border p-3 text-sm">
            <Row label="Subtotal (incl. line tax)" value={formatMoney(p.lineSubtotal)} />
            {p.taxAmount > 0 && <Row label="Order tax" value={`(+) ${formatMoney(p.taxAmount)}`} />}
            {p.shippingCharges > 0 && <Row label="Shipping" value={`(+) ${formatMoney(p.shippingCharges)}`} />}
            <div className="mt-1 border-t pt-1"><Row label="Order total" value={formatMoney(p.finalTotal)} strong /></div>
          </div>
          {(p.shippingDetails || p.additionalNotes) && <div className="grid gap-3 sm:grid-cols-2">{p.shippingDetails && <div className="rounded-lg border p-3 text-sm"><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Shipping</div><p className="mt-1">{p.shippingDetails}</p></div>}{p.additionalNotes && <div className="rounded-lg border p-3 text-sm"><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</div><p className="mt-1 whitespace-pre-wrap">{p.additionalNotes}</p></div>}</div>}
        </div>
      )}
    </Modal>
  );
}
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex justify-between gap-3 py-0.5"><span className="text-muted-foreground">{label}</span><span className={`tabular-nums ${strong ? 'font-semibold' : ''}`}>{value}</span></div>;
}
