import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Pencil, Plus, Trash2, X } from 'lucide-react';
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
  createLabelSheet,
  deleteLabelSheet,
  listLabelSheets,
  setDefaultLabelSheet,
  updateLabelSheet,
  type LabelSheet,
  type SaveLabelSheetBody,
} from '../labels.api';

interface Editing {
  id?: number;
  name: string;
  description: string;
  width: string;
  height: string;
  paperWidth: string;
  paperHeight: string;
  topMargin: string;
  leftMargin: string;
  rowDistance: string;
  colDistance: string;
  stickersInOneRow: string;
  stickersInOneSheet: string;
  isContinuous: boolean;
}

const BLANK: Editing = {
  name: '', description: '', width: '2', height: '1', paperWidth: '8.5', paperHeight: '11',
  topMargin: '0.5', leftMargin: '0.2', rowDistance: '0', colDistance: '0.15',
  stickersInOneRow: '4', stickersInOneSheet: '20', isContinuous: false,
};

const num = (v: string): number | null => (v.trim() === '' ? null : Number(v));
const str = (n: number | null): string => (n == null ? '' : String(n));

/**
 * Label-sheet layouts (GOURI's `/barcodes` screen) — the sticker geometry Print Labels prints onto.
 * Built-in presets are shared read-only rows; a tenant makes its own by duplicating or adding.
 */
export function LabelSheetsPage() {
  const qc = useQueryClient();
  const { has } = usePermissions();
  const canManage = has('barcode_settings.access');

  const { data: sheets, isLoading } = useQuery({ queryKey: ['label-sheets'], queryFn: listLabelSheets });
  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['label-sheets'] });
    qc.invalidateQueries({ queryKey: ['label-sheet-default'] });
  };
  const reset = () => {
    setEditing(null);
    setError('');
  };

  const save = useMutation({
    mutationFn: () => {
      const e = editing as Editing;
      const body: SaveLabelSheetBody = {
        name: e.name.trim(),
        description: e.description.trim(),
        width: num(e.width),
        height: num(e.height),
        paper_width: num(e.paperWidth),
        paper_height: num(e.paperHeight),
        top_margin: num(e.topMargin),
        left_margin: num(e.leftMargin),
        row_distance: num(e.rowDistance),
        col_distance: num(e.colDistance),
        stickers_in_one_row: num(e.stickersInOneRow),
        stickers_in_one_sheet: num(e.stickersInOneSheet),
        is_continuous: e.isContinuous,
      };
      return e.id ? updateLabelSheet(e.id, body) : createLabelSheet(body);
    },
    onSuccess: () => {
      invalidate();
      reset();
    },
    onError: (e: unknown) => setError(getApiErrorMessage(e, 'Could not save the label sheet')),
  });

  const makeDefault = useMutation({
    mutationFn: (id: number) => setDefaultLabelSheet(id),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not set the default')),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteLabelSheet(id),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });

  const startEdit = (s: LabelSheet) =>
    setEditing({
      id: s.id,
      name: s.name,
      description: s.description,
      width: str(s.width),
      height: str(s.height),
      paperWidth: str(s.paperWidth),
      paperHeight: str(s.paperHeight),
      topMargin: str(s.topMargin),
      leftMargin: str(s.leftMargin),
      rowDistance: str(s.rowDistance),
      colDistance: str(s.colDistance),
      stickersInOneRow: str(s.stickersInOneRow),
      stickersInOneSheet: str(s.stickersInOneSheet),
      isContinuous: s.isContinuous,
    });
  /** A preset can't be edited in place — copy it into this business and edit that. */
  const startDuplicate = (s: LabelSheet) => {
    startEdit(s);
    setEditing((e) => (e ? { ...e, id: undefined, name: `${s.name} (copy)` } : e));
  };

  const setE = <K extends keyof Editing>(k: K, v: Editing[K]) => setEditing((e) => (e ? { ...e, [k]: v } : e));

  return (
    <div>
      <PageHeader
        title="Label Sheets"
        description="Sticker sizes and page layouts used by Print Labels."
        breadcrumbs={[{ label: 'Settings' }, { label: 'Label Sheets' }]}
        actions={
          canManage && !editing && (
            <Button size="sm" onClick={() => setEditing(BLANK)}>
              <Plus className="h-4 w-4" /> Add sheet
            </Button>
          )
        }
      />

      {editing && (
        <Card className="mb-5">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">{editing.id ? 'Edit label sheet' : 'Add label sheet'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label>Name<span className="text-destructive"> *</span></Label>
                <Input value={editing.name} onChange={(e) => setE('name', e.target.value)} />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary"
                    checked={editing.isContinuous}
                    onChange={(e) => setE('isContinuous', e.target.checked)}
                  />
                  Continuous roll
                </label>
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description} onChange={(e) => setE('description', e.target.value)} />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sticker (inches)
              </p>
              <div className="grid gap-3 sm:grid-cols-4">
                <NumField label="Width" value={editing.width} onChange={(v) => setE('width', v)} />
                <NumField label="Height" value={editing.height} onChange={(v) => setE('height', v)} />
                <NumField label="Stickers per row" value={editing.stickersInOneRow} onChange={(v) => setE('stickersInOneRow', v)} step="1" />
                <NumField
                  label="Stickers per sheet"
                  value={editing.stickersInOneSheet}
                  onChange={(v) => setE('stickersInOneSheet', v)}
                  step="1"
                  disabled={editing.isContinuous}
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Paper &amp; spacing (inches)
              </p>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <NumField label="Paper width" value={editing.paperWidth} onChange={(v) => setE('paperWidth', v)} />
                <NumField label="Paper height" value={editing.paperHeight} onChange={(v) => setE('paperHeight', v)} disabled={editing.isContinuous} />
                <NumField label="Top margin" value={editing.topMargin} onChange={(v) => setE('topMargin', v)} />
                <NumField label="Left margin" value={editing.leftMargin} onChange={(v) => setE('leftMargin', v)} />
                <NumField label="Row gap" value={editing.rowDistance} onChange={(v) => setE('rowDistance', v)} />
                <NumField label="Column gap" value={editing.colDistance} onChange={(v) => setE('colDistance', v)} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button disabled={!editing.name.trim() || save.isPending} onClick={() => save.mutate()}>
                {editing.id ? 'Save changes' : 'Add sheet'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Layout</TH>
                <TH>Sticker size</TH>
                <TH className="text-right">Action</TH>
              </TR>
            </THead>
            <TBody>
              {isLoading && (
                <TR>
                  <TD colSpan={4} className="py-8 text-center text-sm text-muted-foreground">Loading…</TD>
                </TR>
              )}
              {sheets?.map((s) => (
                <TR key={s.id}>
                  <TD>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      {s.isDefault && <Badge variant="success">Default</Badge>}
                      {s.isSystem && <Badge variant="secondary">Built-in</Badge>}
                    </div>
                    {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                  </TD>
                  <TD className="text-sm">
                    {s.isContinuous
                      ? `Continuous · ${s.stickersInOneRow ?? 1} per row`
                      : `${s.stickersInOneRow ?? '?'} per row · ${s.stickersInOneSheet ?? '?'} per sheet`}
                  </TD>
                  <TD className="text-sm">{s.width ? `${s.width}" × ${s.height ?? '?'}"` : '—'}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {canManage && !s.isDefault && (
                        <Button variant="outline" size="sm" onClick={() => makeDefault.mutate(s.id)} title="Set as default">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      {canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => (s.isSystem ? startDuplicate(s) : startEdit(s))}
                          title={s.isSystem ? 'Duplicate (built-in sheets are read-only)' : 'Edit'}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canManage && !s.isSystem && !s.isDefault && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => window.confirm(`Delete "${s.name}"?`) && remove.mutate(s.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
              {!isLoading && !sheets?.length && (
                <TR>
                  <TD colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No label sheets yet.</TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = '0.01',
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" min="0" step={step} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
