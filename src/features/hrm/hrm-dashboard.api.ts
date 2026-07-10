import { api } from '@/lib/api/axios';

export interface HrmDashboard {
  userCount: number;
  departments: { id: number; name: string; userCount: number }[];
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getHrmDashboard(): Promise<HrmDashboard> {
  const { data } = await api.get<Envelope<HrmDashboard>>('/hrm/dashboard');
  return data.data;
}
