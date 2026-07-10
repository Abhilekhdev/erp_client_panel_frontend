import { api } from '@/lib/api/axios';

export interface HrmSettings {
  leaveRefNoPrefix: string;
  leaveInstructions: string;
  payrollRefNoPrefix: string;
  isLocationRequired: boolean;
  graceBeforeCheckin: string;
  graceAfterCheckin: string;
  graceBeforeCheckout: string;
  graceAfterCheckout: string;
  calculateSalesTargetCommissionWithoutTax: boolean;
  essentialsTodosPrefix: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getHrmSettings(): Promise<HrmSettings> {
  const { data } = await api.get<Envelope<HrmSettings>>('/hrm/settings');
  return data.data;
}
export async function updateHrmSettings(body: HrmSettings): Promise<HrmSettings> {
  const { data } = await api.put<Envelope<HrmSettings>>('/hrm/settings', body);
  return data.data;
}
