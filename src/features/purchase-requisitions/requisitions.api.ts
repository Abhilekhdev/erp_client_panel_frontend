import { api } from '@/lib/api/axios';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export type RequisitionStatus = 'ordered' | 'partial' | 'completed';

export interface RequisitionListItem {
  id: number;
  refNo: string;
  transactionDate: string;
  deliveryDate: string | null;
  location: string;
  status: RequisitionStatus;
  items: number;
  quantityOrdered: number;
  quantityRemaining: number;
  addedBy: string;
}

export interface RequisitionDetail {
  id: number;
  refNo: string;
  transactionDate: string;
  deliveryDate: string | null;
  status: RequisitionStatus;
  locationId: number;
  location: string;
  additionalNotes: string;
  addedBy: string;
  lines: {
    id: number;
    productId: number;
    variationId: number;
    product: string;
    variation: string;
    sku: string;
    alertQuantity: number | null;
    quantity: number;
    secondaryUnitQuantity: number;
    quantityOrdered: number;
    quantityRemaining: number;
  }[];
}

export interface LowStockHit {
  variationId: number;
  productId: number;
  name: string;
  variation: string;
  sku: string;
  currentStock: number;
  alertQuantity: number;
  suggestedQuantity: number;
  unitName: string;
  allowDecimal: boolean;
}

export interface ListRequisitionsParams {
  page: number;
  pageSize: number;
  search: string;
  locationId?: number;
  status?: RequisitionStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface SaveRequisitionBody {
  location_id: number;
  ref_no?: string;
  transaction_date?: string;
  delivery_date?: string;
  additional_notes?: string;
  requisitions: {
    product_id: number;
    variation_id: number;
    quantity: number;
    secondary_unit_quantity?: number;
  }[];
}

export async function listRequisitions(
  params: ListRequisitionsParams,
): Promise<{ data: RequisitionListItem[]; total: number }> {
  const { data } = await api.get<Envelope<{ data: RequisitionListItem[]; total: number }>>(
    '/purchase-requisitions',
    { params },
  );
  return data.data;
}

export async function getRequisition(id: number): Promise<RequisitionDetail> {
  const { data } = await api.get<Envelope<RequisitionDetail>>(`/purchase-requisitions/${id}`);
  return data.data;
}

export async function getLowStock(params: {
  location_id?: number;
  brand_ids?: string;
  category_ids?: string;
}): Promise<LowStockHit[]> {
  const { data } = await api.get<Envelope<{ data: LowStockHit[] }>>(
    '/purchase-requisitions/low-stock',
    { params },
  );
  return data.data.data;
}

export async function createRequisition(body: SaveRequisitionBody): Promise<RequisitionDetail> {
  const { data } = await api.post<Envelope<RequisitionDetail>>('/purchase-requisitions', body);
  return data.data;
}

export async function deleteRequisition(id: number): Promise<void> {
  await api.delete(`/purchase-requisitions/${id}`);
}
