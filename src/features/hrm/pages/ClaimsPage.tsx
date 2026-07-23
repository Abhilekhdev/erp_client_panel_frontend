import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { MultiSelect } from '@/components/ui/multi-select';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import {
  changeClaimStatus,
  createClaim,
  deleteClaim,
  getClaimMeta,
  getClaimSubCategories,
  listClaims,
  updateClaim,
  type ClaimItem,
} from '../claims.api';

const statusVariant = (status: string) =>
  status === 'approved' ? 'success' : status === 'unapproved' ? 'destructive' : 'warning';

const EMPTY_FILTERS = { userId: '' as number | '', categoryId: '' as number | '', status: '' };
const BLANK_FORM = {
  description: '',
  amount: '',
  categoryId: '' as number | '',
  subCategoryId: '' as number | '',
  applicableDate: '',
  employees: [] as number[],
  status: '',
  document: null as File | null,
};

export function ClaimsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const { data: meta } = useQuery({ queryKey: ['claim-meta'], queryFn: getClaimMeta });
  const canApprove = meta?.canApprove ?? false;

  const { data, isLoading } = useQuery({
    queryKey: ['claims', page, pageSize, search, filters],
    queryFn: () => listClaims({ page, pageSize, search, ...filters }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['claims'] });

  // ── Add / edit modal ─────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [formError, setFormError] = useState('');

  // Dependent sub-category dropdown, keyed off the chosen category.
  const { data: subCategories } = useQuery({
    queryKey: ['claim-subcats', form.categoryId],
    queryFn: () => getClaimSubCategories(Number(form.categoryId)),
    enabled: formOpen && Boolean(form.categoryId),
  });

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        description: form.description,
        amount: form.amount,
        categoryId: form.categoryId,
        subCategoryId: form.subCategoryId,
        applicableDate: form.applicableDate,
        employees: canApprove ? form.employees : undefined,
        status: canApprove ? form.status : undefined,
        document: form.document,
      };
      return editId ? updateClaim(editId, payload) : createClaim(payload);
    },
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
    },
    onError: (e) => setFormError(getApiErrorMessage(e, 'Could not save claim')),
  });

  const openAdd = () => {
    setEditId(null);
    setForm(BLANK_FORM);
    setFormError('');
    setFormOpen(true);
  };
  const openEdit = (c: ClaimItem) => {
    setEditId(c.id);
    setForm({
      description: c.description,
      amount: String(c.amount),
      categoryId: c.categoryId ?? '',
      subCategoryId: c.subCategoryId ?? '',
      applicableDate: c.applicableDate,
      employees: c.employees,
      status: c.status,
      document: null,
    });
    setFormError('');
    setFormOpen(true);
  };
  const submit = () => {
    if (!form.description.trim()) return setFormError('Description is required');
    if (form.amount === '' || Number(form.amount) < 0) return setFormError('Enter a valid amount');
    if (canApprove && form.employees.length === 0) return setFormError('Select at least one employee');
    setFormError('');
    save.mutate();
  };

  // ── Change status modal ──────────────────────────
  const [statusClaim, setStatusClaim] = useState<ClaimItem | null>(null);
  const [statusForm, setStatusForm] = useState({ status: 'approved', statusNote: '' });
  const changeStatus = useMutation({
    mutationFn: () => changeClaimStatus(statusClaim!.id, statusForm),
    onSuccess: () => {
      invalidate();
      setStatusClaim(null);
    },
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not update status')),
  });
  const openStatus = (c: ClaimItem) => {
    setStatusClaim(c);
    setStatusForm({ status: c.status, statusNote: c.statusNote });
  };

  const remove = useMutation({
    mutationFn: (id: number) => deleteClaim(id),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete claim')),
  });

  const columns: Column<ClaimItem>[] = [
    { key: 'refNo', header: 'Ref No', render: (c) => <span className="font-medium">{c.refNo}</span> },
    { key: 'description', header: 'Description', render: (c) => c.description },
    {
      key: 'amount',
      header: 'Amount',
      className: 'text-right tabular-nums',
      headerClassName: 'text-right',
      render: (c) => formatMoney(c.amount),
    },
    { key: 'category', header: 'Category', render: (c) => c.category || '—' },
    { key: 'date', header: 'Date', render: (c) => c.applicableDate || '—' },
    {
      key: 'employees',
      header: 'Employee(s)',
      render: (c) => <span className="line-clamp-1">{c.employeeNames.join(', ') || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) =>
        canApprove ? (
          <button type="button" onClick={() => openStatus(c)} title="Change status">
            <Badge variant={statusVariant(c.status)}>{c.statusLabel}</Badge>
          </button>
        ) : (
          <Badge variant={statusVariant(c.status)}>{c.statusLabel}</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Action',
      hideable: false,
      headerClassName: 'text-right',
      className: 'text-right',
      render: (c) => (
        <div className="flex justify-end gap-1.5">
          {c.documentUrl && (
            <a href={c.documentUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" title="Download document">
                <Download className="h-4 w-4" />
              </Button>
            </a>
          )}
          {/* GOURI hides edit once a claim leaves Pending. */}
          {c.status === 'pending' && (
            <Button variant="outline" size="sm" title="Edit" onClick={() => openEdit(c)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            title="Delete"
            onClick={() => window.confirm(`Delete claim ${c.refNo}?`) && remove.mutate(c.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const set = (k: keyof typeof filters, v: string | number) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Claims & Reimbursement"
        breadcrumbs={[{ label: 'Claims' }, { label: 'All Claims' }]}
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          {canApprove && (
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select
                value={String(filters.userId)}
                onChange={(e) => set('userId', e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">All</option>
                {meta?.employees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={String(filters.categoryId)}
              onChange={(e) => set('categoryId', e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">All</option>
              {meta?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={filters.status} onChange={(e) => set('status', e.target.value)}>
              <option value="">All</option>
              {meta?.statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(c) => c.id}
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
        searchPlaceholder="Search ref no / description…"
        columnsStorageKey="claims"
      />

      {/* Add / edit */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? 'Edit Claim' : 'Add Claim'}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} isLoading={save.isPending}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label>
              Description <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Client visit travel"
            />
          </div>
          {canApprove && (
            <div className="space-y-2">
              <Label>
                Employee(s) <span className="text-destructive">*</span>
              </Label>
              <MultiSelect
                options={(meta?.employees ?? []).map((u) => ({ value: u.id, label: u.name }))}
                value={form.employees}
                onChange={(ids) => setForm((f) => ({ ...f, employees: ids }))}
                placeholder="Select employees…"
              />
              <p className="text-xs text-muted-foreground">
                Leave your own claims blank — you can only assign to others as an approver.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>
              Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={String(form.categoryId)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    categoryId: e.target.value ? Number(e.target.value) : '',
                    subCategoryId: '',
                  }))
                }
              >
                <option value="">None</option>
                {meta?.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sub-category</Label>
              <Select
                value={String(form.subCategoryId)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subCategoryId: e.target.value ? Number(e.target.value) : '' }))
                }
                disabled={!form.categoryId}
              >
                <option value="">None</option>
                {(subCategories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Applicable date</Label>
            <Input
              type="date"
              value={form.applicableDate}
              onChange={(e) => setForm((f) => ({ ...f, applicableDate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Attach document</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,image/*"
              onChange={(e) => setForm((f) => ({ ...f, document: e.target.files?.[0] ?? null }))}
            />
            <p className="text-xs text-muted-foreground">Max 5 MB. PDF, Word, Excel, CSV or image.</p>
          </div>
          {canApprove && (
            <div className="space-y-2">
              <Label>Approval status</Label>
              <Select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">Pending</option>
                <option value="approved">Approved</option>
                <option value="unapproved">UnApproved</option>
              </Select>
            </div>
          )}
        </div>
      </Modal>

      {/* Change status */}
      <Modal
        open={Boolean(statusClaim)}
        onClose={() => setStatusClaim(null)}
        title="Change Status"
        footer={
          <>
            <Button variant="outline" onClick={() => setStatusClaim(null)}>
              Cancel
            </Button>
            <Button onClick={() => changeStatus.mutate()} isLoading={changeStatus.isPending}>
              Update
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={statusForm.status}
              onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="unapproved">UnApproved</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea
              rows={3}
              value={statusForm.statusNote}
              onChange={(e) => setStatusForm((f) => ({ ...f, statusNote: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
