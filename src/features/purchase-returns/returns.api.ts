import { api } from '@/lib/api/axios';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export type ReturnPaymentStatus = 'paid' | 'due' | 'partial';

export interface ReturnListItem {
  id: number;
  refNo: string;
  transactionDate: string;
  parentPurchase: { id: number; refNo: string } | null;
  supplier: string;
  location: string;
  paymentStatus: ReturnPaymentStatus;
  finalTotal: number;
  refunded: number;
  due: number;
  items: number;
}

export interface ReturnDetail {
  id: number;
  refNo: string;
  transactionDate: string;
  paymentStatus: ReturnPaymentStatus;
  purchaseId: number | null;
  parentPurchase: { id: number; refNo: string; transactionDate: string } | null;
  contactId: number | null;
  supplier: { id: number; name: string; mobile: string | null } | null;
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
  lines: {
    id: number;
    parentLineId: number | null;
    productId: number;
    variationId: number;
    product: string;
    variation: string;
    sku: string;
    quantity: number;
    purchasePriceIncTax: number;
    lineTotal: number;
    lotNumber: string;
  }[];
  payments: {
    id: number;
    amount: number;
    method: string;
    paymentRefNo: string | null;
    paidOn: string;
    note: string;
  }[];
}

export interface ReturnablePurchase {
  id: number;
  refNo: string;
  transactionDate: string;
  location: string;
  finalTotal: number;
  returnable: number;
}

export interface ReturnableLines {
  purchase: {
    id: number;
    refNo: string;
    transactionDate: string;
    locationId: number;
    contactId: number | null;
    postedStock: boolean;
  };
  lines: {
    parentLineId: number;
    productId: number;
    variationId: number;
    product: string;
    sku: string;
    quantity: number;
    quantitySold: number;
    quantityAdjusted: number;
    quantityReturned: number;
    alreadyOnThisReturn: number;
    returnable: number;
    purchasePriceIncTax: number;
  }[];
}

export interface ListReturnsParams {
  page: number;
  pageSize: number;
  search: string;
  locationId?: number;
  contactId?: number;
  paymentStatus?: ReturnPaymentStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface SaveReturnBody {
  purchase_id: number;
  ref_no?: string;
  transaction_date: string;
  tax_rate_id?: number;
  additional_notes?: string;
  returns: { parent_line_id: number; quantity: number }[];
}

export interface SaveRefundBody {
  amount: number;
  method: string;
  paid_on?: string;
  card_holder_name?: string;
  card_transaction_number?: string;
  card_type?: string;
  cheque_number?: string;
  bank_account_number?: string;
  transaction_no?: string;
  note?: string;
}

export async function listReturns(
  params: ListReturnsParams,
): Promise<{ data: ReturnListItem[]; total: number; totals: { finalTotal: number; due: number } }> {
  const { data } = await api.get<
    Envelope<{ data: ReturnListItem[]; total: number; totals: { finalTotal: number; due: number } }>
  >('/purchase-returns', { params });
  return data.data;
}

export async function getReturn(id: number): Promise<ReturnDetail> {
  const { data } = await api.get<Envelope<ReturnDetail>>(`/purchase-returns/${id}`);
  return data.data;
}

export async function getReturnablePurchases(contactId: number): Promise<ReturnablePurchase[]> {
  const { data } = await api.get<Envelope<{ data: ReturnablePurchase[] }>>(
    '/purchase-returns/returnable-purchases',
    { params: { contact_id: contactId } },
  );
  return data.data.data;
}

export async function getReturnable(purchaseId: number, excludeReturnId?: number): Promise<ReturnableLines> {
  const { data } = await api.get<Envelope<ReturnableLines>>('/purchase-returns/returnable', {
    params: { purchase_id: purchaseId, exclude_return_id: excludeReturnId },
  });
  return data.data;
}

export async function createReturn(body: SaveReturnBody): Promise<ReturnDetail> {
  const { data } = await api.post<Envelope<ReturnDetail>>('/purchase-returns', body);
  return data.data;
}

export async function updateReturn(id: number, body: SaveReturnBody): Promise<ReturnDetail> {
  const { data } = await api.patch<Envelope<ReturnDetail>>(`/purchase-returns/${id}`, body);
  return data.data;
}

export async function deleteReturn(id: number): Promise<void> {
  await api.delete(`/purchase-returns/${id}`);
}

export async function addRefund(id: number, body: SaveRefundBody): Promise<ReturnDetail> {
  const { data } = await api.post<Envelope<ReturnDetail>>(`/purchase-returns/${id}/payments`, body);
  return data.data;
}

export async function deleteRefund(paymentId: number): Promise<void> {
  await api.delete(`/purchase-returns/payments/${paymentId}`);
}
