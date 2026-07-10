import { api } from '@/lib/api/axios';
import type {
  CommissionAgentDetail,
  CommissionAgentFormBody,
  CommissionAgentListItem,
} from './commission-agents.types';

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paginated<T> {
  data: T[];
  total: number;
}

export async function listCommissionAgents(params: {
  page: number;
  pageSize: number;
  search: string;
}): Promise<Paginated<CommissionAgentListItem>> {
  const { data } = await api.get<Envelope<Paginated<CommissionAgentListItem>>>('/commission-agents', {
    params,
  });
  return data.data;
}

export async function getCommissionAgent(id: number): Promise<CommissionAgentDetail> {
  const { data } = await api.get<Envelope<CommissionAgentDetail>>(`/commission-agents/${id}`);
  return data.data;
}

export async function createCommissionAgent(
  body: CommissionAgentFormBody,
): Promise<CommissionAgentDetail> {
  const { data } = await api.post<Envelope<CommissionAgentDetail>>('/commission-agents', body);
  return data.data;
}

export async function updateCommissionAgent(
  id: number,
  body: CommissionAgentFormBody,
): Promise<CommissionAgentDetail> {
  const { data } = await api.patch<Envelope<CommissionAgentDetail>>(`/commission-agents/${id}`, body);
  return data.data;
}

export async function deleteCommissionAgent(id: number): Promise<void> {
  await api.delete(`/commission-agents/${id}`);
}
