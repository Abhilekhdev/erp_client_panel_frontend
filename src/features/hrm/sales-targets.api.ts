import { api } from '@/lib/api/axios';

export interface SalesTargetUser {
  id: number;
  name: string;
  targetCount: number;
}
export interface SalesTargetBand {
  id?: number;
  targetStart: number;
  targetEnd: number;
  commissionPercent: number;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paginated<T> {
  data: T[];
  total: number;
}

export async function listSalesTargetUsers(params: {
  page: number;
  pageSize: number;
  search: string;
}): Promise<Paginated<SalesTargetUser>> {
  const { data } = await api.get<Envelope<Paginated<SalesTargetUser>>>('/hrm/sales-targets', { params });
  return data.data;
}
export async function getUserTargets(userId: number): Promise<SalesTargetBand[]> {
  const { data } = await api.get<Envelope<SalesTargetBand[]>>(`/hrm/sales-targets/${userId}`);
  return data.data;
}
export async function saveUserTargets(
  userId: number,
  bands: { targetStart: string; targetEnd: string; commissionPercent: string }[],
): Promise<SalesTargetBand[]> {
  const { data } = await api.put<Envelope<SalesTargetBand[]>>(`/hrm/sales-targets/${userId}`, { bands });
  return data.data;
}
