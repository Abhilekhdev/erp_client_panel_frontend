import { Check, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ColumnToggleItem {
  key: string;
  label: string;
  visible: boolean;
}

/**
 * "Customize Columns" dropdown — a purely client-side control that toggles which
 * table columns are shown. State lives in the parent (persisted to localStorage).
 */
export function ColumnToggle({
  items,
  onToggle,
  onReset,
}: {
  items: ColumnToggleItem[];
  onToggle: (key: string) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visibleCount = items.filter((i) => i.visible).length;
  const customized = visibleCount !== items.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Columns
        {customized && (
          <span className="rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary">
            {visibleCount}/{items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-56 rounded-lg border bg-card p-1.5 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Customize columns
            </span>
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-primary hover:underline"
            >
              Reset
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                onClick={() => onToggle(it.key)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <span
                  className={cn(
                    'grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors',
                    it.visible ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                  )}
                >
                  {it.visible && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="truncate">{it.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
