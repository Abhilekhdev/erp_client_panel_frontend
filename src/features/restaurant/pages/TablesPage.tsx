import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { usePermissions } from '@/features/auth/usePermission';
import { listLocations } from '@/features/business-locations/business-locations.api';
import { getApiErrorMessage } from '@/lib/api/axios';
import { createTable, deleteTable, listTables, updateTable, type ResTable } from '../restaurant.api';

interface Draft { id?: number; location_id: string; name: string; description: string }

/** GOURI's restaurant Tables CRUD (`/modules/tables`). Dining tables the POS can bill to. */
export function TablesPage() {
  const qc = useQueryClient();
  const { has } = usePermissions();
  const canManage = has('access_tables');

  const { data: tables = [], isLoading } = useQuery({ queryKey: ['res-tables', undefined], queryFn: () => listTables() });
  const { data: locs } = useQuery({ queryKey: ['location-options-list'], queryFn: () => listLocations({ page: 1, pageSize: 100, search: '' }) });
  const locations = locs?.data ?? [];

  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['res-tables'] });
  const save = useMutation({
    mutationFn: () => {
      const d = draft as Draft;
      const body = { location_id: Number(d.location_id), name: d.name.trim(), description: d.description.trim() || undefined };
      return d.id ? updateTable(d.id, body) : createTable(body);
    },
    onSuccess: () => { invalidate(); setDraft(null); setError(''); },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save table')),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteTable(id),
    onSuccess: invalidate,
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });

  const submit = () => {
    const d = draft as Draft;
    if (!d.location_id) return setError('Select a location');
    if (!d.name.trim()) return setError('Table name is required');
    save.mutate();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Tables"
        description="Dining tables a POS sale can be assigned to."
        breadcrumbs={[{ label: 'Settings' }, { label: 'Tables' }]}
        actions={!draft && canManage && (
          <Button size="sm" onClick={() => setDraft({ location_id: locations[0] ? String(locations[0].id) : '', name: '', description: '' })}>
            <Plus className="h-4 w-4" /> Add Table
          </Button>
        )}
      />

      {draft && (
        <Card className="mb-5">
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <div className="flex items-center justify-between sm:col-span-2">
              <h3 className="text-sm font-semibold">{draft.id ? 'Edit' : 'New'} table</h3>
              <Button variant="ghost" size="icon" onClick={() => setDraft(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-1.5">
              <Label>Location <span className="text-destructive">*</span></Label>
              <Select value={draft.location_id} onChange={(e) => setDraft({ ...draft, location_id: e.target.value })} disabled={Boolean(draft.id)}>
                <option value="">Select location</option>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. T1, Patio 3" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
            {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
              <Button onClick={submit} isLoading={save.isPending}>{draft.id ? 'Update' : 'Save'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <THead>
            <TR className="bg-muted/40 hover:bg-muted/40">
              <TH>Name</TH>
              <TH>Location</TH>
              <TH>Description</TH>
              {canManage && <TH className="text-right">Action</TH>}
            </TR>
          </THead>
          <TBody>
            {isLoading ? (
              <TR><TD colSpan={4} className="py-10 text-center text-muted-foreground">Loading…</TD></TR>
            ) : tables.length === 0 ? (
              <TR className="hover:bg-transparent"><TD colSpan={4} className="py-12 text-center text-sm text-muted-foreground">No tables yet.</TD></TR>
            ) : (
              tables.map((t: ResTable) => (
                <TR key={t.id}>
                  <TD className="font-medium">{t.name}</TD>
                  <TD>{t.location}</TD>
                  <TD className="text-muted-foreground">{t.description || '—'}</TD>
                  {canManage && (
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDraft({ id: t.id, location_id: String(t.locationId), name: t.name, description: t.description })}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="destructive" size="sm" onClick={() => window.confirm(`Delete "${t.name}"?`) && remove.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
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
