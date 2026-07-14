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
