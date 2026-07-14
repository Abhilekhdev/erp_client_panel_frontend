import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import { createBrand, deleteBrand, listBrands, updateBrand, type Brand } from '../brands.api';

interface Editing {
  id?: number;
  name: string;
  description: string;
}

const BLANK: Editing = { name: '', description: '' };

export function BrandsPage() {
  const qc = useQueryClient();
  const { has } = usePermissions();
  const canCreate = has('brand.create');
  const canUpdate = has('brand.update');
  const canDelete = has('brand.delete');

  const { data: brands, isLoading } = useQuery({ queryKey: ['brands'], queryFn: listBrands });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState('');

  const reset = () => {
    setEditing(null);
    setError('');
  };

  const save = useMutation({
    mutationFn: () => {
      const e = editing as Editing;
      const body = { name: e.name.trim(), description: e.description.trim() || null };
      return e.id ? updateBrand(e.id, body) : createBrand(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands'] });
      reset();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Could not save brand')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteBrand(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brands'] }),
    onError: (err: unknown) => window.alert(getApiErrorMessage(err, 'Could not delete brand')),
  });

  const startEdit = (b: Brand) => setEditing({ id: b.id, name: b.name, description: b.description });

  const onSave = () => {
    if (!editing?.name.trim()) return setError('Name is required');
    setError('');
    save.mutate();
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Brands"
        description="Manufacturers / brands you can tag products with."
        breadcrumbs={[{ label: 'Products' }, { label: 'Brands' }]}
        actions={
          !editing &&
          canCreate && (
            <Button size="sm" onClick={() => setEditing({ ...BLANK })}>
              <Plus className="h-4 w-4" />
              Add Brand
            </Button>
          )
        }
      />

      {editing && (
        <Card className="mb-5">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">{editing.id ? 'Edit brand' : 'New brand'}</CardTitle>
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
                placeholder="e.g. Nike"
              />
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
              <TH>Description</TH>
              {(canUpdate || canDelete) && <TH className="text-right">Action</TH>}
            </TR>
          </THead>
          <TBody>
            {isLoading ? (
              <TR>
                <TD colSpan={3} className="py-10 text-center text-muted-foreground">
                  Loading…
                </TD>
              </TR>
            ) : (brands ?? []).length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={3} className="py-12 text-center text-sm text-muted-foreground">
                  No brands yet.
                </TD>
              </TR>
            ) : (
              (brands ?? []).map((b) => (
                <TR key={b.id}>
                  <TD className="font-medium">{b.name}</TD>
                  <TD className="max-w-md truncate text-muted-foreground">{b.description || '—'}</TD>
                  {(canUpdate || canDelete) && (
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <Button variant="outline" size="sm" onClick={() => startEdit(b)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => window.confirm(`Delete "${b.name}"?`) && remove.mutate(b.id)}
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
