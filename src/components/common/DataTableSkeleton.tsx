import { Skeleton } from '@/components/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

interface Props {
  rows?: number;
  cols?: number;
}

/** Premium loading placeholder for a data table (toolbar + shimmering rows). */
export function DataTableSkeleton({ rows = 8, cols = 5 }: Props) {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-full max-w-xs" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <Table>
        <THead>
          <TR>
            {Array.from({ length: cols }).map((_, i) => (
              <TH key={i}>
                <Skeleton className="h-3.5 w-20" />
              </TH>
            ))}
          </TR>
        </THead>
        <TBody>
          {Array.from({ length: rows }).map((_, r) => (
            <TR key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <TD key={c}>
                  <Skeleton className="h-4" style={{ width: `${45 + ((r * 7 + c * 13) % 45)}%` }} />
                </TD>
              ))}
            </TR>
          ))}
        </TBody>
      </Table>
      <div className="flex items-center justify-between border-t p-4">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}
