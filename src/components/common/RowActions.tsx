import { MoreHorizontal } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface RowAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** Renders in the destructive colour and, if grouped, below a divider. */
  destructive?: boolean;
  /** Set false to omit (e.g. behind a permission). Defaults to true. */
  show?: boolean;
  /** Start a new group above this item (a divider). */
  divider?: boolean;
}

/**
 * GOURI's per-row "Actions" dropdown, ported. A dropdown instead of a strip of icon buttons —
 * a product has eight actions and they overflow the cell otherwise.
 *
 * The menu is portalled to <body> and positioned against the trigger so it is never clipped by the
 * table's own `overflow` (which a plain absolutely-positioned menu would be).
 */
export function RowActions({ actions }: { actions: RowAction[] }) {
  const visible = actions.filter((a) => a.show !== false);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const width = 224; // w-56
    // Prefer right-aligned under the trigger; clamp into the viewport.
    const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8));
    setPos({ top: r.bottom + 4, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    // Any scroll moves the anchor; simplest correct behaviour is to close.
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  if (visible.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title="Actions"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background transition-colors hover:bg-accent"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-50 w-56 rounded-lg border bg-card p-1.5 shadow-xl"
          >
            {visible.map((a, i) => (
              <div key={i}>
                {a.divider && <div className="my-1 border-t" />}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    a.onClick();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent',
                    a.destructive && 'text-destructive hover:bg-destructive/10',
                  )}
                >
                  <span className="grid h-4 w-4 shrink-0 place-items-center">{a.icon}</span>
                  <span className="truncate">{a.label}</span>
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
