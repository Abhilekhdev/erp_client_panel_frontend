import { api } from '@/lib/api/axios';

interface Envelope<T> { success: boolean; data: T; }
export type ReturnPaymentStatus = 'paid' | 'due' | 'partial';

export interface SellReturnListItem {
  id: number;
  refNo: string;
  transactionDate: string;
  parentSell: { id: number; refNo: string } | null;
  customer: string;
  location: string;
  paymentStatus: ReturnPaymentStatus;
  finalTotal: number;
  refunded: number;
  due: number;
  items: number;
}

export interface SellReturnDetail {
  id: number;
  refNo: string;
  transactionDate: string;
  paymentStatus: ReturnPaymentStatus;
  sellId: number | null;
  parentSell: { id: number; refNo: string; transactionDate: string } | null;
  contactId: number | null;
  customer: { id: number; name: string; mobile: string | null } | null;
  locationId: number;
  location: string;
  lineSubtotal: number;
  taxRateId: number | null;
  tax: { id: number; name: string; amount: number } | null;
  taxAmount: number;
  finalTotal: number;
  refunded: number;
  due: number;
  additionalNotes: string;
  lines: { id: number; parentLineId: number | null; productId: number; variationId: number; product: string; variation: string; sku: string; quantity: number; unitPriceIncTax: number; lineTotal: number }[];
  payments: { id: number; amount: number; method: string; paymentRefNo: string | null; paidOn: string; note: string }[];
}

export interface ReturnableSell { id: number; refNo: string; transactionDate: string; location: string; finalTotal: number; returnable: number; }
export interface ReturnableLines {
  sale: { id: number; refNo: string; transactionDate: string; locationId: number; contactId: number | null; postedStock: boolean };
  lines: { parentLineId: number; productId: number; variationId: number; product: string; quantity: number; quantityReturned: number; alreadyOnThisReturn: number; returnable: number; unitPriceIncTax: number }[];
}

export interface ListSellReturnsParams { page: number; pageSize: number; search: string; locationId?: number; contactId?: number; paymentStatus?: ReturnPaymentStatus; }
export interface SaveSellReturnBody { sell_id: number; ref_no?: string; transaction_date: string; tax_rate_id?: number; additional_notes?: string; returns: { parent_line_id: number; quantity: number }[]; }
export interface SaveRefundBody { amount: number; method: string; paid_on?: string; cheque_number?: string; bank_account_number?: string; transaction_no?: string; note?: string; }

export async function listSellReturns(params: ListSellReturnsParams): Promise<{ data: SellReturnListItem[]; total: number; totals: { finalTotal: number; due: number } }> {
  const { data } = await api.get<Envelope<{ data: SellReturnListItem[]; total: number; totals: { finalTotal: number; due: number } }>>('/sell-returns', { params });
  return data.data;
}
export async function getSellReturn(id: number): Promise<SellReturnDetail> {
  const { data } = await api.get<Envelope<SellReturnDetail>>(`/sell-returns/${id}`);
  return data.data;
}
export async function getReturnableSells(contactId: number): Promise<ReturnableSell[]> {
  const { data } = await api.get<Envelope<{ data: ReturnableSell[] }>>('/sell-returns/returnable-sells', { params: { contact_id: contactId } });
  return data.data.data;
}
export async function getReturnable(sellId: number, excludeReturnId?: number): Promise<ReturnableLines> {
  const { data } = await api.get<Envelope<ReturnableLines>>('/sell-returns/returnable', { params: { sell_id: sellId, exclude_return_id: excludeReturnId } });
  return data.data;
}
export async function createSellReturn(body: SaveSellReturnBody): Promise<SellReturnDetail> {
  const { data } = await api.post<Envelope<SellReturnDetail>>('/sell-returns', body);
  return data.data;
}
export async function deleteSellReturn(id: number): Promise<void> {
  await api.delete(`/sell-returns/${id}`);
}
export async function addRefund(id: number, body: SaveRefundBody): Promise<SellReturnDetail> {
  const { data } = await api.post<Envelope<SellReturnDetail>>(`/sell-returns/${id}/payments`, body);
  return data.data;
}
export async function deleteRefund(paymentId: number): Promise<void> {
  await api.delete(`/sell-returns/payments/${paymentId}`);
}
