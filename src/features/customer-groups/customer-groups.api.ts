import { api } from '@/lib/api/axios';

export interface CustomerGroup {
  id: number;
  name: string;
  priceCalculationType: string;
  amount: number;
  sellingPriceGroupId: number | null;
}

export interface CustomerGroupBody {
  name: string;
  price_calculation_type: 'percentage' | 'selling_price_group';
  amount?: number | null;
  selling_price_group_id?: number | null;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function listCustomerGroups(): Promise<CustomerGroup[]> {
  const { data } = await api.get<Envelope<{ data: CustomerGroup[] }>>('/customer-groups');
  return data.data.data;
}

export async function createCustomerGroup(body: CustomerGroupBody): Promise<CustomerGroup> {
  const { data } = await api.post<Envelope<CustomerGroup>>('/customer-groups', body);
  return data.data;
}

export async function updateCustomerGroup(id: number, body: CustomerGroupBody): Promise<CustomerGroup> {
  const { data } = await api.patch<Envelope<CustomerGroup>>(`/customer-groups/${id}`, body);
  return data.data;
}

export async function deleteCustomerGroup(id: number): Promise<void> {
  await api.delete(`/customer-groups/${id}`);
}
