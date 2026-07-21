import { api } from '@/lib/api/axios';

export interface AppNotification {
  id: string;
  type: string;
  msg: string;
  /** Icon key the bell maps to a lucide component. */
  icon: string;
  /** In-app route to open on click (null = not clickable). */
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  data: AppNotification[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

/** Newest first, 10/page. Page 1 also marks everything read (matches GOURI's bell behaviour). */
export async function listNotifications(page = 1): Promise<NotificationPage> {
  const { data } = await api.get<Envelope<NotificationPage>>('/notifications', { params: { page } });
  return data.data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get<Envelope<{ totalUnread: number }>>('/notifications/unread-count');
  return data.data.totalUnread;
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/mark-all-read');
}

export async function clearAllNotifications(): Promise<void> {
  await api.delete('/notifications');
}

/** Relative time for the row footer — GOURI renders Carbon's diffForHumans(). */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr > 1 ? 's' : ''} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day > 1 ? 's' : ''} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} month${mo > 1 ? 's' : ''} ago`;
  return `${Math.floor(mo / 12)} year(s) ago`;
}
