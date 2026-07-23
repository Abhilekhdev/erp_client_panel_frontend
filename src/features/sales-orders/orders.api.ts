import { api } from '@/lib/api/axios';

interface Envelope<T> { success: boolean; data: T; }

export type SoStatus = 'ordered' | 'partial' | 'completed';
export type ShippingStatus = 'ordered' | 'packed' | 'shipped' | 'delivered' | 'cancelled';

export interface SalesOrderListItem {
  id: number;
  refNo: string;
  transactionDate: string;
  deliveryDate: string | null;
  customer: string;
  location: string;
  status: SoStatus;
  shippingStatus: ShippingStatus | null;
  finalTotal: number;
  items: number;
  quantityOrdered: number;
  quantityRemaining: number;
}

export interface SalesOrderDetailLine {
  id: number;
  productId: number;
  variationId: number;
  product: string;
  variation: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineDiscountType: 'fixed' | 'percentage' | null;
  lineDiscountAmount: number;
  itemTax: number;
  unitPriceIncTax: number;
  taxRateId: number | null;
  lineTotal: number;
  quantityInvoiced: number;
  quantityRemaining: number;
}

export interface SalesOrderDetail {
  id: number;
  refNo: string;
  transactionDate: string;
  deliveryDate: string | null;
  status: SoStatus;
  shippingStatus: ShippingStatus | null;
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
  deliveredTo: string;
  additionalExpenses: { name: string; amount: number }[];
  finalTotal: number;
  payTermNumber: number | null;
  payTermType: 'days' | 'months' | null;
  additionalNotes: string;
  lines: SalesOrderDetailLine[];
}

export interface OpenSalesOrder {
  id: number;
  refNo: string;
  transactionDate: string;
  status: SoStatus;
  lines: {
    id: number;
    productId: number;
    variationId: number;
    product: string;
    variation: string;
    sku: string;
    quantityRemaining: number;
    unitPrice: number;
    lineDiscountType: 'fixed' | 'percentage' | null;
    lineDiscountAmount: number;
    taxRateId: number | null;
  }[];
}

export interface ListSalesOrdersParams {
  page: number;
  pageSize: number;
  search: string;
  locationId?: number;
  contactId?: number;
  status?: SoStatus;
  shippingStatus?: ShippingStatus;
}

export interface SaveSalesOrderBody {
  contact_id: number;
  location_id: number;
  ref_no?: string;
  transaction_date: string;
  delivery_date?: string;
  pay_term_number?: number;
  pay_term_type?: 'days' | 'months';
  discount_type?: 'fixed' | 'percentage';
  discount_amount?: number;
  tax_rate_id?: number;
  shipping_details?: string;
  shipping_address?: string;
  shipping_charges?: number;
  shipping_status?: ShippingStatus;
  delivered_to?: string;
  additional_expenses?: { name: string; amount: number }[];
  additional_notes?: string;
  sells: {
    sell_line_id?: number;
    product_id: number;
    variation_id: number;
    quantity: number;
    sub_unit_id?: number;
    unit_price?: number;
    line_discount_type?: 'fixed' | 'percentage';
    line_discount_amount?: number;
    tax_rate_id?: number;
  }[];
}

export async function listSalesOrders(params: ListSalesOrdersParams): Promise<{ data: SalesOrderListItem[]; total: number; totals: { finalTotal: number } }> {
  const { data } = await api.get<Envelope<{ data: SalesOrderListItem[]; total: number; totals: { finalTotal: number } }>>('/sales-orders', { params });
  return data.data;
}
export async function getSalesOrder(id: number): Promise<SalesOrderDetail> {
  const { data } = await api.get<Envelope<SalesOrderDetail>>(`/sales-orders/${id}`);
  return data.data;
}
export async function getOpenSalesOrders(contactId: number, locationId?: number): Promise<OpenSalesOrder[]> {
  const { data } = await api.get<Envelope<{ data: OpenSalesOrder[] }>>('/sales-orders/open', { params: { contact_id: contactId, location_id: locationId } });
  return data.data.data;
}
export async function createSalesOrder(body: SaveSalesOrderBody): Promise<SalesOrderDetail> {
  const { data } = await api.post<Envelope<SalesOrderDetail>>('/sales-orders', body);
  return data.data;
}
export async function updateSalesOrder(id: number, body: SaveSalesOrderBody): Promise<SalesOrderDetail> {
  const { data } = await api.patch<Envelope<SalesOrderDetail>>(`/sales-orders/${id}`, body);
  return data.data;
}
export async function updateSoShipping(id: number, body: { shipping_status: ShippingStatus; delivered_to?: string }): Promise<SalesOrderDetail> {
  const { data } = await api.post<Envelope<SalesOrderDetail>>(`/sales-orders/${id}/shipping`, body);
  return data.data;
}
export async function deleteSalesOrder(id: number): Promise<void> {
  await api.delete(`/sales-orders/${id}`);
}
