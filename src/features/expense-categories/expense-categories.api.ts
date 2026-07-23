import { api } from '@/lib/api/axios';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  code: string;
  parentId: number | null;
  parentName: string | null;
}

export interface IdName {
  id: number;
  name: string;
}

export interface ExpenseCategoryBody {
  name: string;
  code?: string | null;
  parent_id?: number | null;
}

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data } = await api.get<Envelope<{ data: ExpenseCategory[] }>>('/expense-categories');
  return data.data.data;
}

export async function expenseCategoryDropdown(): Promise<IdName[]> {
  const { data } = await api.get<Envelope<{ data: IdName[] }>>('/expense-categories/dropdown');
  return data.data.data;
}

export async function expenseSubCategories(parentId: number): Promise<IdName[]> {
  const { data } = await api.get<Envelope<{ data: IdName[] }>>(`/expense-categories/${parentId}/sub-categories`);
  return data.data.data;
}

export async function createExpenseCategory(body: ExpenseCategoryBody): Promise<ExpenseCategory> {
  const { data } = await api.post<Envelope<ExpenseCategory>>('/expense-categories', body);
  return data.data;
}

export async function updateExpenseCategory(id: number, body: ExpenseCategoryBody): Promise<ExpenseCategory> {
  const { data } = await api.patch<Envelope<ExpenseCategory>>(`/expense-categories/${id}`, body);
  return data.data;
}

export async function deleteExpenseCategory(id: number): Promise<void> {
  await api.delete(`/expense-categories/${id}`);
}
