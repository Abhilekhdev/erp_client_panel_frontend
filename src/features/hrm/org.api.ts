import { api } from '@/lib/api/axios';

export interface OrgItem {
  id: number;
  name: string;
  shortCode: string | null;
  description: string | null;
}
export interface OrgFormBody {
  name: string;
  shortCode?: string;
  description?: string;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paginated<T> {
  data: T[];
  total: number;
}

/** CRUD bound to a resource base path, shared by the identical Departments & Designations screens. */
export function createOrgApi(base: string) {
  return {
    list: async (params: { page: number; pageSize: number; search: string }) => {
      const { data } = await api.get<Envelope<Paginated<OrgItem>>>(base, { params });
      return data.data;
    },
    create: async (body: OrgFormBody) => {
      const { data } = await api.post<Envelope<OrgItem>>(base, body);
      return data.data;
    },
    update: async (id: number, body: OrgFormBody) => {
      const { data } = await api.patch<Envelope<OrgItem>>(`${base}/${id}`, body);
      return data.data;
    },
    remove: async (id: number) => {
      await api.delete(`${base}/${id}`);
    },
  };
}
