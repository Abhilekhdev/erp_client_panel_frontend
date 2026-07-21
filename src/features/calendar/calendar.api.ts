import { api } from '@/lib/api/axios';

export interface CalendarEvent {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  /** YYYY-MM-DD, inclusive on both ends. */
  start: string;
  end: string;
  allDay: boolean;
  color: string;
  link: string | null;
}

export interface CalendarEventType {
  key: string;
  label: string;
  color: string;
  /** False when the data source (module) isn't built yet — chip is shown but disabled. */
  available: boolean;
  requires?: string;
}

export interface CalendarMeta {
  canPickUser: boolean;
  currentUserId: number;
  users: { id: number; name: string }[];
  locations: { id: number; name: string }[];
  eventTypes: CalendarEventType[];
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getCalendarMeta(): Promise<CalendarMeta> {
  const { data } = await api.get<Envelope<CalendarMeta>>('/calendar/meta');
  return data.data;
}

export async function getCalendarEvents(params: {
  start: string;
  end: string;
  events: string[];
  userId?: number;
  locationId?: number;
}): Promise<CalendarEvent[]> {
  const { data } = await api.get<Envelope<{ data: CalendarEvent[] }>>('/calendar/events', {
    params,
    // Repeat the key per value (`events=a&events=b`) — the shape the DTO expects.
    paramsSerializer: {
      indexes: null,
    },
  });
  return data.data.data;
}
