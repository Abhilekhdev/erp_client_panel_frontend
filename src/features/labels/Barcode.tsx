import JsBarcode from 'jsbarcode';
import { useEffect, useRef } from 'react';

// Map our product barcode types → jsbarcode formats. EAN/UPC need valid numeric+check-digit codes,
// so we fall back to CODE128 (works for any alphanumeric SKU) whenever the strict format throws.
const FORMAT: Record<string, string> = {
  C128: 'CODE128',
  C39: 'CODE39',
  EAN13: 'EAN13',
  EAN8: 'EAN8',
  UPCA: 'UPC',
  UPCE: 'UPC',
};

export function Barcode({ value, type, height = 40 }: { value: string; type: string; height?: number }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !value) return;
    const render = (format: string) =>
      JsBarcode(el, value, { format, width: 1.4, height, fontSize: 12, margin: 0, displayValue: true });
    try {
      render(FORMAT[type] ?? 'CODE128');
    } catch {
      try {
        render('CODE128'); // fallback for values that aren't valid EAN/UPC
      } catch {
        /* give up silently — invalid value */
      }
    }
  }, [value, type, height]);

  return <svg ref={ref} className="max-w-full" />;
}
