import { api } from '@/lib/api/axios';
import type { StockItem } from '@/features/stock-common/StockItemSearch';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export type TransferStatus = 'pending' | 'in_transit' | 'completed';

export interface TransferRow {
  id: number;
  refNo: string;
  transactionDate: string;
  fromLocation: string;
  toLocation: string | null;
  status: TransferStatus;
  totalAmount: number;
  lineCount: number;
}
export interface TransferLine {
  productId: number;
  variationId: number;
  productName: string;
  variationName: string | null;
  subSku: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}
export interface TransferDetail {
  id: number;
  refNo: string;
  transactionDate: string;
  status: TransferStatus;
  fromLocationId: number;
  fromLocation: string;
  fromAddress: string;
  toLocationId: number;
  toLocation: string;
  toAddress: string;
  shippingCharges: number;
  additionalNotes: string | null;
  totalAmount: number;
  lineSubtotal: number;
  createdByName: string;
  createdAt: string | null;
  lines: TransferLine[];
}
export interface SaveTransferBody {
  transaction_date?: string;
  ref_no?: string;
  status: TransferStatus;
  location_id: number;
  transfer_location_id: number;
  shipping_charges?: number;
  additional_notes?: string | null;
  products: { product_id: number; variation_id: number; quantity: number; unit_price?: number }[];
}

export async function listTransfers(params: { page: number; pageSize: number; search: string }) {
  const { data } = await api.get<Envelope<{ data: TransferRow[]; total: number }>>('/stock-transfers', { params });
  return data.data;
}
export async function getTransfer(id: number): Promise<TransferDetail> {
  const { data } = await api.get<Envelope<TransferDetail>>(`/stock-transfers/${id}`);
  return data.data;
}
export async function getTransferMeta(): Promise<{ locations: { id: number; name: string }[] }> {
  const { data } = await api.get<Envelope<{ locations: { id: number; name: string }[] }>>('/stock-transfers/meta');
  return data.data;
}
export async function searchTransferProducts(locationId: number, search: string): Promise<StockItem[]> {
  const { data } = await api.get<Envelope<StockItem[]>>('/stock-transfers/products', {
    params: { locationId, search },
  });
  return data.data;
}
export async function createTransfer(body: SaveTransferBody): Promise<TransferDetail> {
  const { data } = await api.post<Envelope<TransferDetail>>('/stock-transfers', body);
  return data.data;
}
export async function updateTransferStatus(id: number, status: TransferStatus): Promise<TransferDetail> {
  const { data } = await api.post<Envelope<TransferDetail>>(`/stock-transfers/${id}/status`, { status });
  return data.data;
}
export async function deleteTransfer(id: number): Promise<void> {
  await api.delete(`/stock-transfers/${id}`);
}
