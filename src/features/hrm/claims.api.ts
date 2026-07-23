import { api } from '@/lib/api/axios';

export interface ClaimItem {
  id: number;
  refNo: string | null;
  description: string;
  amount: number;
  categoryId: number | null;
  category: string | null;
  subCategoryId: number | null;
  applicableDate: string;
  document: string | null;
  documentUrl: string | null;
  status: string; // pending | approved | unapproved
  statusLabel: string; // Pending | Approved | UnApproved
  statusNote: string;
  employees: number[];
  employeeNames: string[];
}
export interface IdName {
  id: number;
  name: string;
}
export interface ClaimMeta {
  categories: IdName[];
  employees: IdName[];
  statuses: { value: string; label: string }[];
  canApprove: boolean;
}
export interface ClaimCategory {
  id: number;
  name: string;
  code: string;
  parentId: number | null;
  parentName: string | null;
  isSubCategory: boolean;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paginated<T> {
  data: T[];
  total: number;
  canApprove: boolean;
}
interface PaginatedCat<T> {
  data: T[];
  total: number;
}

export interface ClaimFilters {
  page: number;
  pageSize: number;
  search: string;
  userId?: number | '';
  categoryId?: number | '';
  status?: string;
}

// A claim's editable payload. `document` is an optional File (multipart).
export interface ClaimInput {
  description: string;
  amount: string;
  categoryId?: number | '';
  subCategoryId?: number | '';
  applicableDate?: string;
  employees?: number[];
  status?: string;
  document?: File | null;
}

function toFormData(input: ClaimInput): FormData {
  const fd = new FormData();
  fd.append('description', input.description);
  fd.append('amount', input.amount);
  if (input.categoryId) fd.append('categoryId', String(input.categoryId));
  if (input.subCategoryId) fd.append('subCategoryId', String(input.subCategoryId));
  if (input.applicableDate) fd.append('applicableDate', input.applicableDate);
  if (input.status) fd.append('status', input.status);
  for (const id of input.employees ?? []) fd.append('employees', String(id));
  if (input.document) fd.append('document', input.document);
  return fd;
}

export async function listClaims(params: ClaimFilters): Promise<Paginated<ClaimItem>> {
  const { data } = await api.get<Envelope<Paginated<ClaimItem>>>('/hrm/claims', { params });
  return data.data;
}
export async function getClaimMeta(): Promise<ClaimMeta> {
  const { data } = await api.get<Envelope<ClaimMeta>>('/hrm/claims/meta');
  return data.data;
}
export async function getClaimSubCategories(parentId: number): Promise<IdName[]> {
  const { data } = await api.get<Envelope<IdName[]>>(`/hrm/claims/sub-categories/${parentId}`);
  return data.data;
}
export async function createClaim(input: ClaimInput): Promise<ClaimItem> {
  const { data } = await api.post<Envelope<ClaimItem>>('/hrm/claims', toFormData(input));
  return data.data;
}
export async function updateClaim(id: number, input: ClaimInput): Promise<ClaimItem> {
  const { data } = await api.patch<Envelope<ClaimItem>>(`/hrm/claims/${id}`, toFormData(input));
  return data.data;
}
export async function changeClaimStatus(
  id: number,
  body: { status: string; statusNote?: string },
): Promise<ClaimItem> {
  const { data } = await api.post<Envelope<ClaimItem>>(`/hrm/claims/${id}/status`, body);
  return data.data;
}
export async function deleteClaim(id: number): Promise<void> {
  await api.delete(`/hrm/claims/${id}`);
}

// ── categories ─────────────────────────────────────────
export async function listClaimCategories(params: {
  page: number;
  pageSize: number;
  search: string;
}): Promise<PaginatedCat<ClaimCategory>> {
  const { data } = await api.get<Envelope<PaginatedCat<ClaimCategory>>>('/hrm/claim-categories', {
    params,
  });
  return data.data;
}
export async function getClaimCategoryParents(): Promise<IdName[]> {
  const { data } = await api.get<Envelope<IdName[]>>('/hrm/claim-categories/parents');
  return data.data;
}
export async function createClaimCategory(body: {
  name: string;
  code?: string;
  parentId?: number | '';
}): Promise<ClaimCategory> {
  const { data } = await api.post<Envelope<ClaimCategory>>('/hrm/claim-categories', body);
  return data.data;
}
export async function updateClaimCategory(
  id: number,
  body: { name: string; code?: string; parentId?: number | '' },
): Promise<ClaimCategory> {
  const { data } = await api.patch<Envelope<ClaimCategory>>(`/hrm/claim-categories/${id}`, body);
  return data.data;
}
export async function deleteClaimCategory(id: number): Promise<void> {
  await api.delete(`/hrm/claim-categories/${id}`);
}
