import { api } from '@/lib/api/axios';

export interface Brand {
  id: number;
  name: string;
  description: string;
  useForRepair: boolean;
}

export interface BrandBody {
  name: string;
  description?: string | null;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function listBrands(): Promise<Brand[]> {
  const { data } = await api.get<Envelope<{ data: Brand[] }>>('/brands');
  return data.data.data;
}

export async function createBrand(body: BrandBody): Promise<Brand> {
  const { data } = await api.post<Envelope<Brand>>('/brands', body);
  return data.data;
}

export async function updateBrand(id: number, body: BrandBody): Promise<Brand> {
  const { data } = await api.patch<Envelope<Brand>>(`/brands/${id}`, body);
  return data.data;
}

export async function deleteBrand(id: number): Promise<void> {
  await api.delete(`/brands/${id}`);
}
