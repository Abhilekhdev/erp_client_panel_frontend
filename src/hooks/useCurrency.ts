import { useCallback, useMemo } from 'react';
import { useAppSelector } from '@/app/hooks';

/**
 * The tenant's currency, straight from Business Settings (delivered on the auth payload).
 *
 * Money is stored as a plain number — only the *symbol* is presentational. Changing the business
 * currency from INR to USD therefore re-labels `1,000.00 ₹` as `$1,000.00` without touching a single
 * stored amount, which is exactly the behaviour we want.
 */
export function useCurrency() {
  const business = useAppSelector((s) => s.auth.user?.business);

  const symbol = business?.currencySymbol || '';
  const code = business?.currencyCode || '';
  const placement = business?.currencySymbolPlacement === 'after' ? 'after' : 'before';
  const precision = business?.currencyPrecision ?? 2;

  /** Format a number with the tenant symbol, e.g. `₹1,000.00` or `1.000,00 €`. */
  const format = useCallback(
    (value: number | string | null | undefined, opts?: { precision?: number; withSymbol?: boolean }) => {
      const n = typeof value === 'string' ? Number(value) : (value ?? 0);
      const digits = opts?.precision ?? precision;
      const amount = (Number.isFinite(n) ? n : 0).toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
      if (opts?.withSymbol === false || !symbol) return amount;
      return placement === 'after' ? `${amount} ${symbol}` : `${symbol}${amount}`;
    },
    [symbol, placement, precision],
  );

  return useMemo(
    () => ({ symbol, code, placement, precision, format }),
    [symbol, code, placement, precision, format],
  );
}
