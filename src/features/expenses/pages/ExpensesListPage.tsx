import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  deleteExpense,
  getExpenseMeta,
  listExpenses,
  type ExpenseListItem,
} from '../expenses.api';

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function statusBadge(status: string) {
  if (status === 'paid') return <Badge variant="success">Paid</Badge>;
  if (status === 'partial') return <Badge variant="secondary">Partial</Badge>;
  return <Badge variant="destructive">Due</Badge>;
}

export function ExpensesListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { has } = usePermissions();

  const { data: meta } = useQuery({ queryKey: ['expense-meta'], queryFn: getExpenseMeta });
  const { data, isLoading } = useQuery({
    queryKey: ['expenses', page, pageSize, search, categoryId, paymentStatus],
    queryFn: () =>
      listExpenses({
        page,
        pageSize,
        search,
        expenseCategoryId: categoryId ? Number(categoryId) : undefined,
        paymentStatus: paymentStatus || undefined,
      }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete expense')),
  });

  const columns: Column<ExpenseListItem>[] = [
    {
      key: 'refNo',
      header: 'Reference',
      render: (e) => (
        <div className="min-w-0">
          <div className="truncate font-medium">
            {e.refNo}
            {e.isRefund && <Badge variant="secondary" className="ml-2">Refund</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">{e.date}</div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (e) => (
        <div className="min-w-0">
          <div className="truncate">{e.category || '—'}</div>
          {e.subCategory && <div className="truncate text-xs text-muted-foreground">{e.subCategory}</div>}
        </div>
      ),
    },
    { key: 'location', header: 'Location', render: (e) => <span className="text-muted-foreground">{e.location || '—'}</span> },
    { key: 'expenseFor', header: 'Expense for', render: (e) => <span className="text-muted-foreground">{e.expenseFor || '—'}</span> },
    { key: 'finalTotal', header: 'Total', className: 'text-right', headerClassName: 'text-right', render: (e) => <span>{money(e.finalTotal)}</span> },
    { key: 'paymentDue', header: 'Due', className: 'text-right', headerClassName: 'text-right', render: (e) => <span>{money(e.paymentDue)}</span> },
    { key: 'paymentStatus', header: 'Payment', render: (e) => statusBadge(e.paymentStatus) },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (e) => (
        <div className="flex justify-end gap-2">
          {has('expense.edit') && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/expenses/${e.id}/edit`)}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {has('expense.delete') && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => window.confirm(`Delete expense "${e.refNo}"?`) && remove.mutate(e.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="All business expenses — categories, who they're for, and what's still due."
        breadcrumbs={[{ label: 'Expenses' }, { label: 'All Expenses' }]}
        actions={
          has('expense.add') && (
            <Button size="sm" onClick={() => navigate('/expenses/create')}>
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          )
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="w-52">
          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All categories</option>
            {(meta?.categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All payment status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="due">Due</option>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(e) => e.id}
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
        searchPlaceholder="Search by reference…"
      />
    </div>
  );
}
