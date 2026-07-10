import { api } from '@/lib/api/axios';
import type { PermGroup, RoleDetail, RoleFormBody, RoleListItem } from './roles.types';

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paginated<T> {
  data: T[];
  total: number;
}

export async function listRoles(params: {
  page: number;
  pageSize: number;
  search: string;
}): Promise<Paginated<RoleListItem>> {
  const { data } = await api.get<Envelope<Paginated<RoleListItem>>>('/roles', { params });
  return data.data;
}

export async function getRole(id: number): Promise<RoleDetail> {
  const { data } = await api.get<Envelope<RoleDetail>>(`/roles/${id}`);
  return data.data;
}

export async function createRole(body: RoleFormBody): Promise<RoleDetail> {
  const { data } = await api.post<Envelope<RoleDetail>>('/roles', body);
  return data.data;
}

export async function updateRole(id: number, body: RoleFormBody): Promise<RoleDetail> {
  const { data } = await api.patch<Envelope<RoleDetail>>(`/roles/${id}`, body);
  return data.data;
}

export async function deleteRole(id: number): Promise<void> {
  await api.delete(`/roles/${id}`);
}

export async function getPermissionCatalog(): Promise<PermGroup[]> {
  const { data } = await api.get<Envelope<PermGroup[]>>('/permissions/catalog');
  console.log('getPermissionCatalog data:', data);
  return data.data;
}
