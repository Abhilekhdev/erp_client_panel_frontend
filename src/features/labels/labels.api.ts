import { api } from '@/lib/api/axios';

/**
 * A label-sheet layout (GOURI `barcodes`). This is the sticker geometry — how big each label is and
 * how they tile on the page — not the barcode symbology, which lives on the product.
 */
export interface LabelSheet {
  id: number;
  name: string;
  description: string;
  width: number | null;
  height: number | null;
  paperWidth: number | null;
  paperHeight: number | null;
  topMargin: number | null;
  leftMargin: number | null;
  rowDistance: number | null;
  colDistance: number | null;
  stickersInOneRow: number | null;
  stickersInOneSheet: number | null;
  isDefault: boolean;
  isContinuous: boolean;
  /** Built-in presets are shared across tenants and cannot be edited — duplicate instead. */
  isSystem: boolean;
}

export interface SaveLabelSheetBody {
  name: string;
  description?: string;
  width?: number | null;
  height?: number | null;
  paper_width?: number | null;
  paper_height?: number | null;
  top_margin?: number | null;
  left_margin?: number | null;
  row_distance?: number | null;
  col_distance?: number | null;
  stickers_in_one_row?: number | null;
  stickers_in_one_sheet?: number | null;
  is_continuous?: boolean;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function listLabelSheets(): Promise<LabelSheet[]> {
  const { data } = await api.get<Envelope<{ data: LabelSheet[] }>>('/barcodes');
  return data.data.data;
}
export async function getDefaultLabelSheet(): Promise<LabelSheet | null> {
  const { data } = await api.get<Envelope<LabelSheet | null>>('/barcodes/default');
  return data.data;
}
export async function createLabelSheet(body: SaveLabelSheetBody): Promise<LabelSheet> {
  const { data } = await api.post<Envelope<LabelSheet>>('/barcodes', body);
  return data.data;
}
export async function updateLabelSheet(id: number, body: SaveLabelSheetBody): Promise<LabelSheet> {
  const { data } = await api.patch<Envelope<LabelSheet>>(`/barcodes/${id}`, body);
  return data.data;
}
export async function setDefaultLabelSheet(id: number): Promise<LabelSheet> {
  const { data } = await api.post<Envelope<LabelSheet>>(`/barcodes/${id}/set-default`, {});
  return data.data;
}
export async function deleteLabelSheet(id: number): Promise<void> {
  await api.delete(`/barcodes/${id}`);
}
