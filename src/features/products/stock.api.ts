import { api } from '@/lib/api/axios';

interface Envelope<T> {
  success: boolean;
  data: T;
}

// ── opening stock ──────────────────────────────────────
export interface OpeningStockLot {
  purchaseLineId?: number;
  quantity: number;
  purchasePrice: number;
  expDate: string;
  lotNumber: string;
  secondaryUnitQuantity: number;
}

export interface OpeningStockForm {
  product: { id: number; name: string; unitName: string };
  locations: { id: number; name: string }[];
  variations: { variationId: number; label: string; sku: string; defaultPurchasePrice: number }[];
  /** locationId → variationId → lots */
  existingLots: Record<number, Record<number, OpeningStockLot[]>>;
  settings: {
    enableLotNumber: boolean;
    enableProductExpiry: boolean;
    hasSecondaryUnit: boolean;
    defaultDate: string;
  };
}

export interface SaveOpeningStockBody {
  transaction_date?: string;
  lots: {
    location_id: number;
    variation_id: number;
    quantity: number;
    purchase_price?: number;
    exp_date?: string;
    lot_number?: string;
    secondary_unit_quantity?: number;
  }[];
}

export async function getOpeningStock(productId: number): Promise<OpeningStockForm> {
  const { data } = await api.get<Envelope<OpeningStockForm>>(`/products/${productId}/opening-stock`);
  return data.data;
}

export async function saveOpeningStock(
  productId: number,
  body: SaveOpeningStockBody,
): Promise<OpeningStockForm> {
  const { data } = await api.post<Envelope<OpeningStockForm>>(`/products/${productId}/opening-stock`, body);
  return data.data;
}

// ── stock history ──────────────────────────────────────
export interface StockHistoryMeta {
  product: { id: number; name: string; type: string | null; enableStock: boolean; unitName: string };
  locations: { id: number; name: string }[];
  variations: { variationId: number; label: string; sku: string }[];
}

export interface StockHistory {
  summary: {
    totalPurchase: number;
    openingStock: number;
    totalStockTransferIn: number | null;
    totalSellReturn: number | null;
    totalSold: number | null;
    totalStockAdjustment: number;
    totalPurchaseReturn: number;
    totalStockTransferOut: number | null;
    currentStock: number;
  };
  rows: {
    type: string;
    label: string;
    date: string;
    refNo: string;
    quantityChange: number;
    newQuantity: number;
    contact: string;
  }[];
}

export async function getStockHistoryMeta(productId: number): Promise<StockHistoryMeta> {
  const { data } = await api.get<Envelope<StockHistoryMeta>>(`/products/${productId}/stock-history/meta`);
  return data.data;
}

export async function getStockHistory(
  productId: number,
  variationId: number,
  locationId: number,
): Promise<StockHistory> {
  const { data } = await api.get<Envelope<StockHistory>>(`/products/${productId}/stock-history`, {
    params: { variation_id: variationId, location_id: locationId },
  });
  return data.data;
}
