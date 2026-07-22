import { useQuery } from '@tanstack/react-query';
import { Package, Printer, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { store } from '@/app/store';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { getComboVariations, getProduct, getProductMeta } from '@/features/products/products.api';
import { Barcode } from '../Barcode';
import { getDefaultLabelSheet, listLabelSheets, type LabelSheet } from '../labels.api';

interface LabelItem {
  id: number;
  productName: string;
  variationName: string;
  sku: string;
  barcodeType: string;
  /** Both tax variants, so the "price type" toggle needs no refetch. */
  priceIncTax: number;
  priceExcTax: number;
  groupPrices: { priceGroupId: number; priceIncTax: number }[];
  /** '' = the product's own price; otherwise print this group's rate. */
  priceGroupId: number | '';
  lotNumber: string;
  expiryDate: string;
  packingDate: string;
  qty: number;
}

/** Everything that can appear on a sticker, each with its own font size — GOURI's option list. */
interface PrintOptions {
  name: boolean;
  nameSize: number;
  variations: boolean;
  variationsSize: number;
  price: boolean;
  priceSize: number;
  priceType: 'inc' | 'exc';
  businessName: boolean;
  businessNameSize: number;
  packingDate: boolean;
  packingDateSize: number;
  lotNumber: boolean;
  lotNumberSize: number;
  expiryDate: boolean;
  expiryDateSize: number;
  barcode: boolean;
}

const DEFAULT_OPTIONS: PrintOptions = {
  name: true, nameSize: 12,
  variations: true, variationsSize: 10,
  price: true, priceSize: 14,
  priceType: 'inc',
  businessName: false, businessNameSize: 10,
  packingDate: false, packingDateSize: 9,
  lotNumber: false, lotNumberSize: 9,
  expiryDate: false, expiryDateSize: 9,
  barcode: true,
};

// Print only the label sheet (classic hide-everything-else technique — robust regardless of layout).
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #label-sheet, #label-sheet * { visibility: visible !important; }
  #label-sheet { position: absolute; left: 0; top: 0; width: 100%; }
  #label-sheet .sticker { border-color: transparent !important; }
  .no-print { display: none !important; }
  @page { margin: 0; }
}`;

export function LabelsPage() {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<LabelItem[]>([]);
  const [opt, setOpt] = useState<PrintOptions>(DEFAULT_OPTIONS);
  const [sheetId, setSheetId] = useState<number | ''>('');

  const businessName = store.getState().auth.user?.business?.name ?? '';

  const { data: results } = useQuery({
    queryKey: ['label-variations', search],
    queryFn: () => getComboVariations(search),
    enabled: search.trim().length >= 1,
  });
  const { data: meta } = useQuery({ queryKey: ['product-meta'], queryFn: getProductMeta });
  const priceGroups = meta?.priceGroups ?? [];

  // The sticker geometry comes from a saved sheet (Settings → Label Sheets), as in GOURI.
  const { data: sheets } = useQuery({ queryKey: ['label-sheets'], queryFn: listLabelSheets });
  const { data: defaultSheet } = useQuery({ queryKey: ['label-sheet-default'], queryFn: getDefaultLabelSheet });
  useEffect(() => {
    if (sheetId === '' && defaultSheet) setSheetId(defaultSheet.id);
  }, [defaultSheet, sheetId]);
  const sheet: LabelSheet | undefined = sheets?.find((s) => s.id === sheetId) ?? defaultSheet ?? undefined;

  const add = (o: {
    id: number; productName: string; variationName: string; sku: string; barcodeType: string;
    sellPriceIncTax: number; sellPrice: number; groupPrices: { priceGroupId: number; priceIncTax: number }[];
  }) => {
    if (items.some((i) => i.id === o.id)) return;
    setItems((prev) => [
      ...prev,
      {
        id: o.id, productName: o.productName, variationName: o.variationName, sku: o.sku,
        barcodeType: o.barcodeType, priceIncTax: o.sellPriceIncTax, priceExcTax: o.sellPrice,
        groupPrices: o.groupPrices ?? [], priceGroupId: '',
        lotNumber: '', expiryDate: '', packingDate: '', qty: 1,
      },
    ]);
    setSearch('');
  };

  // Arriving from the products list's "Print labels" action (GOURI passes `?product_id=`): preload
  // every variation of that product so the sheet is ready without searching for it again.
  const [searchParams] = useSearchParams();
  const preloadId = searchParams.get('productId') ? Number(searchParams.get('productId')) : undefined;
  const { data: preload } = useQuery({
    queryKey: ['product', preloadId],
    queryFn: () => getProduct(preloadId as number),
    enabled: preloadId != null,
  });
  useEffect(() => {
    if (!preload) return;
    setItems(
      preload.productVariations.flatMap((pv) =>
        pv.variations.map((v) => ({
          id: v.id,
          productName: preload.name,
          variationName: v.name === 'DUMMY' ? '' : v.name,
          sku: v.subSku,
          barcodeType: preload.barcodeType,
          priceIncTax: v.sellPriceIncTax ?? 0,
          priceExcTax: v.defaultSellPrice ?? 0,
          groupPrices: v.groupPrices ?? [],
          priceGroupId: '' as const,
          lotNumber: '', expiryDate: '', packingDate: '', qty: 1,
        })),
      ),
    );
  }, [preload]);

  const patch = (id: number, changes: Partial<LabelItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));
  const remove = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));
  const setOption = <K extends keyof PrintOptions>(k: K, v: PrintOptions[K]) => setOpt((o) => ({ ...o, [k]: v }));

  /** A chosen price group overrides the product's own price (GOURI's per-row selector). */
  const priceOf = (l: LabelItem) => {
    if (l.priceGroupId !== '') {
      const hit = l.groupPrices.find((g) => g.priceGroupId === l.priceGroupId);
      // A group rate is always tax-inclusive; there is no exc-tax variant stored for it.
      if (hit) return hit.priceIncTax;
    }
    return opt.priceType === 'inc' ? l.priceIncTax : l.priceExcTax;
  };

  // Flatten to one entry per printed label.
  const labels = useMemo(() => items.flatMap((i) => Array.from({ length: i.qty }, () => i)), [items]);

  const perRow = sheet?.stickersInOneRow ?? 4;
  // Inches from the sheet definition drive the real sticker size, so a print matches the stock.
  const sheetStyle = sheet?.width
    ? {
        gridTemplateColumns: `repeat(${perRow}, ${sheet.width}in)`,
        columnGap: `${sheet.colDistance ?? 0}in`,
        rowGap: `${sheet.rowDistance ?? 0}in`,
        paddingTop: `${sheet.topMargin ?? 0}in`,
        paddingLeft: `${sheet.leftMargin ?? 0}in`,
      }
    : { gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`, gap: '0.5rem' };
  const stickerStyle = sheet?.width ? { width: `${sheet.width}in`, height: `${sheet.height ?? 1}in` } : undefined;

  return (
    <div>
      <style>{PRINT_CSS}</style>

      <div className="no-print">
        <PageHeader
          title="Print Labels"
          description="Pick products, choose what appears on the sticker, then print onto your label sheet."
          breadcrumbs={[{ label: 'Products' }, { label: 'Print Labels' }]}
          actions={
            <Button size="sm" disabled={labels.length === 0} onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print {labels.length > 0 ? `(${labels.length})` : ''}
            </Button>
          }
        />

        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products by name / SKU…" />
              {search.trim() && (results?.length ?? 0) > 0 && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-input bg-popover shadow-md">
                  {results?.map((o) => (
                    <button key={o.id} type="button" onClick={() => add(o)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent">
                      <span className="truncate">{o.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatMoney(o.sellPriceIncTax)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                Search above to add products to the sheet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Product</th>
                      <th className="w-28 px-3 py-2 text-left font-medium">No. of labels</th>
                      {priceGroups.length > 0 && <th className="w-48 px-3 py-2 text-left font-medium">Price group</th>}
                      {opt.lotNumber && <th className="w-36 px-3 py-2 text-left font-medium">Lot number</th>}
                      {opt.expiryDate && <th className="w-40 px-3 py-2 text-left font-medium">Exp. date</th>}
                      {opt.packingDate && <th className="w-40 px-3 py-2 text-left font-medium">Packing date</th>}
                      <th className="w-12 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((i) => (
                      <tr key={i.id}>
                        <td className="px-3 py-2">
                          <div className="font-medium">
                            {i.productName}
                            {i.variationName ? <span className="text-muted-foreground"> · {i.variationName}</span> : null}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">{i.sku}</div>
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" min="1" className="h-9" value={i.qty} onChange={(e) => patch(i.id, { qty: Math.max(1, Number(e.target.value)) })} />
                        </td>
                        {priceGroups.length > 0 && (
                          <td className="px-3 py-2">
                            <Select
                              className="h-9"
                              value={String(i.priceGroupId)}
                              onChange={(e) => patch(i.id, { priceGroupId: e.target.value ? Number(e.target.value) : '' })}
                            >
                              <option value="">Default price</option>
                              {priceGroups.map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </Select>
                          </td>
                        )}
                        {/* Manual entry: with no purchases yet there is no lot/expiry to inherit. */}
                        {opt.lotNumber && (
                          <td className="px-3 py-2">
                            <Input className="h-9" value={i.lotNumber} onChange={(e) => patch(i.id, { lotNumber: e.target.value })} />
                          </td>
                        )}
                        {opt.expiryDate && (
                          <td className="px-3 py-2">
                            <DateInput value={i.expiryDate} onChange={(v) => patch(i.id, { expiryDate: v })} />
                          </td>
                        )}
                        {opt.packingDate && (
                          <td className="px-3 py-2">
                            <DateInput value={i.packingDate} onChange={(v) => patch(i.id, { packingDate: v })} />
                          </td>
                        )}
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => remove(i.id)} className="text-muted-foreground transition-colors hover:text-destructive" title="Remove">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mb-5 grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Information to show on labels</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* One row per field so a checkbox and its font size can never be read as separate controls. */}
              <div className="divide-y border-t sm:grid sm:grid-cols-2 sm:divide-y-0">
                <FieldToggle label="Product name" checked={opt.name} size={opt.nameSize}
                  onToggle={(v) => setOption('name', v)} onSize={(v) => setOption('nameSize', v)} />
                <FieldToggle label="Variations" checked={opt.variations} size={opt.variationsSize}
                  onToggle={(v) => setOption('variations', v)} onSize={(v) => setOption('variationsSize', v)} />
                <FieldToggle label="Price" checked={opt.price} size={opt.priceSize}
                  onToggle={(v) => setOption('price', v)} onSize={(v) => setOption('priceSize', v)} />
                <FieldToggle label="Business name" checked={opt.businessName} size={opt.businessNameSize}
                  onToggle={(v) => setOption('businessName', v)} onSize={(v) => setOption('businessNameSize', v)} />
                <FieldToggle label="Packing date" checked={opt.packingDate} size={opt.packingDateSize}
                  onToggle={(v) => setOption('packingDate', v)} onSize={(v) => setOption('packingDateSize', v)} />
                <FieldToggle label="Lot number" checked={opt.lotNumber} size={opt.lotNumberSize}
                  onToggle={(v) => setOption('lotNumber', v)} onSize={(v) => setOption('lotNumberSize', v)} />
                <FieldToggle label="Expiry date" checked={opt.expiryDate} size={opt.expiryDateSize}
                  onToggle={(v) => setOption('expiryDate', v)} onSize={(v) => setOption('expiryDateSize', v)} />
                <FieldToggle label="Barcode" checked={opt.barcode} onToggle={(v) => setOption('barcode', v)} />
              </div>
              <div className="flex items-center gap-3 border-t px-4 py-3">
                <Label className="text-sm">Price shown</Label>
                <Select className="h-9 w-44" value={opt.priceType} disabled={!opt.price} onChange={(e) => setOption('priceType', e.target.value as 'inc' | 'exc')}>
                  <option value="inc">Inc. of tax</option>
                  <option value="exc">Exc. of tax</option>
                </Select>
                <span className="text-xs text-muted-foreground">A row set to a price group always prints that group's rate.</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Label sheet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={String(sheetId)} onChange={(e) => setSheetId(e.target.value ? Number(e.target.value) : '')}>
                {(sheets ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.isDefault ? ' (default)' : ''}
                  </option>
                ))}
              </Select>
              {sheet && (
                <dl className="space-y-1.5 rounded-lg bg-muted/40 p-3 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Sticker</dt>
                    <dd className="font-medium">{sheet.width ? `${sheet.width}" × ${sheet.height ?? '?'}"` : '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Per row</dt>
                    <dd className="font-medium">{sheet.stickersInOneRow ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Per sheet</dt>
                    <dd className="font-medium">{sheet.isContinuous ? 'Continuous roll' : (sheet.stickersInOneSheet ?? '—')}</dd>
                  </div>
                </dl>
              )}
              <p className="text-xs text-muted-foreground">Manage sheets in Settings → Label Sheets.</p>
            </CardContent>
          </Card>
        </div>

        {labels.length > 0 && (
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Preview — {labels.length} label{labels.length === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {labels.length === 0 ? (
        <div className="no-print grid place-items-center rounded-xl border border-dashed py-16 text-center">
          <Package className="mb-2 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">Add products above to preview your labels.</p>
        </div>
      ) : (
        <div id="label-sheet" className="grid rounded-xl bg-white p-2 dark:bg-white" style={sheetStyle}>
          {labels.map((l, idx) => (
            <div
              key={idx}
              style={stickerStyle}
              className="sticker flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded border border-dashed border-border p-1 text-center text-black"
            >
              {opt.businessName && businessName && (
                <div style={{ fontSize: `${opt.businessNameSize}px` }} className="max-w-full truncate leading-tight">{businessName}</div>
              )}
              {opt.name && (
                <div style={{ fontSize: `${opt.nameSize}px` }} className="max-w-full truncate font-semibold leading-tight">{l.productName}</div>
              )}
              {opt.variations && l.variationName && (
                <div style={{ fontSize: `${opt.variationsSize}px` }} className="max-w-full truncate leading-tight">{l.variationName}</div>
              )}
              {opt.barcode && l.sku ? <Barcode value={l.sku} type={l.barcodeType} height={30} /> : <div className="font-mono text-xs">{l.sku}</div>}
              {opt.price && (
                // The currency symbol comes from Business Settings — a bare number is not a price.
                <div style={{ fontSize: `${opt.priceSize}px` }} className="font-semibold leading-tight">
                  {formatMoney(priceOf(l))}
                </div>
              )}
              {opt.packingDate && l.packingDate && (
                <div style={{ fontSize: `${opt.packingDateSize}px` }} className="leading-tight">Packed: {l.packingDate}</div>
              )}
              {opt.lotNumber && l.lotNumber && (
                <div style={{ fontSize: `${opt.lotNumberSize}px` }} className="leading-tight">Lot: {l.lotNumber}</div>
              )}
              {opt.expiryDate && l.expiryDate && (
                <div style={{ fontSize: `${opt.expiryDateSize}px` }} className="leading-tight">Exp: {l.expiryDate}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A native date field that opens its picker wherever you click.
 * Chrome only opens on the little calendar icon otherwise, which reads as a broken field.
 */
function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Input
      ref={ref}
      type="date"
      className="h-9"
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      onClick={() => ref.current?.showPicker?.()}
    />
  );
}

/** A show/hide checkbox paired with its own font size, in one visually inseparable row. */
function FieldToggle({
  label,
  checked,
  size,
  onToggle,
  onSize,
}: {
  label: string;
  checked: boolean;
  size?: number;
  onToggle: (v: boolean) => void;
  onSize?: (v: number) => void;
}) {
  // Deliberately NOT a <label> wrapper: clicking the size field inside one would toggle the
  // checkbox. The text is tied to the checkbox with htmlFor instead.
  const id = `label-field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5 transition-colors hover:bg-muted/40">
      <label htmlFor={id} className={cn('flex cursor-pointer items-center gap-2.5 text-sm', !checked && 'text-muted-foreground')}>
        <input
          id={id}
          type="checkbox"
          className="h-4 w-4 cursor-pointer rounded border-input accent-primary"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
        />
        {label}
      </label>
      {onSize && (
        <span className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Size</span>
          <Input
            type="number"
            min={6}
            max={40}
            className="h-8 w-16"
            value={size}
            disabled={!checked}
            onChange={(e) => onSize(Math.min(40, Math.max(6, Number(e.target.value))))}
          />
        </span>
      )}
    </div>
  );
}
