import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api/axios';
import { PermissionGroups } from '../components/PermissionGroups';
import { createRole, getPermissionCatalog, getRole, updateRole } from '../roles.api';

export function RoleFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const roleId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: catalog } = useQuery({ queryKey: ['perm-catalog'], queryFn: getPermissionCatalog });
  const { data: role } = useQuery({
    queryKey: ['role', roleId],
    queryFn: () => getRole(roleId as number),
    enabled: isEdit,
  });
  console.log('RoleFormPage catalog:', catalog);
  const [name, setName] = useState('');
  const [isServiceStaff, setIsServiceStaff] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  // Edit: hydrate from the role. Create: pre-check catalogue defaults.
  useEffect(() => {
    if (isEdit && role) {
      setName(role.name);
      setIsServiceStaff(role.isServiceStaff);
      setSelected(new Set(role.permissions));
    }
  }, [isEdit, role]);

  useEffect(() => {
    if (!isEdit && catalog) {
      const defaults = new Set<string>();
      catalog.forEach((g) => g.items.forEach((it) => it.type === 'checkbox' && it.default && defaults.add(it.value)));
      setSelected(defaults);
    }
  }, [isEdit, catalog]);

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), isServiceStaff, permissions: [...selected] };
      return isEdit ? updateRole(roleId as number, body) : createRole(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      navigate('/roles');
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save role')),
  });

  const onSubmit = () => {
    if (!name.trim()) {
      setError('Role name is required');
      return;
    }
    setError('');
    save.mutate();
  };

  if (isEdit && role && !role.mutable) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Edit Role" breadcrumbs={[{ label: 'Roles', to: '/roles' }, { label: role.name }]} />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              The <span className="font-medium text-foreground">{role.name}</span> role is a system/default
              role and cannot be edited.
            </p>
            <Button variant="outline" onClick={() => navigate('/roles')}>
              <ArrowLeft className="h-4 w-4" />
              Back to roles
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={isEdit ? 'Edit Role' : 'Add Role'}
        description="Set the role name and pick exactly what this role can access."
        breadcrumbs={[{ label: 'Roles', to: '/roles' }, { label: isEdit ? 'Edit' : 'Add' }]}
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="mb-5">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="role-name">
              Role name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales Manager"
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
            <input
              type="checkbox"
              checked={isServiceStaff}
              onChange={(e) => setIsServiceStaff(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            Service staff role
          </label>
        </CardContent>
      </Card>

      <h3 className="mb-3 text-sm font-semibold">Permissions</h3>
      {catalog ? (
        <PermissionGroups catalog={catalog} selected={selected} onChange={setSelected} />
      ) : (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/roles')}>
          Cancel
        </Button>
        <Button onClick={onSubmit} isLoading={save.isPending}>
          {isEdit ? 'Update Role' : 'Save Role'}
        </Button>
      </div>
    </div>
  );
}
