import { api } from '@/lib/api/axios';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export type PurchaseStatus = 'received' | 'pending' | 'ordered';
export type PaymentStatus = 'paid' | 'due' | 'partial';

export interface PurchaseListItem {
  id: number;
  refNo: string;
  transactionDate: string;
  supplier: string;
  location: string;
  status: PurchaseStatus;
  paymentStatus: PaymentStatus;
  isApproved: boolean;
  /** Derived server-side: unpaid AND past its credit term. Never a stored value. */
  isOverdue: boolean;
  finalTotal: number;
  paid: number;
  due: number;
  items: number;
}

export interface PurchasesListResponse {
  data: PurchaseListItem[];
  total: number;
  totals: { finalTotal: number; due: number };
}

export interface ListPurchasesParams {
  page: number;
  pageSize: number;
  search: string;
  locationId?: number;
  contactId?: number;
  status?: PurchaseStatus;
  /** `overdue` is a filter, not a stored status. */
  paymentStatus?: PaymentStatus | 'overdue';
  dateFrom?: string;
  dateTo?: string;
}

export interface PurchaseMeta {
  locations: { id: number; name: string }[];
  suppliers: {
    id: number;
    name: string;
    contactName: string;
    balance: number;
    payTermNumber: number | null;
    payTermType: 'days' | 'months' | null;
    mobile: string;
    taxNumber: string;
    address: string;
  }[];
  taxRates: { id: number; name: string; amount: number }[];
  paymentMethods: { value: string; label: string }[];
  settings: {
    enablePurchaseStatus: boolean;
    enableLotNumber: boolean;
    enableProductExpiry: boolean;
    showMfgDate: boolean;
    enableInlineTax: boolean;
    enableSubUnits: boolean;
    enableEditingProductFromPurchase: boolean;
    purchaseInDiffCurrency: boolean;
    defaultExchangeRate: number;
    currencyPrecision: number;
    quantityPrecision: number;
    defaultProfitPercent: number;
    currency: { code: string; symbol: string };
    purchaseCurrency: { code: string; symbol: string };
  };
}

export interface PurchaseProductHit {
  variationId: number;
  productId: number;
  name: string;
  variation: string;
  sku: string;
  enableStock: boolean;
  /** null when no location is selected, or when the product does not track stock. */
  currentStock: number | null;
  taxRateId: number | null;
  unitId: number | null;
  unitName: string;
  allowDecimal: boolean;
  secondaryUnitId: number | null;
  subUnits: { id: number; name: string; shortName: string; multiplier: number }[];
  defaultPurchasePrice: number;
  dppIncTax: number;
  sellPriceIncTax: number;
  /** What this same supplier last charged — GOURI shows it under the price box. */
  lastPurchase: { price: number; discountPercent: number } | null;
}

export interface PurchaseDetailLine {
  id: number;
  productId: number;
  variationId: number;
  product: string;
  variation: string;
  sku: string;
  quantity: number;
  subUnitId: number | null;
  ppWithoutDiscount: number;
  discountPercent: number;
  purchasePrice: number;
  itemTax: number;
  purchasePriceIncTax: number;
  taxRateId: number | null;
  lineTotal: number;
  lotNumber: string;
  mfgDate: string | null;
  expDate: string | null;
  quantityRemaining: number;
}

export interface PurchasePayment {
  id: number;
  amount: number;
  method: string;
  accountId: number | null;
  paymentRefNo: string | null;
  paidOn: string;
  note: string;
}

export interface PurchaseDetail {
  id: number;
  refNo: string;
  transactionDate: string;
  status: PurchaseStatus;
  paymentStatus: PaymentStatus;
  isApproved: boolean;
  approvedAt: string | null;
  contactId: number | null;
  supplier: { id: number; name: string; mobile: string | null } | null;
  locationId: number;
  location: string;
  lineSubtotal: number;
  taxRateId: number | null;
  tax: { id: number; name: string; amount: number } | null;
  taxAmount: number;
  discountType: 'fixed' | 'percentage' | null;
  discountAmount: number;
  shippingDetails: string;
  shippingCharges: number;
  additionalExpenses: { name: string; amount: number }[];
  finalTotal: number;
  paid: number;
  due: number;
  payTermNumber: number | null;
  payTermType: 'days' | 'months' | null;
  exchangeRate: number;
  additionalNotes: string;
  document: string;
  customField1: string;
  customField2: string;
  customField3: string;
  customField4: string;
  lines: PurchaseDetailLine[];
  payments: PurchasePayment[];
}

/** Only what the user typed. Every derived figure is recomputed by the server. */
export interface SavePurchaseLineBody {
  purchase_line_id?: number;
  /** The purchase-order line this receipt draws against. */
  purchase_order_line_id?: number;
  product_id: number;
  variation_id: number;
  quantity: number;
  sub_unit_id?: number;
  pp_without_discount: number;
  discount_percent: number;
  tax_rate_id?: number;
  lot_number?: string;
  mfg_date?: string;
  exp_date?: string;
  default_sell_price?: number;
}

export interface SavePurchaseBody {
  contact_id: number;
  location_id: number;
  ref_no?: string;
  transaction_date: string;
  status: PurchaseStatus;
  is_approved?: boolean;
  pay_term_number?: number;
  pay_term_type?: 'days' | 'months';
  discount_type?: 'fixed' | 'percentage';
  discount_amount?: number;
  tax_rate_id?: number;
  shipping_details?: string;
  shipping_charges?: number;
  additional_expenses?: { name: string; amount: number }[];
  exchange_rate?: number;
  additional_notes?: string;
  /** Purchase orders this receipt draws down. */
  purchase_order_ids?: number[];
  purchases: SavePurchaseLineBody[];
  payment?: SavePaymentBody[];
}

export interface SavePaymentBody {
  amount: number;
  method: string;
  account_id?: number;
  paid_on?: string;
  card_transaction_number?: string;
  card_holder_name?: string;
  card_type?: string;
  cheque_number?: string;
  bank_account_number?: string;
  transaction_no?: string;
  note?: string;
}

export async function listPurchases(params: ListPurchasesParams): Promise<PurchasesListResponse> {
  const { data } = await api.get<Envelope<PurchasesListResponse>>('/purchases', { params });
  return data.data;
}

export async function getPurchaseMeta(): Promise<PurchaseMeta> {
  const { data } = await api.get<Envelope<PurchaseMeta>>('/purchases/meta');
  return data.data;
}

export async function searchPurchaseProducts(params: {
  search: string;
  location_id?: number;
  contact_id?: number;
}): Promise<PurchaseProductHit[]> {
  const { data } = await api.get<Envelope<{ data: PurchaseProductHit[] }>>('/purchases/products', {
    params,
  });
  return data.data.data;
}

/** Downloads the current filter set as a spreadsheet — the whole result set, not just this page. */
export async function exportPurchases(
  params: Omit<ListPurchasesParams, 'page' | 'pageSize'>,
): Promise<void> {
  const res = await api.get('/purchases/export', { params, responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `purchases-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function getPurchase(id: number): Promise<PurchaseDetail> {
  const { data } = await api.get<Envelope<PurchaseDetail>>(`/purchases/${id}`);
  return data.data;
}

export async function createPurchase(body: SavePurchaseBody): Promise<PurchaseDetail> {
  const { data } = await api.post<Envelope<PurchaseDetail>>('/purchases', body);
  return data.data;
}

export async function updatePurchase(id: number, body: SavePurchaseBody): Promise<PurchaseDetail> {
  const { data } = await api.patch<Envelope<PurchaseDetail>>(`/purchases/${id}`, body);
  return data.data;
}

export async function updatePurchaseStatus(id: number, status: PurchaseStatus): Promise<PurchaseDetail> {
  const { data } = await api.post<Envelope<PurchaseDetail>>(`/purchases/${id}/status`, { status });
  return data.data;
}

export async function updatePurchaseApproval(id: number, isApproved: boolean): Promise<PurchaseDetail> {
  const { data } = await api.post<Envelope<PurchaseDetail>>(`/purchases/${id}/approval`, {
    is_approved: isApproved,
  });
  return data.data;
}

export async function deletePurchase(id: number): Promise<void> {
  await api.delete(`/purchases/${id}`);
}

export async function listPurchasePayments(id: number): Promise<PurchasePayment[]> {
  const { data } = await api.get<Envelope<{ data: PurchasePayment[] }>>(`/purchases/${id}/payments`);
  return data.data.data;
}

export async function addPurchasePayment(id: number, body: SavePaymentBody): Promise<PurchaseDetail> {
  const { data } = await api.post<Envelope<PurchaseDetail>>(`/purchases/${id}/payments`, body);
  return data.data;
}

export async function deletePurchasePayment(paymentId: number): Promise<void> {
  await api.delete(`/purchases/payments/${paymentId}`);
}
