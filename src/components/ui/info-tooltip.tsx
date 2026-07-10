import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Small "i" info icon that reveals a message on hover/focus — the ERP equivalent of GOURI's
 * `@show_tooltip(...)`. Tooltip copy is static & trusted, so `html` messages (with <br>/<small>/<b>)
 * render via dangerouslySetInnerHTML to preserve the original formatting.
 */
export function InfoTooltip({
  content,
  html = false,
  side = 'top',
  className,
}: {
  content: string;
  html?: boolean;
  side?: 'top' | 'bottom';
  className?: string;
}) {
  return (
    <span className={cn('group/tt relative inline-flex align-middle', className)} tabIndex={0}>
      <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground transition-colors hover:text-foreground" />
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none invisible absolute left-1/2 z-50 w-64 max-w-[16rem] -translate-x-1/2 rounded-md bg-foreground px-3 py-2 text-xs leading-relaxed text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover/tt:visible group-hover/tt:opacity-100 group-focus/tt:visible group-focus/tt:opacity-100',
          side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        )}
      >
        {html ? <span dangerouslySetInnerHTML={{ __html: content }} /> : content}
      </span>
    </span>
  );
}
