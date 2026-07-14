import { api } from '@/lib/api/axios';

export interface Warranty {
  id: number;
  name: string;
  description: string;
  duration: number;
  durationType: string; // days | months | years
}
export interface WarrantyBody {
  name: string;
  description?: string | null;
  duration: number;
  duration_type: 'days' | 'months' | 'years';
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function listWarranties(): Promise<Warranty[]> {
  const { data } = await api.get<Envelope<{ data: Warranty[] }>>('/warranties');
  return data.data.data;
}
export async function createWarranty(body: WarrantyBody): Promise<Warranty> {
  const { data } = await api.post<Envelope<Warranty>>('/warranties', body);
  return data.data;
}
export async function updateWarranty(id: number, body: WarrantyBody): Promise<Warranty> {
  const { data } = await api.patch<Envelope<Warranty>>(`/warranties/${id}`, body);
  return data.data;
}
export async function deleteWarranty(id: number): Promise<void> {
  await api.delete(`/warranties/${id}`);
}
