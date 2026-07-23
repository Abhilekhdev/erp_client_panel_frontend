import { useAppSelector } from '@/app/hooks';

/**
 * Currency-aware money formatter for the reports — prefixes the tenant's currency symbol
 * (from Business Settings, carried on the auth user) before the grouped 2-dp amount.
 */
export function useMoney() {
  const symbol = useAppSelector((s) => s.auth.user?.business?.currencySymbol) ?? '';
  return (n: number): string => {
    const formatted = (n ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return symbol ? `${symbol} ${formatted}` : formatted;
  };
}
