import { useCallback, useMemo, useState } from 'react';
import {
  calcLine,
  calcTotals,
  priceFromDiscounted,
  priceFromIncTax,
  profitPercent,
  round4,
  sellPriceFromMargin,
  type CalculatedLine,
} from './purchase.calc';
import type { PurchaseDetail, PurchaseMeta, PurchaseProductHit } from './purchases.api';

/**
 * One row of the line table.
 *
 * The numeric boxes are kept as STRINGS on purpose: a controlled number input that round-trips
 * through `Number()` eats the "0." the user is halfway through typing, and re-formats "10" to
 * "10.0000" under the cursor. They become numbers once, at submit.
 */
export interface LineRow {
  /** Client-side row key. Not the database id. */
  id: string;
  /** Set when editing an existing purchase — lets the server update the row in place. */
  purchaseLineId?: number;
  /** The requisition line this order line fulfils (purchase-order form only). */
  purchaseRequisitionLineId?: number;
  /** The purchase-order line this receipt draws against (purchase form only). */
  purchaseOrderLineId?: number;
  /** When drawn from an order/requisition, the quantity still available on that source line. */
  maxQuantity?: number;

  productId: number;
  variationId: number;
  name: string;
  variation: string;
  sku: string;
  enableStock: boolean;
  currentStock: number | null;
  unitName: string;
  allowDecimal: boolean;
  subUnits: { id: number; name: string; shortName: string; multiplier: number }[];
  lastPurchase: { price: number; discountPercent: number } | null;

  quantity: string;
  subUnitId: number | null;
  ppWithoutDiscount: string;
  discountPercent: string;
  purchasePrice: string;
  taxRateId: number | null;
  purchasePriceIncTax: string;
  profitPercent: string;
  defaultSellPrice: string;
  lotNumber: string;
  mfgDate: string;
  expDate: string;

  /** Derived, recomputed on every edit. Never typed into. */
  calc: CalculatedLine;
}

const str = (n: number): string => String(round4(n));

/** Which sibling boxes a given edit has to rewrite, so the row stays internally consistent. */
function recalc(row: LineRow, edited: keyof LineRow | undefined, taxPercent: number): LineRow {
  const next = { ...row };

  if (edited === 'purchasePrice') {
    // The user typed the after-discount price: back out the list price at the same discount.
    next.ppWithoutDiscount = str(priceFromDiscounted(next.purchasePrice, next.discountPercent));
  } else if (edited === 'purchasePriceIncTax') {
    // The user typed the net cost: strip the tax, then back out the list price.
    const beforeTax = priceFromIncTax(next.purchasePriceIncTax, taxPercent);
    next.purchasePrice = str(beforeTax);
    next.ppWithoutDiscount = str(priceFromDiscounted(beforeTax, next.discountPercent));
  }

  const calc = calcLine({
    quantity: next.quantity,
    ppWithoutDiscount: next.ppWithoutDiscount,
    discountPercent: next.discountPercent,
    taxPercent,
    multiplier: next.subUnitId
      ? (next.subUnits.find((u) => u.id === next.subUnitId)?.multiplier ?? 1)
      : 1,
  });

  next.calc = calc;
  // These two always reflect the calculation, except in the box the user is actively editing.
  if (edited !== 'purchasePrice') next.purchasePrice = str(calc.purchasePrice);
  if (edited !== 'purchasePriceIncTax') next.purchasePriceIncTax = str(calc.purchasePriceIncTax);

  // Margin and selling price are two views of one number — whichever was typed drives the other.
  if (edited === 'profitPercent') {
    next.defaultSellPrice = str(sellPriceFromMargin(calc.purchasePriceIncTax, next.profitPercent));
  } else {
    next.profitPercent = str(profitPercent(calc.purchasePriceIncTax, Number(next.defaultSellPrice)));
  }

  return next;
}

export function usePurchaseForm(meta: PurchaseMeta | undefined) {
  const [lines, setLines] = useState<LineRow[]>([]);
  const [discountType, setDiscountType] = useState<'' | 'fixed' | 'percentage'>('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [taxRateId, setTaxRateId] = useState<number | null>(null);
  const [shippingDetails, setShippingDetails] = useState('');
  const [shippingCharges, setShippingCharges] = useState('0');
  const [additionalExpenses, setAdditionalExpenses] = useState<{ name: string; amount: string }[]>([]);

  const taxPercentOf = useCallback(
    (id: number | null) => (id ? (meta?.taxRates.find((t) => t.id === id)?.amount ?? 0) : 0),
    [meta],
  );

  const addLine = useCallback(
    (
      hit: PurchaseProductHit,
      /** Draw-down context: a starting quantity, a cap, and the source line ids. */
      extra?: Partial<Pick<LineRow, 'purchaseRequisitionLineId' | 'purchaseOrderLineId' | 'maxQuantity'>> & {
        quantity?: number;
      },
    ) => {
      setLines((prev) => {
        // Same variation twice would split one receipt into two lots for no reason; bump the qty.
        // A drawn-in line is exempt — it is tied to a specific source line, so it stays its own row.
        const existing = extra ? undefined : prev.find((l) => l.variationId === hit.variationId);
        if (existing) {
          return prev.map((l) =>
            l.id === existing.id
              ? recalc(
                  { ...l, quantity: str(Number(l.quantity) + 1) },
                  'quantity',
                  taxPercentOf(l.taxRateId),
                )
              : l,
          );
        }

        const price = hit.lastPurchase?.price ?? hit.defaultPurchasePrice;
        const discount = hit.lastPurchase?.discountPercent ?? 0;
        const row: LineRow = {
          id: `${hit.variationId}-${prev.length}-${performance.now()}`,
          purchaseRequisitionLineId: extra?.purchaseRequisitionLineId,
          purchaseOrderLineId: extra?.purchaseOrderLineId,
          maxQuantity: extra?.maxQuantity,
          productId: hit.productId,
          variationId: hit.variationId,
          name: hit.name,
          variation: hit.variation,
          sku: hit.sku,
          enableStock: hit.enableStock,
          currentStock: hit.currentStock,
          unitName: hit.unitName,
          allowDecimal: hit.allowDecimal,
          subUnits: hit.subUnits,
          lastPurchase: hit.lastPurchase,
          quantity: str(extra?.quantity ?? 1),
          subUnitId: null,
          ppWithoutDiscount: str(price),
          discountPercent: str(discount),
          purchasePrice: str(price),
          taxRateId: hit.taxRateId,
          purchasePriceIncTax: str(price),
          profitPercent: '0',
          defaultSellPrice: str(hit.sellPriceIncTax),
          lotNumber: '',
          mfgDate: '',
          expDate: '',
          calc: calcLine({
            quantity: extra?.quantity ?? 1,
            ppWithoutDiscount: price,
            discountPercent: discount,
            taxPercent: 0,
          }),
        };
        return [...prev, recalc(row, undefined, taxPercentOf(hit.taxRateId))];
      });
    },
    [taxPercentOf],
  );

  const updateLine = useCallback(
    (id: string, patch: Partial<LineRow>, field?: keyof LineRow) => {
      setLines((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          const merged = { ...l, ...patch };
          return recalc(merged, field, taxPercentOf(merged.taxRateId));
        }),
      );
    },
    [taxPercentOf],
  );

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  /** Rehydrate the form from a saved purchase, for the edit screen. */
  const loadFrom = useCallback(
    (p: PurchaseDetail, hits: Map<number, PurchaseProductHit>) => {
      setDiscountType(p.discountType ?? '');
      setDiscountAmount(str(p.discountAmount));
      setTaxRateId(p.taxRateId);
      setShippingDetails(p.shippingDetails);
      setShippingCharges(str(p.shippingCharges));
      setAdditionalExpenses(p.additionalExpenses.map((e) => ({ name: e.name, amount: str(e.amount) })));

      setLines(
        p.lines.map((l, i) => {
          const hit = hits.get(l.variationId);
          const row: LineRow = {
            id: `line-${l.id}-${i}`,
            // 0 means "duplicate" — the caller stripped the id so these save as new rows.
            purchaseLineId: l.id || undefined,
            productId: l.productId,
            variationId: l.variationId,
            name: l.product,
            variation: l.variation,
            sku: l.sku,
            enableStock: hit?.enableStock ?? true,
            currentStock: hit?.currentStock ?? null,
            unitName: hit?.unitName ?? '',
            allowDecimal: hit?.allowDecimal ?? true,
            subUnits: hit?.subUnits ?? [],
            lastPurchase: null,
            // Stored quantities and prices are always in the BASE unit, so the sub-unit selection
            // is deliberately not restored — re-picking it would double-convert.
            quantity: str(l.quantity),
            subUnitId: null,
            ppWithoutDiscount: str(l.ppWithoutDiscount),
            discountPercent: str(l.discountPercent),
            purchasePrice: str(l.purchasePrice),
            taxRateId: l.taxRateId,
            purchasePriceIncTax: str(l.purchasePriceIncTax),
            profitPercent: '0',
            defaultSellPrice: str(hit?.sellPriceIncTax ?? 0),
            lotNumber: l.lotNumber,
            mfgDate: l.mfgDate ? l.mfgDate.slice(0, 10) : '',
            expDate: l.expDate ? l.expDate.slice(0, 10) : '',
            calc: calcLine({
              quantity: l.quantity,
              ppWithoutDiscount: l.ppWithoutDiscount,
              discountPercent: l.discountPercent,
              taxPercent: 0,
            }),
          };
          return recalc(row, undefined, taxPercentOf(l.taxRateId));
        }),
      );
    },
    [taxPercentOf],
  );

  const totals = useMemo(
    () =>
      calcTotals({
        lineSubtotal: lines.reduce((sum, l) => sum + l.calc.lineTotal, 0),
        discountType,
        discountAmount,
        orderTaxPercent: taxPercentOf(taxRateId),
        shippingCharges,
        additionalExpenses,
      }),
    [lines, discountType, discountAmount, taxRateId, shippingCharges, additionalExpenses, taxPercentOf],
  );

  const totalQuantity = useMemo(
    () => round4(lines.reduce((sum, l) => sum + l.calc.baseQuantity, 0)),
    [lines],
  );

  return {
    lines,
    addLine,
    updateLine,
    removeLine,
    loadFrom,
    totals,
    totalQuantity,
    discountType,
    setDiscountType,
    discountAmount,
    setDiscountAmount,
    taxRateId,
    setTaxRateId,
    shippingDetails,
    setShippingDetails,
    shippingCharges,
    setShippingCharges,
    additionalExpenses,
    setAdditionalExpenses,
  };
}
