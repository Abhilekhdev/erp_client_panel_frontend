import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { deleteRole, listRoles } from '../roles.api';
import type { RoleListItem } from '../roles.types';

export function RolesListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['roles', page, pageSize, search],
    queryFn: () => listRoles({ page, pageSize, search }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'Could not delete role';
      window.alert(msg);
    },
  });

  const columns: Column<RoleListItem>[] = [
    {
      key: 'name',
      header: 'Role',
      render: (r) => (
        <span className="font-medium">
          {r.name}
          {r.isAdmin && (
            <Badge variant="secondary" className="ml-2">
              System
            </Badge>
          )}
          {r.isServiceStaff && (
            <Badge variant="outline" className="ml-2">
              Service staff
            </Badge>
          )}
        </span>
      ),
    },
    { key: 'permissionCount', header: 'Permissions', render: (r) => (r.isAdmin ? 'All' : r.permissionCount) },
    { key: 'userCount', header: 'Users' },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (r) =>
        r.mutable ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/roles/${r.id}/edit`)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => window.confirm(`Delete role "${r.name}"?`) && remove.mutate(r.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Locked</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Define roles and the permissions assigned to them."
        breadcrumbs={[{ label: 'User Management' }, { label: 'Roles' }]}
        actions={
          <Button size="sm" onClick={() => navigate('/roles/create')}>
            <Plus className="h-4 w-4" />
            Add Role
          </Button>
        }
      />
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
        searchPlaceholder="Search roles…"
      />
    </div>
  );
}
