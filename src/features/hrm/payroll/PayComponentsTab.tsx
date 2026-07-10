import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { MultiSelect } from '@/components/ui/multi-select';
import { Select } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  createPayComponent,
  deletePayComponent,
  getPayrollMeta,
  listPayComponents,
  money,
  updatePayComponent,
  type PayComponent,
} from '../payroll.api';

const EMPTY = {
  description: '',
  type: 'allowance',
  amount: '',
  amountType: 'fixed',
  applicableDate: '',
  employees: [] as number[],
};

export function PayComponentsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const { data: meta } = useQuery({ queryKey: ['payroll-meta'], queryFn: getPayrollMeta });
  const { data, isLoading } = useQuery({
    queryKey: ['pay-components', page, pageSize, search],
    queryFn: () => listPayComponents({ page, pageSize, search }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['pay-components'] });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PayComponent | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const body = {
        description: form.description.trim(),
        type: form.type,
        amount: Number(form.amount || 0),
        amountType: form.amountType,
        applicableDate: form.applicableDate || undefined,
        employees: form.employees,
      };
      return editing ? updatePayComponent(editing.id, body) : createPayComponent(body);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save pay component')),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deletePayComponent(id),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setOpen(true);
  };
  const openEdit = (c: PayComponent) => {
    setEditing(c);
    setForm({
      description: c.description,
      type: c.type,
      amount: String(c.amount),
      amountType: c.amountType,
      applicableDate: c.applicableDate,
      employees: c.employees,
    });
    setError('');
    setOpen(true);
  };
  const onSubmit = () => {
    if (!form.description.trim()) return setError('Description is required');
    if (form.amount === '' || Number(form.amount) < 0) return setError('Enter a valid amount');
    setError('');
    save.mutate();
  };

  const columns: Column<PayComponent>[] = [
    { key: 'description', header: 'Name', render: (c) => <span className="font-medium">{c.description}</span> },
    {
      key: 'type',
      header: 'Type',
      render: (c) => (
        <Badge variant={c.type === 'deduction' ? 'destructive' : 'success'}>
          {c.type === 'deduction' ? 'Deduction' : 'Allowance'}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (c) => (c.amountType === 'percent' ? `${money(c.amount)}%` : money(c.amount)),
    },
    { key: 'amountType', header: 'Amount type', render: (c) => (c.amountType === 'percent' ? 'Percentage' : 'Fixed') },
    {
      key: 'employees',
      header: 'Applicable to',
      render: (c) =>
        c.employeeNames.length ? (
          <span className="line-clamp-1 text-muted-foreground" title={c.employeeNames.join(', ')}>
            {c.employeeNames.join(', ')}
          </span>
        ) : (
          <span className="text-muted-foreground">All / none</span>
        ),
    },
    { key: 'applicableDate', header: 'Applicable date', render: (c) => c.applicableDate || '—' },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (c) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => window.confirm(`Delete "${c.description}"?`) && remove.mutate(c.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const employeeOptions = (meta?.employees ?? []).map((u) => ({ value: u.id, label: u.name }));

  return (
    <div>
      <Card className="mb-4">
        <CardContent className="flex items-center justify-between pt-6">
          <p className="text-sm text-muted-foreground">
            Reusable allowances &amp; deductions. Assign each to employees so they pre-fill during payroll.
          </p>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add allowance / deduction
          </Button>
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
        searchPlaceholder="Search by name…"
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit allowance / deduction' : 'Add allowance / deduction'}
        className="max-w-xl"
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
            <Label>
              Description <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. House Rent Allowance"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="allowance">Allowance</option>
                <option value="deduction">Deduction</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount type</Label>
              <Select
                value={form.amountType}
                onChange={(e) => setForm((f) => ({ ...f, amountType: e.target.value }))}
              >
                <option value="fixed">Fixed</option>
                <option value="percent">Percentage</option>
              </Select>
            </div>
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
            <Label>Applicable employees</Label>
            <MultiSelect
              options={employeeOptions}
              value={form.employees}
              onChange={(v) => setForm((f) => ({ ...f, employees: v }))}
              placeholder="Select employees…"
            />
            <p className="text-xs text-muted-foreground">
              Assigned employees get this line pre-filled when you generate their payroll.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
