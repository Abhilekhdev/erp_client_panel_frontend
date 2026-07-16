import { api } from '@/lib/api/axios';

export interface ActivityChange {
  field: string;
  /** Human label, e.g. "Sell price" — the backend humanizes it so every view reads the same. */
  label: string;
  from: unknown;
  to: unknown;
}

export interface ActivityEntry {
  id: number;
  action: string;
  actionLabel: string;
  subjectType: string | null;
  subjectTypeLabel: string | null;
  subjectId: number | null;
  description: string;
  userId: number | null;
  userName: string | null;
  changes: ActivityChange[];
  attributes: Record<string, unknown> | null;
  route: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ActivityLogQuery {
  page?: number;
  pageSize?: number;
  /** Activity BY this user. */
  userId?: number;
  /** Activity ON this record (pair them). */
  subjectType?: string;
  subjectId?: number;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ActivityLogMeta {
  users: { id: number; name: string }[];
  actions: { value: string; label: string }[];
  subjectTypes: { value: string; label: string }[];
  /** False for users limited to `activity_log.view_own` — hide the "user" filter for them. */
  canViewAll: boolean;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listActivity(query: ActivityLogQuery): Promise<Paged<ActivityEntry>> {
  const { data } = await api.get<Envelope<Paged<ActivityEntry>>>('/activity-log', { params: query });
  return data.data;
}

export async function getActivityMeta(): Promise<ActivityLogMeta> {
  const { data } = await api.get<Envelope<ActivityLogMeta>>('/activity-log/meta');
  return data.data;
}
