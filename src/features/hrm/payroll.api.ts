import { api } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';

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

// ── Payslip / Payments / Group edit ──────────────────────────────

export interface PayslipLine {
  description: string;
  amount: number;
}
export interface PayslipPayment {
  id: number;
  paymentRefNo: string | null;
  amount: number;
  method: string;
  paidOn: string;
}
/** Everything the printable payslip renders (mirrors GOURI's payslip blade). */
export interface Payslip {
  id: number;
  refNo: string | null;
  month: string;
  monthName: string;
  year: number;
  business: { name: string; currencySymbol: string };
  employee: {
    id: number;
    name: string;
    email: string;
    department: string | null;
    designation: string | null;
    location: string | null;
    bankDetails: Record<string, unknown> | null;
  };
  groupName: string | null;
  basicSalary: number;
  allowances: PayslipLine[];
  deductions: PayslipLine[];
  finalTotal: number;
  paymentStatus: string;
  totalPaid: number;
  totalDue: number;
  payments: PayslipPayment[];
  attendance: { daysInMonth: number; totalLeaves: number; daysPresent: number; workHours: number };
  ytdPayroll: number;
}

export interface PaymentFormRow {
  payrollId: number;
  refNo: string | null;
  employee: string;
  finalTotal: number;
  paid: number;
  due: number;
  paymentStatus: string;
  paymentRefNos: (string | null)[];
  bankDetails: Record<string, unknown> | null;
}
export interface PaymentForm {
  id: number;
  name: string;
  month: string;
  paymentStatus: string;
  payrolls: PaymentFormRow[];
}

export interface PaymentInput {
  payroll_id: number;
  amount: number;
  method: string;
  paid_on: string;
  note?: string | null;
  cheque_number?: string | null;
  bank_account_number?: string | null;
  card_number?: string | null;
  card_holder_name?: string | null;
  transaction_no?: string | null;
}

export async function getPayslip(id: number): Promise<Payslip> {
  const { data } = await api.get<Envelope<Payslip>>(`/hrm/payroll/${id}/payslip`);
  return data.data;
}

/** Download the server-rendered payslip PDF (pdfmake) and hand it to the browser. */
export async function downloadPayslipPdf(id: number, refNo: string | null): Promise<void> {
  const res = await api.get(`/hrm/payroll/${id}/payslip/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `Payroll-${(refNo ?? 'payslip').replace(/[^\w-]/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Email the payslip (PDF attached) to the employee. */
export async function sendPayslipEmail(id: number): Promise<{ success: boolean; msg: string }> {
  const { data } = await api.post<Envelope<{ success: boolean; msg: string }>>(
    `/hrm/payroll/${id}/send-email`,
  );
  return data.data;
}

export async function getGroupPaymentForm(id: number): Promise<PaymentForm> {
  const { data } = await api.get<Envelope<PaymentForm>>(`/hrm/payroll/groups/${id}/payment-form`);
  return data.data;
}

export async function addPayrollPayments(
  payments: PaymentInput[],
): Promise<{ success: boolean; recorded: number; msg: string }> {
  const { data } = await api.post<Envelope<{ success: boolean; recorded: number; msg: string }>>(
    '/hrm/payroll/payments',
    { payments },
  );
  return data.data;
}

export async function deletePayrollPayment(id: number): Promise<void> {
  await api.delete(`/hrm/payroll/payments/${id}`);
}

export async function updatePayrollGroup(
  id: number,
  body: { name?: string; status?: 'draft' | 'final' },
): Promise<PayrollGroupDetail> {
  const { data } = await api.patch<Envelope<PayrollGroupDetail>>(`/hrm/payroll/groups/${id}`, body);
  return data.data;
}

export async function deletePayroll(id: number): Promise<void> {
  await api.delete(`/hrm/payroll/${id}`);
}

/** Payment methods offered on the payroll payment form (GOURI Util::payment_types). */
export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
];

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

/**
 * Format a money amount using the business currency (symbol + placement from Business Settings).
 * Re-exported from `lib/currency` so every existing call site picks the tenant symbol up automatically.
 */
export const money = formatMoney;
