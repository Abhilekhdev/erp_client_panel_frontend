import { Info } from 'lucide-react';

/** Small banner listing report figures that stay zero until a later module lands (e.g. Sells). */
export function PendingNote({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <span className="font-medium">Some figures fill in later:</span>{' '}
        {items.join(' · ')}
      </div>
    </div>
  );
}
