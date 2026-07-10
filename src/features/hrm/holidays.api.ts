import { api } from '@/lib/api/axios';

export interface Holiday {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  days: number;
  locationId: number | null;
  location: string | null;
  note: string;
}
export interface HolidayBody {
  name: string;
  startDate: string;
  endDate: string;
  locationId?: number | null;
  note?: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paginated<T> {
  data: T[];
  total: number;
}

export interface HolidayFilters {
  page: number;
  pageSize: number;
  search: string;
  locationId?: number | '';
  startDate?: string;
  endDate?: string;
}

export async function listHolidays(params: HolidayFilters): Promise<Paginated<Holiday>> {
  const { data } = await api.get<Envelope<Paginated<Holiday>>>('/hrm/holidays', { params });
  return data.data;
}
export async function getHolidayMeta(): Promise<{ locations: { id: number; name: string }[] }> {
  const { data } = await api.get<Envelope<{ locations: { id: number; name: string }[] }>>(
    '/hrm/holidays/meta',
  );
  return data.data;
}
export async function createHoliday(body: HolidayBody): Promise<Holiday> {
  const { data } = await api.post<Envelope<Holiday>>('/hrm/holidays', body);
  return data.data;
}
export async function updateHoliday(id: number, body: HolidayBody): Promise<Holiday> {
  const { data } = await api.patch<Envelope<Holiday>>(`/hrm/holidays/${id}`, body);
  return data.data;
}
export async function deleteHoliday(id: number): Promise<void> {
  await api.delete(`/hrm/holidays/${id}`);
}
