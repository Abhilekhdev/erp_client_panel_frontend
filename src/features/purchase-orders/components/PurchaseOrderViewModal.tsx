import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { formatMoney } from '@/lib/currency';
import { getPurchaseOrder } from '../orders.api';

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '—';

export function PurchaseOrderViewModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data: p, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => getPurchaseOrder(id as number),
    enabled: id != null,
  });

  return (
    <Modal
      open={id != null}
      onClose={onClose}
      title={p ? `Purchase order ${p.refNo}` : 'Purchase order'}
      description={p ? `${p.supplier?.name ?? ''} · ${p.location}` : undefined}
      className="max-w-4xl"
    >
      {isLoading || !p ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={p.status === 'completed' ? 'success' : p.status === 'partial' ? 'warning' : 'default'}>
              {p.status}
            </Badge>
            {p.shippingStatus && <Badge variant="secondary">Shipping: {p.shippingStatus}</Badge>}
            <span className="text-muted-foreground">
              Ordered {formatDate(p.transactionDate)} · delivery {formatDate(p.deliveryDate)}
            </span>
          </div>

          {p.requisitions.length > 0 && (
            <p className="text-xs text-muted-foreground">
              From requisition{p.requisitions.length > 1 ? 's' : ''}: {p.requisitions.map((r) => r.refNo).join(', ')}
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-right">Ordered</th>
                  <th className="px-3 py-2 text-right">Received</th>
                  <th className="px-3 py-2 text-right">Remaining</th>
                  <th className="px-3 py-2 text-right">Unit cost</th>
                  <th className="px-3 py-2 text-right">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {p.lines.map((l, i) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{l.product}</div>
                      {l.variation && <div className="text-xs text-muted-foreground">{l.variation}</div>}
                      <div className="text-xs text-muted-foreground">{l.sku}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.quantityReceived}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.quantityRemaining}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(l.purchasePriceIncTax)}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{formatMoney(l.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto max-w-xs space-y-1 rounded-lg border p-3 text-sm">
            <Row label="Net total (incl. line tax)" value={formatMoney(p.lineSubtotal)} />
            {p.discountAmount > 0 && (
              <Row
                label={`Discount${p.discountType === 'percentage' ? ` (${p.discountAmount}%)` : ''}`}
                value={`(−) ${formatMoney(
                  p.discountType === 'percentage' ? (p.lineSubtotal * p.discountAmount) / 100 : p.discountAmount,
                )}`}
              />
            )}
            {p.taxAmount > 0 && <Row label="Purchase tax" value={`(+) ${formatMoney(p.taxAmount)}`} />}
            {p.shippingCharges > 0 && <Row label="Shipping" value={`(+) ${formatMoney(p.shippingCharges)}`} />}
            <div className="mt-1 border-t pt-1">
              <Row label="Order total" value={formatMoney(p.finalTotal)} strong />
            </div>
          </div>

          {(p.shippingDetails || p.shippingAddress || p.deliveredTo || p.additionalNotes) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(p.shippingDetails || p.shippingAddress || p.deliveredTo) && (
                <div className="rounded-lg border p-3 text-sm">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Shipping</div>
                  {p.shippingDetails && <p className="mt-1">{p.shippingDetails}</p>}
                  {p.shippingAddress && <p className="mt-1 whitespace-pre-wrap">{p.shippingAddress}</p>}
                  {p.deliveredTo && <p className="mt-1 text-muted-foreground">Delivered to: {p.deliveredTo}</p>}
                </div>
              )}
              {p.additionalNotes && (
                <div className="rounded-lg border p-3 text-sm">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</div>
                  <p className="mt-1 whitespace-pre-wrap">{p.additionalNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}
