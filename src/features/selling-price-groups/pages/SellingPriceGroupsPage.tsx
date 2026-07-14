import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Power, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  createSellingPriceGroup,
  deleteSellingPriceGroup,
  listSellingPriceGroups,
  toggleSellingPriceGroup,
  updateSellingPriceGroup,
  type SellingPriceGroup,
} from '../selling-price-groups.api';

interface Editing {
  id?: number;
  name: string;
  description: string;
}

const BLANK: Editing = { name: '', description: '' };

export function SellingPriceGroupsPage() {
  const qc = useQueryClient();
  const { has } = usePermissions();
  const canCreate = has('product.create');
  const canUpdate = has('product.update');

  const { data: groups, isLoading } = useQuery({ queryKey: ['selling-price-groups'], queryFn: listSellingPriceGroups });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState('');

  const reset = () => {
    setEditing(null);
    setError('');
  };
  const invalidate = () => qc.invalidateQueries({ queryKey: ['selling-price-groups'] });

  const save = useMutation({
    mutationFn: () => {
      const e = editing as Editing;
      const body = { name: e.name.trim(), description: e.description.trim() || null };
      return e.id ? updateSellingPriceGroup(e.id, body) : createSellingPriceGroup(body);
    },
    onSuccess: () => {
      invalidate();
      reset();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Could not save price group')),
  });

  const toggle = useMutation({
    mutationFn: (g: SellingPriceGroup) => toggleSellingPriceGroup(g.id, !g.isActive),
    onSuccess: invalidate,
    onError: (err: unknown) => window.alert(getApiErrorMessage(err, 'Could not update')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteSellingPriceGroup(id),
    onSuccess: invalidate,
    onError: (err: unknown) => window.alert(getApiErrorMessage(err, 'Could not delete')),
  });

  const startEdit = (g: SellingPriceGroup) => setEditing({ id: g.id, name: g.name, description: g.description });

  const onSave = () => {
    if (!editing?.name.trim()) return setError('Name is required');
    setError('');
    save.mutate();
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Selling Price Groups"
        description="Named price tiers (e.g. Wholesale, Retail). Per-product prices are set on each product."
        breadcrumbs={[{ label: 'Products' }, { label: 'Selling Price Groups' }]}
        actions={
          !editing &&
          canCreate && (
            <Button size="sm" onClick={() => setEditing({ ...BLANK })}>
              <Plus className="h-4 w-4" />
              Add Price Group
            </Button>
          )
        }
      />

      {editing && (
        <Card className="mb-5">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">{editing.id ? 'Edit price group' : 'New price group'}</CardTitle>
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
                placeholder="e.g. Wholesale"
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
              <TH>Status</TH>
              {canUpdate && <TH className="text-right">Action</TH>}
            </TR>
          </THead>
          <TBody>
            {isLoading ? (
              <TR>
                <TD colSpan={4} className="py-10 text-center text-muted-foreground">
                  Loading…
                </TD>
              </TR>
            ) : (groups ?? []).length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                  No price groups yet.
                </TD>
              </TR>
            ) : (
              (groups ?? []).map((g) => (
                <TR key={g.id}>
                  <TD className="font-medium">{g.name}</TD>
                  <TD className="max-w-xs truncate text-muted-foreground">{g.description || '—'}</TD>
                  <TD>
                    <Badge variant={g.isActive ? 'success' : 'secondary'}>
                      {g.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TD>
                  {canUpdate && (
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggle.mutate(g)}
                          title={g.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => startEdit(g)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => window.confirm(`Delete "${g.name}"?`) && remove.mutate(g.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
