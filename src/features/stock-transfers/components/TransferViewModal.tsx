import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { formatMoney } from '@/lib/currency';
import { getTransfer, type TransferStatus } from '../stock-transfers.api';

/** Print the document by handing the rendered markup to a fresh window (same pattern as purchases). */
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
  setTimeout(() => {
    w.print();
    w.close();
  }, 250);
}

const STATUS: Record<TransferStatus, { label: string; variant: 'secondary' | 'warning' | 'success' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  in_transit: { label: 'In transit', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
};
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

/** Read-only detail view — mirrors GOURI's "Stock transfer details" modal, incl. the Activities log. */
export function TransferViewModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: t, isLoading } = useQuery({
    queryKey: ['transfer', id],
    queryFn: () => getTransfer(id as number),
    enabled: id != null,
  });
  const st = t ? STATUS[t.status] : null;

  return (
    <Modal
      open={id != null}
      onClose={onClose}
      title={t ? `Stock transfer details — ${t.refNo}` : 'Stock transfer'}
      className="max-w-3xl"
      footer={
        t && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => printRef.current && printNode(printRef.current, `Stock Transfer ${t.refNo}`)}
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          </>
        )
      }
    >
      {isLoading || !t ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div ref={printRef} className="space-y-5 text-sm">
          {/* From / To / Ref header */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Location (From)</p>
              <p className="font-semibold">{t.fromLocation}</p>
              {t.fromAddress && <p className="text-xs text-muted-foreground">{t.fromAddress}</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Location (To)</p>
              <p className="font-semibold">{t.toLocation}</p>
              {t.toAddress && <p className="text-xs text-muted-foreground">{t.toAddress}</p>}
            </div>
            <div className="space-y-0.5">
              <p className="text-xs">
                <span className="text-muted-foreground">Reference No: </span>
                <span className="font-semibold">{t.refNo}</span>
              </p>
              <p className="text-xs">
                <span className="text-muted-foreground">Date: </span>
                {new Date(t.transactionDate).toLocaleDateString()}
              </p>
              <p className="text-xs">
                <span className="text-muted-foreground">Status: </span>
                {st && <Badge variant={st.variant}>{st.label}</Badge>}
              </p>
            </div>
          </div>

          {/* Lines */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 text-right font-medium">Quantity</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {t.lines.map((l, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      {l.productName}
                      {l.variationName && <span className="text-muted-foreground"> — {l.variationName}</span>}
                      {l.subSku && <span className="ml-1 text-xs text-muted-foreground">({l.subSku})</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(l.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="ml-auto max-w-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Total Amount:</span>
              <span className="tabular-nums">{formatMoney(t.lineSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Additional Shipping charges: (+)</span>
              <span className="tabular-nums">{formatMoney(t.shippingCharges)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Purchase Total:</span>
              <span className="tabular-nums">{formatMoney(t.totalAmount)}</span>
            </div>
          </div>

          {/* Additional notes */}
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Additional Notes:</p>
            <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">{t.additionalNotes || '--'}</div>
          </div>

          {/* Activities — who did what */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Activities:</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1 font-medium">Date</th>
                  <th className="py-1 font-medium">Action</th>
                  <th className="py-1 font-medium">By</th>
                  <th className="py-1 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="py-2">{fmtDate(t.createdAt)}</td>
                  <td className="py-2">Added</td>
                  <td className="py-2 font-medium">{t.createdByName || '—'}</td>
                  <td className="py-2">{st && <Badge variant={st.variant}>{st.label}</Badge>}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
