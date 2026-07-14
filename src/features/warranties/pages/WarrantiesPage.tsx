import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import { createWarranty, deleteWarranty, listWarranties, updateWarranty, type Warranty } from '../warranties.api';

interface Editing {
  id?: number;
  name: string;
  description: string;
  duration: string;
  durationType: 'days' | 'months' | 'years';
}

const BLANK: Editing = { name: '', description: '', duration: '', durationType: 'months' };

export function WarrantiesPage() {
  const qc = useQueryClient();
  const { has } = usePermissions();
  const canCreate = has('product.create');
  const canUpdate = has('product.update');
  const canDelete = has('product.delete');

  const { data: warranties, isLoading } = useQuery({ queryKey: ['warranties'], queryFn: listWarranties });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState('');

  const reset = () => {
    setEditing(null);
    setError('');
  };

  const save = useMutation({
    mutationFn: () => {
      const e = editing as Editing;
      const body = {
        name: e.name.trim(),
        description: e.description.trim() || null,
        duration: Number(e.duration || 0),
        duration_type: e.durationType,
      };
      return e.id ? updateWarranty(e.id, body) : createWarranty(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warranties'] });
      reset();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Could not save warranty')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteWarranty(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warranties'] }),
    onError: (err: unknown) => window.alert(getApiErrorMessage(err, 'Could not delete')),
  });

  const startEdit = (w: Warranty) =>
    setEditing({
      id: w.id,
      name: w.name,
      description: w.description,
      duration: String(w.duration),
      durationType: (w.durationType as Editing['durationType']) ?? 'months',
    });

  const onSave = () => {
    if (!editing?.name.trim()) return setError('Name is required');
    if (!editing.duration || Number(editing.duration) <= 0) return setError('Enter a valid duration');
    setError('');
    save.mutate();
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Warranties"
        description="Warranty periods you can attach to products."
        breadcrumbs={[{ label: 'Products' }, { label: 'Warranties' }]}
        actions={
          !editing &&
          canCreate && (
            <Button size="sm" onClick={() => setEditing({ ...BLANK })}>
              <Plus className="h-4 w-4" />
              Add Warranty
            </Button>
          )
        }
      />

      {editing && (
        <Card className="mb-5">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">{editing.id ? 'Edit warranty' : 'New warranty'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={reset}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Name<span className="text-destructive"> *</span>
              </Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. 1 Year Warranty"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>
                  Duration<span className="text-destructive"> *</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={editing.duration}
                  onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <Select
                  value={editing.durationType}
                  onChange={(e) => setEditing({ ...editing, durationType: e.target.value as Editing['durationType'] })}
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>
            {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button onClick={onSave} isLoading={save.isPending}>
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
              <TH>Duration</TH>
              <TH>Description</TH>
              {(canUpdate || canDelete) && <TH className="text-right">Action</TH>}
            </TR>
          </THead>
          <TBody>
            {isLoading ? (
              <TR>
                <TD colSpan={4} className="py-10 text-center text-muted-foreground">
                  Loading…
                </TD>
              </TR>
            ) : (warranties ?? []).length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                  No warranties yet.
                </TD>
              </TR>
            ) : (
              (warranties ?? []).map((w) => (
                <TR key={w.id}>
                  <TD className="font-medium">{w.name}</TD>
                  <TD>
                    {w.duration} {w.durationType}
                  </TD>
                  <TD className="max-w-xs truncate text-muted-foreground">{w.description || '—'}</TD>
                  {(canUpdate || canDelete) && (
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <Button variant="outline" size="sm" onClick={() => startEdit(w)}>
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
