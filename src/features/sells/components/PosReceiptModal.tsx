import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatMoney } from '@/lib/currency';
import type { SellDetail } from '../sells.api';

const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

/**
 * A POS sale receipt — GOURI prints one after checkout. Shown as a preview after a sale completes
 * (and reachable from Recent Transactions); the Print button renders a self-contained 80mm slip in a
 * fresh window and calls the browser print dialog, so no page CSS bleeds into the printout.
 */
export function PosReceiptModal({ sell, businessName, onClose, onNewSale }: {
  sell: SellDetail;
  businessName: string;
  onClose: () => void;
  onNewSale?: () => void;
}) {
  const change = Math.max(0, sell.paid - sell.finalTotal);

  const print = () => {
    const w = window.open('', '_blank', 'width=380,height=640');
    if (!w) return;
    const rows = sell.lines
      .map(
        (l) => `<tr><td>${escapeHtml(l.product)}${l.variation ? ` (${escapeHtml(l.variation)})` : ''}<br><span class="muted">${l.quantity} × ${formatMoney(l.unitPriceIncTax)}</span></td><td class="r">${formatMoney(l.lineTotal)}</td></tr>`,
      )
      .join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(sell.refNo)}</title>
<style>
  *{font-family:'Courier New',monospace;font-size:12px;color:#000}
  body{margin:0;padding:8px;width:280px}
  h2{font-size:15px;text-align:center;margin:2px 0}
  .center{text-align:center}.muted{color:#555;font-size:11px}
  table{width:100%;border-collapse:collapse}.r{text-align:right}
  td{padding:2px 0;vertical-align:top}
  hr{border:none;border-top:1px dashed #000;margin:6px 0}
  .tot td{font-weight:bold}
</style></head><body>
  <h2>${escapeHtml(businessName)}</h2>
  <div class="center muted">${escapeHtml(sell.location)}</div>
  <hr>
  <div>Invoice: ${escapeHtml(sell.refNo)}</div>
  <div>Date: ${fmtDate(sell.transactionDate)}</div>
  <div>Customer: ${escapeHtml(sell.customer?.name ?? 'Walk-In Customer')}</div>
  <hr>
  <table>${rows}</table>
  <hr>
  <table>
    <tr><td>Subtotal</td><td class="r">${formatMoney(sell.lineSubtotal)}</td></tr>
    ${sell.discountAmount ? `<tr><td>Discount</td><td class="r">-${formatMoney(sell.discountAmount)}</td></tr>` : ''}
    ${sell.taxAmount ? `<tr><td>Tax</td><td class="r">${formatMoney(sell.taxAmount)}</td></tr>` : ''}
    ${sell.shippingCharges ? `<tr><td>Shipping</td><td class="r">${formatMoney(sell.shippingCharges)}</td></tr>` : ''}
    <tr class="tot"><td>Total</td><td class="r">${formatMoney(sell.finalTotal)}</td></tr>
    <tr><td>Paid</td><td class="r">${formatMoney(sell.paid)}</td></tr>
    ${change ? `<tr><td>Change</td><td class="r">${formatMoney(change)}</td></tr>` : ''}
    ${sell.due > 0 ? `<tr><td>Due</td><td class="r">${formatMoney(sell.due)}</td></tr>` : ''}
  </table>
  <hr>
  <div class="center muted">Thank you!</div>
  <script>window.onload=function(){window.print();}</script>
</body></html>`);
    w.document.close();
  };

  return (
    <Modal open onClose={onClose} title={`Sale ${sell.refNo} completed`} description={`${sell.customer?.name ?? 'Walk-In Customer'} · ${sell.location}`} className="max-w-sm">
      <div className="space-y-3">
        <div className="rounded-lg border p-3 font-mono text-xs">
          <div className="text-center text-sm font-semibold">{businessName}</div>
          <div className="mb-2 text-center text-muted-foreground">{sell.location}</div>
          <div className="border-t border-dashed pt-2">
            {sell.lines.map((l) => (
              <div key={l.id} className="flex justify-between gap-2 py-0.5">
                <span className="min-w-0 truncate">{l.quantity} × {l.product}</span>
                <span className="tabular-nums">{formatMoney(l.lineTotal)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-0.5 border-t border-dashed pt-2">
            <Line label="Total" value={formatMoney(sell.finalTotal)} bold />
            <Line label="Paid" value={formatMoney(sell.paid)} />
            {change > 0 && <Line label="Change" value={formatMoney(change)} />}
            {sell.due > 0 && <Line label="Due" value={formatMoney(sell.due)} />}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {onNewSale && <Button type="button" variant="outline" size="sm" onClick={onNewSale}>New sale</Button>}
          <Button type="button" size="sm" onClick={print}><Printer className="h-4 w-4" />Print receipt</Button>
        </div>
      </div>
    </Modal>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className={`flex justify-between gap-2 ${bold ? 'font-semibold' : ''}`}><span>{label}</span><span className="tabular-nums">{value}</span></div>;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
