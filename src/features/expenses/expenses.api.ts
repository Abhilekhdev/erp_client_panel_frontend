import { api } from '@/lib/api/axios';

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paginated<T> {
  data: T[];
  total: number;
}

export interface IdName {
  id: number;
  name: string;
}

export interface ExpenseListItem {
  id: number;
  refNo: string;
  date: string;
  isRefund: boolean;
  category: string;
  subCategory: string;
  location: string;
  contact: string;
  expenseFor: string;
  paymentStatus: string;
  finalTotal: number;
  totalPaid: number;
  paymentDue: number;
}

export interface ExpenseMeta {
  categories: IdName[];
  locations: IdName[];
  accounts: IdName[];
  taxRates: { id: number; name: string; amount: number }[];
  expenseForUsers: IdName[];
}

export interface ExpensePayment {
  id: number;
  amount: number;
  method: string;
  accountId: number | null;
  paidOn: string;
  note: string;
}

export interface ExpenseDetail {
  id: number;
  refNo: string;
  transactionDate: string;
  locationId: number;
  isRefund: boolean;
  expenseCategoryId: number | null;
  expenseSubCategoryId: number | null;
  expenseFor: number | null;
  contactId: number | null;
  taxRateId: number | null;
  finalTotal: number;
  taxAmount: number;
  additionalNotes: string;
  document: string;
  isRecurring: boolean;
  recurInterval: number | null;
  recurIntervalType: string;
  recurRepetitions: number | null;
  paymentStatus: string;
  payments: ExpensePayment[];
}

export interface ExpensePaymentBody {
  amount: number;
  method: string;
  account_id?: number | null;
  paid_on?: string;
  note?: string;
  card_holder_name?: string;
  card_transaction_number?: string;
  card_type?: string;
  cheque_number?: string;
  bank_account_number?: string;
  transaction_no?: string;
}

export interface ExpenseFormBody {
  location_id: number;
  transaction_date: string;
  ref_no?: string;
  expense_category_id?: number | null;
  expense_sub_category_id?: number | null;
  expense_for?: number | null;
  contact_id?: number | null;
  tax_rate_id?: number | null;
  final_total: number;
  additional_notes?: string;
  is_refund?: boolean;
  is_recurring?: boolean;
  recur_interval?: number;
  recur_interval_type?: string;
  recur_repetitions?: number;
  payment?: ExpensePaymentBody[];
}

export interface ExpensesQuery {
  page: number;
  pageSize: number;
  search: string;
  expenseCategoryId?: number;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listExpenses(params: ExpensesQuery): Promise<Paginated<ExpenseListItem>> {
  const { data } = await api.get<Envelope<Paginated<ExpenseListItem>>>('/expenses', { params });
  return data.data;
}

export async function getExpenseMeta(): Promise<ExpenseMeta> {
  const { data } = await api.get<Envelope<ExpenseMeta>>('/expenses/meta');
  return data.data;
}

export async function getExpense(id: number): Promise<ExpenseDetail> {
  const { data } = await api.get<Envelope<ExpenseDetail>>(`/expenses/${id}`);
  return data.data;
}

export async function createExpense(body: ExpenseFormBody): Promise<ExpenseDetail> {
  const { data } = await api.post<Envelope<ExpenseDetail>>('/expenses', body);
  return data.data;
}

export async function updateExpense(id: number, body: ExpenseFormBody): Promise<ExpenseDetail> {
  const { data } = await api.patch<Envelope<ExpenseDetail>>(`/expenses/${id}`, body);
  return data.data;
}

export async function deleteExpense(id: number): Promise<void> {
  await api.delete(`/expenses/${id}`);
}
