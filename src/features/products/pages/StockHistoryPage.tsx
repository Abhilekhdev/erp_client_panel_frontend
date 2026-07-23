import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { getStockHistory, getStockHistoryMeta } from '../stock.api';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });

/**
 * Product stock history — read-only. The in/out boxes and the movement ledger for one variation at
 * one location. GOURI mutates inventory from this GET; this one only reads.
 */
export function StockHistoryPage() {
  const { id } = useParams();
  const productId = Number(id);
  const [params] = useSearchParams();

  const [locationId, setLocationId] = useState('');
  const [variationId, setVariationId] = useState('');

  const { data: meta, isLoading: metaLoading } = useQuery({
    queryKey: ['stock-history-meta', productId],
    queryFn: () => getStockHistoryMeta(productId),
  });

  // Deep-link support: the Stock Report row links here pre-selecting a location + variation.
  useEffect(() => {
    if (!meta) return;
    const qLoc = params.get('location_id');
    const qVar = params.get('variation_id');
    setLocationId(qLoc || String(meta.locations[0]?.id ?? ''));
    setVariationId(qVar || String(meta.variations[0]?.variationId ?? ''));
  }, [meta]);

  const { data, isLoading } = useQuery({
    queryKey: ['stock-history', productId, variationId, locationId],
    queryFn: () => getStockHistory(productId, Number(variationId), Number(locationId)),
    enabled: Boolean(variationId) && Boolean(locationId),
  });

  const unit = meta?.product.unitName ?? '';
  const s = data?.summary;

  return (
    <div>
      <PageHeader
        title="Stock history"
        description={meta ? meta.product.name : undefined}
        breadcrumbs={[{ label: 'Products', to: '/products' }, { label: 'Stock history' }]}
      />

      {metaLoading || !meta ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="flex flex-wrap gap-4 p-4">
            <div className="w-56">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Location</label>
              <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                {meta.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
            {meta.product.type === 'variable' && meta.variations.length > 1 && (
              <div className="w-56">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Variation</label>
                <Select value={variationId} onChange={(e) => setVariationId(e.target.value)}>
                  {meta.variations.map((v) => (
                    <option key={v.variationId} value={v.variationId}>
                      {v.label || v.sku}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </Card>

          {isLoading || !s ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <Box
                  title="Quantities in"
                  icon={<ArrowDownLeft className="h-4 w-4 text-emerald-500" />}
                  rows={[
                    ['Opening stock', s.openingStock, unit],
                    ['Total purchase', s.totalPurchase, unit],
                    ['Stock transfers (in)', s.totalStockTransferIn, unit],
                    ['Total sell return', s.totalSellReturn, unit],
                  ]}
                />
                <Box
                  title="Quantities out"
                  icon={<ArrowUpRight className="h-4 w-4 text-rose-500" />}
                  rows={[
                    ['Total sold', s.totalSold, unit],
                    ['Total stock adjustment', s.totalStockAdjustment, unit],
                    ['Total purchase return', s.totalPurchaseReturn, unit],
                    ['Stock transfers (out)', s.totalStockTransferOut, unit],
                  ]}
                />
                <div className="rounded-lg border bg-primary/5 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Current stock
                  </div>
                  <div className="mt-2 text-3xl font-semibold tabular-nums">
                    {s.currentStock}
                    <span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>
                  </div>
                </div>
              </div>

              <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Type</th>
                        <th className="px-4 py-2.5 text-right">Quantity change</th>
                        <th className="px-4 py-2.5 text-right">New quantity</th>
                        <th className="px-4 py-2.5 text-left">Date</th>
                        <th className="px-4 py-2.5 text-left">Reference</th>
                        <th className="px-4 py-2.5 text-left">Supplier / customer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.rows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                            No stock movements at this location yet.
                          </td>
                        </tr>
                      ) : (
                        data.rows.map((r, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2.5 font-medium">{r.label}</td>
                            <td
                              className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                                r.quantityChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                              }`}
                            >
                              {r.quantityChange >= 0 ? '+' : ''}
                              {r.quantityChange} {unit}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {r.newQuantity} {unit}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(r.date)}</td>
                            <td className="px-4 py-2.5 font-mono text-xs">{r.refNo || '—'}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{r.contact || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Box({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  rows: [string, number | null, string][];
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <div className="space-y-1.5 text-sm">
        {rows.map(([label, value, unit]) => (
          <div key={label} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span className="tabular-nums">
              {value == null ? <span className="text-muted-foreground">—</span> : `${value} ${unit}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
