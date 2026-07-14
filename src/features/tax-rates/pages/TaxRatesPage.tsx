import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Pencil, Percent, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  createTaxGroup,
  createTaxRate,
  deleteTaxGroup,
  deleteTaxRate,
  listTaxRates,
  updateTaxGroup,
  updateTaxRate,
  type TaxRate,
} from '../tax-rates.api';

type RateForm = { kind: 'rate'; id?: number; name: string; amount: string; forTaxGroup: boolean };
type GroupForm = { kind: 'group'; id?: number; name: string; taxes: number[] };
type Editing = RateForm | GroupForm;

export function TaxRatesPage() {
  const qc = useQueryClient();
  const { has } = usePermissions();
  const canCreate = has('tax_rate.create');
  const canUpdate = has('tax_rate.update');
  const canDelete = has('tax_rate.delete');

  const { data: rates, isLoading } = useQuery({ queryKey: ['tax-rates'], queryFn: listTaxRates });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState('');

  const reset = () => {
    setEditing(null);
    setError('');
  };
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tax-rates'] });

  // Simple rates are the only things that can be members of a group.
  const memberOptions = useMemo(
    () => (rates ?? []).filter((r) => !r.isTaxGroup).map((r) => ({ value: r.id, label: `${r.name} (${r.amount}%)` })),
    [rates],
  );

  const save = useMutation({
    mutationFn: () => {
      const e = editing as Editing;
      if (e.kind === 'rate') {
        const body = { name: e.name.trim(), amount: Number(e.amount || 0), for_tax_group: e.forTaxGroup };
        return e.id ? updateTaxRate(e.id, body) : createTaxRate(body);
      }
      const body = { name: e.name.trim(), taxes: e.taxes };
      return e.id ? updateTaxGroup(e.id, body) : createTaxGroup(body);
    },
    onSuccess: () => {
      invalidate();
      reset();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Could not save')),
  });

  const remove = useMutation({
    mutationFn: (r: TaxRate) => (r.isTaxGroup ? deleteTaxGroup(r.id) : deleteTaxRate(r.id)),
    onSuccess: invalidate,
    onError: (err: unknown) => window.alert(getApiErrorMessage(err, 'Could not delete')),
  });

  const startEditRate = (r: TaxRate) =>
    setEditing({ kind: 'rate', id: r.id, name: r.name, amount: String(r.amount), forTaxGroup: r.forTaxGroup });
  const startEditGroup = (r: TaxRate) =>
    setEditing({ kind: 'group', id: r.id, name: r.name, taxes: r.subTaxes.map((t) => t.id) });

  const onSave = () => {
    if (!editing?.name.trim()) return setError('Name is required');
    if (editing.kind === 'group' && editing.taxes.length === 0) return setError('Select at least one tax rate');
    setError('');
    save.mutate();
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Tax Rates"
        description="Simple tax rates and tax groups (a group's rate is the sum of its members)."
        breadcrumbs={[{ label: 'Settings' }, { label: 'Tax Rates' }]}
        actions={
          !editing &&
          canCreate && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing({ kind: 'group', name: '', taxes: [] })}>
                <Layers className="h-4 w-4" />
                Add Tax Group
              </Button>
              <Button size="sm" onClick={() => setEditing({ kind: 'rate', name: '', amount: '', forTaxGroup: false })}>
                <Plus className="h-4 w-4" />
                Add Tax Rate
              </Button>
            </div>
          )
        }
      />

      {editing && (
        <Card className="mb-5">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">
              {editing.id ? 'Edit' : 'New'} {editing.kind === 'group' ? 'tax group' : 'tax rate'}
            </CardTitle>
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
                placeholder={editing.kind === 'group' ? 'e.g. GST 18%' : 'e.g. VAT'}
              />
            </div>

            {editing.kind === 'rate' ? (
              <>
                <div className="space-y-2">
                  <Label>
                    Rate %<span className="text-destructive"> *</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={editing.amount}
                    onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 self-end pb-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={editing.forTaxGroup}
                    onChange={(e) => setEditing({ ...editing, forTaxGroup: e.target.checked })}
                  />
                  For tax group only (hide from the product tax dropdown)
                </label>
              </>
            ) : (
              <div className="space-y-2 sm:col-span-2">
                <Label>
                  Sub taxes<span className="text-destructive"> *</span>
                </Label>
                <MultiSelect
                  options={memberOptions}
                  value={editing.taxes}
                  onChange={(v) => setEditing({ ...editing, taxes: v })}
                  placeholder="Select tax rates to combine…"
                />
                <p className="text-xs text-muted-foreground">
                  The group's total rate is the sum of the selected rates.
                </p>
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
              <TH>Type</TH>
              <TH>Rate %</TH>
              <TH>Sub taxes</TH>
              {(canUpdate || canDelete) && <TH className="text-right">Action</TH>}
            </TR>
          </THead>
          <TBody>
            {isLoading ? (
              <TR>
                <TD colSpan={5} className="py-10 text-center text-muted-foreground">
                  Loading…
                </TD>
              </TR>
            ) : (rates ?? []).length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No tax rates yet.
                </TD>
              </TR>
            ) : (
              (rates ?? []).map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.name}</TD>
                  <TD>
                    {r.isTaxGroup ? (
                      <Badge variant="secondary">
                        <Layers className="mr-1 h-3 w-3" />
                        Group
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Percent className="mr-1 h-3 w-3" />
                        Rate
                      </Badge>
                    )}
                  </TD>
                  <TD>{r.amount}%</TD>
                  <TD className="text-muted-foreground">
                    {r.isTaxGroup ? r.subTaxes.map((t) => `${t.name} (${t.amount}%)`).join(' + ') : '—'}
                  </TD>
                  {(canUpdate || canDelete) && (
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => (r.isTaxGroup ? startEditGroup(r) : startEditRate(r))}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => window.confirm(`Delete "${r.name}"?`) && remove.mutate(r)}
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
