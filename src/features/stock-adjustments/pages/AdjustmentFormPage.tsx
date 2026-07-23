import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { StockItemSearch, type StockItem } from '@/features/stock-common/StockItemSearch';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import { createAdjustment, getAdjustmentMeta, searchAdjustmentProducts } from '../stock-adjustments.api';

interface Line {
  productId: number;
  variationId: number;
  productName: string;
  variationName: string | null;
  quantity: string;
  unitPrice: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export function AdjustmentFormPage() {
  const navigate = useNavigate();
  const { data: meta } = useQuery({ queryKey: ['adjustment-meta'], queryFn: getAdjustmentMeta });

  const [locationId, setLocationId] = useState('');
  const [refNo, setRefNo] = useState('');
  const [date, setDate] = useState(today());
  const [adjustmentTypeId, setAdjustmentTypeId] = useState('');
  const [recovered, setRecovered] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState('');

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  const addItem = (it: StockItem) => {
    if (lines.some((l) => l.variationId === it.variationId)) return;
    setLines((ls) => [
      ...ls,
      {
        productId: it.productId,
        variationId: it.variationId,
        productName: it.productName,
        variationName: it.variationName,
        quantity: '1',
        unitPrice: String(it.unitPrice || 0),
      },
    ]);
  };
  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = useMutation({
    mutationFn: () =>
      createAdjustment({
        location_id: Number(locationId),
        ref_no: refNo.trim() || undefined,
        transaction_date: date,
        adjustment_type_id: adjustmentTypeId ? Number(adjustmentTypeId) : null,
        total_amount_recovered: recovered ? Number(recovered) : 0,
        additional_notes: notes.trim() || null,
        products: lines.map((l) => ({
          product_id: l.productId,
          variation_id: l.variationId,
          quantity: Number(l.quantity),
          unit_price: Number(l.unitPrice) || 0,
        })),
      }),
    onSuccess: () => navigate('/stock-adjustments'),
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save adjustment')),
  });

  const onSave = () => {
    if (!locationId) return setError('Select a business location');
    if (lines.length === 0) return setError('Add at least one product');
    if (lines.some((l) => !(Number(l.quantity) > 0))) return setError('Every line needs a quantity greater than zero');
    setError('');
    save.mutate();
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Add Stock Adjustment"
        description="Write off damaged, expired or lost stock — the quantity leaves the selected location."
        breadcrumbs={[{ label: 'Stock Adjustment', to: '/stock-adjustments' }, { label: 'Add' }]}
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="mb-5">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>
              Business Location <span className="text-destructive">*</span>
            </Label>
            <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">Select location</option>
              {(meta?.locations ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reference No</Label>
            <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Auto-generated if blank" />
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Adjustment Type</Label>
            <Select value={adjustmentTypeId} onChange={(e) => setAdjustmentTypeId(e.target.value)}>
              <option value="">— None —</option>
              {(meta?.wastageTypes ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Total amount recovered</Label>
            <Input type="number" step="0.01" value={recovered} onChange={(e) => setRecovered(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardContent className="pt-6">
          <div className="mb-3">
            <StockItemSearch
              locationId={locationId ? Number(locationId) : null}
              fetcher={searchAdjustmentProducts}
              onPick={addItem}
            />
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <THead>
                <TR className="bg-muted/40 hover:bg-muted/40">
                  <TH>Product</TH>
                  <TH className="w-28">Quantity</TH>
                  <TH className="w-32">Unit Price</TH>
                  <TH className="w-28 text-right">Subtotal</TH>
                  <TH className="w-10" />
                </TR>
              </THead>
              <TBody>
                {lines.length === 0 ? (
                  <TR className="hover:bg-transparent">
                    <TD colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Search and add products above.
                    </TD>
                  </TR>
                ) : (
                  lines.map((l, i) => (
                    <TR key={l.variationId}>
                      <TD className="font-medium">
                        {l.productName}
                        {l.variationName && <span className="text-muted-foreground"> · {l.variationName}</span>}
                      </TD>
                      <TD>
                        <Input
                          type="number"
                          step="0.01"
                          value={l.quantity}
                          onChange={(e) => setLine(i, { quantity: e.target.value })}
                        />
                      </TD>
                      <TD>
                        <Input
                          type="number"
                          step="0.01"
                          value={l.unitPrice}
                          onChange={(e) => setLine(i, { unitPrice: e.target.value })}
                        />
                      </TD>
                      <TD className="text-right tabular-nums">
                        {formatMoney((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))}
                      </TD>
                      <TD>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
          <div className="mt-3 flex justify-end text-sm">
            <span className="text-muted-foreground">Total adjustment:&nbsp;</span>
            <span className="font-semibold tabular-nums">{formatMoney(total)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardContent className="pt-6">
          <div className="space-y-1.5">
            <Label>Reason for stock adjustment</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/stock-adjustments')}>
          Cancel
        </Button>
        <Button onClick={onSave} isLoading={save.isPending}>
          Save Adjustment
        </Button>
      </div>
    </div>
  );
}
