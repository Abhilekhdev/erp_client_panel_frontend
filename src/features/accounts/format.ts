/** Money formatter for the accounts screens — grouped, 2 dp, sign-aware. */
export function money(n: number): string {
  return (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Human label for an account_transactions sub_type / auto row. */
export function subTypeLabel(subType: string | null, transactionType?: string | null): string {
  if (subType === 'OPENING_BALANCE') return 'Opening Balance';
  if (subType === 'FUND_TRANSFER') return 'Fund Transfer';
  if (subType === 'DEPOSIT') return 'Deposit';
  if (transactionType) return transactionType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return 'Payment';
}
