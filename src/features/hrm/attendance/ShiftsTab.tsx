import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  assignShiftUsers,
  createShift,
  deleteShift,
  getShiftUsers,
  listShifts,
  updateShift,
  type Shift,
  type ShiftUserRow,
} from '../attendance.api';

const WEEKDAYS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];
const dayLabel = (v: string) => WEEKDAYS.find((d) => d.value === v)?.label ?? v;
const EMPTY = { name: '', type: 'fixed_shift', startTime: '', endTime: '', holidays: [] as string[], isAllowedAutoClockout: false, autoClockoutTime: '' };

export function ShiftsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['hrm-shifts', page, pageSize, search],
    queryFn: () => listShifts({ page, pageSize, search }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['hrm-shifts'] });

  // add/edit
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: () => {
      const b = {
        name: form.name.trim(),
        type: form.type,
        startTime: form.startTime,
        endTime: form.endTime,
        holidays: form.holidays,
        isAllowedAutoClockout: form.isAllowedAutoClockout,
        autoClockoutTime: form.autoClockoutTime,
      };
      return editing ? updateShift(editing.id, b) : createShift(b);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save shift')),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteShift(id),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setOpen(true);
  };
  const openEdit = (s: Shift) => {
    setEditing(s);
    setForm({
      name: s.name,
      type: s.type,
      startTime: s.startTime,
      endTime: s.endTime,
      holidays: s.holidays,
      isAllowedAutoClockout: s.isAllowedAutoClockout,
      autoClockoutTime: s.autoClockoutTime,
    });
    setError('');
    setOpen(true);
  };
  const onSubmit = () => {
    if (!form.name.trim()) return setError('Name is required');
    setError('');
    save.mutate();
  };
  const flexible = form.type === 'flexible_shift';

  // assign users
  const [assignShift, setAssignShift] = useState<Shift | null>(null);
  const [rows, setRows] = useState<ShiftUserRow[]>([]);
  const loadUsers = useMutation({
    mutationFn: (id: number) => getShiftUsers(id),
    onSuccess: (r) => setRows(r),
  });
  const saveUsers = useMutation({
    mutationFn: () =>
      assignShiftUsers(
        assignShift!.id,
        rows.map((r) => ({ userId: r.userId, isAdded: r.isAdded, startDate: r.startDate, endDate: r.endDate })),
      ),
    onSuccess: () => setAssignShift(null),
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not save')),
  });
  const openAssign = (s: Shift) => {
    setAssignShift(s);
    setRows([]);
    loadUsers.mutate(s.id);
  };

  const columns: Column<Shift>[] = [
    { key: 'name', header: 'Name', render: (s) => <span className="font-medium">{s.name}</span> },
    { key: 'type', header: 'Shift Type', render: (s) => s.typeLabel },
    { key: 'startTime', header: 'Start Time', render: (s) => s.startTime || '—' },
    { key: 'endTime', header: 'End Time', render: (s) => s.endTime || '—' },
    { key: 'holidays', header: "Day's Off", render: (s) => (s.holidays.length ? s.holidays.map(dayLabel).join(', ') : '—') },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (s) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => openAssign(s)}>
            <Users className="h-4 w-4" />
            Users
          </Button>
          <Button variant="destructive" size="sm" onClick={() => window.confirm(`Delete "${s.name}"?`) && remove.mutate(s.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(s) => s.id}
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
        searchPlaceholder="Search shifts…"
      />

      {/* Add / edit shift */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Shift' : 'Add Shift'}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={onSubmit} isLoading={save.isPending}>{editing ? 'Update' : 'Save'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label>Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Shift Type</Label>
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="fixed_shift">Fixed shift</option>
              <option value="flexible_shift">Flexible shift</option>
            </Select>
          </div>
          {!flexible && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Day's Off</Label>
            <div className="flex flex-wrap gap-3">
              {WEEKDAYS.map((d) => (
                <label key={d.value} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={form.holidays.includes(d.value)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        holidays: e.target.checked ? [...f.holidays, d.value] : f.holidays.filter((x) => x !== d.value),
                      }))
                    }
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={form.isAllowedAutoClockout}
              onChange={(e) => setForm((f) => ({ ...f, isAllowedAutoClockout: e.target.checked }))}
            />
            Do auto clock out
          </label>
          {form.isAllowedAutoClockout && (
            <div className="space-y-2">
              <Label>Auto clockout time</Label>
              <Input type="time" value={form.autoClockoutTime} onChange={(e) => setForm((f) => ({ ...f, autoClockoutTime: e.target.value }))} />
            </div>
          )}
        </div>
      </Modal>

      {/* Assign users */}
      <Modal
        open={Boolean(assignShift)}
        onClose={() => setAssignShift(null)}
        title={`Assign users — ${assignShift?.name ?? ''}`}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setAssignShift(null)}>Cancel</Button>
            <Button onClick={() => saveUsers.mutate()} isLoading={saveUsers.isPending}>Save</Button>
          </>
        }
      >
        {loadUsers.isPending ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {rows.map((r, i) => (
              <div key={r.userId} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 border-b border-border pb-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  checked={r.isAdded}
                  onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, isAdded: e.target.checked } : x)))}
                />
                <span>{r.name}</span>
                <Input
                  type="date"
                  className="h-9 w-36"
                  value={r.startDate}
                  disabled={!r.isAdded}
                  onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, startDate: e.target.value } : x)))}
                />
                <Input
                  type="date"
                  className="h-9 w-36"
                  value={r.endDate}
                  disabled={!r.isAdded}
                  onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, endDate: e.target.value } : x)))}
                />
              </div>
            ))}
            {!rows.length && <p className="py-6 text-center text-sm text-muted-foreground">No employees.</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
