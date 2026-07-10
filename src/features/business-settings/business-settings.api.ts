import { api } from '@/lib/api/axios';
import type {
  BusinessSettingsResponse,
  UpdateBusinessSettingsPayload,
} from './business-settings.types';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getBusinessSettings(): Promise<BusinessSettingsResponse> {
  const { data } = await api.get<Envelope<BusinessSettingsResponse>>('/business/settings');
  return data.data;
}

export async function updateBusinessSettings(
  body: UpdateBusinessSettingsPayload,
): Promise<unknown> {
  const { data } = await api.put<Envelope<unknown>>('/business/settings', body);
  return data.data;
}

export interface LogoUploadResult {
  field: string;
  path: string;
  url: string;
}

export async function uploadBusinessLogo(
  type: 'logo' | 'login_logo',
  file: File,
): Promise<LogoUploadResult> {
  const form = new FormData();
  form.append('type', type);
  form.append('file', file);
  const { data } = await api.post<Envelope<LogoUploadResult>>('/business/settings/logo', form);
  return data.data;
}
