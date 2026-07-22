import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatMoney } from '@/lib/currency';
import type { PurchaseMeta } from '../purchases.api';
import type { LineRow } from '../usePurchaseForm';

/**
 * The line table. Every editable box maps to one GOURI column, in GOURI's order, and the three
 * price boxes stay mutually consistent: edit any one and the other two are back-computed
 * (`update_purchase_entry_row_values` in purchase.js).
 */
export function PurchaseLinesTable({
  lines,
  meta,
  onChange,
  onRemove,
}: {
  lines: LineRow[];
  meta: PurchaseMeta;
  onChange: (id: string, patch: Partial<LineRow>, field?: keyof LineRow) => void;
  onRemove: (id: string) => void;
}) {
  const s = meta.settings;

  if (lines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
        No products added yet. Search above to add the first line.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-2 py-2 text-left">#</th>
            <th className="px-2 py-2 text-left">Product</th>
            <th className="px-2 py-2 text-right">Quantity</th>
            {s.enableSubUnits && <th className="px-2 py-2 text-left">Unit</th>}
            <th className="px-2 py-2 text-right">Unit cost (before discount)</th>
            <th className="px-2 py-2 text-right">Discount %</th>
            <th className="px-2 py-2 text-right">Unit cost (before tax)</th>
            {s.enableInlineTax && <th className="px-2 py-2 text-left">Product tax</th>}
            {s.enableInlineTax && <th className="px-2 py-2 text-right">Net cost</th>}
            {s.enableEditingProductFromPurchase && <th className="px-2 py-2 text-right">Margin %</th>}
            {s.enableEditingProductFromPurchase && (
              <th className="px-2 py-2 text-right">Sell price (inc tax)</th>
            )}
            {s.enableLotNumber && <th className="px-2 py-2 text-left">Lot no.</th>}
            {s.enableProductExpiry && s.showMfgDate && <th className="px-2 py-2 text-left">Mfg date</th>}
            {s.enableProductExpiry && <th className="px-2 py-2 text-left">Exp date</th>}
            <th className="px-2 py-2 text-right">Line total</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {lines.map((l, i) => (
            <tr key={l.id} className="align-top">
              <td className="px-2 py-2 text-muted-foreground">{i + 1}</td>
              <td className="px-2 py-2">
                <div className="min-w-[180px] font-medium">
                  {l.name}
                  {l.variation ? <span className="text-muted-foreground"> · {l.variation}</span> : ''}
                </div>
                <div className="text-xs text-muted-foreground">
                  {l.sku}
                  {l.enableStock && l.currentStock != null
                    ? ` · In stock: ${l.currentStock} ${l.unitName}`
                    : ' · Stock not tracked'}
                </div>
                {l.lastPurchase && (
                  <div className="text-xs text-muted-foreground">
                    Last paid: {formatMoney(l.lastPurchase.price)}
                    {l.lastPurchase.discountPercent > 0
                      ? ` less ${l.lastPurchase.discountPercent}%`
                      : ''}
                  </div>
                )}
              </td>

              <td className="px-2 py-2">
                <Num
                  value={l.quantity}
                  // A unit flagged "no decimals" (a Piece) must not accept 1.5.
                  step={l.allowDecimal ? '0.0001' : '1'}
                  onChange={(v) => onChange(l.id, { quantity: v }, 'quantity')}
                />
              </td>

              {s.enableSubUnits && (
                <td className="px-2 py-2">
                  {l.subUnits.length ? (
                    <Select
                      value={l.subUnitId ?? ''}
                      className="h-9 w-24 text-xs"
                      onChange={(e) =>
                        onChange(l.id, { subUnitId: e.target.value ? Number(e.target.value) : null }, 'subUnitId')
                      }
                    >
                      <option value="">{l.unitName}</option>
                      {l.subUnits.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.shortName}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <span className="text-xs text-muted-foreground">{l.unitName}</span>
                  )}
                </td>
              )}

              <td className="px-2 py-2">
                <Num
                  value={l.ppWithoutDiscount}
                  onChange={(v) => onChange(l.id, { ppWithoutDiscount: v }, 'ppWithoutDiscount')}
                />
              </td>
              <td className="px-2 py-2">
                <Num
                  value={l.discountPercent}
                  onChange={(v) => onChange(l.id, { discountPercent: v }, 'discountPercent')}
                />
              </td>
              <td className="px-2 py-2">
                <Num
                  value={l.purchasePrice}
                  onChange={(v) => onChange(l.id, { purchasePrice: v }, 'purchasePrice')}
                />
              </td>

              {s.enableInlineTax && (
                <td className="px-2 py-2">
                  <Select
                    value={l.taxRateId ?? ''}
                    className="h-9 w-28 text-xs"
                    onChange={(e) =>
                      onChange(l.id, { taxRateId: e.target.value ? Number(e.target.value) : null }, 'taxRateId')
                    }
                  >
                    <option value="">None</option>
                    {meta.taxRates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                  <div className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
                    {formatMoney(l.calc.itemTax)}/unit
                  </div>
                </td>
              )}
              {s.enableInlineTax && (
                <td className="px-2 py-2">
                  <Num
                    value={l.purchasePriceIncTax}
                    onChange={(v) => onChange(l.id, { purchasePriceIncTax: v }, 'purchasePriceIncTax')}
                  />
                </td>
              )}

              {s.enableEditingProductFromPurchase && (
                <td className="px-2 py-2">
                  <Num
                    value={l.profitPercent}
                    onChange={(v) => onChange(l.id, { profitPercent: v }, 'profitPercent')}
                  />
                </td>
              )}
              {s.enableEditingProductFromPurchase && (
                <td className="px-2 py-2">
                  <Num
                    value={l.defaultSellPrice}
                    onChange={(v) => onChange(l.id, { defaultSellPrice: v }, 'defaultSellPrice')}
                  />
                </td>
              )}

              {s.enableLotNumber && (
                <td className="px-2 py-2">
                  <Input
                    value={l.lotNumber}
                    className="h-9 w-24 text-xs"
                    onChange={(e) => onChange(l.id, { lotNumber: e.target.value })}
                  />
                </td>
              )}
              {s.enableProductExpiry && s.showMfgDate && (
                <td className="px-2 py-2">
                  <Input
                    type="date"
                    value={l.mfgDate}
                    className="h-9 w-36 text-xs"
                    onChange={(e) => onChange(l.id, { mfgDate: e.target.value })}
                  />
                </td>
              )}
              {s.enableProductExpiry && (
                <td className="px-2 py-2">
                  <Input
                    type="date"
                    value={l.expDate}
                    className="h-9 w-36 text-xs"
                    onChange={(e) => onChange(l.id, { expDate: e.target.value })}
                  />
                </td>
              )}

              <td className="px-2 py-2 text-right font-medium tabular-nums">
                {formatMoney(l.calc.lineTotal)}
              </td>
              <td className="px-2 py-2 text-right">
                <button
                  type="button"
                  title="Remove line"
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onRemove(l.id)}
                >
                  <X className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Num({
  value,
  onChange,
  step = '0.0001',
}: {
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <Input
      type="number"
      step={step}
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-28 text-right text-xs tabular-nums"
    />
  );
}
