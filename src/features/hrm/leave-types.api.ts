import { api } from '@/lib/api/axios';

export interface LeaveType {
  id: number;
  name: string;
  maxLeaveCount: number | null;
  leaveCountInterval: string; // 'month' | 'year' | ''
  isPaid: boolean;
}
export interface LeaveTypeFormBody {
  name: string;
  maxLeaveCount?: string;
  leaveCountInterval?: string;
  isPaid: boolean;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paginated<T> {
  data: T[];
  total: number;
}

export async function listLeaveTypes(params: {
  page: number;
  pageSize: number;
  search: string;
}): Promise<Paginated<LeaveType>> {
  const { data } = await api.get<Envelope<Paginated<LeaveType>>>('/hrm/leave-types', { params });
  return data.data;
}

export async function createLeaveType(body: LeaveTypeFormBody): Promise<LeaveType> {
  const { data } = await api.post<Envelope<LeaveType>>('/hrm/leave-types', body);
  return data.data;
}

export async function updateLeaveType(id: number, body: LeaveTypeFormBody): Promise<LeaveType> {
  const { data } = await api.patch<Envelope<LeaveType>>(`/hrm/leave-types/${id}`, body);
  return data.data;
}

export async function deleteLeaveType(id: number): Promise<void> {
  await api.delete(`/hrm/leave-types/${id}`);
}
