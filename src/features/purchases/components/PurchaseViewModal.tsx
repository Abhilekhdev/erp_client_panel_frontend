import { useQuery } from '@tanstack/react-query';
import { Pencil, Printer } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { usePermissions } from '@/features/auth/usePermission';
import { formatMoney } from '@/lib/currency';
import { getPurchase } from '../purchases.api';
import { ApprovalBadge, PaymentBadge, StatusBadge } from './PurchaseBadges';

/**
 * Print the document by handing the rendered markup to a fresh window.
 *
 * The alternative — a print stylesheet that hides the rest of the app — has to keep working as
 * every other page changes. A detached window only ever contains this one document.
 */
function printNode(node: HTMLElement, title: string) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title><style>
    body { font: 13px/1.5 system-ui, sans-serif; margin: 24px; color: #111; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f4f4f5; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
    .text-right, [class*="text-right"] { text-align: right; }
    button { display: none; }
  </style></head><body>${node.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  // Give the new document a tick to lay out before the print dialog measures it.
  setTimeout(() => {
    w.print();
    w.close();
  }, 250);
}

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '—';

/** Read-only document view — GOURI's `purchase/show` modal, same sections in the same order. */
export function PurchaseViewModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const navigate = useNavigate();
  const { has } = usePermissions();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: p, isLoading } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => getPurchase(id as number),
    enabled: id != null,
  });

  return (
    <Modal
      open={id != null}
      onClose={onClose}
      title={p ? `Purchase ${p.refNo}` : 'Purchase'}
      description={p ? `${p.supplier?.name ?? ''} · ${p.location}` : undefined}
      className="max-w-5xl"
      footer={
        p && (
          <>
            {has('purchase.update') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(`/purchases/${p.id}/edit`);
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => printRef.current && printNode(printRef.current, `Purchase ${p.refNo}`)}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          </>
        )
      }
    >
      {isLoading || !p ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div ref={printRef} className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-3">
            <Facts
              title="Supplier"
              rows={[
                ['Name', p.supplier?.name ?? '—'],
                ['Mobile', p.supplier?.mobile || '—'],
              ]}
            />
            <Facts
              title="Document"
              rows={[
                ['Reference no', p.refNo],
                ['Date', formatDate(p.transactionDate)],
                ['Location', p.location],
              ]}
            />
            <div className="space-y-2 rounded-lg border p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={p.status} />
                <PaymentBadge status={p.paymentStatus} />
                <ApprovalBadge isApproved={p.isApproved} />
              </div>
              {!p.isApproved && (
                <p className="text-xs text-muted-foreground">
                  Stock is not counted until this purchase is approved.
                </p>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-left">SKU</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Unit cost</th>
                  <th className="px-3 py-2 text-right">Disc %</th>
                  <th className="px-3 py-2 text-right">Tax/unit</th>
                  <th className="px-3 py-2 text-right">Net cost</th>
                  <th className="px-3 py-2 text-right">Line total</th>
                  <th className="px-3 py-2 text-right" title="Quantity from this lot still on hand">
                    Remaining
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {p.lines.map((l, i) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{l.product}</div>
                      {l.variation && <div className="text-xs text-muted-foreground">{l.variation}</div>}
                      {(l.lotNumber || l.expDate) && (
                        <div className="text-xs text-muted-foreground">
                          {l.lotNumber && `Lot ${l.lotNumber}`}
                          {l.lotNumber && l.expDate ? ' · ' : ''}
                          {l.expDate && `Exp ${formatDate(l.expDate)}`}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{l.sku}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(l.ppWithoutDiscount)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.discountPercent}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(l.itemTax)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatMoney(l.purchasePriceIncTax)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">
                      {formatMoney(l.lineTotal)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {l.quantityRemaining}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <Block title="Shipping details" body={p.shippingDetails || '—'} />
              <Block title="Additional notes" body={p.additionalNotes || '—'} />
            </div>

            <div className="rounded-lg border p-3 text-sm">
              <Row label="Net total (incl. line tax)" value={formatMoney(p.lineSubtotal)} />
              {p.discountAmount > 0 && (
                <Row
                  label={`Discount${p.discountType === 'percentage' ? ` (${p.discountAmount}%)` : ''}`}
                  value={`(−) ${formatMoney(
                    p.discountType === 'percentage'
                      ? (p.lineSubtotal * p.discountAmount) / 100
                      : p.discountAmount,
                  )}`}
                />
              )}
              {p.taxAmount > 0 && (
                <Row label={`Purchase tax${p.tax ? ` (${p.tax.name})` : ''}`} value={`(+) ${formatMoney(p.taxAmount)}`} />
              )}
              {p.shippingCharges > 0 && (
                <Row label="Shipping" value={`(+) ${formatMoney(p.shippingCharges)}`} />
              )}
              {p.additionalExpenses.map((e, i) => (
                <Row key={i} label={e.name || `Expense ${i + 1}`} value={`(+) ${formatMoney(e.amount)}`} />
              ))}
              <div className="mt-2 border-t pt-2">
                <Row label="Purchase total" value={formatMoney(p.finalTotal)} strong />
                <Row label="Paid" value={formatMoney(p.paid)} />
                <Row label="Due" value={formatMoney(p.due)} strong danger={p.due > 0} />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Payments
            </div>
            {p.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Reference</th>
                      <th className="px-3 py-2 text-left">Method</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-left">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {p.payments.map((x) => (
                      <tr key={x.id}>
                        <td className="px-3 py-2">{formatDate(x.paidOn)}</td>
                        <td className="px-3 py-2 font-mono text-xs">{x.paymentRefNo || '—'}</td>
                        <td className="px-3 py-2 capitalize">{x.method.replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(x.amount)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{x.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Facts({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{k}</span>
          <span className="text-right font-medium">{v}</span>
        </div>
      ))}
    </div>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      <p className="mt-1 whitespace-pre-wrap text-sm">{body}</p>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  danger,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`tabular-nums ${strong ? 'font-semibold' : ''} ${danger ? 'text-destructive' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
