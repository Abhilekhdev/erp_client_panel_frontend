import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
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
  applyLeave,
  changeLeaveStatus,
  deleteLeave,
  getAssignableTypes,
  getLeaveMeta,
  getUserBalances,
  listLeaves,
  setUserBalances,
  type LeaveItem,
} from '../leaves.api';

const statusVariant = (status: string) =>
  status === 'approved' ? 'success' : status === 'cancelled' ? 'destructive' : 'warning';

const EMPTY_FILTERS = { userId: '' as number | '', leaveTypeId: '' as number | '', status: '', startDate: '', endDate: '' };

export function LeavesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const { data: meta } = useQuery({ queryKey: ['leave-meta'], queryFn: getLeaveMeta });
  const canManageAll = meta?.canManageAll ?? false;

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', page, pageSize, search, filters],
    queryFn: () => listLeaves({ page, pageSize, search, ...filters }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['leaves'] });
    qc.invalidateQueries({ queryKey: ['leave-assignable'] });
    qc.invalidateQueries({ queryKey: ['user-balances'] });
  };

  // ── Add leave modal ──────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ userId: '' as number | '', leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [addError, setAddError] = useState('');
  const assignableUserId = canManageAll ? (addForm.userId || undefined) : undefined;
  const { data: assignable } = useQuery({
    queryKey: ['leave-assignable', assignableUserId ?? 'self'],
    queryFn: () => getAssignableTypes(assignableUserId as number | undefined),
    enabled: addOpen && (!canManageAll || Boolean(addForm.userId)),
  });

  const apply = useMutation({
    mutationFn: () =>
      applyLeave({
        userId: canManageAll && addForm.userId ? Number(addForm.userId) : undefined,
        leaveTypeId: Number(addForm.leaveTypeId),
        startDate: addForm.startDate,
        endDate: addForm.endDate,
        reason: addForm.reason,
      }),
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
    },
    onError: (e) => setAddError(getApiErrorMessage(e, 'Could not apply leave')),
  });
  const openAdd = () => {
    setAddForm({ userId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '' });
    setAddError('');
    setAddOpen(true);
  };
  const submitAdd = () => {
    if (canManageAll && !addForm.userId) return setAddError('Select an employee');
    if (!addForm.leaveTypeId) return setAddError('Select a leave type');
    if (!addForm.startDate || !addForm.endDate) return setAddError('Pick the start and end dates');
    setAddError('');
    apply.mutate();
  };

  // ── Change status modal ──────────────────────────
  const [statusLeave, setStatusLeave] = useState<LeaveItem | null>(null);
  const [statusForm, setStatusForm] = useState({ status: 'approved', statusNote: '' });
  const changeStatus = useMutation({
    mutationFn: () => changeLeaveStatus(statusLeave!.id, statusForm),
    onSuccess: () => {
      invalidate();
      setStatusLeave(null);
    },
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not update status')),
  });
  const openStatus = (l: LeaveItem) => {
    setStatusLeave(l);
    setStatusForm({ status: l.status, statusNote: l.statusNote });
  };

  const remove = useMutation({
    mutationFn: (id: number) => deleteLeave(id),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete leave')),
  });

  // ── Entitlements modal ───────────────────────────
  const [entOpen, setEntOpen] = useState(false);
  const [entUserId, setEntUserId] = useState<number | ''>('');
  const [entRows, setEntRows] = useState<{ leaveTypeId: number; name: string; balance: string }[]>([]);
  const [entError, setEntError] = useState('');
  const loadBalances = useMutation({
    mutationFn: (userId: number) => getUserBalances(userId),
    onSuccess: (rows) =>
      setEntRows(rows.map((r) => ({ leaveTypeId: r.leaveTypeId, name: r.name, balance: r.assigned ? String(r.balance) : '' }))),
  });
  const saveBalances = useMutation({
    mutationFn: () =>
      setUserBalances(
        Number(entUserId),
        entRows.filter((r) => r.balance !== '').map((r) => ({ leaveTypeId: r.leaveTypeId, balance: r.balance })),
      ),
    onSuccess: () => {
      invalidate();
      setEntOpen(false);
    },
    onError: (e) => setEntError(getApiErrorMessage(e, 'Could not save entitlements')),
  });
  const openEntitlements = () => {
    setEntUserId('');
    setEntRows([]);
    setEntError('');
    setEntOpen(true);
  };

  const columns: Column<LeaveItem>[] = [
    { key: 'refNo', header: 'Ref No', render: (l) => <span className="font-medium">{l.refNo}</span> },
    { key: 'leaveType', header: 'Leave type' },
    { key: 'employee', header: 'Employee', render: (l) => l.employee || '—' },
    {
      key: 'date',
      header: 'Date',
      render: (l) => (
        <span>
          {l.startDate} → {l.endDate}{' '}
          <span className="text-muted-foreground">({l.days} day{l.days > 1 ? 's' : ''})</span>
        </span>
      ),
    },
    { key: 'reason', header: 'Reason', render: (l) => <span className="text-muted-foreground line-clamp-1">{l.reason || '—'}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (l) =>
        canManageAll ? (
          <button type="button" onClick={() => openStatus(l)} title="Change status">
            <Badge variant={statusVariant(l.status)}>{l.statusLabel}</Badge>
          </button>
        ) : (
          <Badge variant={statusVariant(l.status)}>{l.statusLabel}</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (l) =>
        canManageAll ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => window.confirm(`Delete leave ${l.refNo}?`) && remove.mutate(l.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
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
        title="Leave"
        breadcrumbs={[{ label: 'HRM', to: '/hrm' }, { label: 'Leave' }]}
        actions={
          <div className="flex gap-2">
            {canManageAll && (
              <Button variant="outline" size="sm" onClick={openEntitlements}>
                <SlidersHorizontal className="h-4 w-4" />
                Manage entitlements
              </Button>
            )}
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        }
      />
      <HrmTabs />

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {canManageAll && (
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={String(filters.userId)} onChange={(e) => set('userId', e.target.value ? Number(e.target.value) : '')}>
                <option value="">All</option>
                {meta?.employees.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={filters.status} onChange={(e) => set('status', e.target.value)}>
              <option value="">All</option>
              {meta?.statuses.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Leave type</Label>
            <Select value={String(filters.leaveTypeId)} onChange={(e) => set('leaveTypeId', e.target.value ? Number(e.target.value) : '')}>
              <option value="">All</option>
              {meta?.leaveTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="date" value={filters.startDate} onChange={(e) => set('startDate', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={filters.endDate} onChange={(e) => set('endDate', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(l) => l.id}
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
        searchPlaceholder="Search ref no / reason…"
      />

      {/* Add Leave */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Leave"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd} isLoading={apply.isPending}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          {addError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}
          {canManageAll && (
            <div className="space-y-2">
              <Label>Employee <span className="text-destructive">*</span></Label>
              <Select
                value={String(addForm.userId)}
                onChange={(e) => setAddForm((f) => ({ ...f, userId: e.target.value ? Number(e.target.value) : '', leaveTypeId: '' }))}
              >
                <option value="">Select employee…</option>
                {meta?.employees.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Leave type <span className="text-destructive">*</span></Label>
            <Select value={addForm.leaveTypeId} onChange={(e) => setAddForm((f) => ({ ...f, leaveTypeId: e.target.value }))}>
              <option value="">Select leave type…</option>
              {(assignable ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.balance} left)</option>
              ))}
            </Select>
            {canManageAll && !addForm.userId && (
              <p className="text-xs text-muted-foreground">Pick an employee to see their leave entitlements.</p>
            )}
            {(assignable?.length ?? 0) === 0 && (!canManageAll || addForm.userId) && (
              <p className="text-xs text-amber-600">
                No leave entitlements — assign some via “Manage entitlements” first.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start date <span className="text-destructive">*</span></Label>
              <Input type="date" value={addForm.startDate} onChange={(e) => setAddForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>End date <span className="text-destructive">*</span></Label>
              <Input type="date" value={addForm.endDate} onChange={(e) => setAddForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea rows={3} value={addForm.reason} onChange={(e) => setAddForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Change status */}
      <Modal
        open={Boolean(statusLeave)}
        onClose={() => setStatusLeave(null)}
        title="Change Status"
        footer={
          <>
            <Button variant="outline" onClick={() => setStatusLeave(null)}>Cancel</Button>
            <Button onClick={() => changeStatus.mutate()} isLoading={changeStatus.isPending}>Update</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusForm.status} onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="cancelled">Rejected</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea rows={3} value={statusForm.statusNote} onChange={(e) => setStatusForm((f) => ({ ...f, statusNote: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Manage entitlements */}
      <Modal
        open={entOpen}
        onClose={() => setEntOpen(false)}
        title="Manage leave entitlements"
        footer={
          <>
            <Button variant="outline" onClick={() => setEntOpen(false)}>Cancel</Button>
            <Button onClick={() => saveBalances.mutate()} isLoading={saveBalances.isPending} disabled={!entUserId}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          {entError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{entError}</span>
            </div>
          )}
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select
              value={String(entUserId)}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : '';
                setEntUserId(id);
                if (id) loadBalances.mutate(id);
                else setEntRows([]);
              }}
            >
              <option value="">Select employee…</option>
              {meta?.employees.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </div>
          {entUserId ? (
            entRows.length ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Set the day balance for each leave type (blank = not entitled).</p>
                {entRows.map((r, i) => (
                  <div key={r.leaveTypeId} className="flex items-center gap-3">
                    <span className="flex-1 text-sm">{r.name}</span>
                    <Input
                      type="number"
                      min="0"
                      className="w-28"
                      placeholder="—"
                      value={r.balance}
                      onChange={(e) =>
                        setEntRows((rows) => rows.map((x, j) => (j === i ? { ...x, balance: e.target.value } : x)))
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No leave types defined — create some under “Leave Type” first.</p>
            )
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
