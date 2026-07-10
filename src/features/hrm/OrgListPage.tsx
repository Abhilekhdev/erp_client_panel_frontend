import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api/axios';
import { HrmTabs } from './components/HrmTabs';
import { createOrgApi, type OrgItem } from './org.api';

interface OrgListPageProps {
  title: string;
  description: string;
  singular: string; // e.g. "Department"
  base: string; // e.g. "/hrm/departments"
  queryKey: string; // e.g. "hrm-departments"
  group: string; // breadcrumb group, e.g. "HRM"
}

const EMPTY = { name: '', shortCode: '', description: '' };

export function OrgListPage({ title, description, singular, base, queryKey, group }: OrgListPageProps) {
  const orgApi = useMemo(() => createOrgApi(base), [base]);
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrgItem | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, page, pageSize, search],
    queryFn: () => orgApi.list({ page, pageSize, search }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [queryKey] });
    qc.invalidateQueries({ queryKey: ['user-meta'] }); // dept/designation feed the user form dropdowns
  };

  const save = useMutation({
    mutationFn: () => {
      const body = { name: form.name.trim(), shortCode: form.shortCode, description: form.description };
      return editing ? orgApi.update(editing.id, body) : orgApi.create(body);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
    onError: (e) => setError(getApiErrorMessage(e, `Could not save ${singular.toLowerCase()}`)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => orgApi.remove(id),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, `Could not delete ${singular.toLowerCase()}`)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setOpen(true);
  };
  const openEdit = (item: OrgItem) => {
    setEditing(item);
    setForm({ name: item.name, shortCode: item.shortCode ?? '', description: item.description ?? '' });
    setError('');
    setOpen(true);
  };
  const onSubmit = () => {
    if (!form.name.trim()) return setError('Name is required');
    setError('');
    save.mutate();
  };

  const columns: Column<OrgItem>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: 'shortCode',
      header: 'Code',
      render: (r) => <span className="text-muted-foreground">{r.shortCode || '—'}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (r) => (
        <span className="text-muted-foreground line-clamp-1">{r.description || '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => window.confirm(`Delete "${r.name}"?`) && remove.mutate(r.id)}
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
        title={title}
        description={description}
        breadcrumbs={[{ label: group, to: '/hrm' }, { label: title }]}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add {singular}
          </Button>
        }
      />
      <HrmTabs />
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(r) => r.id}
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
        searchPlaceholder={`Search ${title.toLowerCase()}…`}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${singular}` : `Add ${singular}`}
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
            <Label htmlFor="org-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={`e.g. ${singular === 'Department' ? 'Sales' : 'Manager'}`}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-code">Code</Label>
            <Input
              id="org-code"
              value={form.shortCode}
              onChange={(e) => setForm((f) => ({ ...f, shortCode: e.target.value }))}
              placeholder="Optional short code"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-desc">Description</Label>
            <Textarea
              id="org-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
