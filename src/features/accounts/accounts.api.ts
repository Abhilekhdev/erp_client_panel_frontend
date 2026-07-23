import { api } from '@/lib/api/axios';

interface Envelope<T> {
  success: boolean;
  data: T;
}
const unwrap = <T>(p: Promise<{ data: Envelope<T> }>) => p.then((r) => r.data.data);

// ── types ──────────────────────────────────────────────
export interface Account {
  id: number;
  name: string;
  accountNumber: string;
  accountType: string | null;
  accountTypeId: number | null;
  note: string | null;
  isClosed: boolean;
  balance: number;
}
export interface AccountDetailRow {
  label: string;
  value: string;
}
export interface AccountDetail extends Account {
  accountDetails: AccountDetailRow[];
}
export interface AccountsList {
  data: Account[];
  unlinkedPaymentCount: number;
}
export interface LedgerRow {
  id: number;
  date: string;
  type: 'DEBIT' | 'CREDIT';
  subType: string | null;
  debit: number;
  credit: number;
  balance: number;
  note: string | null;
  refNo: string | null;
  method?: string | null;
  transactionType?: string | null;
  editable: boolean;
}
export interface AccountBook {
  account: AccountDetail;
  ledger: LedgerRow[];
}
export interface AccountTypeNode {
  id: number;
  name: string;
  children: { id: number; name: string }[];
}
export interface AccountTypeFlat {
  id: number;
  name: string;
  parentAccountTypeId: number | null;
}
export interface CashFlowRow {
  id: number;
  date: string;
  account: string;
  type: 'DEBIT' | 'CREDIT';
  subType: string | null;
  debit: number;
  credit: number;
  balance: number;
  note: string | null;
  refNo: string | null;
  paymentMethod: string | null;
}
export interface PaymentReportRow {
  id: number;
  date: string;
  paymentRefNo: string;
  transactionRefNo: string | null;
  transactionType: string | null;
  method: string;
  amount: number;
  isReturn: boolean;
  account: string | null;
}

export interface SaveAccountBody {
  name: string;
  accountNumber: string;
  accountTypeId?: number | null;
  openingBalance?: number;
  accountDetails?: AccountDetailRow[];
  note?: string | null;
}

// ── accounts ───────────────────────────────────────────
export const listAccounts = (includeClosed = false) =>
  unwrap<AccountsList>(api.get('/accounts', { params: { includeClosed } }));
export const accountsDropdown = () =>
  unwrap<{ data: { id: number; name: string }[] }>(api.get('/accounts/dropdown')).then((r) => r.data);
export const getAccount = (id: number) => unwrap<AccountDetail>(api.get(`/accounts/${id}`));
export const createAccount = (body: SaveAccountBody) => unwrap<AccountDetail>(api.post('/accounts', body));
export const updateAccount = (id: number, body: SaveAccountBody) =>
  unwrap<AccountDetail>(api.put(`/accounts/${id}`, body));
export const deleteAccount = (id: number) => api.delete(`/accounts/${id}`);
export const closeAccount = (id: number) => api.post(`/accounts/${id}/close`);
export const activateAccount = (id: number) => api.post(`/accounts/${id}/activate`);
export const getAccountBook = (id: number) => unwrap<AccountBook>(api.get(`/accounts/${id}/book`));

export const fundTransfer = (body: {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  operationDate?: string;
  note?: string | null;
}) => api.post('/accounts/fund-transfer', body);

export const deposit = (body: {
  toAccountId: number;
  fromAccountId?: number | null;
  amount: number;
  operationDate?: string;
  note?: string | null;
}) => api.post('/accounts/deposit', body);

export const cashFlow = (params: { accountId?: number; from?: string; to?: string }) =>
  unwrap<{ data: CashFlowRow[]; totals: { totalDebit: number; totalCredit: number; balance: number } }>(
    api.get('/accounts/cash-flow', { params }),
  );

// ── account transactions (edit/delete manual) ──────────
export const updateAccountTransaction = (
  id: number,
  body: { amount: number; operationDate?: string; note?: string | null },
) => api.put(`/account-transactions/${id}`, body);
export const deleteAccountTransaction = (id: number) => api.delete(`/account-transactions/${id}`);

// ── account types ──────────────────────────────────────
export const listAccountTypes = () =>
  unwrap<{ data: AccountTypeFlat[]; tree: AccountTypeNode[] }>(api.get('/account-types'));
export const groupedAccountTypes = () =>
  unwrap<{ data: AccountTypeNode[] }>(api.get('/account-types/grouped')).then((r) => r.data);
export const createAccountType = (body: { name: string; parentAccountTypeId?: number | null }) =>
  api.post('/account-types', body);
export const updateAccountType = (id: number, body: { name: string; parentAccountTypeId?: number | null }) =>
  api.put(`/account-types/${id}`, body);
export const deleteAccountType = (id: number) => api.delete(`/account-types/${id}`);

// ── reports ────────────────────────────────────────────
export interface AccountLedgerRow {
  id: number;
  name: string;
  accountNumber: string;
  debit: number;
  credit: number;
  balance: number;
}
export const trialBalance = () =>
  unwrap<{
    accounts: AccountLedgerRow[];
    summary: {
      purchase: number;
      purchasePaid: number;
      purchaseDue: number;
      sell: number;
      sellPaid: number;
      sellDue: number;
    };
    pending: string[];
  }>(api.get('/accounts/reports/trial-balance'));

export const balanceSheet = () =>
  unwrap<{
    assets: {
      paymentAccounts: number;
      closingStock: number;
      customerDue: number;
      accounts: AccountLedgerRow[];
    };
    liabilities: { supplierDue: number };
    pending: string[];
  }>(api.get('/accounts/reports/balance-sheet'));

export const paymentReport = (params: { accountId?: number; from?: string; to?: string; method?: string }) =>
  unwrap<{ data: PaymentReportRow[]; totals: { totalIn: number; totalOut: number; count: number } }>(
    api.get('/accounts/reports/payment-report', { params }),
  );
