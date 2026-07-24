import { api } from '@/lib/api/axios';

interface Envelope<T> { success: boolean; data: T }

export interface ResTable {
  id: number;
  name: string;
  description: string;
  locationId: number;
  location: string;
}
export interface IdName { id: number; name: string }

export interface LineOrder {
  lineId: number;
  transactionId: number;
  refNo: string;
  date: string;
  product: string;
  sku: string;
  quantity: number;
  status: 'received' | 'cooked' | 'served';
  note: string;
  location: string;
  table: string | null;
  customer: string;
}

export async function listTables(locationId?: number): Promise<ResTable[]> {
  const { data } = await api.get<Envelope<ResTable[]>>('/restaurant/tables', { params: { location_id: locationId } });
  return data.data;
}
export async function createTable(body: { location_id: number; name: string; description?: string }): Promise<ResTable> {
  const { data } = await api.post<Envelope<ResTable>>('/restaurant/tables', body);
  return data.data;
}
export async function updateTable(id: number, body: { location_id: number; name: string; description?: string }): Promise<ResTable> {
  const { data } = await api.patch<Envelope<ResTable>>(`/restaurant/tables/${id}`, body);
  return data.data;
}
export async function deleteTable(id: number): Promise<void> {
  await api.delete(`/restaurant/tables/${id}`);
}
export async function listServiceStaff(locationId?: number): Promise<IdName[]> {
  const { data } = await api.get<Envelope<IdName[]>>('/restaurant/service-staff', { params: { location_id: locationId } });
  return data.data;
}
export async function kitchenOrders(locationId?: number): Promise<LineOrder[]> {
  const { data } = await api.get<Envelope<LineOrder[]>>('/restaurant/kitchen', { params: { location_id: locationId } });
  return data.data;
}
export async function markCooked(lineId: number): Promise<void> {
  await api.post(`/restaurant/kitchen/${lineId}/cooked`);
}
export async function waiterOrders(params: { waiterId?: number; locationId?: number } = {}): Promise<LineOrder[]> {
  const { data } = await api.get<Envelope<LineOrder[]>>('/restaurant/orders', { params: { waiter_id: params.waiterId, location_id: params.locationId } });
  return data.data;
}
export async function markServed(lineId: number): Promise<void> {
  await api.post(`/restaurant/orders/${lineId}/served`);
}
