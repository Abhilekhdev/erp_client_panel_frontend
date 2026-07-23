import { api } from '@/lib/api/axios';
import type {
  ContactDetail,
  ContactFormBody,
  ContactListItem,
  ContactListType,
  ContactMeta,
} from './contacts.types';

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paginated<T> {
  data: T[];
  total: number;
}

export interface ListContactsParams {
  type: ContactListType;
  page: number;
  pageSize: number;
  search: string;
  status?: 'active' | 'inactive';
  customerGroupId?: number;
}

export async function listContacts(params: ListContactsParams): Promise<Paginated<ContactListItem>> {
  const { data } = await api.get<Envelope<Paginated<ContactListItem>>>('/contacts', { params });
  return data.data;
}

export async function getContactMeta(): Promise<ContactMeta> {
  const { data } = await api.get<Envelope<ContactMeta>>('/contacts/meta');
  return data.data;
}

export async function getContact(id: number): Promise<ContactDetail> {
  const { data } = await api.get<Envelope<ContactDetail>>(`/contacts/${id}`);
  return data.data;
}

export async function createContact(body: ContactFormBody): Promise<ContactDetail> {
  const { data } = await api.post<Envelope<ContactDetail>>('/contacts', body);
  return data.data;
}

export async function updateContact(id: number, body: ContactFormBody): Promise<ContactDetail> {
  const { data } = await api.patch<Envelope<ContactDetail>>(`/contacts/${id}`, body);
  return data.data;
}

export async function toggleContactStatus(id: number): Promise<{ contactStatus: string }> {
  const { data } = await api.patch<Envelope<{ contactStatus: string }>>(`/contacts/${id}/toggle-status`);
  return data.data;
}

export async function deleteContact(id: number): Promise<void> {
  await api.delete(`/contacts/${id}`);
}

export interface ContactLedgerRow {
  date: string;
  refNo: string;
  type: string;
  label: string;
  location: string;
  paymentStatus: string | null;
  method: string | null;
  debit: number | null;
  credit: number | null;
  balance: number;
  note: string;
}

export interface ContactLedger {
  contact: { id: number; name: string; type: string };
  openingBalance: number;
  totalInvoice: number;
  totalPurchase: number;
  totalPaid: number;
  advanceBalance: number;
  /** Positive = the contact owes us; negative = we owe them. */
  balanceDue: number;
  rows: ContactLedgerRow[];
}

export async function getContactLedger(
  id: number,
  params: { dateFrom?: string; dateTo?: string; locationId?: number } = {},
): Promise<ContactLedger> {
  const { data } = await api.get<Envelope<ContactLedger>>(`/contacts/${id}/ledger`, { params });
  return data.data;
}
