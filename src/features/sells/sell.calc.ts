/**
 * Live sell arithmetic for the form — mirrors `backend/src/modules/sells/sell.calc.ts`. Display
 * only; the server recomputes and stores its own numbers, so drift here is a display bug, not a
 * data bug (the opposite of GOURI, which banks the browser's total).
 */
export const round4 = (n: number): number => Math.round((n + Number.EPSILON) * 1e4) / 1e4;
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

export type DiscountKind = 'fixed' | 'percentage' | '' | null | undefined;

export interface SellLineInput {
  quantity: number | string;
  /** Ex-tax unit price the user typed, in the entered unit. */
  unitPrice: number | string;
  lineDiscountType?: DiscountKind;
  lineDiscountAmount?: number | string;
  taxPercent: number;
  multiplier?: number;
}

export interface CalculatedSellLine {
  unitPrice: number;
  itemTax: number;
  unitPriceIncTax: number;
  baseQuantity: number;
  lineTotal: number;
}

export function calcSellLine(line: SellLineInput): CalculatedSellLine {
  const multiplier = line.multiplier && line.multiplier > 0 ? line.multiplier : 1;
  const listPrice = num(line.unitPrice) / multiplier;
  const quantity = num(line.quantity) * multiplier;
  const disc = num(line.lineDiscountAmount);
  let unitPrice = listPrice;
  if (line.lineDiscountType === 'fixed') unitPrice = listPrice - disc / multiplier;
  else if (line.lineDiscountType === 'percentage') unitPrice = listPrice * (1 - disc / 100);
  unitPrice = Math.max(0, unitPrice);
  const itemTax = (num(line.taxPercent) / 100) * unitPrice;
  const unitPriceIncTax = unitPrice + itemTax;
  return {
    unitPrice: round4(unitPrice),
    itemTax: round4(itemTax),
    unitPriceIncTax: round4(unitPriceIncTax),
    baseQuantity: round4(quantity),
    lineTotal: round4(quantity * unitPriceIncTax),
  };
}

export interface SellTotalsInput {
  lineSubtotal: number;
  discountType?: DiscountKind;
  discountAmount: number | string;
  orderTaxPercent: number;
  shippingCharges: number | string;
  additionalExpenses?: { name: string; amount: number | string }[];
  roundOff?: number | string;
}

export interface CalculatedSellTotals {
  lineSubtotal: number;
  discount: number;
  taxAmount: number;
  additionalExpenseTotal: number;
  finalTotal: number;
}

export function calcSellTotals(input: SellTotalsInput): CalculatedSellTotals {
  const lineSubtotal = round4(input.lineSubtotal);
  const discAmount = num(input.discountAmount);
  const discount =
    input.discountType === 'fixed'
      ? discAmount
      : input.discountType === 'percentage'
        ? (discAmount / 100) * lineSubtotal
        : 0;
  const taxAmount = (num(input.orderTaxPercent) / 100) * (lineSubtotal - discount);
  const additionalExpenseTotal = (input.additionalExpenses ?? []).reduce((s, e) => s + num(e.amount), 0);
  return {
    lineSubtotal,
    discount: round4(discount),
    taxAmount: round4(taxAmount),
    additionalExpenseTotal: round4(additionalExpenseTotal),
    finalTotal: round4(lineSubtotal - discount + taxAmount + num(input.shippingCharges) + additionalExpenseTotal + num(input.roundOff)),
  };
}
