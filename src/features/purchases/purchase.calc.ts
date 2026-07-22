/**
 * The purchase arithmetic, mirrored from `backend/src/modules/purchases/purchase.calc.ts`.
 *
 * This copy exists only so the form can show live figures as the user types. The server recomputes
 * every one of them on save and stores its own numbers, so a drift here is a display bug, never a
 * data bug — which is the opposite of GOURI, where the browser's total is what gets banked.
 *
 * Keep the two files in step: same order of operations, same 4dp rounding.
 */

export const round4 = (n: number): number => Math.round((n + Number.EPSILON) * 1e4) / 1e4;

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

export interface LineInput {
  quantity: number | string;
  ppWithoutDiscount: number | string;
  discountPercent: number | string;
  /** The line tax rate as a percentage; 0 when no tax is selected. */
  taxPercent: number;
  /** >1 when the user is buying in a sub-unit (a Box of 12). */
  multiplier?: number;
}

export interface CalculatedLine {
  /** Unit price after the line discount, before tax — in the ENTERED unit. */
  purchasePrice: number;
  /** Tax for ONE unit. GOURI's `item_tax` is per-unit, not per-line. */
  itemTax: number;
  purchasePriceIncTax: number;
  lineSubtotalBeforeTax: number;
  lineTotal: number;
  /** Quantity converted to the product's base unit — what actually moves stock. */
  baseQuantity: number;
}

/** One line. Line tax is EXCLUSIVE: added on top of the discounted price. */
export function calcLine(line: LineInput): CalculatedLine {
  const listPrice = num(line.ppWithoutDiscount);
  const discountPercent = num(line.discountPercent);
  const quantity = num(line.quantity);

  const purchasePrice = listPrice - (discountPercent / 100) * listPrice;
  const itemTax = (num(line.taxPercent) / 100) * purchasePrice;
  const purchasePriceIncTax = purchasePrice + itemTax;

  return {
    purchasePrice: round4(purchasePrice),
    itemTax: round4(itemTax),
    purchasePriceIncTax: round4(purchasePriceIncTax),
    lineSubtotalBeforeTax: round4(quantity * purchasePrice),
    lineTotal: round4(quantity * purchasePriceIncTax),
    baseQuantity: round4(quantity * (line.multiplier ?? 1)),
  };
}

/** Back out the list price when the user edits the after-discount price instead. */
export function priceFromDiscounted(discounted: number | string, discountPercent: number | string): number {
  const pct = num(discountPercent);
  if (pct >= 100) return num(discounted);
  return round4(num(discounted) / (1 - pct / 100));
}

/** Back out the pre-tax price when the user edits the net (inc-tax) cost instead. */
export function priceFromIncTax(incTax: number | string, taxPercent: number): number {
  return round4(num(incTax) / (1 + num(taxPercent) / 100));
}

export interface TotalsInput {
  /** Σ of every line total, each already INCLUDING its own line tax. */
  lineSubtotal: number;
  discountType?: 'fixed' | 'percentage' | '';
  discountAmount: number | string;
  orderTaxPercent: number;
  shippingCharges: number | string;
  additionalExpenses?: { name: string; amount: number | string }[];
}

export interface CalculatedTotals {
  lineSubtotal: number;
  discount: number;
  taxAmount: number;
  additionalExpenseTotal: number;
  finalTotal: number;
}

/**
 * Document totals. The order matters: the order-level tax is charged on the subtotal AFTER the
 * discount, and shipping + landed costs are added after tax (they are not taxed).
 */
export function calcTotals(input: TotalsInput): CalculatedTotals {
  const lineSubtotal = round4(input.lineSubtotal);

  const discount =
    input.discountType === 'fixed'
      ? num(input.discountAmount)
      : input.discountType === 'percentage'
        ? (num(input.discountAmount) / 100) * lineSubtotal
        : 0;

  const taxAmount = (num(input.orderTaxPercent) / 100) * (lineSubtotal - discount);
  const additionalExpenseTotal = (input.additionalExpenses ?? []).reduce(
    (sum, e) => sum + num(e.amount),
    0,
  );

  return {
    lineSubtotal,
    discount: round4(discount),
    taxAmount: round4(taxAmount),
    additionalExpenseTotal: round4(additionalExpenseTotal),
    finalTotal: round4(
      lineSubtotal - discount + taxAmount + num(input.shippingCharges) + additionalExpenseTotal,
    ),
  };
}

/** Selling price ÷ net cost, as a margin percentage — GOURI's inline profit column. */
export function profitPercent(netCost: number, sellPrice: number): number {
  if (!netCost) return 0;
  return round4(((num(sellPrice) - netCost) / netCost) * 100);
}

/** The inverse: what selling price yields this margin over the net cost. */
export function sellPriceFromMargin(netCost: number, margin: number | string): number {
  return round4(netCost + (num(margin) / 100) * netCost);
}
