import { api } from '@/lib/api/axios';

export interface LeaveItem {
  id: number;
  refNo: string | null;
  leaveTypeId: number;
  leaveType: string;
  userId: number;
  employee: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string; // pending | approved | cancelled
  statusLabel: string; // Pending | Approved | Rejected
  statusNote: string;
}
export interface IdName {
  id: number;
  name: string;
}
export interface LeaveMeta {
  leaveTypes: IdName[];
  employees: IdName[];
  statuses: { value: string; label: string }[];
  canManageAll: boolean;
}
export interface AssignableType {
  id: number;
  name: string;
  balance: number;
}
export interface UserBalance {
  leaveTypeId: number;
  name: string;
  balance: number;
  assigned: boolean;
}
export interface LeaveSummaryRow {
  leaveType: string;
  pending: number;
  approved: number;
  rejected: number;
  balance: number;
  max: number | null;
  interval: string | null;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paginated<T> {
  data: T[];
  total: number;
  canManageAll: boolean;
}

export interface LeaveFilters {
  page: number;
  pageSize: number;
  search: string;
  userId?: number | '';
  leaveTypeId?: number | '';
  status?: string;
  startDate?: string;
  endDate?: string;
}

export async function listLeaves(params: LeaveFilters): Promise<Paginated<LeaveItem>> {
  const { data } = await api.get<Envelope<Paginated<LeaveItem>>>('/hrm/leaves', { params });
  return data.data;
}
export async function getLeaveMeta(): Promise<LeaveMeta> {
  const { data } = await api.get<Envelope<LeaveMeta>>('/hrm/leaves/meta');
  return data.data;
}
export async function getAssignableTypes(userId?: number): Promise<AssignableType[]> {
  const { data } = await api.get<Envelope<AssignableType[]>>('/hrm/leaves/assignable', {
    params: userId ? { userId } : {},
  });
  return data.data;
}
export async function applyLeave(body: {
  userId?: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason?: string;
}): Promise<LeaveItem> {
  const { data } = await api.post<Envelope<LeaveItem>>('/hrm/leaves', body);
  return data.data;
}
export async function changeLeaveStatus(
  id: number,
  body: { status: string; statusNote?: string },
): Promise<LeaveItem> {
  const { data } = await api.post<Envelope<LeaveItem>>(`/hrm/leaves/${id}/status`, body);
  return data.data;
}
export async function deleteLeave(id: number): Promise<void> {
  await api.delete(`/hrm/leaves/${id}`);
}
export async function getUserBalances(userId: number): Promise<UserBalance[]> {
  const { data } = await api.get<Envelope<UserBalance[]>>(`/hrm/leaves/balances/${userId}`);
  return data.data;
}
export async function setUserBalances(
  userId: number,
  balances: { leaveTypeId: number; balance: string }[],
): Promise<UserBalance[]> {
  const { data } = await api.put<Envelope<UserBalance[]>>(`/hrm/leaves/balances/${userId}`, {
    balances,
  });
  return data.data;
}
export async function getLeaveSummary(userId?: number): Promise<{ rows: LeaveSummaryRow[] }> {
  const { data } = await api.get<Envelope<{ rows: LeaveSummaryRow[] }>>('/hrm/leaves/summary', {
    params: userId ? { userId } : {},
  });
  return data.data;
}
