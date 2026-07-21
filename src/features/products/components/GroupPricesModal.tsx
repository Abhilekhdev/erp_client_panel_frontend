import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api/axios';
import { currencyInfo } from '@/lib/currency';
import { getProduct, getProductMeta, updateProduct, type SaveProductBody } from '../products.api';

/** priceGroupId -> price, per variation id. */
type Grid = Record<number, Record<number, string>>;

/**
 * "Add or edit Group Prices" from the products list — GOURI's `/products/add-selling-prices/{id}`
 * screen as a modal: one row per variation, one column per active selling price group.
 *
 * The product form already edits these inline; this exists so the price list can be corrected
 * without walking through the whole product form, which is the point of GOURI's separate screen.
 */
export function GroupPricesModal({ productId, onClose }: { productId: number | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [grid, setGrid] = useState<Grid>({});
  const [error, setError] = useState('');
  const { symbol } = currencyInfo();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId as number),
    enabled: productId != null,
  });
  const { data: meta } = useQuery({ queryKey: ['product-meta'], queryFn: getProductMeta });

  useEffect(() => {
    if (!product) return;
    const next: Grid = {};
    for (const pv of product.productVariations) {
      for (const v of pv.variations) {
        next[v.id] = Object.fromEntries(v.groupPrices.map((g) => [g.priceGroupId, String(g.priceIncTax)]));
      }
    }
    setGrid(next);
  }, [product]);

  const save = useMutation({
    mutationFn: () => {
      const p = product!;
      const line = (v: { id: number; defaultPurchasePrice: number | null; dppIncTax: number; profitPercent: number; defaultSellPrice: number | null; sellPriceIncTax: number | null }) => ({
        default_purchase_price: v.defaultPurchasePrice ?? 0,
        dpp_inc_tax: v.dppIncTax,
        profit_percent: v.profitPercent,
        default_sell_price: v.defaultSellPrice ?? 0,
        sell_price_inc_tax: v.sellPriceIncTax ?? 0,
        group_prices: Object.entries(grid[v.id] ?? {})
          .filter(([, price]) => price !== '' && price != null)
          .map(([groupId, price]) => ({ price_group_id: Number(groupId), price_inc_tax: Number(price) })),
      });

      // The save endpoint rebuilds the whole product, so echo its current shape back with only the
      // group prices changed — anything omitted here would be wiped.
      const first = p.productVariations[0]?.variations[0];
      const base: SaveProductBody = {
        name: p.name,
        type: p.type as 'single' | 'variable' | 'combo',
        unit_id: p.unitId,
        secondary_unit_id: p.secondaryUnitId,
        sub_unit_ids: p.subUnitIds,
        brand_id: p.brandId,
        category_id: p.categoryId,
        sub_category_id: p.subCategoryId,
        tax: p.tax,
        tax_type: p.taxType === 'inclusive' ? 'inclusive' : 'exclusive',
        enable_stock: p.enableStock,
        alert_quantity: p.alertQuantity,
        sku: p.sku,
        barcode_type: p.barcodeType,
        expiry_period: p.expiryPeriod,
        expiry_period_type: p.expiryPeriodType === 'days' || p.expiryPeriodType === 'months' ? p.expiryPeriodType : undefined,
        enable_sr_no: p.enableSrNo,
        weight: p.weight || undefined,
        product_custom_field1: p.productCustomField1 || undefined,
        product_custom_field2: p.productCustomField2 || undefined,
        product_custom_field3: p.productCustomField3 || undefined,
        product_custom_field4: p.productCustomField4 || undefined,
        preparation_time_in_minutes: p.preparationTimeInMinutes,
        image: p.image,
        product_locations: p.productLocations,
        product_racks: p.productRacks,
        warranty_id: p.warrantyId,
        not_for_selling: p.notForSelling,
        product_description: p.productDescription || undefined,
      };

      if (p.type === 'variable') {
        base.variations = p.productVariations.map((pv) => ({
          variation_template_id: pv.variationTemplateId,
          name: pv.name,
          values: pv.variations.map((v) => ({ value: v.name, sub_sku: v.subSku, ...line(v) })),
        }));
      } else if (p.type === 'combo' && first) {
        base.combo = {
          ...line(first),
          composition: (first.comboVariations ?? []).map((c) => ({
            variation_id: c.variation_id,
            quantity: c.quantity,
            unit_id: c.unit_id,
          })),
        };
      } else if (first) {
        base.single = line(first);
      }
      return updateProduct(p.id, base);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product', productId] });
      onClose();
    },
    onError: (e: unknown) => setError(getApiErrorMessage(e, 'Could not save the group prices')),
  });

  const groups = meta?.priceGroups ?? [];
  const rows = (product?.productVariations ?? []).flatMap((pv) =>
    pv.variations.map((v) => ({
      id: v.id,
      label: v.name === 'DUMMY' ? (pv.name === 'DUMMY' ? product!.name : pv.name) : `${pv.name} · ${v.name}`,
      subSku: v.subSku,
      defaultPrice: v.sellPriceIncTax,
    })),
  );

  return (
    <Modal
      open={productId != null}
      onClose={onClose}
      title="Selling price group prices"
      description={product?.name}
      className="max-w-3xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending || groups.length === 0} onClick={() => save.mutate()}>
            Save prices
          </Button>
        </div>
      }
    >
      {isLoading || !product ? (
        <Skeleton className="h-40 w-full" />
      ) : groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No active selling price groups. Create one under Products → Selling Price Group first.
        </p>
      ) : (
        <div className="space-y-3">
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <THead>
                <TR>
                  <TH>Variation</TH>
                  <TH className="text-right">Default price</TH>
                  {groups.map((g) => (
                    <TH key={g.id} className="text-right">{g.name}</TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <div className="font-medium">{r.label}</div>
                      <div className="font-mono text-xs text-muted-foreground">{r.subSku}</div>
                    </TD>
                    <TD className="text-right text-sm text-muted-foreground">
                      {r.defaultPrice != null ? r.defaultPrice.toFixed(2) : '—'}
                    </TD>
                    {groups.map((g) => (
                      <TD key={g.id} className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 w-28"
                          value={grid[r.id]?.[g.id] ?? ''}
                          onChange={(e) =>
                            setGrid((prev) => ({ ...prev, [r.id]: { ...(prev[r.id] ?? {}), [g.id]: e.target.value } }))
                          }
                        />
                      </TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">Prices are inclusive of tax{symbol ? `, in ${symbol}` : ''}.</p>
        </div>
      )}
    </Modal>
  );
}
