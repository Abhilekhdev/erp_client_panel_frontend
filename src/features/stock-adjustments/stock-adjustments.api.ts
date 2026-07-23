import { api } from '@/lib/api/axios';
import type { StockItem } from '@/features/stock-common/StockItemSearch';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface AdjustmentRow {
  id: number;
  refNo: string;
  transactionDate: string;
  location: string;
  adjustmentType: string | null;
  totalAmount: number;
  totalAmountRecovered: number;
  lineCount: number;
}
export interface AdjustmentLine {
  id: number;
  productId: number;
  variationId: number;
  productName: string;
  variationName: string | null;
  subSku: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}
export interface AdjustmentDetail {
  id: number;
  refNo: string;
  transactionDate: string;
  locationId: number;
  location: string;
  adjustmentTypeId: number | null;
  adjustmentType: string | null;
  totalAmount: number;
  totalAmountRecovered: number;
  additionalNotes: string | null;
  lines: AdjustmentLine[];
}
export interface AdjustmentMeta {
  locations: { id: number; name: string }[];
  wastageTypes: { id: number; name: string }[];
}
export interface SaveAdjustmentBody {
  location_id: number;
  ref_no?: string;
  transaction_date?: string;
  adjustment_type_id?: number | null;
  total_amount_recovered?: number;
  additional_notes?: string | null;
  products: {
    product_id: number;
    variation_id: number;
    quantity: number;
    unit_price?: number;
    lot_no_line_id?: number | null;
  }[];
}

export async function listAdjustments(params: { page: number; pageSize: number; search: string }) {
  const { data } = await api.get<Envelope<{ data: AdjustmentRow[]; total: number }>>('/stock-adjustments', { params });
  return data.data;
}
export async function getAdjustment(id: number): Promise<AdjustmentDetail> {
  const { data } = await api.get<Envelope<AdjustmentDetail>>(`/stock-adjustments/${id}`);
  return data.data;
}
export async function getAdjustmentMeta(): Promise<AdjustmentMeta> {
  const { data } = await api.get<Envelope<AdjustmentMeta>>('/stock-adjustments/meta');
  return data.data;
}
export async function searchAdjustmentProducts(locationId: number, search: string): Promise<StockItem[]> {
  const { data } = await api.get<Envelope<StockItem[]>>('/stock-adjustments/products', {
    params: { locationId, search },
  });
  return data.data;
}
export async function createAdjustment(body: SaveAdjustmentBody): Promise<AdjustmentDetail> {
  const { data } = await api.post<Envelope<AdjustmentDetail>>('/stock-adjustments', body);
  return data.data;
}
export async function deleteAdjustment(id: number): Promise<void> {
  await api.delete(`/stock-adjustments/${id}`);
}
