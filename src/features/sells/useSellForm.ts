import { useCallback, useMemo, useState } from 'react';
import { calcSellLine, calcSellTotals, round4, type CalculatedSellLine } from './sell.calc';
import type { SellDetail, SellMeta, SellProductHit } from './sells.api';

/** One line of the sell table. Numeric fields are strings so half-typed input isn't reformatted. */
export interface SellLineRow {
  id: string;
  sellLineId?: number;
  soLineId?: number;
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
  quantity: string;
  subUnitId: number | null;
  unitPrice: string;
  lineDiscountType: '' | 'fixed' | 'percentage';
  lineDiscountAmount: string;
  taxRateId: number | null;
  /** Restaurant: per-line service staff (waiter). */
  resServiceStaffId: number | null;
  calc: CalculatedSellLine;
}

const str = (n: number) => String(round4(n));

export function useSellForm(meta: SellMeta | undefined) {
  const [lines, setLines] = useState<SellLineRow[]>([]);
  const [discountType, setDiscountType] = useState<'' | 'fixed' | 'percentage'>('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [taxRateId, setTaxRateId] = useState<number | null>(null);
  const [shippingDetails, setShippingDetails] = useState('');
  const [shippingCharges, setShippingCharges] = useState('0');
  const [additionalExpenses, setAdditionalExpenses] = useState<{ name: string; amount: string }[]>([]);

  const taxPct = useCallback(
    (id: number | null) => (id ? (meta?.taxRates.find((t) => t.id === id)?.amount ?? 0) : 0),
    [meta],
  );

  const recalc = (row: SellLineRow): SellLineRow => {
    const multiplier = row.subUnitId ? (row.subUnits.find((u) => u.id === row.subUnitId)?.multiplier ?? 1) : 1;
    return {
      ...row,
      calc: calcSellLine({
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        lineDiscountType: row.lineDiscountType,
        lineDiscountAmount: row.lineDiscountAmount,
        taxPercent: taxPct(row.taxRateId),
        multiplier,
      }),
    };
  };

  const addLine = useCallback(
    (hit: SellProductHit, extra?: { quantity?: number; maxQuantity?: number; soLineId?: number; unitPrice?: number }) => {
      setLines((prev) => {
        const existing = extra ? undefined : prev.find((l) => l.variationId === hit.variationId);
        if (existing) {
          return prev.map((l) => (l.id === existing.id ? recalc({ ...l, quantity: str(Number(l.quantity) + 1) }) : l));
        }
        const price = extra?.unitPrice ?? hit.defaultSellPrice;
        const row: SellLineRow = {
          id: `${hit.variationId}-${prev.length}-${performance.now()}`,
          soLineId: extra?.soLineId,
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
          quantity: str(extra?.quantity ?? 1),
          subUnitId: null,
          unitPrice: str(price),
          lineDiscountType: '',
          lineDiscountAmount: '0',
          taxRateId: hit.taxRateId,
          resServiceStaffId: null,
          calc: calcSellLine({ quantity: extra?.quantity ?? 1, unitPrice: price, taxPercent: 0 }),
        };
        return [...prev, recalc(row)];
      });
    },
    [taxPct],
  );

  const updateLine = useCallback(
    (id: string, patch: Partial<SellLineRow>) => {
      setLines((prev) => prev.map((l) => (l.id === id ? recalc({ ...l, ...patch }) : l)));
    },
    [taxPct],
  );

  const removeLine = useCallback((id: string) => setLines((prev) => prev.filter((l) => l.id !== id)), []);

  const loadFrom = useCallback(
    (sell: SellDetail, hits: Map<number, SellProductHit>) => {
      setDiscountType(sell.discountType ?? '');
      setDiscountAmount(str(sell.discountAmount));
      setTaxRateId(sell.taxRateId);
      setShippingDetails(sell.shippingDetails);
      setShippingCharges(str(sell.shippingCharges));
      setAdditionalExpenses(sell.additionalExpenses.map((e) => ({ name: e.name, amount: str(e.amount) })));
      setLines(
        sell.lines.map((l, i) => {
          const hit = hits.get(l.variationId);
          const row: SellLineRow = {
            id: `line-${l.id}-${i}`,
            sellLineId: l.id,
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
            quantity: str(l.quantity),
            subUnitId: null,
            unitPrice: str(l.unitPrice),
            lineDiscountType: l.lineDiscountType ?? '',
            lineDiscountAmount: str(l.lineDiscountAmount),
            taxRateId: l.taxRateId,
            resServiceStaffId: null,
            calc: calcSellLine({ quantity: l.quantity, unitPrice: l.unitPrice, taxPercent: 0 }),
          };
          return recalc(row);
        }),
      );
    },
    [taxPct],
  );

  const totals = useMemo(
    () =>
      calcSellTotals({
        lineSubtotal: lines.reduce((s, l) => s + l.calc.lineTotal, 0),
        discountType,
        discountAmount,
        orderTaxPercent: taxPct(taxRateId),
        shippingCharges,
        additionalExpenses,
      }),
    [lines, discountType, discountAmount, taxRateId, shippingCharges, additionalExpenses, taxPct],
  );

  const totalQuantity = useMemo(() => round4(lines.reduce((s, l) => s + l.calc.baseQuantity, 0)), [lines]);

  return {
    lines, addLine, updateLine, removeLine, loadFrom, totals, totalQuantity,
    discountType, setDiscountType, discountAmount, setDiscountAmount, taxRateId, setTaxRateId,
    shippingDetails, setShippingDetails, shippingCharges, setShippingCharges, additionalExpenses, setAdditionalExpenses,
  };
}
