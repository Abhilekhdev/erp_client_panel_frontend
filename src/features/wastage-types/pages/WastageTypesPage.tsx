import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  createWastageType,
  deleteWastageType,
  listWastageTypes,
  updateWastageType,
  type WastageType,
} from '../wastage-types.api';

export function WastageTypesPage() {
  const qc = useQueryClient();
  const { has } = usePermissions();
  const canCreate = has('wastage_type.create');
  const canUpdate = has('wastage_type.update');
  const canDelete = has('wastage_type.delete');

  const { data, isLoading } = useQuery({ queryKey: ['wastage-types'], queryFn: listWastageTypes });
  const [editing, setEditing] = useState<{ id?: number; name: string } | null>(null);
  const [error, setError] = useState('');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['wastage-types'] });
  const save = useMutation({
    mutationFn: () => {
      const e = editing as { id?: number; name: string };
      const body = { name: e.name.trim() };
      return e.id ? updateWastageType(e.id, body) : createWastageType(body);
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
      setError('');
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save')),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteWastageType(id),
    onSuccess: invalidate,
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Wastage Types"
        description="Categories a stock adjustment can be classified under."
        breadcrumbs={[{ label: 'Settings' }, { label: 'Wastage Types' }]}
        actions={
          !editing &&
          canCreate && (
            <Button size="sm" onClick={() => setEditing({ name: '' })}>
              <Plus className="h-4 w-4" /> Add Wastage Type
            </Button>
          )
        }
      />

      {editing && (
        <Card className="mb-5">
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <div className="flex items-center justify-between sm:col-span-2">
              <h3 className="text-sm font-semibold">{editing.id ? 'Edit' : 'New'} wastage type</h3>
              <Button variant="ghost" size="icon" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Damaged, Expired, Theft"
              />
            </div>
            {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => (editing.name.trim() ? save.mutate() : setError('Name is required'))}
                isLoading={save.isPending}
              >
                {editing.id ? 'Update' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <THead>
            <TR className="bg-muted/40 hover:bg-muted/40">
              <TH>Name</TH>
              {(canUpdate || canDelete) && <TH className="text-right">Action</TH>}
            </TR>
          </THead>
          <TBody>
            {isLoading ? (
              <TR>
                <TD colSpan={2} className="py-10 text-center text-muted-foreground">
                  Loading…
                </TD>
              </TR>
            ) : (data ?? []).length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={2} className="py-12 text-center text-sm text-muted-foreground">
                  No wastage types yet.
                </TD>
              </TR>
            ) : (
              (data ?? []).map((w: WastageType) => (
                <TR key={w.id}>
                  <TD className="font-medium">{w.name}</TD>
                  {(canUpdate || canDelete) && (
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <Button variant="outline" size="sm" onClick={() => setEditing({ id: w.id, name: w.name })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => window.confirm(`Delete "${w.name}"?`) && remove.mutate(w.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TD>
                  )}
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
