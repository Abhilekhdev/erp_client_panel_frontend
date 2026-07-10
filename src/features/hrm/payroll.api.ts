import { api } from '@/lib/api/axios';

export interface IdName {
  id: number;
  name: string;
}

/** One row of the "All Payrolls" table. */
export interface PayrollRow {
  id: number;
  employee: string;
  department: string;
  designation: string;
  month: string; // "Aug 2026"
  refNo: string | null;
  total: number;
  paymentStatus: string; // due | partial | paid
  groupId: number | null;
}

/** One row of the "Payroll Groups" table. */
export interface PayrollGroupRow {
  id: number;
  name: string;
  status: string; // draft | final
  paymentStatus: string; // due | partial | paid
  grossTotal: number;
  month: string;
  employees: number;
}

/** A single allowance/deduction line as displayed in a payroll detail. */
export interface PayrollLineView {
  description: string;
  amount: number;
}

/** Full payroll detail (used inside a group's expanded view). */
export interface PayrollDetail {
  id: number;
  refNo: string | null;
  employee: string;
  month: string;
  basicSalary: number;
  finalTotal: number;
  paymentStatus: string;
  allowances: PayrollLineView[];
  deductions: PayrollLineView[];
}

export interface PayrollGroupDetail {
  id: number;
  name: string;
  status: string;
  paymentStatus: string;
  grossTotal: number;
  month: string;
  payrolls: PayrollDetail[];
}

export interface PayrollMeta {
  employees: IdName[];
  locations: IdName[];
  departments: IdName[];
  designations: IdName[];
}

/** An editable allowance/deduction line inside the generate form. */
export interface EditableLine {
  type: 'allowance' | 'deduction';
  description: string;
  amountType: 'fixed' | 'percent';
  amount: number;
}

/** One employee row returned by `prepare` (pre-filled from salary + assigned pay components). */
export interface PreparedEmployee {
  userId: number;
  name: string;
  basicSalary: number;
  lines: EditableLine[];
}

export interface PrepareResult {
  skipped: string[];
  employees: PreparedEmployee[];
}

// ── Pay Components (Allowances & Deductions) ─────────────────────
export interface PayComponent {
  id: number;
  description: string;
  type: string; // allowance | deduction
  amount: number;
  amountType: string; // fixed | percent
  applicableDate: string;
  employees: number[];
  employeeNames: string[];
}

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paginated<T> {
  data: T[];
  total: number;
}

export interface PayrollFilters {
  page: number;
  pageSize: number;
  search: string;
  employeeId?: number | '';
  departmentId?: number | '';
  designationId?: number | '';
  locationId?: number | '';
  month?: string;
}

export async function listPayrolls(params: PayrollFilters): Promise<Paginated<PayrollRow>> {
  const { data } = await api.get<Envelope<Paginated<PayrollRow>>>('/hrm/payroll', { params });
  return data.data;
}
export async function listPayrollGroups(params: {
  page: number;
  pageSize: number;
  search: string;
}): Promise<Paginated<PayrollGroupRow>> {
  const { data } = await api.get<Envelope<Paginated<PayrollGroupRow>>>('/hrm/payroll/groups', {
    params,
  });
  return data.data;
}
export async function getPayrollGroup(id: number): Promise<PayrollGroupDetail> {
  const { data } = await api.get<Envelope<PayrollGroupDetail>>(`/hrm/payroll/groups/${id}`);
  return data.data;
}
export async function getPayroll(id: number): Promise<PayrollDetail> {
  const { data } = await api.get<Envelope<PayrollDetail>>(`/hrm/payroll/${id}`);
  return data.data;
}
export async function getPayrollMeta(): Promise<PayrollMeta> {
  const { data } = await api.get<Envelope<PayrollMeta>>('/hrm/payroll/meta');
  return data.data;
}
export async function preparePayroll(body: {
  month: string;
  employeeIds: number[];
}): Promise<PrepareResult> {
  const { data } = await api.post<Envelope<PrepareResult>>('/hrm/payroll/prepare', body);
  return data.data;
}
export async function generatePayroll(body: {
  name: string;
  status: 'draft' | 'final';
  locationId?: number | null;
  month: string;
  notify?: boolean;
  employees: { userId: number; basicSalary: number; lines: EditableLine[] }[];
}): Promise<PayrollGroupDetail> {
  const { data } = await api.post<Envelope<PayrollGroupDetail>>('/hrm/payroll/generate', body);
  return data.data;
}
export async function payPayrollGroup(id: number): Promise<PayrollGroupDetail> {
  const { data } = await api.post<Envelope<PayrollGroupDetail>>(`/hrm/payroll/groups/${id}/pay`);
  return data.data;
}
export async function deletePayrollGroup(id: number): Promise<void> {
  await api.delete(`/hrm/payroll/groups/${id}`);
}

// ── Pay Components CRUD ──────────────────────────────────────────
export async function listPayComponents(params: {
  page: number;
  pageSize: number;
  search: string;
}): Promise<Paginated<PayComponent>> {
  const { data } = await api.get<Envelope<Paginated<PayComponent>>>('/hrm/pay-components', {
    params,
  });
  return data.data;
}
export async function createPayComponent(body: {
  description: string;
  type: string;
  amount: number;
  amountType: string;
  applicableDate?: string;
  employees: number[];
}): Promise<PayComponent> {
  const { data } = await api.post<Envelope<PayComponent>>('/hrm/pay-components', body);
  return data.data;
}
export async function updatePayComponent(
  id: number,
  body: {
    description: string;
    type: string;
    amount: number;
    amountType: string;
    applicableDate?: string;
    employees: number[];
  },
): Promise<PayComponent> {
  const { data } = await api.patch<Envelope<PayComponent>>(`/hrm/pay-components/${id}`, body);
  return data.data;
}
export async function deletePayComponent(id: number): Promise<void> {
  await api.delete(`/hrm/pay-components/${id}`);
}

/** Format a money amount with 2 decimals + thousands separators (no currency symbol). */
export function money(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
