import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api/axios';
import { HrmTabs } from '../components/HrmTabs';
import {
  createHoliday,
  deleteHoliday,
  getHolidayMeta,
  listHolidays,
  updateHoliday,
  type Holiday,
} from '../holidays.api';

const EMPTY = { name: '', startDate: '', endDate: '', locationId: '' as number | '', note: '' };

export function HolidaysPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ locationId: '' as number | '', startDate: '', endDate: '' });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const { data: meta } = useQuery({ queryKey: ['holiday-meta'], queryFn: getHolidayMeta });
  const { data, isLoading } = useQuery({
    queryKey: ['hrm-holidays', page, pageSize, search, filters],
    queryFn: () => listHolidays({ page, pageSize, search, ...filters }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['hrm-holidays'] });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        locationId: form.locationId ? Number(form.locationId) : null,
        note: form.note,
      };
      return editing ? updateHoliday(editing.id, body) : createHoliday(body);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save holiday')),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteHoliday(id),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setOpen(true);
  };
  const openEdit = (h: Holiday) => {
    setEditing(h);
    setForm({ name: h.name, startDate: h.startDate, endDate: h.endDate, locationId: h.locationId ?? '', note: h.note });
    setError('');
    setOpen(true);
  };
  const onSubmit = () => {
    if (!form.name.trim()) return setError('Name is required');
    if (!form.startDate || !form.endDate) return setError('Pick the start and end dates');
    setError('');
    save.mutate();
  };

  const columns: Column<Holiday>[] = [
    { key: 'name', header: 'Name', render: (h) => <span className="font-medium">{h.name}</span> },
    {
      key: 'date',
      header: 'Date',
      render: (h) => (
        <span>
          {h.startDate} → {h.endDate} <span className="text-muted-foreground">({h.days} day{h.days > 1 ? 's' : ''})</span>
        </span>
      ),
    },
    { key: 'location', header: 'Business Location', render: (h) => h.location || <span className="text-muted-foreground">All</span> },
    { key: 'note', header: 'Note', render: (h) => <span className="text-muted-foreground line-clamp-1">{h.note || '—'}</span> },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (h) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(h)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => window.confirm(`Delete "${h.name}"?`) && remove.mutate(h.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const setFilter = (k: keyof typeof filters, v: string | number) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Day's Off"
        breadcrumbs={[{ label: 'HRM', to: '/hrm' }, { label: "Day's Off" }]}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        }
      />
      <HrmTabs />

      <Card className="mb-4">
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Business Location</Label>
            <Select value={String(filters.locationId)} onChange={(e) => setFilter('locationId', e.target.value ? Number(e.target.value) : '')}>
              <option value="">All</option>
              {meta?.locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input type="date" value={filters.startDate} onChange={(e) => setFilter('startDate', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input type="date" value={filters.endDate} onChange={(e) => setFilter('endDate', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(h) => h.id}
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
        searchPlaceholder="Search holidays…"
        filtersActive={Boolean(search || filters.locationId || filters.startDate || filters.endDate)}
        onResetFilters={() => {
          setSearch('');
          setFilters({ locationId: '', startDate: '', endDate: '' });
          setPage(1);
        }}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Holiday' : 'Add Holiday'}
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
            <Label htmlFor="h-name">Name <span className="text-destructive">*</span></Label>
            <Input id="h-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>End date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Business location</Label>
            <Select value={String(form.locationId)} onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value ? Number(e.target.value) : '' }))}>
              <option value="">All locations</option>
              {meta?.locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea rows={3} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
