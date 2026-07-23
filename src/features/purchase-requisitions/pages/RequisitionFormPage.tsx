import { useMutation, useQuery } from '@tanstack/react-query';
import { Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { ProductSearchBox } from '@/features/purchases/components/ProductSearchBox';
import { getProductMeta } from '@/features/products/products.api';
import { getApiErrorMessage } from '@/lib/api/axios';
import { createRequisition, getLowStock, type LowStockHit } from '../requisitions.api';

const today = () => new Date().toISOString().slice(0, 10);

interface Row {
  key: string;
  productId: number;
  variationId: number;
  name: string;
  variation: string;
  sku: string;
  unitName: string;
  allowDecimal: boolean;
  currentStock: number | null;
  alertQuantity: number | null;
  quantity: string;
}

export function RequisitionFormPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const { data: meta, isLoading: metaLoading } = useQuery({
    queryKey: ['product-meta'],
    queryFn: getProductMeta,
  });

  const [locationId, setLocationId] = useState('');
  const [refNo, setRefNo] = useState('');
  const [transactionDate, setTransactionDate] = useState(today());
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (meta?.locations.length === 1) setLocationId(String(meta.locations[0].id));
  }, [meta]);

  const addRow = (r: Omit<Row, 'key' | 'quantity'> & { quantity?: string }) => {
    setRows((prev) => {
      if (prev.some((x) => x.variationId === r.variationId)) return prev;
      return [...prev, { ...r, key: `${r.variationId}-${performance.now()}`, quantity: r.quantity ?? '1' }];
    });
  };

  // The low-stock picker — GOURI opens the create screen with it. Adds everything under alert.
  const lowStock = useMutation({
    mutationFn: () => getLowStock({ location_id: locationId ? Number(locationId) : undefined }),
    onSuccess: (hits: LowStockHit[]) => {
      if (hits.length === 0) return toast.info('No products are below their alert quantity');
      let added = 0;
      for (const h of hits) {
        const before = rows.length + added;
        addRow({
          productId: h.productId,
          variationId: h.variationId,
          name: h.name,
          variation: h.variation,
          sku: h.sku,
          unitName: h.unitName,
          allowDecimal: h.allowDecimal,
          currentStock: h.currentStock,
          alertQuantity: h.alertQuantity,
          quantity: String(h.suggestedQuantity || 1),
        });
        if (rows.length + added === before) added++;
      }
      toast.success(`${hits.length} low-stock product(s) added`);
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not load low-stock products')),
  });

  const save = useMutation({
    mutationFn: () =>
      createRequisition({
        location_id: Number(locationId),
        ref_no: refNo.trim() || undefined,
        transaction_date: transactionDate,
        delivery_date: deliveryDate || undefined,
        additional_notes: notes || undefined,
        requisitions: rows.map((r) => ({
          product_id: r.productId,
          variation_id: r.variationId,
          quantity: Number(r.quantity) || 0,
        })),
      }),
    onSuccess: (r) => {
      toast.success(`Requisition ${r.refNo} saved`);
      navigate('/purchase-requisitions');
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not save requisition')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId) return toast.error('Select a business location');
    if (rows.length === 0) return toast.error('Add at least one product');
    if (rows.some((r) => !(Number(r.quantity) > 0))) return toast.error('Every line needs a quantity');
    save.mutate();
  };

  if (metaLoading || !meta) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <PageHeader
        title="Add requisition"
        description="Request a restock for a location. It carries no supplier or price — that comes with the order."
        breadcrumbs={[{ label: 'Purchases', to: '/purchase-requisitions' }, { label: 'Add' }]}
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate('/purchase-requisitions')}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <Card className="p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="location">Business location *</Label>
              <Select id="location" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
                <option value="">Select location</option>
                {meta.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="refNo">Reference no</Label>
              <Input
                id="refNo"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder="Leave empty to auto-generate"
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="required">Required by</Label>
              <Input id="required" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <ProductSearchBox
                locationId={locationId ? Number(locationId) : undefined}
                disabled={!locationId}
                onPick={(hit) =>
                  addRow({
                    productId: hit.productId,
                    variationId: hit.variationId,
                    name: hit.name,
                    variation: hit.variation,
                    sku: hit.sku,
                    unitName: hit.unitName,
                    allowDecimal: hit.allowDecimal,
                    currentStock: hit.currentStock,
                    alertQuantity: null,
                  })
                }
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!locationId || lowStock.isPending}
              onClick={() => lowStock.mutate()}
              title="Add every product under its alert quantity"
            >
              <Sparkles className="h-4 w-4" />
              {lowStock.isPending ? 'Loading…' : 'Add low-stock items'}
            </Button>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              Search above, or pull in everything that is below its alert quantity.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-right">In stock</th>
                    <th className="px-3 py-2 text-right">Alert qty</th>
                    <th className="px-3 py-2 text-right">Required qty</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <td className="px-3 py-2">
                        <div className="font-medium">
                          {r.name}
                          {r.variation ? <span className="text-muted-foreground"> · {r.variation}</span> : ''}
                        </div>
                        <div className="text-xs text-muted-foreground">{r.sku}</div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {r.currentStock ?? '—'} {r.unitName}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {r.alertQuantity ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          min="0"
                          step={r.allowDecimal ? '0.0001' : '1'}
                          value={r.quantity}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) => (x.key === r.key ? { ...x, quantity: e.target.value } : x)),
                            )
                          }
                          className="h-9 w-28 text-right tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          title="Remove"
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Additional notes</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </Card>
      </div>
    </form>
  );
}
