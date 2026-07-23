import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  createAccountType,
  deleteAccountType,
  listAccountTypes,
  updateAccountType,
} from '../accounts.api';

type Editing = { id?: number; name: string; parentAccountTypeId: string };

export function AccountTypesTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['account-types'], queryFn: listAccountTypes });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['account-types'] });
    qc.invalidateQueries({ queryKey: ['account-types-grouped'] });
  };

  const save = useMutation({
    mutationFn: () => {
      const e = editing as Editing;
      const body = { name: e.name.trim(), parentAccountTypeId: e.parentAccountTypeId ? Number(e.parentAccountTypeId) : null };
      return e.id ? updateAccountType(e.id, body) : createAccountType(body);
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
      setError('');
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteAccountType(id),
    onSuccess: invalidate,
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });

  const parents = (data?.tree ?? []).map((p) => ({ id: p.id, name: p.name }));
  const nameOf = (id: number | null) => data?.data.find((t) => t.id === id)?.name ?? '—';

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {editing ? null : (
          <Button size="sm" onClick={() => setEditing({ name: '', parentAccountTypeId: '' })}>
            <Plus className="h-4 w-4" /> Add Account Type
          </Button>
        )}
      </div>

      {editing && (
        <Card className="mb-5">
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <div className="flex items-center justify-between sm:col-span-2">
              <h3 className="text-sm font-semibold">{editing.id ? 'Edit' : 'New'} account type</h3>
              <Button variant="ghost" size="icon" onClick={() => setEditing(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>
                Name <span className="text-destructive">*</span>
              </Label>
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Parent type</Label>
              <Select
                value={editing.parentAccountTypeId}
                onChange={(e) => setEditing({ ...editing, parentAccountTypeId: e.target.value })}
              >
                <option value="">— Top level —</option>
                {parents
                  .filter((p) => p.id !== editing.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </Select>
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
              <TH>Parent</TH>
              <TH className="text-right">Action</TH>
            </TR>
          </THead>
          <TBody>
            {(data?.data ?? []).length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={3} className="py-12 text-center text-sm text-muted-foreground">
                  No account types yet.
                </TD>
              </TR>
            ) : (
              (data?.data ?? []).map((t) => (
                <TR key={t.id}>
                  <TD className="font-medium">{t.name}</TD>
                  <TD className="text-muted-foreground">
                    {t.parentAccountTypeId ? nameOf(t.parentAccountTypeId) : '—'}
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditing({
                            id: t.id,
                            name: t.name,
                            parentAccountTypeId: t.parentAccountTypeId ? String(t.parentAccountTypeId) : '',
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => window.confirm(`Delete "${t.name}"?`) && remove.mutate(t.id)}
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
