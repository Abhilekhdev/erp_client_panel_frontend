import { api } from '@/lib/api/axios';
import type {
  NotificationTemplatesResponse,
  SaveNotificationTemplatesPayload,
} from './notification-templates.types';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getNotificationTemplates(): Promise<NotificationTemplatesResponse> {
  const { data } = await api.get<Envelope<NotificationTemplatesResponse>>('/notification-templates');
  return data.data;
}

export async function saveNotificationTemplates(
  body: SaveNotificationTemplatesPayload,
): Promise<NotificationTemplatesResponse> {
  const { data } = await api.post<Envelope<NotificationTemplatesResponse>>(
    '/notification-templates',
    body,
  );
  return data.data;
}
