import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { formatMoney } from '@/lib/currency';
import { getSell } from '../sells.api';
import { PaymentBadge, SellStatusBadge } from './SellBadges';

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '—');

export function SellViewModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data: p, isLoading } = useQuery({ queryKey: ['sell', id], queryFn: () => getSell(id as number), enabled: id != null });
  return (
    <Modal open={id != null} onClose={onClose} title={p ? `Sale ${p.refNo}` : 'Sale'} description={p ? `${p.customer?.name ?? ''} · ${p.location}` : undefined} className="max-w-5xl">
      {isLoading || !p ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <SellStatusBadge status={p.status} />
            <PaymentBadge status={p.paymentStatus} />
            <span className="text-muted-foreground">{fmtDate(p.transactionDate)}</span>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Unit price</th><th className="px-3 py-2 text-right">Tax/unit</th><th className="px-3 py-2 text-right">Line total</th></tr>
              </thead>
              <tbody className="divide-y">
                {p.lines.map((l, i) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2"><div className="font-medium">{l.product}</div>{l.variation && <div className="text-xs text-muted-foreground">{l.variation}</div>}<div className="text-xs text-muted-foreground">{l.sku}</div></td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(l.unitPriceIncTax)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(l.itemTax)}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{formatMoney(l.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ml-auto max-w-xs space-y-1 rounded-lg border p-3 text-sm">
            <Row label="Subtotal (incl. line tax)" value={formatMoney(p.lineSubtotal)} />
            {p.discountAmount > 0 && <Row label="Order discount" value={`(−) ${formatMoney(p.discountType === 'percentage' ? (p.lineSubtotal * p.discountAmount) / 100 : p.discountAmount)}`} />}
            {p.taxAmount > 0 && <Row label="Order tax" value={`(+) ${formatMoney(p.taxAmount)}`} />}
            {p.shippingCharges > 0 && <Row label="Shipping" value={`(+) ${formatMoney(p.shippingCharges)}`} />}
            <div className="mt-1 border-t pt-1"><Row label="Total payable" value={formatMoney(p.finalTotal)} strong /><Row label="Received" value={formatMoney(p.paid)} /><Row label="Due" value={formatMoney(p.due)} strong danger={p.due > 0} /></div>
          </div>
          {p.additionalNotes && <div className="rounded-lg border p-3 text-sm"><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Note</div><p className="mt-1 whitespace-pre-wrap">{p.additionalNotes}</p></div>}
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Payments</div>
            {p.payments.length === 0 ? <p className="text-sm text-muted-foreground">No payments recorded.</p> : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Method</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-left">Note</th></tr></thead>
                  <tbody className="divide-y">{p.payments.map((x) => <tr key={x.id}><td className="px-3 py-2">{fmtDate(x.paidOn)}</td><td className="px-3 py-2 capitalize">{x.method.replace(/_/g, ' ')}</td><td className="px-3 py-2 text-right tabular-nums">{formatMoney(x.amount)}</td><td className="px-3 py-2 text-muted-foreground">{x.note || '—'}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
function Row({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return <div className="flex justify-between gap-3 py-0.5"><span className="text-muted-foreground">{label}</span><span className={`tabular-nums ${strong ? 'font-semibold' : ''} ${danger ? 'text-destructive' : ''}`}>{value}</span></div>;
}
