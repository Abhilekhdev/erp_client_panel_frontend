import { store } from '@/app/store';

/** The tenant currency as delivered on the auth payload (Business Settings → Currency). */
export function currencyInfo() {
  const business = store.getState().auth.user?.business;
  return {
    symbol: business?.currencySymbol || '',
    code: business?.currencyCode || '',
    placement: business?.currencySymbolPlacement === 'after' ? ('after' as const) : ('before' as const),
    precision: business?.currencyPrecision ?? 2,
  };
}

/**
 * Format an amount using the business's currency symbol and placement.
 *
 * Amounts are stored as plain numbers — only the symbol is presentational, so switching the business
 * currency re-labels `1,000.00` from `₹1,000.00` to `$1,000.00` without touching stored values.
 *
 * Reads the store directly (like the axios interceptor) so the hundreds of existing `money(...)`
 * call sites become currency-aware without each one needing a hook.
 */
export function formatMoney(
  value: number | string | null | undefined,
  opts?: { precision?: number; withSymbol?: boolean },
): string {
  const { symbol, placement, precision } = currencyInfo();
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  const digits = opts?.precision ?? precision;
  const amount = (Number.isFinite(n) ? n : 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  if (opts?.withSymbol === false || !symbol) return amount;
  return placement === 'after' ? `${amount} ${symbol}` : `${symbol}${amount}`;
}
