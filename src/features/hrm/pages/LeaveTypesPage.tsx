import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api/axios';
import { HrmTabs } from '../components/HrmTabs';
import {
  createLeaveType,
  deleteLeaveType,
  listLeaveTypes,
  updateLeaveType,
  type LeaveType,
} from '../leave-types.api';

interface FormState {
  name: string;
  maxLeaveCount: string;
  leaveCountInterval: string;
  isPaid: boolean;
}
const EMPTY: FormState = { name: '', maxLeaveCount: '', leaveCountInterval: '', isPaid: true };

export function LeaveTypesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['hrm-leave-types', page, pageSize, search],
    queryFn: () => listLeaveTypes({ page, pageSize, search }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hrm-leave-types'] });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        maxLeaveCount: form.maxLeaveCount,
        leaveCountInterval: form.leaveCountInterval,
        isPaid: form.isPaid,
      };
      return editing ? updateLeaveType(editing.id, body) : createLeaveType(body);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save leave type')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteLeaveType(id),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete leave type')),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setOpen(true);
  };
  const openEdit = (t: LeaveType) => {
    setEditing(t);
    setForm({
      name: t.name,
      maxLeaveCount: t.maxLeaveCount != null ? String(t.maxLeaveCount) : '',
      leaveCountInterval: t.leaveCountInterval,
      isPaid: t.isPaid,
    });
    setError('');
    setOpen(true);
  };
  const onSubmit = () => {
    if (!form.name.trim()) return setError('Name is required');
    setError('');
    save.mutate();
  };

  const columns: Column<LeaveType>[] = [
    { key: 'name', header: 'Leave type', render: (t) => <span className="font-medium">{t.name}</span> },
    {
      key: 'maxLeaveCount',
      header: 'Max leaves',
      render: (t) =>
        t.maxLeaveCount != null ? (
          <span>
            {t.maxLeaveCount}
            {t.leaveCountInterval ? <span className="text-muted-foreground"> / {t.leaveCountInterval}</span> : null}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'isPaid',
      header: 'Type',
      render: (t) =>
        t.isPaid ? <Badge variant="success">Paid</Badge> : <Badge variant="secondary">Unpaid</Badge>,
    },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (t) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => window.confirm(`Delete "${t.name}"?`) && remove.mutate(t.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Leave Types"
        description="Define the kinds of leave employees can take."
        breadcrumbs={[{ label: 'HRM', to: '/hrm' }, { label: 'Leave Types' }]}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Leave Type
          </Button>
        }
      />
      <HrmTabs />
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(t) => t.id}
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
        searchPlaceholder="Search leave types…"
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Leave Type' : 'Add Leave Type'}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} isLoading={save.isPending}>
              {editing ? 'Update' : 'Save'}
            </Button>
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
            <Label htmlFor="lt-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lt-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Casual Leave"
              autoFocus
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lt-max">Max leaves</Label>
              <Input
                id="lt-max"
                type="number"
                min="0"
                value={form.maxLeaveCount}
                onChange={(e) => setForm((f) => ({ ...f, maxLeaveCount: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lt-interval">Leave count interval</Label>
              <Select
                id="lt-interval"
                value={form.leaveCountInterval}
                onChange={(e) => setForm((f) => ({ ...f, leaveCountInterval: e.target.value }))}
              >
                <option value="">None</option>
                <option value="month">Current month</option>
                <option value="year">Current FY</option>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPaid}
              onChange={(e) => setForm((f) => ({ ...f, isPaid: e.target.checked }))}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            Paid leave (tracks a balance)
          </label>
        </div>
      </Modal>
    </div>
  );
}
