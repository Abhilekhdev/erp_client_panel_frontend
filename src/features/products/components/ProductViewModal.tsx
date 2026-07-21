import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { getProduct, getProductMeta } from '../products.api';

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

  const name = (list: { id: number; name: string }[] | undefined, id: number | null) =>
    id == null ? null : (list?.find((x) => x.id === id)?.name ?? null);
  const locationName = (id: number) => meta?.locations.find((l) => l.id === id)?.name ?? `#${id}`;
  const rackRows = Object.entries(p?.productRacks ?? {});

  return (
    <Modal
      open={productId != null}
      onClose={onClose}
      title={p?.name ?? 'Product'}
      className="max-w-3xl max-h-[85vh] overflow-y-auto"
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
                    <TH className="text-right">Purchase</TH>
                    <TH className="text-right">Sell (exc. tax)</TH>
                    <TH className="text-right">Sell (inc. tax)</TH>
                  </TR>
                </THead>
                <TBody>
                  {p.productVariations.flatMap((pv) =>
                    pv.variations.map((v) => (
                      <TR key={v.id}>
                        <TD>{v.name === 'DUMMY' ? (pv.name === 'DUMMY' ? '—' : pv.name) : `${pv.name} · ${v.name}`}</TD>
                        <TD className="font-mono text-xs">{v.subSku}</TD>
                        <TD className="text-right">{money(v.defaultPurchasePrice)}</TD>
                        <TD className="text-right">{money(v.defaultSellPrice)}</TD>
                        <TD className="text-right">{money(v.sellPriceIncTax)}</TD>
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
