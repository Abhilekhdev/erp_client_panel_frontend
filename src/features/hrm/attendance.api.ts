import { api } from '@/lib/api/axios';

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paginated<T> {
  data: T[];
  total: number;
  canManageAll: boolean;
}
export interface IdName {
  id: number;
  name: string;
}

// ── Shifts ──────────────────────────────────────────────
export interface Shift {
  id: number;
  name: string;
  type: string; // fixed_shift | flexible_shift
  typeLabel: string;
  startTime: string;
  endTime: string;
  holidays: string[];
  isAllowedAutoClockout: boolean;
  autoClockoutTime: string;
}
export interface ShiftBody {
  name: string;
  type: string;
  startTime?: string;
  endTime?: string;
  holidays?: string[];
  isAllowedAutoClockout?: boolean;
  autoClockoutTime?: string;
}
export interface ShiftUserRow {
  userId: number;
  name: string;
  isAdded: boolean;
  startDate: string;
  endDate: string;
}

export const listShifts = async (p: { page: number; pageSize: number; search: string }) =>
  (await api.get<Envelope<{ data: Shift[]; total: number }>>('/hrm/shifts', { params: p })).data.data;
export const createShift = async (b: ShiftBody) =>
  (await api.post<Envelope<Shift>>('/hrm/shifts', b)).data.data;
export const updateShift = async (id: number, b: ShiftBody) =>
  (await api.patch<Envelope<Shift>>(`/hrm/shifts/${id}`, b)).data.data;
export const deleteShift = async (id: number) => {
  await api.delete(`/hrm/shifts/${id}`);
};
export const getShiftUsers = async (id: number) =>
  (await api.get<Envelope<ShiftUserRow[]>>(`/hrm/shifts/${id}/users`)).data.data;
export const assignShiftUsers = async (
  id: number,
  assignments: { userId: number; isAdded: boolean; startDate?: string; endDate?: string }[],
) => {
  await api.post(`/hrm/shifts/${id}/users`, { assignments });
};

// ── Attendance ──────────────────────────────────────────
export interface AttendanceRow {
  id: number;
  date: string;
  userId: number;
  employee: string;
  clockIn: string;
  clockInNote: string;
  clockOut: string;
  clockOutNote: string;
  workDuration: string;
  ipAddress: string;
  shiftId: number | null;
  shift: string;
  activityCodeId: number | null;
  activityCode: string;
}
export interface AttendanceMeta {
  employees: IdName[];
  activityCodes: IdName[];
  shifts: { id: number; name: string; startTime: string | null; endTime: string | null }[];
}
export interface AttendanceFilters {
  page: number;
  pageSize: number;
  search: string;
  employeeId?: number | '';
  activityCodeId?: number | '';
  startDate?: string;
  endDate?: string;
}
export interface AttendanceBody {
  userId: number;
  shiftId?: number | null;
  activityCodeId?: number | null;
  clockInTime: string;
  clockOutTime?: string;
  clockInNote?: string;
  clockOutNote?: string;
}

export const getAttendanceMeta = async () =>
  (await api.get<Envelope<AttendanceMeta>>('/hrm/attendance/meta')).data.data;
export const listAttendance = async (p: AttendanceFilters) =>
  (await api.get<Envelope<Paginated<AttendanceRow>>>('/hrm/attendance', { params: p })).data.data;
export const getAttendanceSummary = async (p: Partial<AttendanceFilters>) =>
  (await api.get<Envelope<{ totalHours: number }>>('/hrm/attendance/summary', { params: p })).data.data;
export const createAttendance = async (b: AttendanceBody) =>
  (await api.post<Envelope<{ id: number }>>('/hrm/attendance', b)).data.data;
export const updateAttendance = async (id: number, b: Partial<AttendanceBody>) =>
  (await api.patch<Envelope<{ id: number }>>(`/hrm/attendance/${id}`, b)).data.data;
export const deleteAttendance = async (id: number) => {
  await api.delete(`/hrm/attendance/${id}`);
};
export const deleteSelectedAttendance = async (ids: number[]) => {
  await api.post('/hrm/attendance/delete-selected', { ids });
};

// ── Clock in / out ──────────────────────────────────────
export interface ClockStatus {
  clockedIn: boolean;
  attendanceId: number | null;
  clockInTime: string | null;
}
export const getClockStatus = async () =>
  (await api.get<Envelope<ClockStatus>>('/hrm/attendance/clock-status')).data.data;
export const clockIn = async (b: { note?: string; location?: string }) =>
  (await api.post<Envelope<ClockStatus>>('/hrm/attendance/clock-in', b)).data.data;
export const clockOut = async (b: { note?: string; location?: string }) =>
  (await api.post<Envelope<ClockStatus>>('/hrm/attendance/clock-out', b)).data.data;

// ── By shift / by date ──────────────────────────────────
export interface ByShiftRow {
  shift: string;
  presentCount: number;
  present: string[];
  absentCount: number;
  absent: string[];
}
export interface ByDateRow {
  date: string;
  present: number;
  absent: number;
}
export const getAttendanceByShift = async (date: string) =>
  (await api.get<Envelope<{ rows: ByShiftRow[] }>>('/hrm/attendance/by-shift', { params: { date } })).data
    .data;
export const getAttendanceByDate = async (startDate: string, endDate: string) =>
  (await api.get<Envelope<{ rows: ByDateRow[] }>>('/hrm/attendance/by-date', {
    params: { startDate, endDate },
  })).data.data;
