import { api } from '@/lib/api/axios';

export interface Category {
  id: number;
  name: string;
  shortCode: string;
  description: string;
  parentId: number | null;
  parentName: string | null;
  isSubCategory: boolean;
}

export interface CategoryOption {
  id: number;
  name: string; // "Electronics - EL"
}

export interface CategoryBody {
  name: string;
  short_code?: string | null;
  description?: string | null;
  add_as_sub_category: boolean;
  parent_id?: number | null;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<Envelope<{ data: Category[] }>>('/categories');
  return data.data.data;
}

export async function categoryDropdown(): Promise<CategoryOption[]> {
  const { data } = await api.get<Envelope<{ data: CategoryOption[] }>>('/categories/dropdown');
  return data.data.data;
}

export async function createCategory(body: CategoryBody): Promise<Category> {
  const { data } = await api.post<Envelope<Category>>('/categories', body);
  return data.data;
}

export async function updateCategory(id: number, body: CategoryBody): Promise<Category> {
  const { data } = await api.patch<Envelope<Category>>(`/categories/${id}`, body);
  return data.data;
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/categories/${id}`);
}
