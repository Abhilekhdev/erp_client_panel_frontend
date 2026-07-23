import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/currency';
import { searchSellProducts, type SellProductHit } from '../sells.api';

const NO_HITS: SellProductHit[] = [];

/** The sell line-adder — same behaviour as the purchase picker, but shows the sell price. */
export function SellProductSearchBox({
  locationId,
  priceGroupId,
  disabled,
  onPick,
}: {
  locationId?: number;
  priceGroupId?: number;
  disabled?: boolean;
  onPick: (hit: SellProductHit) => void;
}) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(t);
  }, [term]);
  useEffect(() => {
    const onAway = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onAway);
    return () => document.removeEventListener('mousedown', onAway);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ['sell-products', debounced, locationId, priceGroupId],
    queryFn: () => searchSellProducts({ search: debounced, location_id: locationId, price_group_id: priceGroupId }),
    enabled: debounced.length >= 2 && !disabled,
  });
  const hits = data ?? NO_HITS;
  useEffect(() => setActive(0), [hits]);

  const pick = (h: SellProductHit) => {
    onPick(h);
    setTerm('');
    setDebounced('');
    setOpen(false);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (!open || hits.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(hits[active]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          disabled={disabled}
          placeholder={disabled ? 'Select a business location first' : 'Enter product name / SKU / scan barcode'}
          className="pl-9"
          onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
        />
      </div>
      {open && debounced.length >= 2 && !disabled && (
        <div className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border bg-card shadow-lg">
          {isFetching && hits.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>}
          {!isFetching && hits.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No products match “{debounced}”.</div>}
          {hits.map((h, i) => (
            <button
              key={h.variationId}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(h)}
              className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm ${i === active ? 'bg-muted' : ''}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{h.name}{h.variation ? ` · ${h.variation}` : ''}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {h.sku}
                  {h.enableStock && h.currentStock != null ? ` · In stock: ${h.currentStock} ${h.unitName}` : ' · Stock not tracked'}
                </span>
              </span>
              <span className="whitespace-nowrap text-xs text-muted-foreground">{formatMoney(h.sellPriceIncTax)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
