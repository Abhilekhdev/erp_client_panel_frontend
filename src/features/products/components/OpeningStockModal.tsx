import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api/axios';
import { getOpeningStock, saveOpeningStock } from '../stock.api';

interface LotRow {
  key: string;
  locationId: number;
  variationId: number;
  quantity: string;
  purchasePrice: string;
  expDate: string;
  lotNumber: string;
}

/**
 * "Add or edit opening stock" — GOURI's per-location, per-variation, multi-lot form as a modal.
 * The whole product's opening stock is submitted at once; the server replaces what was there.
 */
export function OpeningStockModal({ productId, onClose }: { productId: number | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [rows, setRows] = useState<LotRow[]>([]);
  const [date, setDate] = useState('');

  const { data: form, isLoading } = useQuery({
    queryKey: ['opening-stock', productId],
    queryFn: () => getOpeningStock(productId as number),
    enabled: productId != null,
  });

  // Seed the grid: every (location, variation) gets at least one lot row, pre-filled from existing.
  useEffect(() => {
    if (!form) return;
    setDate(form.settings.defaultDate);
    const seeded: LotRow[] = [];
    for (const loc of form.locations) {
      for (const v of form.variations) {
        const existing = form.existingLots[loc.id]?.[v.variationId] ?? [];
        if (existing.length) {
          existing.forEach((lot, i) =>
            seeded.push({
              key: `${loc.id}-${v.variationId}-${i}`,
              locationId: loc.id,
              variationId: v.variationId,
              quantity: String(lot.quantity),
              purchasePrice: String(lot.purchasePrice),
              expDate: lot.expDate,
              lotNumber: lot.lotNumber,
            }),
          );
        } else {
          seeded.push({
            key: `${loc.id}-${v.variationId}-0`,
            locationId: loc.id,
            variationId: v.variationId,
            quantity: '',
            purchasePrice: String(v.defaultPurchasePrice),
            expDate: '',
            lotNumber: '',
          });
        }
      }
    }
    setRows(seeded);
  }, [form?.product.id]);

  const save = useMutation({
    mutationFn: () =>
      saveOpeningStock(productId as number, {
        transaction_date: date || undefined,
        lots: rows
          .filter((r) => Number(r.quantity) > 0)
          .map((r) => ({
            location_id: r.locationId,
            variation_id: r.variationId,
            quantity: Number(r.quantity),
            purchase_price: Number(r.purchasePrice) || 0,
            exp_date: r.expDate || undefined,
            lot_number: r.lotNumber || undefined,
          })),
      }),
    onSuccess: () => {
      toast.success('Opening stock saved');
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-report'] });
      qc.invalidateQueries({ queryKey: ['opening-stock', productId] });
      onClose();
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not save opening stock')),
  });

  const set = (key: string, patch: Partial<LotRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addLot = (locationId: number, variationId: number) =>
    setRows((prev) => {
      const idx = prev.map((r) => r.locationId === locationId && r.variationId === variationId).lastIndexOf(true);
      const row: LotRow = {
        key: `${locationId}-${variationId}-${performance.now()}`,
        locationId,
        variationId,
        quantity: '',
        purchasePrice: String(form?.variations.find((v) => v.variationId === variationId)?.defaultPurchasePrice ?? 0),
        expDate: '',
        lotNumber: '',
      };
      const next = [...prev];
      next.splice(idx + 1, 0, row);
      return next;
    });

  return (
    <Modal
      open={productId != null}
      onClose={onClose}
      title={form ? `Opening stock — ${form.product.name}` : 'Opening stock'}
      description="Starting quantities the product already had, per location. This posts stock like a purchase."
      className="max-w-4xl"
      footer={
        form && (
          <>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        )
      }
    >
      {isLoading || !form ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : form.locations.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          This product is not assigned to any business location, so it cannot hold opening stock.
        </p>
      ) : (
        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
          <div className="w-48">
            <Label htmlFor="os-date">Stock date</Label>
            <Input id="os-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {form.locations.map((loc) => (
            <div key={loc.id} className="rounded-lg border">
              <div className="border-b bg-muted/40 px-3 py-2 text-sm font-semibold">{loc.name}</div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-right">Quantity</th>
                      <th className="px-3 py-2 text-right">Unit cost</th>
                      {form.settings.enableProductExpiry && <th className="px-3 py-2 text-left">Exp date</th>}
                      {form.settings.enableLotNumber && <th className="px-3 py-2 text-left">Lot no.</th>}
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {form.variations.map((v) => {
                      const lotRows = rows.filter((r) => r.locationId === loc.id && r.variationId === v.variationId);
                      return lotRows.map((r, i) => (
                        <tr key={r.key}>
                          <td className="px-3 py-2">
                            {i === 0 && (
                              <>
                                <div className="font-medium">
                                  {form.product.name}
                                  {v.label ? <span className="text-muted-foreground"> · {v.label}</span> : ''}
                                </div>
                                <div className="text-xs text-muted-foreground">{v.sku}</div>
                              </>
                            )}
                            {i > 0 && <span className="text-xs text-muted-foreground">↳ another lot</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.0001"
                              value={r.quantity}
                              onChange={(e) => set(r.key, { quantity: e.target.value })}
                              className="h-9 w-24 text-right tabular-nums"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.0001"
                              value={r.purchasePrice}
                              onChange={(e) => set(r.key, { purchasePrice: e.target.value })}
                              className="h-9 w-24 text-right tabular-nums"
                            />
                          </td>
                          {form.settings.enableProductExpiry && (
                            <td className="px-3 py-2">
                              <Input
                                type="date"
                                value={r.expDate}
                                onChange={(e) => set(r.key, { expDate: e.target.value })}
                                className="h-9 w-36"
                              />
                            </td>
                          )}
                          {form.settings.enableLotNumber && (
                            <td className="px-3 py-2">
                              <Input
                                value={r.lotNumber}
                                onChange={(e) => set(r.key, { lotNumber: e.target.value })}
                                className="h-9 w-24"
                              />
                            </td>
                          )}
                          <td className="px-3 py-2 text-right">
                            {i === 0 ? (
                              <button
                                type="button"
                                title="Add another lot"
                                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                onClick={() => addLot(loc.id, v.variationId)}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Remove lot"
                                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
