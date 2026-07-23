import { useQuery } from '@tanstack/react-query';
import { History, Info, Tags } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { getStockReport, type StockReportFilters, type StockReportRow } from '../products.api';
import { GroupPricesModal } from './GroupPricesModal';

const qty = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });
/** Transaction-derived figures come back null — say so rather than print a convincing 0. */
const PENDING = <span className="text-muted-foreground">—</span>;

interface StockReportTabProps {
  /** The shared filter bar's current state (the same one the All Products tab uses). */
  filters: Omit<StockReportFilters, 'page' | 'pageSize' | 'search' | 'lowStock'>;
  search: string;
  onSearchChange: (v: string) => void;
  toolbar?: ReactNode;
  onResetFilters?: () => void;
  filtersActive?: boolean;
}

export function StockReportTab({
  filters,
  search,
  onSearchChange,
  toolbar,
  onResetFilters,
  filtersActive,
}: StockReportTabProps) {
  const navigate = useNavigate();
  const [groupPricesId, setGroupPricesId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const query = { ...filters, search, page, pageSize };

  // Narrowing the filters while on page 3 would otherwise strand the user on an empty page.
  const filterKey = JSON.stringify({ filters, search });
  useEffect(() => setPage(1), [filterKey]);

  const { data, isLoading } = useQuery({
    queryKey: ['stock-report', query],
    queryFn: () => getStockReport(query),
    placeholderData: (prev) => prev,
  });

  const canValue = data?.can.viewStockValue ?? false;
  const canSelling = data?.can.viewSellingPrice ?? false;

  const columns: Column<StockReportRow>[] = [
    {
      key: 'actions',
      header: 'Action',
      hideable: false,
      render: (r) => (
        <div className="flex gap-1.5">
          {/* GOURI deep-links its history button to this exact location + variation. */}
          {r.enableStock && (
            <Button
              variant="outline"
              size="sm"
              title="Product stock history"
              onClick={() =>
                navigate(
                  `/products/${r.productId}/stock-history?variation_id=${r.variationId}${
                    r.locationId ? `&location_id=${r.locationId}` : ''
                  }`,
                )
              }
            >
              <History className="h-4 w-4" />
            </Button>
          )}
          {canSelling && (
            <Button
              variant="outline"
              size="sm"
              title="View group prices"
              onClick={() => setGroupPricesId(r.productId)}
            >
              <Tags className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
    { key: 'sku', header: 'SKU', render: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    {
      key: 'product',
      header: 'Product',
      hideable: false,
      render: (r) => (
        <div>
          <div className="font-medium">{r.product}</div>
          {r.variation && <div className="text-xs text-muted-foreground">{r.variation}</div>}
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (r) => r.category || '—' },
    {
      key: 'location',
      header: 'Location',
      render: (r) =>
        r.location || <span className="text-xs text-muted-foreground">Not assigned</span>,
    },
    ...(canSelling
      ? [
          {
            key: 'unitPrice',
            header: 'Unit selling price',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (r: StockReportRow) => (r.unitPrice == null ? PENDING : formatMoney(r.unitPrice)),
          },
        ]
      : []),
    {
      key: 'stock',
      header: 'Current stock',
      hideable: false,
      headerClassName: 'text-right',
      className: 'text-right',
      render: (r) => {
        // A product that doesn't track stock has no number to show — GOURI prints "--".
        if (!r.enableStock) return <span className="text-muted-foreground">—</span>;
        const low = r.alertQuantity != null && r.stock <= r.alertQuantity;
        return (
          <span className={cn('font-medium', low && 'text-destructive')}>
            {qty(r.stock)} {r.unit}
            {low && <span className="ml-1.5 align-middle text-[10px] uppercase">low</span>}
          </span>
        );
      },
    },
    ...(canValue
      ? [
          {
            key: 'stockValueByPurchasePrice',
            header: 'Stock value (cost)',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (r: StockReportRow) =>
              r.stockValueByPurchasePrice == null ? PENDING : formatMoney(r.stockValueByPurchasePrice),
          },
          {
            key: 'stockValueBySalePrice',
            header: 'Stock value (sale)',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (r: StockReportRow) =>
              r.stockValueBySalePrice == null ? PENDING : formatMoney(r.stockValueBySalePrice),
          },
          {
            key: 'potentialProfit',
            header: 'Potential profit',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (r: StockReportRow) => (r.potentialProfit == null ? PENDING : formatMoney(r.potentialProfit)),
          },
        ]
      : []),
    {
      key: 'totalSold',
      header: 'Total sold',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (r) => (r.totalSold == null ? PENDING : `${qty(r.totalSold)} ${r.unit}`),
    },
    {
      key: 'totalTransferred',
      header: 'Total transferred',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (r) => (r.totalTransferred == null ? PENDING : `${qty(r.totalTransferred)} ${r.unit}`),
    },
    {
      key: 'totalAdjusted',
      header: 'Total adjusted',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (r) => (r.totalAdjusted == null ? PENDING : `${qty(r.totalAdjusted)} ${r.unit}`),
    },
    ...([1, 2, 3, 4] as const).map((n) => ({
      key: `customField${n}`,
      header: `Custom field ${n}`,
      render: (r: StockReportRow) => r[`customField${n}` as const] || '—',
    })),
  ];

  const totals = data?.totals;

  return (
    <div className="space-y-4">
      {/* Totals cover the whole filtered report, not just this page (GOURI totals the page only). */}
      {totals && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TotalCard label="Total stock" value={`${qty(totals.stock)} units`} />
          {canValue && (
            <>
              <TotalCard label="Stock value (cost)" value={formatMoney(totals.stockValueByPurchasePrice ?? 0)} />
              <TotalCard label="Stock value (sale)" value={formatMoney(totals.stockValueBySalePrice ?? 0)} />
              <TotalCard label="Potential profit" value={formatMoney(totals.potentialProfit ?? 0)} />
            </>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p>
          Stock, cost value and <strong>Total sold</strong> are live from purchases and returns.{' '}
          <strong>Total transferred</strong> shows “—” until stock transfers are built. Combo products
          are excluded: their components hold the stock.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(r) => `${r.variationId}-${r.locationId ?? 'none'}`}
        loading={isLoading}
        page={page}
        pageSize={pageSize}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search product / SKU…"
        toolbar={toolbar}
        onResetFilters={onResetFilters}
        filtersActive={filtersActive}
        emptyMessage="No stock rows match these filters"
        columnsStorageKey="stock-report"
      />

      <GroupPricesModal productId={groupPricesId} onClose={() => setGroupPricesId(null)} />
    </div>
  );
}

function TotalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
