import { useQuery } from '@tanstack/react-query';
import { Package, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { getProduct, getProductMeta, getProductStockDetails } from '../products.api';

const money = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Row({ label, value }: { label: string; value: ReactNode }) {
  const empty = value == null || value === '' || (Array.isArray(value) && value.length === 0);
  return (
    <div className="flex justify-between gap-6 border-b py-2 text-sm last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={empty ? 'text-muted-foreground/60' : 'text-right font-medium'}>{empty ? '—' : value}</span>
    </div>
  );
}

/**
 * Read-only product details — GOURI's `product/view-modal.blade.php`, reachable from the list's
 * "View" action. Per-location stock is the one block we can't fill in yet; it needs the stock
 * ledger that arrives with the transaction core.
 */
export function ProductViewModal({ productId, onClose }: { productId: number | null; onClose: () => void }) {
  const { data: p, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId as number),
    enabled: productId != null,
  });
  const { data: meta } = useQuery({ queryKey: ['product-meta'], queryFn: getProductMeta });
  const { data: stockRows = [] } = useQuery({
    queryKey: ['product-stock-details', productId],
    queryFn: () => getProductStockDetails(productId as number),
    enabled: productId != null,
  });

  const name = (list: { id: number; name: string }[] | undefined, id: number | null) =>
    id == null ? null : (list?.find((x) => x.id === id)?.name ?? null);
  const locationName = (id: number) => meta?.locations.find((l) => l.id === id)?.name ?? `#${id}`;
  const priceGroupName = (id: number) => meta?.priceGroups.find((g) => g.id === id)?.name ?? `#${id}`;
  const rackRows = Object.entries(p?.productRacks ?? {});

  const print = () => {
    if (!p) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
    const priceRows = p.productVariations
      .flatMap((pv) => pv.variations.map((v) => `<tr><td>${esc(v.name === 'DUMMY' ? (pv.name === 'DUMMY' ? '-' : pv.name) : `${pv.name} · ${v.name}`)}</td><td>${esc(v.subSku)}</td><td class="r">${money(v.defaultPurchasePrice)}</td><td class="r">${money(v.dppIncTax)}</td><td class="r">${v.profitPercent}%</td><td class="r">${money(v.defaultSellPrice)}</td><td class="r">${money(v.sellPriceIncTax)}</td></tr>`))
      .join('');
    const stockRowsHtml = stockRows
      .map((r) => `<tr><td>${esc(r.sku)}</td><td>${esc(r.product)}${r.variation ? ` (${esc(r.variation)})` : ''}</td><td>${esc(r.location)}</td><td class="r">${money(r.unitPrice)}</td><td class="r">${r.currentStock} ${esc(r.unit)}</td><td class="r">${money(r.stockValue)}</td><td class="r">${r.totalSold}</td><td class="r">${r.totalTransferred}</td><td class="r">${r.totalAdjusted}</td></tr>`)
      .join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(p.name)}</title><style>
      body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:16px}
      h2{margin:0 0 8px}h3{margin:16px 0 6px;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:4px}
      th,td{border:1px solid #ddd;padding:4px 6px;text-align:left}th{background:#f3f4f6}
      .r{text-align:right}
    </style></head><body>
      <h2>${esc(p.name)}</h2>
      <div>SKU: <b>${esc(p.sku)}</b></div>
      <h3>Pricing</h3>
      <table><thead><tr><th>Variation</th><th>SKU</th><th class="r">Purchase (exc)</th><th class="r">Purchase (inc)</th><th class="r">Margin</th><th class="r">Sale (exc)</th><th class="r">Sale (inc)</th></tr></thead><tbody>${priceRows}</tbody></table>
      <h3>Product Stock Details</h3>
      <table><thead><tr><th>SKU</th><th>Product</th><th>Location</th><th class="r">Unit price</th><th class="r">Current stock</th><th class="r">Stock value</th><th class="r">Sold</th><th class="r">Transferred</th><th class="r">Adjusted</th></tr></thead><tbody>${stockRowsHtml || '<tr><td colspan="9">No stock</td></tr>'}</tbody></table>
      <script>window.onload=function(){window.print();}</script>
    </body></html>`);
    w.document.close();
  };

  return (
    <Modal
      open={productId != null}
      onClose={onClose}
      title={p?.name ?? 'Product'}
      className="max-w-4xl"
      footer={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button type="button" size="sm" disabled={!p} onClick={print}><Printer className="h-4 w-4" />Print</Button>
        </>
      }
    >
      {isLoading || !p ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            {p.image ? (
              <img src={`/uploads/${p.image}`} alt={p.name} className="h-24 w-24 rounded-lg border object-cover" />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-lg border border-dashed text-muted-foreground">
                <Package className="h-7 w-7" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                {p.isInactive && <Badge variant="secondary">Inactive</Badge>}
                {p.notForSelling && <Badge variant="warning">Not for selling</Badge>}
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{p.sku}</p>
            </div>
          </div>

          <div className="grid gap-x-8 sm:grid-cols-2">
            <div>
              <Row label="Type" value={p.type} />
              <Row label="Unit" value={name(meta?.units, p.unitId)} />
              <Row label="Secondary unit" value={name(meta?.units, p.secondaryUnitId)} />
              <Row label="Brand" value={name(meta?.brands, p.brandId)} />
              <Row label="Category" value={name(meta?.categories, p.categoryId)} />
              <Row label="Sub-category" value={name(meta?.categories, p.subCategoryId)} />
              <Row label="Barcode type" value={p.barcodeType} />
            </div>
            <div>
              <Row label="Manage stock" value={p.enableStock ? 'Yes' : 'No'} />
              <Row label="Alert quantity" value={p.enableStock ? p.alertQuantity : null} />
              <Row label="Tax" value={name(meta?.taxRates, p.tax)} />
              <Row label="Selling price tax" value={p.taxType} />
              <Row label="Warranty" value={name(meta?.warranties, p.warrantyId)} />
              <Row
                label="Expires in"
                value={p.expiryPeriod != null && p.expiryPeriodType ? `${p.expiryPeriod} ${p.expiryPeriodType}` : null}
              />
              <Row label="Weight" value={p.weight} />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Available at</p>
            <p className="text-sm">
              {p.productLocations.length ? p.productLocations.map(locationName).join(', ') : 'Not assigned to any location'}
            </p>
          </div>

          {/* Prices per variation — a single product shows one "DUMMY" row, which we label plainly. */}
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pricing</p>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <THead>
                  <TR>
                    <TH>Variation</TH>
                    <TH>SKU</TH>
                    <TH className="text-right">Purchase (exc.)</TH>
                    <TH className="text-right">Purchase (inc.)</TH>
                    <TH className="text-right">Margin %</TH>
                    <TH className="text-right">Sale (exc.)</TH>
                    <TH className="text-right">Sale (inc.)</TH>
                    <TH>Group prices</TH>
                  </TR>
                </THead>
                <TBody>
                  {p.productVariations.flatMap((pv) =>
                    pv.variations.map((v) => (
                      <TR key={v.id}>
                        <TD>{v.name === 'DUMMY' ? (pv.name === 'DUMMY' ? '—' : pv.name) : `${pv.name} · ${v.name}`}</TD>
                        <TD className="font-mono text-xs">{v.subSku}</TD>
                        <TD className="text-right">{money(v.defaultPurchasePrice)}</TD>
                        <TD className="text-right">{money(v.dppIncTax)}</TD>
                        <TD className="text-right">{v.profitPercent}%</TD>
                        <TD className="text-right">{money(v.defaultSellPrice)}</TD>
                        <TD className="text-right">{money(v.sellPriceIncTax)}</TD>
                        <TD className="text-xs">
                          {v.groupPrices.length === 0 ? (
                            <span className="text-muted-foreground/60">—</span>
                          ) : (
                            <div className="space-y-0.5">
                              {v.groupPrices.map((g) => (
                                <div key={g.priceGroupId} className="whitespace-nowrap">
                                  {priceGroupName(g.priceGroupId)}: <span className="font-medium">{money(g.priceIncTax)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </TD>
                      </TR>
                    )),
                  )}
                </TBody>
              </Table>
            </div>
          </div>

          {rackRows.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Rack details</p>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <THead>
                    <TR>
                      <TH>Location</TH>
                      <TH>Rack</TH>
                      <TH>Row</TH>
                      <TH>Position</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {rackRows.map(([locId, r]) => (
                      <TR key={locId}>
                        <TD>{locationName(Number(locId))}</TD>
                        <TD>{r.rack || '—'}</TD>
                        <TD>{r.row || '—'}</TD>
                        <TD>{r.position || '—'}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </div>
          )}

          {/* Product Stock Details — per-location current stock, cost value, and units moved. */}
          {p.enableStock && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Product stock details</p>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <THead>
                    <TR>
                      <TH>SKU</TH>
                      <TH>Location</TH>
                      <TH className="text-right">Unit price</TH>
                      <TH className="text-right">Current stock</TH>
                      <TH className="text-right">Stock value</TH>
                      <TH className="text-right">Sold</TH>
                      <TH className="text-right">Transferred</TH>
                      <TH className="text-right">Adjusted</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {stockRows.length === 0 ? (
                      <TR><TD colSpan={8} className="py-6 text-center text-muted-foreground">No stock at any location yet.</TD></TR>
                    ) : (
                      stockRows.map((r, i) => (
                        <TR key={`${r.variationId}-${r.locationId}-${i}`}>
                          <TD className="font-mono text-xs">{r.sku}</TD>
                          <TD>{r.location}</TD>
                          <TD className="text-right">{money(r.unitPrice)}</TD>
                          <TD className="text-right">{r.currentStock} {r.unit}</TD>
                          <TD className="text-right">{money(r.stockValue)}</TD>
                          <TD className="text-right">{r.totalSold} {r.unit}</TD>
                          <TD className="text-right">{r.totalTransferred} {r.unit}</TD>
                          <TD className="text-right">{r.totalAdjusted} {r.unit}</TD>
                        </TR>
                      ))
                    )}
                  </TBody>
                </Table>
              </div>
            </div>
          )}

          {p.productDescription && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap text-sm">{p.productDescription}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
