import { api } from '@/lib/api/axios';
import type { InvoiceScheme, SaveInvoiceSchemePayload } from './invoice-schemes.types';

interface Envelope<T> {
  success: boolean;
  data: T;
}

const BASE = '/invoice-schemes';

export async function listInvoiceSchemes(): Promise<InvoiceScheme[]> {
  const { data } = await api.get<Envelope<{ data: InvoiceScheme[] }>>(BASE);
  return data.data.data;
}

export async function getInvoiceScheme(id: number): Promise<InvoiceScheme> {
  const { data } = await api.get<Envelope<InvoiceScheme>>(`${BASE}/${id}`);
  return data.data;
}

export async function createInvoiceScheme(body: SaveInvoiceSchemePayload): Promise<InvoiceScheme> {
  const { data } = await api.post<Envelope<InvoiceScheme>>(BASE, body);
  return data.data;
}

export async function updateInvoiceScheme(
  id: number,
  body: SaveInvoiceSchemePayload,
): Promise<InvoiceScheme> {
  const { data } = await api.patch<Envelope<InvoiceScheme>>(`${BASE}/${id}`, body);
  return data.data;
}

export async function deleteInvoiceScheme(id: number): Promise<{ msg: string }> {
  const { data } = await api.delete<Envelope<{ msg: string }>>(`${BASE}/${id}`);
  return data.data;
}

export async function setDefaultInvoiceScheme(id: number): Promise<{ msg: string }> {
  const { data } = await api.post<Envelope<{ msg: string }>>(`${BASE}/${id}/set-default`);
  return data.data;
}
