import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { getApiErrorMessage } from '@/lib/api/axios';
import { HrmTabs } from '../components/HrmTabs';
import {
  createActivityCode,
  deleteActivityCode,
  listActivityCodes,
  updateActivityCode,
  type ActivityCode,
} from '../activity-codes.api';

const EMPTY = { activityName: '', activityCode: '' };

export function ActivityCodesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityCode | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['hrm-activity-codes', page, pageSize, search],
    queryFn: () => listActivityCodes({ page, pageSize, search }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['hrm-activity-codes'] });

  const save = useMutation({
    mutationFn: () => {
      const body = { activityName: form.activityName.trim(), activityCode: form.activityCode };
      return editing ? updateActivityCode(editing.id, body) : createActivityCode(body);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save activity code')),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteActivityCode(id),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setOpen(true);
  };
  const openEdit = (a: ActivityCode) => {
    setEditing(a);
    setForm({ activityName: a.activityName, activityCode: a.activityCode ?? '' });
    setError('');
    setOpen(true);
  };
  const onSubmit = () => {
    if (!form.activityName.trim()) return setError('Activity name is required');
    setError('');
    save.mutate();
  };

  const columns: Column<ActivityCode>[] = [
    { key: 'activityName', header: 'Activity Name', render: (a) => <span className="font-medium">{a.activityName}</span> },
    { key: 'activityCode', header: 'Activity Code', render: (a) => a.activityCode || <span className="text-muted-foreground">—</span> },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (a) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(a)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => window.confirm(`Delete "${a.activityName}"?`) && remove.mutate(a.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Activity Code"
        breadcrumbs={[{ label: 'HRM', to: '/hrm' }, { label: 'Activity Code' }]}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        }
      />
      <HrmTabs />
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
        searchPlaceholder="Search activity codes…"
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Activity Log' : 'Add Activity Log'}
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
            <Label htmlFor="ac-name">Activity Name <span className="text-destructive">*</span></Label>
            <Input id="ac-name" value={form.activityName} onChange={(e) => setForm((f) => ({ ...f, activityName: e.target.value }))} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ac-code">Activity Code</Label>
            <Input id="ac-code" value={form.activityCode} onChange={(e) => setForm((f) => ({ ...f, activityCode: e.target.value }))} placeholder="Optional" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
