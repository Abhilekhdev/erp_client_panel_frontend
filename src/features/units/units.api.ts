import { api } from '@/lib/api/axios';

export interface Unit {
  id: number;
  actualName: string;
  shortName: string;
  allowDecimal: boolean;
  baseUnitId: number | null;
  baseUnitMultiplier: number | null;
  baseUnitName: string | null;
  relation: string | null; // "1 Box = 12 Pcs" for sub-units, else null
}

export interface UnitOption {
  id: number;
  name: string; // "Pieces (Pcs)"
}

export interface UnitBody {
  actual_name: string;
  short_name: string;
  allow_decimal: boolean;
  base_unit_id?: number | null;
  base_unit_multiplier?: number | null;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function listUnits(): Promise<Unit[]> {
  const { data } = await api.get<Envelope<{ data: Unit[] }>>('/units');
  return data.data.data;
}

export async function unitDropdown(): Promise<UnitOption[]> {
  const { data } = await api.get<Envelope<{ data: UnitOption[] }>>('/units/dropdown');
  return data.data.data;
}

export async function createUnit(body: UnitBody): Promise<Unit> {
  const { data } = await api.post<Envelope<Unit>>('/units', body);
  return data.data;
}

export async function updateUnit(id: number, body: UnitBody): Promise<Unit> {
  const { data } = await api.patch<Envelope<Unit>>(`/units/${id}`, body);
  return data.data;
}

export async function deleteUnit(id: number): Promise<void> {
  await api.delete(`/units/${id}`);
}
