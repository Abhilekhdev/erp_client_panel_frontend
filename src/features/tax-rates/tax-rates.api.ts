import { api } from '@/lib/api/axios';

export interface TaxSubRate {
  id: number;
  name: string;
  amount: number;
}

export interface TaxRate {
  id: number;
  name: string;
  amount: number;
  isTaxGroup: boolean;
  forTaxGroup: boolean;
  subTaxes: TaxSubRate[];
}

export interface TaxRateBody {
  name: string;
  amount: number;
  for_tax_group: boolean;
}

export interface TaxGroupBody {
  name: string;
  taxes: number[];
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function listTaxRates(): Promise<TaxRate[]> {
  const { data } = await api.get<Envelope<{ data: TaxRate[] }>>('/tax-rates');
  return data.data.data;
}

// ── simple rates ────────────────────────────────────────
export async function createTaxRate(body: TaxRateBody): Promise<TaxRate> {
  const { data } = await api.post<Envelope<TaxRate>>('/tax-rates', body);
  return data.data;
}
export async function updateTaxRate(id: number, body: TaxRateBody): Promise<TaxRate> {
  const { data } = await api.patch<Envelope<TaxRate>>(`/tax-rates/${id}`, body);
  return data.data;
}
export async function deleteTaxRate(id: number): Promise<void> {
  await api.delete(`/tax-rates/${id}`);
}

// ── tax groups ──────────────────────────────────────────
export async function createTaxGroup(body: TaxGroupBody): Promise<TaxRate> {
  const { data } = await api.post<Envelope<TaxRate>>('/tax-groups', body);
  return data.data;
}
export async function updateTaxGroup(id: number, body: TaxGroupBody): Promise<TaxRate> {
  const { data } = await api.patch<Envelope<TaxRate>>(`/tax-groups/${id}`, body);
  return data.data;
}
export async function deleteTaxGroup(id: number): Promise<void> {
  await api.delete(`/tax-groups/${id}`);
}
