import { api } from '@/lib/api/axios';

interface Envelope<T> { success: boolean; data: T }

export interface RegisterDetails {
  id: number;
  status: 'open' | 'close';
  openedAt: string;
  closedAt: string | null;
  location: string | null;
  locationId: number | null;
  user: string;
  cashInHand: number;
  totalSale: number;
  totalExpense: number;
  totalRefund: number;
  expectedCash: number;
  saleByMethod: Record<string, number>;
  expenseByMethod: Record<string, number>;
  refundByMethod: Record<string, number>;
  cardSlips: number;
  chequeCount: number;
  closingAmount: number;
  countedCardSlips: number;
  countedCheques: number;
  denominations: Record<string, number> | null;
  closingNote: string;
}

export async function getCurrentRegister(): Promise<{ open: boolean; registerId: number | null }> {
  const { data } = await api.get<Envelope<{ open: boolean; registerId: number | null }>>('/cash-register/current');
  return data.data;
}
export async function openRegister(body: { location_id?: number; initial_amount?: number }): Promise<RegisterDetails> {
  const { data } = await api.post<Envelope<RegisterDetails>>('/cash-register/open', body);
  return data.data;
}
export async function getRegisterDetails(): Promise<RegisterDetails> {
  const { data } = await api.get<Envelope<RegisterDetails>>('/cash-register/details');
  return data.data;
}
export async function closeRegister(body: {
  closing_amount?: number; total_card_slips?: number; total_cheques?: number; denominations?: Record<string, number>; closing_note?: string;
}): Promise<RegisterDetails> {
  const { data } = await api.post<Envelope<RegisterDetails>>('/cash-register/close', body);
  return data.data;
}
export async function listRegisters(params: { userId?: number; status?: 'open' | 'close'; dateFrom?: string; dateTo?: string }): Promise<{ data: RegisterDetails[] }> {
  const { data } = await api.get<Envelope<{ data: RegisterDetails[] }>>('/cash-register', { params });
  return data.data;
}
