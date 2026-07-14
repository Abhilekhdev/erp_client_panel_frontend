import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  createVariationTemplate,
  deleteVariationTemplate,
  listVariationTemplates,
  updateVariationTemplate,
  type VariationTemplate,
} from '../variation-templates.api';

interface Editing {
  id?: number;
  name: string;
  values: string[];
}

export function VariationTemplatesPage() {
  const qc = useQueryClient();
  const { has } = usePermissions();
  const canCreate = has('product.create');
  const canUpdate = has('product.update');
  const canDelete = has('product.delete');

  const { data: templates, isLoading } = useQuery({ queryKey: ['variation-templates'], queryFn: listVariationTemplates });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState('');

  const reset = () => {
    setEditing(null);
    setError('');
  };

  const save = useMutation({
    mutationFn: () => {
      const e = editing as Editing;
      const body = { name: e.name.trim(), values: e.values.map((v) => v.trim()).filter(Boolean) };
      return e.id ? updateVariationTemplate(e.id, body) : createVariationTemplate(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variation-templates'] });
      reset();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Could not save variation')),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteVariationTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['variation-templates'] }),
    onError: (err: unknown) => window.alert(getApiErrorMessage(err, 'Could not delete')),
  });

  const startEdit = (t: VariationTemplate) =>
    setEditing({ id: t.id, name: t.name, values: t.values.map((v) => v.name) });
  const startNew = () => setEditing({ name: '', values: ['', ''] });

  const setValue = (i: number, v: string) =>
    setEditing((e) => (e ? { ...e, values: e.values.map((x, j) => (j === i ? v : x)) } : e));
  const addValue = () => setEditing((e) => (e ? { ...e, values: [...e.values, ''] } : e));
  const removeValue = (i: number) =>
    setEditing((e) => (e ? { ...e, values: e.values.filter((_, j) => j !== i) } : e));

  const onSave = () => {
    if (!editing?.name.trim()) return setError('Name is required');
    if (editing.values.map((v) => v.trim()).filter(Boolean).length === 0) return setError('Add at least one value');
    setError('');
    save.mutate();
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Variations"
        description="Attribute sets (e.g. Colour, Size) used to build variable products."
        breadcrumbs={[{ label: 'Products' }, { label: 'Variations' }]}
        actions={
          !editing &&
          canCreate && (
            <Button size="sm" onClick={startNew}>
              <Plus className="h-4 w-4" />
              Add Variation
            </Button>
          )
        }
      />

      {editing && (
        <Card className="mb-5">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">{editing.id ? 'Edit variation' : 'New variation'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={reset}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                Variation name<span className="text-destructive"> *</span>
              </Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Colour"
                className="max-w-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Values<span className="text-destructive"> *</span>
              </Label>
              <div className="space-y-2">
                {editing.values.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={v}
                      onChange={(e) => setValue(i, e.target.value)}
                      placeholder={`Value ${i + 1}`}
                      className="max-w-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeValue(i)}
                      disabled={editing.values.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addValue}>
                <Plus className="h-4 w-4" />
                Add value
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
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
              <TH>Variation</TH>
              <TH>Values</TH>
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
            ) : (templates ?? []).length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={3} className="py-12 text-center text-sm text-muted-foreground">
                  No variations yet.
                </TD>
              </TR>
            ) : (
              (templates ?? []).map((t) => (
                <TR key={t.id}>
                  <TD className="font-medium">{t.name}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {t.values.map((v) => (
                        <Badge key={v.id} variant="secondary">
                          {v.name}
                        </Badge>
                      ))}
                    </div>
                  </TD>
                  {(canUpdate || canDelete) && (
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <Button variant="outline" size="sm" onClick={() => startEdit(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => window.confirm(`Delete "${t.name}"?`) && remove.mutate(t.id)}
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
