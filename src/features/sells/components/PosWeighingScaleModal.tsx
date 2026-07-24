import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { searchSellProducts, type SellMeta, type SellProductHit } from '../sells.api';

type Scale = NonNullable<SellMeta['settings']['weighingScale']>;

/**
 * Parse a weighing-scale label barcode — GOURI's `__parseWeighingBarcode`. The label is laid out as
 * `[prefix][sku][qty-integer][qty-fraction]`; we slice by the configured field lengths. (GOURI's PHP
 * has +1 off-by-one slice bugs; the port uses exact lengths.)
 */
export function parseWeighingBarcode(barcode: string, scale: Scale): { sku: string; qty: number } | null {
  const code = barcode.trim();
  if (scale.labelPrefix && !code.startsWith(scale.labelPrefix)) return null;
  const rest = code.slice(scale.labelPrefix.length);
  const skuEnd = scale.skuLength;
  const intEnd = skuEnd + scale.qtyIntegerLength;
  const fracEnd = intEnd + scale.qtyFractionalLength;
  if (rest.length < fracEnd) return null;
  const sku = rest.slice(0, skuEnd).replace(/^0+/, '') || rest.slice(0, skuEnd);
  const qtyInt = rest.slice(skuEnd, intEnd) || '0';
  const qtyFrac = rest.slice(intEnd, fracEnd) || '0';
  const qty = Number(qtyInt) + Number(`0.${qtyFrac}`);
  if (!sku || !Number.isFinite(qty)) return null;
  return { sku, qty };
}

/** GOURI's weighing-scale modal — scan/paste a scale label, resolve it to a product + weighed qty. */
export function PosWeighingScaleModal({ scale, locationId, priceGroupId, onClose, onResolved }: {
  scale: Scale;
  locationId?: number;
  priceGroupId?: number;
  onClose: () => void;
  onResolved: (hit: SellProductHit, qty: number) => void;
}) {
  const toast = useToast();
  const [barcode, setBarcode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseWeighingBarcode(barcode, scale);
    if (!parsed) return toast.error('That does not look like a scale label for this format.');
    setBusy(true);
    try {
      const hits = await searchSellProducts({ search: parsed.sku, location_id: locationId, price_group_id: priceGroupId });
      const hit = hits.find((h) => h.sku.toLowerCase() === parsed.sku.toLowerCase()) ?? hits[0];
      if (!hit) return toast.error(`No product matches SKU ${parsed.sku}.`);
      onResolved(hit, parsed.qty);
      onClose();
    } catch {
      toast.error('Could not look up the product.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Weighing scale" description={`Scan a scale label${scale.labelPrefix ? ` (prefix “${scale.labelPrefix}”)` : ''}.`} className="max-w-md">
      <form className="space-y-3" onSubmit={submit}>
        <div>
          <Label htmlFor="ws-code">Scale barcode</Label>
          <Input id="ws-code" value={barcode} onChange={(e) => setBarcode(e.target.value)} autoFocus placeholder="Scan or type the label" />
          <p className="mt-1 text-xs text-muted-foreground">
            SKU {scale.skuLength} + weight {scale.qtyIntegerLength}.{scale.qtyFractionalLength} digits.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={busy}>{busy ? 'Looking up…' : 'Add to cart'}</Button>
        </div>
      </form>
    </Modal>
  );
}
