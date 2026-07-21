import { api } from '@/lib/api/axios';

export interface SellingPriceGroup {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
}
export interface SellingPriceGroupBody {
  name: string;
  description?: string | null;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function listSellingPriceGroups(): Promise<SellingPriceGroup[]> {
  const { data } = await api.get<Envelope<{ data: SellingPriceGroup[] }>>('/selling-price-groups');
  return data.data.data;
}
export async function createSellingPriceGroup(body: SellingPriceGroupBody): Promise<SellingPriceGroup> {
  const { data } = await api.post<Envelope<SellingPriceGroup>>('/selling-price-groups', body);
  return data.data;
}
export async function updateSellingPriceGroup(id: number, body: SellingPriceGroupBody): Promise<SellingPriceGroup> {
  const { data } = await api.patch<Envelope<SellingPriceGroup>>(`/selling-price-groups/${id}`, body);
  return data.data;
}
export async function toggleSellingPriceGroup(id: number, isActive: boolean): Promise<SellingPriceGroup> {
  const { data } = await api.post<Envelope<SellingPriceGroup>>(`/selling-price-groups/${id}/toggle-active`, {
    isActive,
  });
  return data.data;
}
export async function deleteSellingPriceGroup(id: number): Promise<void> {
  await api.delete(`/selling-price-groups/${id}`);
}

/** The whole price list as a workbook — one row per variation, one column per active group. */
export async function exportGroupPrices(): Promise<void> {
  const res = await api.get('/selling-price-groups/export', { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'product_group_prices.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

export interface GroupPriceImportResult {
  imported: number;
  rows: number;
  /** How many individual prices were written. */
  updated: number;
  errors: { row: number; message: string }[];
  /** Headers that matched no price group — usually a renamed group. */
  unknownColumns: string[];
  groups: string[];
}

export async function importGroupPrices(file: File): Promise<GroupPriceImportResult> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<{ success: boolean; data: GroupPriceImportResult }>(
    '/selling-price-groups/import',
    form,
  );
  return data.data;
}
