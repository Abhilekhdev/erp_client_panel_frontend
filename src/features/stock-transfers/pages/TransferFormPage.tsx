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
import { createTransfer, getTransferMeta, searchTransferProducts, type TransferStatus } from '../stock-transfers.api';

interface Line {
  productId: number;
  variationId: number;
  productName: string;
  variationName: string | null;
  quantity: string;
  unitPrice: string;
}
const today = () => new Date().toISOString().slice(0, 10);

export function TransferFormPage() {
  const navigate = useNavigate();
  const { data: meta } = useQuery({ queryKey: ['transfer-meta'], queryFn: getTransferMeta });

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [status, setStatus] = useState<TransferStatus>('pending');
  const [refNo, setRefNo] = useState('');
  const [date, setDate] = useState(today());
  const [shipping, setShipping] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState('');

  const subtotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
  const total = subtotal + (Number(shipping) || 0);

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
      createTransfer({
        transaction_date: date,
        ref_no: refNo.trim() || undefined,
        status,
        location_id: Number(fromId),
        transfer_location_id: Number(toId),
        shipping_charges: shipping ? Number(shipping) : 0,
        additional_notes: notes.trim() || null,
        products: lines.map((l) => ({
          product_id: l.productId,
          variation_id: l.variationId,
          quantity: Number(l.quantity),
          unit_price: Number(l.unitPrice) || 0,
        })),
      }),
    onSuccess: () => navigate('/stock-transfers'),
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save transfer')),
  });

  const onSave = () => {
    if (!fromId || !toId) return setError('Select both the source and destination locations');
    if (fromId === toId) return setError('Source and destination must be different');
    if (lines.length === 0) return setError('Add at least one product');
    if (lines.some((l) => !(Number(l.quantity) > 0))) return setError('Every line needs a quantity greater than zero');
    setError('');
    save.mutate();
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Add Stock Transfer"
        description="Move stock between locations. Stock only leaves and arrives when the transfer is Completed."
        breadcrumbs={[{ label: 'Stock Transfers', to: '/stock-transfers' }, { label: 'Add' }]}
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
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reference No</Label>
            <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="Auto-generated if blank" />
          </div>
          <div className="space-y-1.5">
            <Label>
              Status <span className="text-destructive">*</span>
            </Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as TransferStatus)}>
              <option value="pending">Pending</option>
              <option value="in_transit">In transit</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>
              Location (From) <span className="text-destructive">*</span>
            </Label>
            <Select
              value={fromId}
              onChange={(e) => {
                setFromId(e.target.value);
                setLines([]);
              }}
            >
              <option value="">Select location</option>
              {(meta?.locations ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>
              Location (To) <span className="text-destructive">*</span>
            </Label>
            <Select value={toId} onChange={(e) => setToId(e.target.value)}>
              <option value="">Select location</option>
              {(meta?.locations ?? [])
                .filter((l) => String(l.id) !== fromId)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Shipping Charges</Label>
            <Input type="number" step="0.01" value={shipping} onChange={(e) => setShipping(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardContent className="pt-6">
          <div className="mb-3">
            <StockItemSearch
              locationId={fromId ? Number(fromId) : null}
              fetcher={searchTransferProducts}
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
                      Choose the source location, then search and add products.
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
          <div className="mt-3 flex justify-end gap-4 text-sm">
            <span className="text-muted-foreground">
              Items: <span className="font-medium text-foreground tabular-nums">{formatMoney(subtotal)}</span>
            </span>
            <span className="text-muted-foreground">
              Total: <span className="font-semibold text-foreground tabular-nums">{formatMoney(total)}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardContent className="pt-6">
          <div className="space-y-1.5">
            <Label>Additional Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/stock-transfers')}>
          Cancel
        </Button>
        <Button onClick={onSave} isLoading={save.isPending}>
          Save Transfer
        </Button>
      </div>
    </div>
  );
}
