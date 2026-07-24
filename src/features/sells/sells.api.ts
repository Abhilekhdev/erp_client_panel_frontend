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
  /** The walk-in default customer the POS pre-selects (null if none is flagged). */
  defaultCustomerId: number | null;
  customers: {
    id: number;
    name: string;
    mobile: string;
    isDefault: boolean;
    payTermNumber: number | null;
    payTermType: 'days' | 'months' | null;
    address: string;
  }[];
  taxRates: { id: number; name: string; amount: number }[];
  priceGroups: { id: number; name: string }[];
  categories: { id: number; name: string; subCategories: { id: number; name: string }[] }[];
  brands: { id: number; name: string }[];
  /** Payment accounts for the "deposit to" dropdown in the payment modal. */
  accounts: { id: number; name: string }[];
  paymentMethods: { value: string; label: string }[];
  settings: {
    enableInlineTax: boolean;
    enableSubUnits: boolean;
    currencyPrecision: number;
    quantityPrecision: number;
    currency: { code: string; symbol: string };
    /** POS keyboard map (GOURI defaults when uncustomised). Keys → key-combo strings. */
    keyboardShortcuts: Record<string, string>;
    /** Weighing-scale barcode layout (null → feature off). */
    weighingScale: { labelPrefix: string; skuLength: number; qtyIntegerLength: number; qtyFractionalLength: number } | null;
    /** POS on/off toggles. */
    posSettings: Record<string, unknown>;
  };
  /** Restaurant module flags — the POS shows Table/Staff pickers only when on. */
  restaurant: {
    tablesEnabled: boolean;
    serviceStaffEnabled: boolean;
    kitchenEnabled: boolean;
    inlineServiceStaff: boolean;
    isServiceStaffRequired: boolean;
  };
}

export interface SellProductHit {
  variationId: number;
  productId: number;
  name: string;
  variation: string;
  sku: string;
  /** Product image path (POS grid only; the line search omits it). */
  image?: string | null;
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
  isSuspend: boolean;
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
  /** Restaurant: the service staff (waiter) for this line. */
  res_service_staff_id?: number;
}

export interface SaveSellBody {
  contact_id: number;
  location_id: number;
  ref_no?: string;
  transaction_date: string;
  status: 'final' | 'draft';
  sub_status?: 'quotation' | 'proforma';
  /** POS "Suspend" — parks the bill as a draft with no payment. */
  is_suspend?: boolean;
  /** Restaurant: dining table + waiter for this sale. */
  res_table_id?: number;
  res_waiter_id?: number;
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
  card_holder_name?: string;
  card_transaction_number?: string;
  card_type?: string;
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
export interface PosGridResponse { data: SellProductHit[]; page: number; hasMore: boolean }
export async function posGridProducts(params: {
  location_id?: number; category_id?: number | string; brand_id?: number | string; search?: string; price_group_id?: number; page?: number;
}): Promise<PosGridResponse> {
  const { data } = await api.get<Envelope<PosGridResponse>>('/sells/pos/products', { params });
  return data.data;
}
export interface SuspendedSale {
  id: number;
  refNo: string;
  transactionDate: string;
  customer: string;
  location: string;
  finalTotal: number;
  items: number;
  note: string;
}
export async function listSuspendedSells(locationId?: number): Promise<SuspendedSale[]> {
  const { data } = await api.get<Envelope<SuspendedSale[]>>('/sells/suspended', { params: { location_id: locationId } });
  return data.data;
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
