import { api } from '@/lib/api/axios';

export interface ActivityCode {
  id: number;
  activityName: string;
  activityCode: string | null;
}
export interface ActivityCodeBody {
  activityName: string;
  activityCode?: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paginated<T> {
  data: T[];
  total: number;
}

export async function listActivityCodes(params: {
  page: number;
  pageSize: number;
  search: string;
}): Promise<Paginated<ActivityCode>> {
  const { data } = await api.get<Envelope<Paginated<ActivityCode>>>('/hrm/activity-codes', { params });
  return data.data;
}
export async function createActivityCode(body: ActivityCodeBody): Promise<ActivityCode> {
  const { data } = await api.post<Envelope<ActivityCode>>('/hrm/activity-codes', body);
  return data.data;
}
export async function updateActivityCode(id: number, body: ActivityCodeBody): Promise<ActivityCode> {
  const { data } = await api.patch<Envelope<ActivityCode>>(`/hrm/activity-codes/${id}`, body);
  return data.data;
}
export async function deleteActivityCode(id: number): Promise<void> {
  await api.delete(`/hrm/activity-codes/${id}`);
}
