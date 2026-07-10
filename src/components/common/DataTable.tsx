import { ChevronLeft, ChevronRight, Inbox, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;

  // Server-side pagination
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];

  // Search
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  // Row selection
  selectable?: boolean;
  selectedKeys?: Array<string | number>;
  onSelectionChange?: (keys: Array<string | number>) => void;

  toolbar?: ReactNode;
  emptyMessage?: string;
}

/** Windowed page numbers with ellipses: 1 … 4 5 6 … 343 */
function pageList(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) out.push('ellipsis');
  for (let p = start; p <= end; p++) out.push(p);
  if (end < totalPages - 1) out.push('ellipsis');
  out.push(totalPages);
  return out;
}

/**
 * Reusable, server-side-paginated data table (search, selection, toolbar, loading + empty states).
 * The parent owns `page`/`pageSize`/`search` state and fetches the matching slice from the API.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  selectable,
  selectedKeys = [],
  onSelectionChange,
  toolbar,
  emptyMessage = 'No data',
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const colSpan = columns.length + (selectable ? 1 : 0);
  const pageKeys = data.map(rowKey);
  const allSelected = Boolean(selectable) && data.length > 0 && pageKeys.every((k) => selectedKeys.includes(k));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(
      allSelected
        ? selectedKeys.filter((k) => !pageKeys.includes(k))
        : Array.from(new Set([...selectedKeys, ...pageKeys])),
    );
  };
  const toggleRow = (k: string | number) => {
    if (!onSelectionChange) return;
    onSelectionChange(selectedKeys.includes(k) ? selectedKeys.filter((x) => x !== k) : [...selectedKeys, k]);
  };

  return (
    <div className="space-y-4">
      {(onSearchChange || toolbar) && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {onSearchChange ? (
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="rounded-full pl-10"
              />
            </div>
          ) : (
            <div />
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <THead>
            <TR className="bg-muted/40 hover:bg-muted/40">
              {selectable && (
                <TH className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-input accent-primary"
                    aria-label="Select all"
                  />
                </TH>
              )}
              {columns.map((c) => (
                <TH key={c.key} className={c.headerClassName}>
                  {c.header}
                </TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 10) }).map((_, r) => (
                <TR key={r}>
                  {selectable && (
                    <TD>
                      <Skeleton className="h-4 w-4" />
                    </TD>
                  )}
                  {columns.map((c, ci) => (
                    <TD key={c.key}>
                      <Skeleton className="h-4" style={{ width: `${45 + ((r * 7 + ci * 13) % 45)}%` }} />
                    </TD>
                  ))}
                </TR>
              ))
            ) : data.length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={colSpan} className="py-16">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Inbox className="h-10 w-10 opacity-40" strokeWidth={1.5} />
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </TD>
              </TR>
            ) : (
              data.map((row) => {
                const key = rowKey(row);
                const selected = selectedKeys.includes(key);
                return (
                  <TR key={key} className={cn(selected && 'bg-primary/5')}>
                    {selectable && (
                      <TD>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleRow(key)}
                          className="h-4 w-4 rounded border-input accent-primary"
                          aria-label="Select row"
                        />
                      </TD>
                    )}
                    {columns.map((c) => (
                      <TD key={c.key} className={c.className}>
                        {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                      </TD>
                    ))}
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>

        <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            {total > 0
              ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total.toLocaleString()}`
              : '0 results'}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="grid h-8 w-8 place-items-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pageList(page, totalPages).map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`e${i}`} className="px-1 text-sm text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={cn(
                      'h-8 min-w-8 rounded-md px-2 text-sm transition-colors',
                      p === page ? 'bg-primary text-primary-foreground' : 'border border-input hover:bg-accent',
                    )}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="grid h-8 w-8 place-items-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {onPageSizeChange && (
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                aria-label="Rows per page"
              >
                {pageSizeOptions.map((s) => (
                  <option key={s} value={s}>
                    {s} / page
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
