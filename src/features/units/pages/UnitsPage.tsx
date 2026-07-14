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
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  createUnit,
  deleteUnit,
  listUnits,
  unitDropdown,
  updateUnit,
  type Unit,
} from '../units.api';

interface Editing {
  id?: number;
  actualName: string;
  shortName: string;
  allowDecimal: boolean;
  defineBaseUnit: boolean;
  baseUnitId: string;
  baseUnitMultiplier: string;
}

const BLANK: Editing = {
  actualName: '',
  shortName: '',
  allowDecimal: false,
  defineBaseUnit: false,
  baseUnitId: '',
  baseUnitMultiplier: '',
};

export function UnitsPage() {
  const qc = useQueryClient();
  const { has } = usePermissions();
  const canCreate = has('unit.create');
  const canUpdate = has('unit.update');
  const canDelete = has('unit.delete');

  const { data: units, isLoading } = useQuery({ queryKey: ['units'], queryFn: listUnits });
  const { data: baseOptions } = useQuery({ queryKey: ['units-dropdown'], queryFn: unitDropdown });

  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState('');

  const reset = () => {
    setEditing(null);
    setError('');
  };
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['units'] });
    qc.invalidateQueries({ queryKey: ['units-dropdown'] });
  };

  const save = useMutation({
    mutationFn: () => {
      const e = editing as Editing;
      const isSub = e.defineBaseUnit && e.baseUnitId !== '' && e.baseUnitMultiplier !== '';
      const body = {
        actual_name: e.actualName.trim(),
        short_name: e.shortName.trim(),
        allow_decimal: e.allowDecimal,
        base_unit_id: isSub ? Number(e.baseUnitId) : null,
        base_unit_multiplier: isSub ? Number(e.baseUnitMultiplier) : null,
      };
      return e.id ? updateUnit(e.id, body) : createUnit(body);
    },
    onSuccess: () => {
      invalidate();
      reset();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Could not save unit')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteUnit(id),
    onSuccess: invalidate,
    onError: (err: unknown) => window.alert(getApiErrorMessage(err, 'Could not delete unit')),
  });

  const startEdit = (u: Unit) =>
    setEditing({
      id: u.id,
      actualName: u.actualName,
      shortName: u.shortName,
      allowDecimal: u.allowDecimal,
      defineBaseUnit: u.baseUnitId != null,
      baseUnitId: u.baseUnitId != null ? String(u.baseUnitId) : '',
      baseUnitMultiplier: u.baseUnitMultiplier != null ? String(u.baseUnitMultiplier) : '',
    });

  const onSave = () => {
    if (!editing?.actualName.trim()) return setError('Name is required');
    if (!editing.shortName.trim()) return setError('Short name is required');
    if (editing.defineBaseUnit && (editing.baseUnitId === '' || editing.baseUnitMultiplier === '')) {
      return setError('Pick a base unit and its conversion multiplier');
    }
    setError('');
    save.mutate();
  };

  // Base-unit choices exclude the unit currently being edited (can't be its own base).
  const baseChoices = (baseOptions ?? []).filter((o) => o.id !== editing?.id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Units"
        description="Units of measure for your products. Add sub-units (e.g. 1 Box = 12 Pcs) for multi-unit selling."
        breadcrumbs={[{ label: 'Products' }, { label: 'Units' }]}
        actions={
          !editing &&
          canCreate && (
            <Button size="sm" onClick={() => setEditing({ ...BLANK })}>
              <Plus className="h-4 w-4" />
              Add Unit
            </Button>
          )
        }
      />

      {editing && (
        <Card className="mb-5">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">{editing.id ? 'Edit unit' : 'New unit'}</CardTitle>
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
                value={editing.actualName}
                onChange={(e) => setEditing({ ...editing, actualName: e.target.value })}
                placeholder="e.g. Pieces"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Short name<span className="text-destructive"> *</span>
              </Label>
              <Input
                value={editing.shortName}
                onChange={(e) => setEditing({ ...editing, shortName: e.target.value })}
                placeholder="e.g. Pcs"
              />
            </div>
            <div className="space-y-2">
              <Label>Allow decimal</Label>
              <Select
                value={editing.allowDecimal ? '1' : '0'}
                onChange={(e) => setEditing({ ...editing, allowDecimal: e.target.value === '1' })}
              >
                <option value="0">No</option>
                <option value="1">Yes</option>
              </Select>
            </div>

            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={editing.defineBaseUnit}
                onChange={(e) => setEditing({ ...editing, defineBaseUnit: e.target.checked })}
              />
              Add as a sub-unit of another unit
            </label>

            {editing.defineBaseUnit && (
              <>
                <div className="space-y-2">
                  <Label>Base unit</Label>
                  <Select
                    value={editing.baseUnitId}
                    onChange={(e) => setEditing({ ...editing, baseUnitId: e.target.value })}
                  >
                    <option value="">Select base unit…</option>
                    {baseChoices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Multiplier (1 {editing.actualName || 'unit'} = ? base units)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={editing.baseUnitMultiplier}
                    onChange={(e) => setEditing({ ...editing, baseUnitMultiplier: e.target.value })}
                    placeholder="e.g. 12"
                  />
                </div>
              </>
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
              <TH>Short name</TH>
              <TH>Allow decimal</TH>
              <TH>Base unit</TH>
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
            ) : (units ?? []).length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No units yet.
                </TD>
              </TR>
            ) : (
              (units ?? []).map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium">{u.actualName}</TD>
                  <TD>{u.shortName}</TD>
                  <TD>{u.allowDecimal ? 'Yes' : 'No'}</TD>
                  <TD>
                    {u.relation ? (
                      <span className="text-muted-foreground">{u.relation}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TD>
                  {(canUpdate || canDelete) && (
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <Button variant="outline" size="sm" onClick={() => startEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => window.confirm(`Delete "${u.actualName}"?`) && remove.mutate(u.id)}
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
