import { useInfiniteQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { useMemo } from 'react';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { fileUrl } from '@/lib/fileUrl';
import { formatMoney } from '@/lib/currency';
import { posGridProducts, type SellMeta, type SellProductHit } from '../sells.api';

/**
 * GOURI's POS product suggestion grid (`#product_list_box`). A scrollable wall of product cards —
 * image, name, code, price — filtered by category and brand, paged by infinite scroll. Clicking a
 * card drops that variation straight into the cart. Bound to the selected location's stock.
 */
export function PosProductGrid({
  meta,
  locationId,
  priceGroupId,
  category,
  brand,
  onCategory,
  onBrand,
  onPick,
}: {
  meta: SellMeta;
  locationId?: number;
  priceGroupId?: number;
  category: string;
  brand: string;
  onCategory: (v: string) => void;
  onBrand: (v: string) => void;
  onPick: (hit: SellProductHit) => void;
}) {
  const query = useInfiniteQuery({
    queryKey: ['pos-grid', locationId, category, brand, priceGroupId],
    initialPageParam: 1,
    enabled: Boolean(locationId),
    queryFn: ({ pageParam }) =>
      posGridProducts({
        location_id: locationId,
        category_id: category || undefined,
        brand_id: brand || undefined,
        price_group_id: priceGroupId,
        page: pageParam,
      }),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });

  const products = useMemo(() => query.data?.pages.flatMap((p) => p.data) ?? [], [query.data]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 240 && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b p-3">
        <Select value={category} onChange={(e) => onCategory(e.target.value)} className="flex-1">
          <option value="">All categories</option>
          {meta.categories.map((c) => (
            <optgroup key={c.id} label={c.name}>
              <option value={c.id}>{c.name} (all)</option>
              {c.subCategories.map((s) => <option key={s.id} value={s.id}>&nbsp;&nbsp;{s.name}</option>)}
            </optgroup>
          ))}
        </Select>
        <Select value={brand} onChange={(e) => onBrand(e.target.value)} className="flex-1">
          <option value="">All brands</option>
          {meta.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto p-3" onScroll={onScroll}>
        {!locationId ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Select a location to see products.</p>
        ) : query.isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : products.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No products to display.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => {
              const img = fileUrl(p.image);
              const outOfStock = p.enableStock && p.currentStock != null && p.currentStock <= 0;
              return (
                <button
                  key={p.variationId}
                  type="button"
                  onClick={() => onPick(p)}
                  title={`${p.name}${p.variation ? ` - ${p.variation}` : ''} (${p.sku})`}
                  className="group relative flex flex-col overflow-hidden rounded-lg border bg-card text-left transition hover:border-primary hover:shadow-sm"
                >
                  {outOfStock && (
                    <span className="absolute right-1 top-1 z-10 rounded bg-destructive/90 px-1 py-0.5 text-[9px] font-medium text-white">Out of stock</span>
                  )}
                  <div className="flex h-20 items-center justify-center bg-muted/40">
                    {img ? (
                      <img src={img} alt="" className="h-full w-full object-contain" loading="lazy" />
                    ) : (
                      <Package className="h-7 w-7 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 p-2">
                    <span className="line-clamp-2 text-xs font-medium leading-tight">{p.name}{p.variation ? ` - ${p.variation}` : ''}</span>
                    <span className="text-[11px] text-muted-foreground">{p.sku}{p.enableStock && p.currentStock != null ? ` · ${p.currentStock} ${p.unitName}` : ''}</span>
                    <span className="mt-auto text-xs font-semibold tabular-nums">{formatMoney(p.sellPriceIncTax || p.defaultSellPrice)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {query.isFetchingNextPage && <div className="flex justify-center py-4"><Spinner /></div>}
      </div>
    </div>
  );
}
