import { api } from '@/lib/api/axios';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export type OrderStatus = 'ordered' | 'partial' | 'completed';
export type ShippingStatus = 'ordered' | 'packed' | 'shipped' | 'delivered' | 'cancelled';

export interface PurchaseOrderListItem {
  id: number;
  refNo: string;
  transactionDate: string;
  deliveryDate: string | null;
  supplier: string;
  location: string;
  status: OrderStatus;
  shippingStatus: ShippingStatus | null;
  finalTotal: number;
  items: number;
  quantityOrdered: number;
  quantityRemaining: number;
  addedBy: string;
}

export interface PurchaseOrderDetailLine {
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
  purchaseRequisitionLineId: number | null;
  quantityReceived: number;
  quantityRemaining: number;
}

export interface PurchaseOrderDetail {
  id: number;
  refNo: string;
  transactionDate: string;
  deliveryDate: string | null;
  status: OrderStatus;
  shippingStatus: ShippingStatus | null;
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
  shippingAddress: string;
  shippingCharges: number;
  deliveredTo: string;
  additionalExpenses: { name: string; amount: number }[];
  finalTotal: number;
  payTermNumber: number | null;
  payTermType: 'days' | 'months' | null;
  exchangeRate: number;
  additionalNotes: string;
  requisitions: { id: number; refNo: string }[];
  addedBy: string;
  lines: PurchaseOrderDetailLine[];
}

export interface OpenOrder {
  id: number;
  refNo: string;
  transactionDate: string;
  status: OrderStatus;
  shippingDetails: string;
  shippingCharges: number;
  additionalExpenses: { name: string; amount: number }[];
  lines: {
    id: number;
    productId: number;
    variationId: number;
    product: string;
    variation: string;
    sku: string;
    quantityRemaining: number;
    ppWithoutDiscount: number;
    discountPercent: number;
    taxRateId: number | null;
  }[];
}

export interface OpenRequisition {
  id: number;
  refNo: string;
  transactionDate: string;
  deliveryDate: string | null;
  status: OrderStatus;
  lines: {
    id: number;
    productId: number;
    variationId: number;
    product: string;
    variation: string;
    sku: string;
    quantityRemaining: number;
    defaultPurchasePrice: number;
  }[];
}

export interface ListOrdersParams {
  page: number;
  pageSize: number;
  search: string;
  locationId?: number;
  contactId?: number;
  status?: OrderStatus;
  shippingStatus?: ShippingStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface SaveOrderLineBody {
  purchase_line_id?: number;
  purchase_requisition_line_id?: number;
  product_id: number;
  variation_id: number;
  quantity: number;
  sub_unit_id?: number;
  pp_without_discount: number;
  discount_percent: number;
  tax_rate_id?: number;
}

export interface SaveOrderBody {
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
  exchange_rate?: number;
  additional_notes?: string;
  purchase_requisition_ids?: number[];
  purchases: SaveOrderLineBody[];
}

export async function listPurchaseOrders(
  params: ListOrdersParams,
): Promise<{ data: PurchaseOrderListItem[]; total: number; totals: { finalTotal: number } }> {
  const { data } = await api.get<
    Envelope<{ data: PurchaseOrderListItem[]; total: number; totals: { finalTotal: number } }>
  >('/purchase-orders', { params });
  return data.data;
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrderDetail> {
  const { data } = await api.get<Envelope<PurchaseOrderDetail>>(`/purchase-orders/${id}`);
  return data.data;
}

export async function getOpenOrders(contactId: number, locationId?: number): Promise<OpenOrder[]> {
  const { data } = await api.get<Envelope<{ data: OpenOrder[] }>>('/purchase-orders/open', {
    params: { contact_id: contactId, location_id: locationId },
  });
  return data.data.data;
}

export async function getOpenRequisitions(locationId: number): Promise<OpenRequisition[]> {
  const { data } = await api.get<Envelope<{ data: OpenRequisition[] }>>(
    '/purchase-orders/open-requisitions',
    { params: { location_id: locationId } },
  );
  return data.data.data;
}

export async function createPurchaseOrder(body: SaveOrderBody): Promise<PurchaseOrderDetail> {
  const { data } = await api.post<Envelope<PurchaseOrderDetail>>('/purchase-orders', body);
  return data.data;
}

export async function updatePurchaseOrder(id: number, body: SaveOrderBody): Promise<PurchaseOrderDetail> {
  const { data } = await api.patch<Envelope<PurchaseOrderDetail>>(`/purchase-orders/${id}`, body);
  return data.data;
}

export async function updateOrderShipping(
  id: number,
  body: { shipping_status: ShippingStatus; delivered_to?: string; shipping_address?: string; delivery_date?: string },
): Promise<PurchaseOrderDetail> {
  const { data } = await api.post<Envelope<PurchaseOrderDetail>>(`/purchase-orders/${id}/shipping`, body);
  return data.data;
}

export async function deletePurchaseOrder(id: number): Promise<void> {
  await api.delete(`/purchase-orders/${id}`);
}
