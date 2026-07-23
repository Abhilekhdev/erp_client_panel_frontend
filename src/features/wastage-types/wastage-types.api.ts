import { api } from '@/lib/api/axios';

interface Envelope<T> {
  success: boolean;
  data: T;
}
export interface WastageType {
  id: number;
  name: string;
}

export async function listWastageTypes(): Promise<WastageType[]> {
  const { data } = await api.get<Envelope<{ data: WastageType[] }>>('/wastage-types');
  return data.data.data;
}
export async function createWastageType(body: { name: string }): Promise<WastageType> {
  const { data } = await api.post<Envelope<WastageType>>('/wastage-types', body);
  return data.data;
}
export async function updateWastageType(id: number, body: { name: string }): Promise<WastageType> {
  const { data } = await api.put<Envelope<WastageType>>(`/wastage-types/${id}`, body);
  return data.data;
}
export async function deleteWastageType(id: number): Promise<void> {
  await api.delete(`/wastage-types/${id}`);
}
