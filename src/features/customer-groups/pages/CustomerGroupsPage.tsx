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
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  createCustomerGroup,
  deleteCustomerGroup,
  listCustomerGroups,
  updateCustomerGroup,
  type CustomerGroup,
} from '../customer-groups.api';

interface Editing {
  id?: number;
  name: string;
  priceCalculationType: 'percentage' | 'selling_price_group';
  amount: string;
}

const BLANK: Editing = { name: '', priceCalculationType: 'percentage', amount: '' };

export function CustomerGroupsPage() {
  const qc = useQueryClient();
  const { data: groups, isLoading } = useQuery({
    queryKey: ['customer-groups'],
    queryFn: listCustomerGroups,
  });

  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState('');

  const reset = () => {
    setEditing(null);
    setError('');
  };

  const save = useMutation({
    mutationFn: () => {
      const e = editing!;
      const body = {
        name: e.name,
        price_calculation_type: e.priceCalculationType,
        amount: e.priceCalculationType === 'percentage' && e.amount !== '' ? Number(e.amount) : null,
      };
      return e.id ? updateCustomerGroup(e.id, body) : createCustomerGroup(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-groups'] });
      reset();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Could not save customer group')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteCustomerGroup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-groups'] }),
    onError: (err: unknown) => window.alert(getApiErrorMessage(err, 'Could not delete')),
  });

  const startEdit = (g: CustomerGroup) =>
    setEditing({
      id: g.id,
      name: g.name,
      priceCalculationType: g.priceCalculationType === 'selling_price_group' ? 'selling_price_group' : 'percentage',
      amount: g.amount ? String(g.amount) : '',
    });

  const onSave = () => {
    if (!editing?.name.trim()) return setError('Name is required');
    setError('');
    save.mutate();
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Customer Groups"
        description="Group customers to apply a shared discount when selling."
        breadcrumbs={[{ label: 'Contacts' }, { label: 'Customer Groups' }]}
        actions={
          !editing && (
            <Button size="sm" onClick={() => setEditing({ ...BLANK })}>
              <Plus className="h-4 w-4" />
              Add Group
            </Button>
          )
        }
      />

      {editing && (
        <Card className="mb-5">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">{editing.id ? 'Edit group' : 'New group'}</CardTitle>
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
              />
            </div>
            <div className="space-y-2">
              <Label>Calculation type</Label>
              <Select
                value={editing.priceCalculationType}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    priceCalculationType: e.target.value as 'percentage' | 'selling_price_group',
                  })
                }
              >
                <option value="percentage">Percentage</option>
                <option value="selling_price_group">Selling price group</option>
              </Select>
            </div>
            {editing.priceCalculationType === 'percentage' ? (
              <div className="space-y-2">
                <Label>Calculation percentage</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editing.amount}
                  onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
                  placeholder="e.g. 10"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Selling price group</Label>
                <Input disabled placeholder="Available once the Products module is built" />
              </div>
            )}
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
              <TH>Calculation %</TH>
              <TH>Selling Price Group</TH>
              <TH className="text-right">Action</TH>
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
                  No customer groups yet.
                </TD>
              </TR>
            ) : (
              (groups ?? []).map((g) => (
                <TR key={g.id}>
                  <TD className="font-medium">{g.name}</TD>
                  <TD>{g.priceCalculationType === 'percentage' ? `${g.amount}%` : '—'}</TD>
                  <TD>{g.priceCalculationType === 'selling_price_group' ? '—' : '—'}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
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
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
