import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Target, X } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { getApiErrorMessage } from '@/lib/api/axios';
import { HrmTabs } from '../components/HrmTabs';
import {
  getUserTargets,
  listSalesTargetUsers,
  saveUserTargets,
  type SalesTargetUser,
} from '../sales-targets.api';

interface BandRow {
  targetStart: string;
  targetEnd: string;
  commissionPercent: string;
}
const blankRow = (): BandRow => ({ targetStart: '', targetEnd: '', commissionPercent: '' });

export function SalesTargetsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['hrm-sales-targets', page, pageSize, search],
    queryFn: () => listSalesTargetUsers({ page, pageSize, search }),
  });

  const [user, setUser] = useState<SalesTargetUser | null>(null);
  const [rows, setRows] = useState<BandRow[]>([blankRow()]);

  const load = useMutation({
    mutationFn: (userId: number) => getUserTargets(userId),
    onSuccess: (bands) =>
      setRows(
        bands.length
          ? bands.map((b) => ({
              targetStart: String(b.targetStart),
              targetEnd: String(b.targetEnd),
              commissionPercent: String(b.commissionPercent),
            }))
          : [blankRow()],
      ),
  });
  const save = useMutation({
    mutationFn: () => saveUserTargets(user!.id, rows),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hrm-sales-targets'] });
      setUser(null);
    },
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not save')),
  });

  const openUser = (u: SalesTargetUser) => {
    setUser(u);
    setRows([blankRow()]);
    load.mutate(u.id);
  };

  const columns: Column<SalesTargetUser>[] = [
    { key: 'name', header: 'User', render: (u) => <span className="font-medium">{u.name}</span> },
    {
      key: 'targetCount',
      header: 'Targets',
      render: (u) =>
        u.targetCount > 0 ? <Badge variant="success">{u.targetCount} band(s)</Badge> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (u) => (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => openUser(u)}>
            <Target className="h-4 w-4" />
            Set Sales Target
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Structured Commission" breadcrumbs={[{ label: 'HRM', to: '/hrm' }, { label: 'Structured Commission' }]} />
      <HrmTabs />
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(u) => u.id}
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
        searchPlaceholder="Search users…"
      />

      <Modal
        open={Boolean(user)}
        onClose={() => setUser(null)}
        title={`Set sales target — ${user?.name ?? ''}`}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setUser(null)}>Cancel</Button>
            <Button onClick={() => save.mutate()} isLoading={save.isPending}>Submit</Button>
          </>
        }
      >
        {load.isPending ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-[11px] font-semibold uppercase text-muted-foreground">
              <span>Sales amount from</span>
              <span>Sales amount to</span>
              <span>Commission %</span>
              <span />
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
                <Input type="number" min="0" value={r.targetStart} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, targetStart: e.target.value } : x)))} />
                <Input type="number" min="0" value={r.targetEnd} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, targetEnd: e.target.value } : x)))} />
                <Input type="number" min="0" max="100" value={r.commissionPercent} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, commissionPercent: e.target.value } : x)))} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs))}
                  disabled={rows.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, blankRow()])}>
              <Plus className="h-4 w-4" />
              Add band
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
