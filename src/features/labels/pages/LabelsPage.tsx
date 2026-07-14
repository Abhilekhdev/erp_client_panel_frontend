import { useQuery } from '@tanstack/react-query';
import { Printer, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getComboVariations } from '@/features/products/products.api';
import { Barcode } from '../Barcode';

interface LabelItem {
  id: number;
  productName: string;
  variationName: string;
  sku: string;
  barcodeType: string;
  price: number;
  qty: number;
}

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Print only the label sheet (classic hide-everything-else technique — robust regardless of layout).
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #label-sheet, #label-sheet * { visibility: visible !important; }
  #label-sheet { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
}`;

export function LabelsPage() {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<LabelItem[]>([]);
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [perRow, setPerRow] = useState(4);

  const { data: results } = useQuery({
    queryKey: ['label-variations', search],
    queryFn: () => getComboVariations(search),
    enabled: search.trim().length >= 1,
  });

  const add = (o: { id: number; productName: string; variationName: string; sku: string; barcodeType: string; sellPriceIncTax: number }) => {
    if (items.some((i) => i.id === o.id)) return;
    setItems((prev) => [
      ...prev,
      { id: o.id, productName: o.productName, variationName: o.variationName, sku: o.sku, barcodeType: o.barcodeType, price: o.sellPriceIncTax, qty: 1 },
    ]);
    setSearch('');
  };
  const setQty = (id: number, qty: number) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)));
  const remove = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));

  // Flatten to one entry per printed label.
  const labels = items.flatMap((i) => Array.from({ length: i.qty }, () => i));
  const gridCols = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5' }[perRow] ?? 'grid-cols-4';

  return (
    <div>
      <style>{PRINT_CSS}</style>
      <div className="no-print">
        <PageHeader
          title="Print Labels"
          description="Generate printable barcode labels for your products."
          breadcrumbs={[{ label: 'Products' }, { label: 'Print Labels' }]}
          actions={
            <Button size="sm" onClick={() => window.print()} disabled={labels.length === 0}>
              <Printer className="h-4 w-4" />
              Print ({labels.length})
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
                      <span className="text-xs text-muted-foreground">{money(o.sellPriceIncTax)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 rounded-md border border-border p-2.5 text-sm">
                    <span className="flex-1 font-medium">
                      {i.productName}
                      {i.variationName ? ` · ${i.variationName}` : ''} <span className="font-mono text-xs text-muted-foreground">{i.sku}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs">Labels</Label>
                      <Input type="number" min="1" className="h-8 w-20" value={i.qty} onChange={(e) => setQty(i.id, Number(e.target.value))} />
                    </div>
                    <button type="button" onClick={() => remove(i.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-5 border-t border-border pt-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={showName} onChange={(e) => setShowName(e.target.checked)} />
                Product name
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
                Price
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={showBarcode} onChange={(e) => setShowBarcode(e.target.checked)} />
                Barcode
              </label>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Labels per row</Label>
                <Input type="number" min="2" max="5" className="h-8 w-16" value={perRow} onChange={(e) => setPerRow(Math.min(5, Math.max(2, Number(e.target.value))))} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {labels.length === 0 ? (
        <div className="no-print rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Add products above to preview labels.
        </div>
      ) : (
        <div id="label-sheet" className={`grid gap-2 ${gridCols}`}>
          {labels.map((l, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center gap-1 rounded border border-border p-2 text-center">
              {showName && <div className="truncate text-[11px] font-semibold leading-tight">{l.productName}</div>}
              {showBarcode && l.sku ? <Barcode value={l.sku} type={l.barcodeType} height={34} /> : <div className="font-mono text-xs">{l.sku}</div>}
              {showPrice && <div className="text-[11px] font-medium">{money(l.price)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
