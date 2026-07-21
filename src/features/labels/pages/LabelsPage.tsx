import { useQuery } from '@tanstack/react-query';
import { Printer, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { store } from '@/app/store';
import { formatMoney } from '@/lib/currency';
import { getComboVariations, getProduct } from '@/features/products/products.api';
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

  // The sticker geometry comes from a saved sheet (Settings → Label Sheets), as in GOURI.
  const { data: sheets } = useQuery({ queryKey: ['label-sheets'], queryFn: listLabelSheets });
  const { data: defaultSheet } = useQuery({ queryKey: ['label-sheet-default'], queryFn: getDefaultLabelSheet });
  useEffect(() => {
    if (sheetId === '' && defaultSheet) setSheetId(defaultSheet.id);
  }, [defaultSheet, sheetId]);
  const sheet: LabelSheet | undefined = sheets?.find((s) => s.id === sheetId) ?? defaultSheet ?? undefined;

  const add = (o: {
    id: number; productName: string; variationName: string; sku: string; barcodeType: string;
    sellPriceIncTax: number; sellPrice: number;
  }) => {
    if (items.some((i) => i.id === o.id)) return;
    setItems((prev) => [
      ...prev,
      {
        id: o.id, productName: o.productName, variationName: o.variationName, sku: o.sku,
        barcodeType: o.barcodeType, priceIncTax: o.sellPriceIncTax, priceExcTax: o.sellPrice,
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
          lotNumber: '', expiryDate: '', packingDate: '', qty: 1,
        })),
      ),
    );
  }, [preload]);

  const patch = (id: number, changes: Partial<LabelItem>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));
  const remove = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));
  const setOption = <K extends keyof PrintOptions>(k: K, v: PrintOptions[K]) => setOpt((o) => ({ ...o, [k]: v }));

  // Flatten to one entry per printed label.
  const labels = useMemo(() => items.flatMap((i) => Array.from({ length: i.qty }, () => i)), [items]);

  const perRow = sheet?.stickersInOneRow ?? 4;
  // Inches from the sheet definition drive the real sticker size, so a print matches the stock.
  const sheetStyle = sheet
    ? {
        gridTemplateColumns: `repeat(${perRow}, ${sheet.width ?? 2}in)`,
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
          breadcrumbs={[{ label: 'Products' }, { label: 'Print Labels' }]}
          actions={
            <Button size="sm" disabled={labels.length === 0} onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          }
        />

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products by name / SKU…" />
              {search.trim() && (results?.length ?? 0) > 0 && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-input bg-popover shadow-md">
                  {results?.map((o) => (
                    <button key={o.id} type="button" onClick={() => add(o)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent">
                      <span>{o.label}</span>
                      <span className="text-xs text-muted-foreground">{formatMoney(o.sellPriceIncTax)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((i) => (
                  <div key={i.id} className="flex flex-wrap items-end gap-3 rounded-md border border-border p-2.5 text-sm">
                    <span className="min-w-[12rem] flex-1 font-medium">
                      {i.productName}
                      {i.variationName ? ` · ${i.variationName}` : ''}{' '}
                      <span className="font-mono text-xs text-muted-foreground">{i.sku}</span>
                    </span>
                    <div className="space-y-1">
                      <Label className="text-xs">No. of labels</Label>
                      <Input type="number" min="1" className="h-8 w-20" value={i.qty} onChange={(e) => patch(i.id, { qty: Math.max(1, Number(e.target.value)) })} />
                    </div>
                    {/* Manual entry: with no purchases yet there is no lot/expiry to inherit. */}
                    {opt.lotNumber && (
                      <div className="space-y-1">
                        <Label className="text-xs">Lot number</Label>
                        <Input className="h-8 w-28" value={i.lotNumber} onChange={(e) => patch(i.id, { lotNumber: e.target.value })} />
                      </div>
                    )}
                    {opt.expiryDate && (
                      <div className="space-y-1">
                        <Label className="text-xs">Exp. date</Label>
                        <Input type="date" className="h-8 w-36" value={i.expiryDate} onChange={(e) => patch(i.id, { expiryDate: e.target.value })} />
                      </div>
                    )}
                    {opt.packingDate && (
                      <div className="space-y-1">
                        <Label className="text-xs">Packing date</Label>
                        <Input type="date" className="h-8 w-36" value={i.packingDate} onChange={(e) => patch(i.id, { packingDate: e.target.value })} />
                      </div>
                    )}
                    <button type="button" onClick={() => remove(i.id)} className="pb-2 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mb-4 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Information to show on labels</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <FieldToggle label="Product name" checked={opt.name} size={opt.nameSize}
                onToggle={(v) => setOption('name', v)} onSize={(v) => setOption('nameSize', v)} />
              <FieldToggle label="Variations" checked={opt.variations} size={opt.variationsSize}
                onToggle={(v) => setOption('variations', v)} onSize={(v) => setOption('variationsSize', v)} />
              <FieldToggle label="Price" checked={opt.price} size={opt.priceSize}
                onToggle={(v) => setOption('price', v)} onSize={(v) => setOption('priceSize', v)} />
              <div className="space-y-1">
                <Label className="text-xs">Price type</Label>
                <Select className="h-9" value={opt.priceType} disabled={!opt.price} onChange={(e) => setOption('priceType', e.target.value as 'inc' | 'exc')}>
                  <option value="inc">Inc. of tax</option>
                  <option value="exc">Exc. of tax</option>
                </Select>
              </div>
              <FieldToggle label="Business name" checked={opt.businessName} size={opt.businessNameSize}
                onToggle={(v) => setOption('businessName', v)} onSize={(v) => setOption('businessNameSize', v)} />
              <FieldToggle label="Packing date" checked={opt.packingDate} size={opt.packingDateSize}
                onToggle={(v) => setOption('packingDate', v)} onSize={(v) => setOption('packingDateSize', v)} />
              <FieldToggle label="Lot number" checked={opt.lotNumber} size={opt.lotNumberSize}
                onToggle={(v) => setOption('lotNumber', v)} onSize={(v) => setOption('lotNumberSize', v)} />
              <FieldToggle label="Expiry date" checked={opt.expiryDate} size={opt.expiryDateSize}
                onToggle={(v) => setOption('expiryDate', v)} onSize={(v) => setOption('expiryDateSize', v)} />
              <label className="flex items-center gap-2 pt-5 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={opt.barcode} onChange={(e) => setOption('barcode', e.target.checked)} />
                Barcode
              </label>
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
                <p className="text-xs text-muted-foreground">
                  {sheet.description || '—'}
                  <br />
                  {sheet.isContinuous
                    ? `Continuous roll · ${sheet.stickersInOneRow ?? 1} per row`
                    : `${sheet.stickersInOneRow ?? '?'} per row · ${sheet.stickersInOneSheet ?? '?'} per sheet`}
                  {sheet.width ? ` · ${sheet.width}" × ${sheet.height ?? '?'}"` : ''}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Manage sheets in Settings → Label Sheets.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {labels.length === 0 ? (
        <div className="no-print rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Add products above to preview labels.
        </div>
      ) : (
        <div id="label-sheet" className="grid" style={sheetStyle}>
          {labels.map((l, idx) => (
            <div
              key={idx}
              style={stickerStyle}
              className="flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded border border-border p-1 text-center"
            >
              {opt.businessName && businessName && (
                <div style={{ fontSize: `${opt.businessNameSize}px` }} className="truncate leading-tight">{businessName}</div>
              )}
              {opt.name && (
                <div style={{ fontSize: `${opt.nameSize}px` }} className="truncate font-semibold leading-tight">{l.productName}</div>
              )}
              {opt.variations && l.variationName && (
                <div style={{ fontSize: `${opt.variationsSize}px` }} className="truncate leading-tight">{l.variationName}</div>
              )}
              {opt.barcode && l.sku ? <Barcode value={l.sku} type={l.barcodeType} height={30} /> : <div className="font-mono text-xs">{l.sku}</div>}
              {opt.price && (
                // The currency symbol comes from Business Settings — a bare number is not a price.
                <div style={{ fontSize: `${opt.priceSize}px` }} className="font-medium leading-tight">
                  {formatMoney(opt.priceType === 'inc' ? l.priceIncTax : l.priceExcTax)}
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

/** A show/hide checkbox paired with its own font size, the way GOURI lays the options out. */
function FieldToggle({
  label,
  checked,
  size,
  onToggle,
  onSize,
}: {
  label: string;
  checked: boolean;
  size: number;
  onToggle: (v: boolean) => void;
  onSize: (v: number) => void;
}) {
  return (
    <div className="flex items-end gap-3">
      <label className="flex flex-1 items-center gap-2 pb-2 text-sm">
        <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={checked} onChange={(e) => onToggle(e.target.checked)} />
        {label}
      </label>
      <div className="space-y-1">
        <Label className="text-xs">Size</Label>
        <Input
          type="number"
          min={6}
          max={40}
          className="h-9 w-20"
          value={size}
          disabled={!checked}
          onChange={(e) => onSize(Math.min(40, Math.max(6, Number(e.target.value))))}
        />
      </div>
    </div>
  );
}
