import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  createAttendance,
  deleteAttendance,
  deleteSelectedAttendance,
  getAttendanceMeta,
  getAttendanceSummary,
  listAttendance,
  updateAttendance,
  type AttendanceMeta,
  type AttendanceRow,
} from '../attendance.api';

const EMPTY = { userId: '', shiftId: '', activityCodeId: '', clockInTime: '', clockOutTime: '', clockInNote: '', clockOutNote: '' };

export function AllAttendanceTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ employeeId: '' as number | '', activityCodeId: '' as number | '', startDate: '', endDate: '' });
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data: meta } = useQuery({ queryKey: ['attendance-meta'], queryFn: getAttendanceMeta });
  const { data, isLoading } = useQuery({
    queryKey: ['attendance', page, pageSize, search, filters],
    queryFn: () => listAttendance({ page, pageSize, search, ...filters }),
  });
  const { data: summary } = useQuery({
    queryKey: ['attendance-summary', filters],
    queryFn: () => getAttendanceSummary(filters),
  });
  const canManageAll = data?.canManageAll ?? false;
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['attendance'] });
    setSelected(new Set());
  };

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRow | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const b = {
        userId: Number(form.userId),
        shiftId: form.shiftId ? Number(form.shiftId) : null,
        activityCodeId: form.activityCodeId ? Number(form.activityCodeId) : null,
        clockInTime: form.clockInTime,
        clockOutTime: form.clockOutTime || undefined,
        clockInNote: form.clockInNote,
        clockOutNote: form.clockOutNote,
      };
      return editing ? updateAttendance(editing.id, b) : createAttendance(b);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save attendance')),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteAttendance(id),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });
  const bulkDelete = useMutation({
    mutationFn: () => deleteSelectedAttendance([...selected]),
    onSuccess: invalidate,
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setOpen(true);
  };
  const openEdit = (a: AttendanceRow) => {
    setEditing(a);
    setForm({
      userId: String(a.userId),
      shiftId: a.shiftId ? String(a.shiftId) : '',
      activityCodeId: a.activityCodeId ? String(a.activityCodeId) : '',
      clockInTime: a.clockIn ? a.clockIn.replace(' ', 'T') : '',
      clockOutTime: a.clockOut ? a.clockOut.replace(' ', 'T') : '',
      clockInNote: a.clockInNote,
      clockOutNote: a.clockOutNote,
    });
    setError('');
    setOpen(true);
  };
  const onSubmit = () => {
    if (!form.userId) return setError('Select an employee');
    if (!form.clockInTime) return setError('Clock in time is required');
    setError('');
    save.mutate();
  };

  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const columns: Column<AttendanceRow>[] = [
    ...(canManageAll
      ? [
          {
            key: 'sel',
            header: '#',
            render: (a: AttendanceRow) => (
              <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
            ),
          } as Column<AttendanceRow>,
        ]
      : []),
    { key: 'date', header: 'Date' },
    { key: 'employee', header: 'Employee', render: (a) => a.employee || '—' },
    { key: 'clockIn', header: 'Clock in', render: (a) => a.clockIn || '—' },
    { key: 'clockOut', header: 'Clock out', render: (a) => a.clockOut || <span className="text-muted-foreground">—</span> },
    { key: 'workDuration', header: 'Work Duration', render: (a) => a.workDuration || '—' },
    { key: 'ipAddress', header: 'IP address', render: (a) => <span className="text-muted-foreground">{a.ipAddress || '—'}</span> },
    { key: 'shift', header: 'Shift', render: (a) => a.shift || '—' },
    { key: 'activityCode', header: 'Activity Code', render: (a) => a.activityCode || '—' },
    ...(canManageAll
      ? [
          {
            key: 'actions',
            header: 'Action',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (a: AttendanceRow) => (
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(a)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => window.confirm('Delete this record?') && remove.mutate(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          } as Column<AttendanceRow>,
        ]
      : []),
  ];

  const setFilter = (k: keyof typeof filters, v: string | number) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          {canManageAll && (
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select className="w-44" value={String(filters.employeeId)} onChange={(e) => setFilter('employeeId', e.target.value ? Number(e.target.value) : '')}>
                <option value="">All</option>
                {meta?.employees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Activity Code</Label>
            <Select className="w-40" value={String(filters.activityCodeId)} onChange={(e) => setFilter('activityCodeId', e.target.value ? Number(e.target.value) : '')}>
              <option value="">All</option>
              {meta?.activityCodes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input type="date" className="w-40" value={filters.startDate} onChange={(e) => setFilter('startDate', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input type="date" className="w-40" value={filters.endDate} onChange={(e) => setFilter('endDate', e.target.value)} />
          </div>
          <div className="ml-auto flex items-end gap-2">
            {canManageAll && (
              <>
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Add latest attendance
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!selected.size}
                  onClick={() => window.confirm(`Delete ${selected.size} record(s)?`) && bulkDelete.mutate()}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {summary && (
        <p className="mb-3 text-sm">
          <span className="font-medium">Total work hours:</span> {summary.totalHours}
        </p>
      )}

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(a) => a.id}
        loading={isLoading}
        page={page}
        pageSize={pageSize}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search attendance…"
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit attendance' : 'Add attendance'}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={onSubmit} isLoading={save.isPending}>{editing ? 'Update' : 'Save'}</Button>
          </>
        }
      >
        <AttendanceForm form={form} setForm={setForm} meta={meta} error={error} disableEmployee={Boolean(editing)} />
      </Modal>
    </div>
  );
}

function AttendanceForm({
  form,
  setForm,
  meta,
  error,
  disableEmployee,
}: {
  form: typeof EMPTY;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY>>;
  meta?: AttendanceMeta;
  error: string;
  disableEmployee: boolean;
}) {
  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Employee <span className="text-destructive">*</span></Label>
          <Select value={form.userId} onChange={(e) => set('userId', e.target.value)} disabled={disableEmployee}>
            <option value="">Select employee…</option>
            {meta?.employees.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Shift</Label>
          <Select value={form.shiftId} onChange={(e) => set('shiftId', e.target.value)}>
            <option value="">None</option>
            {meta?.shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Clock in time <span className="text-destructive">*</span></Label>
          <Input type="datetime-local" value={form.clockInTime} onChange={(e) => set('clockInTime', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Clock out time</Label>
          <Input type="datetime-local" value={form.clockOutTime} onChange={(e) => set('clockOutTime', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Activity Code</Label>
          <Select value={form.activityCodeId} onChange={(e) => set('activityCodeId', e.target.value)}>
            <option value="">None</option>
            {meta?.activityCodes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Clock in note</Label>
          <Textarea rows={2} value={form.clockInNote} onChange={(e) => set('clockInNote', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Clock out note</Label>
          <Textarea rows={2} value={form.clockOutNote} onChange={(e) => set('clockOutNote', e.target.value)} />
        </div>
      </div>
    </div>
  );
}
