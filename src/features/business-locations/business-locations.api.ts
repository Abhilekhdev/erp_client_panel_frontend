import { api } from '@/lib/api/axios';
import type {
  LocationDetail,
  LocationOptions,
  LocationRow,
  Paginated,
  SaveLocationPayload,
} from './business-locations.types';

interface Envelope<T> {
  success: boolean;
  data: T;
}

const BASE = '/business/locations';

export async function listLocations(params: {
  page: number;
  pageSize: number;
  search: string;
}): Promise<Paginated<LocationRow>> {
  const { data } = await api.get<Envelope<Paginated<LocationRow>>>(BASE, { params });
  return data.data;
}

export async function getLocationOptions(): Promise<LocationOptions> {
  const { data } = await api.get<Envelope<LocationOptions>>(`${BASE}/options`);
  return data.data;
}

export async function getLocation(id: number): Promise<LocationDetail> {
  const { data } = await api.get<Envelope<LocationDetail>>(`${BASE}/${id}`);
  return data.data;
}

export async function createLocation(body: SaveLocationPayload): Promise<LocationDetail> {
  const { data } = await api.post<Envelope<LocationDetail>>(BASE, body);
  return data.data;
}

export async function updateLocation(
  id: number,
  body: SaveLocationPayload,
): Promise<LocationDetail> {
  const { data } = await api.patch<Envelope<LocationDetail>>(`${BASE}/${id}`, body);
  return data.data;
}

export async function activateDeactivateLocation(
  id: number,
): Promise<{ isActive: boolean; msg: string }> {
  const { data } = await api.post<Envelope<{ isActive: boolean; msg: string }>>(
    `${BASE}/${id}/activate-deactivate`,
  );
  return data.data;
}

export async function checkLocationId(
  locationId: string,
  hiddenId?: number,
): Promise<{ valid: boolean }> {
  const { data } = await api.get<Envelope<{ valid: boolean }>>(`${BASE}/check-location-id`, {
    params: { location_id: locationId, ...(hiddenId ? { hidden_id: hiddenId } : {}) },
  });
  return data.data;
}
