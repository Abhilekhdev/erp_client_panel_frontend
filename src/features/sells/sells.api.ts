import { api } from '@/lib/api/axios';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export type SellStatus = 'final' | 'draft' | 'quotation' | 'proforma';
export type PaymentStatus = 'paid' | 'due' | 'partial';

export interface SellListItem {
  id: number;
  refNo: string;
  transactionDate: string;
  customer: string;
  location: string;
  status: SellStatus;
  paymentStatus: PaymentStatus;
  isOverdue: boolean;
  finalTotal: number;
  paid: number;
  due: number;
  items: number;
}

export interface SellsListResponse {
  data: SellListItem[];
  total: number;
  totals: { finalTotal: number; due: number };
}

export interface ListSellsParams {
  page: number;
  pageSize: number;
  search: string;
  locationId?: number;
  contactId?: number;
  status?: 'final' | 'draft' | 'quotation';
  paymentStatus?: PaymentStatus | 'overdue';
  dateFrom?: string;
  dateTo?: string;
}

export interface SellMeta {
  locations: { id: number; name: string }[];
  customers: {
    id: number;
    name: string;
    mobile: string;
    payTermNumber: number | null;
    payTermType: 'days' | 'months' | null;
    address: string;
  }[];
  taxRates: { id: number; name: string; amount: number }[];
  priceGroups: { id: number; name: string }[];
  paymentMethods: { value: string; label: string }[];
  settings: {
    enableInlineTax: boolean;
    enableSubUnits: boolean;
    currencyPrecision: number;
    quantityPrecision: number;
    currency: { code: string; symbol: string };
  };
}

export interface SellProductHit {
  variationId: number;
  productId: number;
  name: string;
  variation: string;
  sku: string;
  enableStock: boolean;
  currentStock: number | null;
  taxRateId: number | null;
  unitId: number | null;
  unitName: string;
  allowDecimal: boolean;
  subUnits: { id: number; name: string; shortName: string; multiplier: number }[];
  defaultSellPrice: number;
  sellPriceIncTax: number;
}

export interface SellDetailLine {
  id: number;
  productId: number;
  variationId: number;
  product: string;
  variation: string;
  sku: string;
  quantity: number;
  subUnitId: number | null;
  unitPrice: number;
  unitPriceBeforeDiscount: number;
  lineDiscountType: 'fixed' | 'percentage' | null;
  lineDiscountAmount: number;
  itemTax: number;
  unitPriceIncTax: number;
  taxRateId: number | null;
  lineTotal: number;
  quantityReturned: number;
  note: string;
}

export interface SellPayment {
  id: number;
  amount: number;
  method: string;
  accountId: number | null;
  paymentRefNo: string | null;
  paidOn: string;
  note: string;
}

export interface SellDetail {
  id: number;
  refNo: string;
  transactionDate: string;
  status: SellStatus;
  isDraft: boolean;
  paymentStatus: PaymentStatus;
  contactId: number | null;
  customer: { id: number; name: string; mobile: string | null } | null;
  locationId: number;
  location: string;
  lineSubtotal: number;
  taxRateId: number | null;
  tax: { id: number; name: string; amount: number } | null;
  taxAmount: number;
  discountType: 'fixed' | 'percentage' | null;
  discountAmount: number;
  shippingDetails: string;
  shippingAddress: string;
  shippingCharges: number;
  shippingStatus: string | null;
  deliveredTo: string;
  additionalExpenses: { name: string; amount: number }[];
  roundOffAmount: number;
  finalTotal: number;
  paid: number;
  due: number;
  payTermNumber: number | null;
  payTermType: 'days' | 'months' | null;
  additionalNotes: string;
  lines: SellDetailLine[];
  payments: SellPayment[];
}

export interface SaveSellLineBody {
  sell_line_id?: number;
  so_line_id?: number;
  product_id: number;
  variation_id: number;
  quantity: number;
  sub_unit_id?: number;
  unit_price?: number;
  line_discount_type?: 'fixed' | 'percentage';
  line_discount_amount?: number;
  tax_rate_id?: number;
}

export interface SaveSellBody {
  contact_id: number;
  location_id: number;
  ref_no?: string;
  transaction_date: string;
  status: 'final' | 'draft';
  sub_status?: 'quotation' | 'proforma';
  pay_term_number?: number;
  pay_term_type?: 'days' | 'months';
  discount_type?: 'fixed' | 'percentage';
  discount_amount?: number;
  tax_rate_id?: number;
  shipping_details?: string;
  shipping_address?: string;
  shipping_charges?: number;
  delivered_to?: string;
  additional_expenses?: { name: string; amount: number }[];
  round_off_amount?: number;
  additional_notes?: string;
  sales_order_ids?: number[];
  sells: SaveSellLineBody[];
  payment?: SavePaymentBody[];
}

export interface SavePaymentBody {
  amount: number;
  method: string;
  account_id?: number;
  paid_on?: string;
  cheque_number?: string;
  bank_account_number?: string;
  transaction_no?: string;
  note?: string;
}

export async function listSells(params: ListSellsParams): Promise<SellsListResponse> {
  const { data } = await api.get<Envelope<SellsListResponse>>('/sells', { params });
  return data.data;
}
export async function getSellMeta(): Promise<SellMeta> {
  const { data } = await api.get<Envelope<SellMeta>>('/sells/meta');
  return data.data;
}
export async function searchSellProducts(params: { search: string; location_id?: number; price_group_id?: number }): Promise<SellProductHit[]> {
  const { data } = await api.get<Envelope<{ data: SellProductHit[] }>>('/sells/products', { params });
  return data.data.data;
}
export async function getSell(id: number): Promise<SellDetail> {
  const { data } = await api.get<Envelope<SellDetail>>(`/sells/${id}`);
  return data.data;
}
export async function createSell(body: SaveSellBody): Promise<SellDetail> {
  const { data } = await api.post<Envelope<SellDetail>>('/sells', body);
  return data.data;
}
export async function updateSell(id: number, body: SaveSellBody): Promise<SellDetail> {
  const { data } = await api.patch<Envelope<SellDetail>>(`/sells/${id}`, body);
  return data.data;
}
export async function updateSellStatus(id: number, status: 'final' | 'draft'): Promise<SellDetail> {
  const { data } = await api.post<Envelope<SellDetail>>(`/sells/${id}/status`, { status });
  return data.data;
}
export async function deleteSell(id: number): Promise<void> {
  await api.delete(`/sells/${id}`);
}
export async function addSellPayment(id: number, body: SavePaymentBody): Promise<SellDetail> {
  const { data } = await api.post<Envelope<SellDetail>>(`/sells/${id}/payments`, body);
  return data.data;
}
export async function deleteSellPayment(paymentId: number): Promise<void> {
  await api.delete(`/sells/payments/${paymentId}`);
}
