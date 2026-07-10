import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api/axios';
import { deleteCommissionAgent, listCommissionAgents } from '../commission-agents.api';
import type { CommissionAgentListItem } from '../commission-agents.types';

export function CommissionAgentsListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['commission-agents', page, pageSize, search],
    queryFn: () => listCommissionAgents({ page, pageSize, search }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteCommissionAgent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commission-agents'] }),
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete commission agent')),
  });

  const columns: Column<CommissionAgentListItem>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (a) => <span className="font-medium">{a.name || '—'}</span>,
    },
    { key: 'email', header: 'Email', render: (a) => <span className="text-muted-foreground">{a.email}</span> },
    {
      key: 'contactNo',
      header: 'Contact',
      render: (a) => <span className="text-muted-foreground">{a.contactNo || '—'}</span>,
    },
    {
      key: 'cmmsnPercent',
      header: 'Commission (%)',
      render: (a) => <span>{a.cmmsnPercent}</span>,
    },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (a) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/commission-agents/${a.id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() =>
              window.confirm(`Delete commission agent "${a.name}"?`) && remove.mutate(a.id)
            }
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
        title="Commission Agents"
        description="Sales commission agents — non-login users tracked for commission on sales."
        breadcrumbs={[{ label: 'User Management' }, { label: 'Commission Agents' }]}
        actions={
          <Button size="sm" onClick={() => navigate('/commission-agents/create')}>
            <Plus className="h-4 w-4" />
            Add Commission Agent
          </Button>
        }
      />
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
        searchPlaceholder="Search commission agents…"
      />
    </div>
  );
}
