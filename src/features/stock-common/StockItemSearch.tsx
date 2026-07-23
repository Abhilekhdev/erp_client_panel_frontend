import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export interface StockItem {
  productId: number;
  variationId: number;
  productVariationId: number;
  productName: string;
  variationName: string | null;
  subSku: string | null;
  enableStock: boolean;
  currentStock: number;
  unitPrice: number;
}

/** Type-ahead product picker used by the stock adjustment / transfer forms. */
export function StockItemSearch({
  locationId,
  fetcher,
  onPick,
  disabled,
}: {
  locationId: number | null;
  fetcher: (locationId: number, search: string) => Promise<StockItem[]>;
  onPick: (item: StockItem) => void;
  disabled?: boolean;
}) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['stock-item-search', locationId, term],
    queryFn: () => fetcher(locationId as number, term),
    enabled: !disabled && locationId != null && open,
  });

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-9"
        placeholder={locationId ? 'Search products by name or SKU…' : 'Select a location first'}
        value={term}
        disabled={disabled || locationId == null}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (data ?? []).length > 0 && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover shadow-lg">
          {(data ?? []).map((it) => (
            <button
              key={it.variationId}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(it);
                setTerm('');
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span>
                <span className="font-medium">{it.productName}</span>
                {it.variationName && <span className="text-muted-foreground"> · {it.variationName}</span>}
                {it.subSku && <span className="ml-1 text-xs text-muted-foreground">({it.subSku})</span>}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">Stock: {it.currentStock}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
