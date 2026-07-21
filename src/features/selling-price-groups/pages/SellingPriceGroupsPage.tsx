import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Pencil, Plus, Power, Trash2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
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
  exportGroupPrices,
  importGroupPrices,
  listSellingPriceGroups,
  type GroupPriceImportResult,
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

  const fileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<GroupPriceImportResult | null>(null);
  const runImport = useMutation({
    mutationFn: (file: File) => importGroupPrices(file),
    onSuccess: (res) => {
      setImportResult(res);
      if (!res.errors.length) invalidate();
    },
    onError: (err: unknown) => window.alert(getApiErrorMessage(err, 'Could not import the price list')),
  });
  const importing = runImport.isPending;

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
          !editing && (
            <div className="flex flex-wrap gap-2">
              {/* Bulk-edit the whole price list in Excel: export, edit, import back. */}
              <Button variant="outline" size="sm" onClick={() => exportGroupPrices()}>
                <Download className="h-4 w-4" />
                Export prices
              </Button>
              {canUpdate && (
                <>
                  <Button variant="outline" size="sm" disabled={importing} onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    {importing ? 'Importing…' : 'Import prices'}
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) runImport.mutate(f);
                      e.target.value = '';
                    }}
                  />
                </>
              )}
              {canCreate && (
                <Button size="sm" onClick={() => setEditing({ ...BLANK })}>
                  <Plus className="h-4 w-4" />
                  Add Price Group
                </Button>
              )}
            </div>
          )
        }
      />

      {importResult && (
        <Card
          className={`mb-5 ${importResult.errors.length ? 'border-destructive/40 bg-destructive/5' : 'border-emerald-500/40 bg-emerald-500/5'}`}
        >
          <CardContent className="space-y-2 py-4 text-sm">
            {importResult.errors.length ? (
              <>
                <p className="font-medium text-destructive">
                  Nothing was imported — fix these {importResult.errors.length} problem(s) and try again:
                </p>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>
                      <span className="font-medium">Row {err.row}:</span> {err.message}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="font-medium text-emerald-700 dark:text-emerald-400">
                Updated {importResult.updated} price(s) across {importResult.rows} product(s).
              </p>
            )}
            {importResult.unknownColumns.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Ignored unrecognised column(s): {importResult.unknownColumns.join(', ')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
