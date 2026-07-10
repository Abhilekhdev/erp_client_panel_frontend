import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api/axios';
import { deleteUser, listUsers } from '../users.api';
import type { UserListItem } from '../users.types';

export function UsersListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, pageSize, search],
    queryFn: () => listUsers({ page, pageSize, search }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete user')),
  });

  const columns: Column<UserListItem>[] = [
    {
      key: 'name',
      header: 'User',
      render: (u) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{u.name || '—'}</div>
          <div className="truncate text-xs text-muted-foreground">
            {u.username ? `@${u.username}` : 'Login disabled'}
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (u) => <span className="text-muted-foreground">{u.email}</span> },
    {
      key: 'role',
      header: 'Role',
      render: (u) =>
        u.isAdmin ? <Badge variant="secondary">{u.role}</Badge> : <span>{u.role}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) =>
        u.status === 'active' ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (u) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/users/${u.id}/edit`)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          {!u.isAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => window.confirm(`Delete user "${u.name}"?`) && remove.mutate(u.id)}
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
        title="Users"
        description="Manage the people who can access this business."
        breadcrumbs={[{ label: 'User Management' }, { label: 'Users' }]}
        actions={
          <Button size="sm" onClick={() => navigate('/users/create')}>
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        }
      />
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
    </div>
  );
}
