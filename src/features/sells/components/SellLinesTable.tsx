import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatMoney } from '@/lib/currency';
import type { SellMeta } from '../sells.api';
import type { SellLineRow } from '../useSellForm';

/** The sell line table — product, qty, sell price, line discount, tax, subtotal. */
export function SellLinesTable({
  lines,
  meta,
  onChange,
  onRemove,
}: {
  lines: SellLineRow[];
  meta: SellMeta;
  onChange: (id: string, patch: Partial<SellLineRow>) => void;
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
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-2 py-2 text-left">#</th>
            <th className="px-2 py-2 text-left">Product</th>
            <th className="px-2 py-2 text-right">Qty</th>
            {s.enableSubUnits && <th className="px-2 py-2 text-left">Unit</th>}
            <th className="px-2 py-2 text-right">Unit price</th>
            <th className="px-2 py-2 text-left">Discount</th>
            {s.enableInlineTax && <th className="px-2 py-2 text-left">Tax</th>}
            {s.enableInlineTax && <th className="px-2 py-2 text-right">Price inc tax</th>}
            <th className="px-2 py-2 text-right">Subtotal</th>
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
                  {l.enableStock && l.currentStock != null ? ` · In stock: ${l.currentStock} ${l.unitName}` : ' · Stock not tracked'}
                </div>
              </td>
              <td className="px-2 py-2">
                <Input
                  type="number"
                  step={l.allowDecimal ? '0.0001' : '1'}
                  min="0"
                  value={l.quantity}
                  onChange={(e) => onChange(l.id, { quantity: e.target.value })}
                  className="h-9 w-24 text-right text-xs tabular-nums"
                />
              </td>
              {s.enableSubUnits && (
                <td className="px-2 py-2">
                  {l.subUnits.length ? (
                    <Select
                      value={l.subUnitId ?? ''}
                      className="h-9 w-24 text-xs"
                      onChange={(e) => onChange(l.id, { subUnitId: e.target.value ? Number(e.target.value) : null })}
                    >
                      <option value="">{l.unitName}</option>
                      {l.subUnits.map((u) => (
                        <option key={u.id} value={u.id}>{u.shortName}</option>
                      ))}
                    </Select>
                  ) : (
                    <span className="text-xs text-muted-foreground">{l.unitName}</span>
                  )}
                </td>
              )}
              <td className="px-2 py-2">
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={l.unitPrice}
                  onChange={(e) => onChange(l.id, { unitPrice: e.target.value })}
                  className="h-9 w-24 text-right text-xs tabular-nums"
                />
              </td>
              <td className="px-2 py-2">
                <div className="flex gap-1">
                  <Select
                    value={l.lineDiscountType}
                    className="h-9 w-20 text-xs"
                    onChange={(e) => onChange(l.id, { lineDiscountType: e.target.value as never })}
                  >
                    <option value="">—</option>
                    <option value="fixed">Fixed</option>
                    <option value="percentage">%</option>
                  </Select>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={l.lineDiscountAmount}
                    disabled={!l.lineDiscountType}
                    onChange={(e) => onChange(l.id, { lineDiscountAmount: e.target.value })}
                    className="h-9 w-20 text-right text-xs tabular-nums"
                  />
                </div>
              </td>
              {s.enableInlineTax && (
                <td className="px-2 py-2">
                  <Select
                    value={l.taxRateId ?? ''}
                    className="h-9 w-28 text-xs"
                    onChange={(e) => onChange(l.id, { taxRateId: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">None</option>
                    {meta.taxRates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                </td>
              )}
              {s.enableInlineTax && (
                <td className="px-2 py-2 text-right tabular-nums">{formatMoney(l.calc.unitPriceIncTax)}</td>
              )}
              <td className="px-2 py-2 text-right font-medium tabular-nums">{formatMoney(l.calc.lineTotal)}</td>
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
