import { api } from '@/lib/api/axios';
import type { UserDetail, UserFormBody, UserListItem, UserMeta } from './users.types';

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paginated<T> {
  data: T[];
  total: number;
}

export async function listUsers(params: {
  page: number;
  pageSize: number;
  search: string;
}): Promise<Paginated<UserListItem>> {
  const { data } = await api.get<Envelope<Paginated<UserListItem>>>('/users', { params });
  return data.data;
}

export async function getUserMeta(): Promise<UserMeta> {
  const { data } = await api.get<Envelope<UserMeta>>('/users/meta');
  return data.data;
}

export async function getUser(id: number): Promise<UserDetail> {
  const { data } = await api.get<Envelope<UserDetail>>(`/users/${id}`);
  return data.data;
}

export async function createUser(body: UserFormBody): Promise<UserDetail> {
  const { data } = await api.post<Envelope<UserDetail>>('/users', body);
  return data.data;
}

export async function updateUser(id: number, body: UserFormBody): Promise<UserDetail> {
  const { data } = await api.patch<Envelope<UserDetail>>(`/users/${id}`, body);
  return data.data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}
