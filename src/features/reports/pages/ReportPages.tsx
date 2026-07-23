import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  Briefcase,
  Coins,
  MinusCircle,
  Percent,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import {
  getCustomerSupplier,
  getExpenseReport,
  getItems,
  getProfitLoss,
  getPurchaseSale,
  getSalesRep,
  getStockReport,
  getTaxReport,
  getTrending,
} from '../reports.api';
import { ReportShell } from '../components/ReportShell';
import { useMoney } from '../useMoney';

/** Empty-table row. */
function Empty({ cols, text = 'No data for this filter.' }: { cols: number; text?: string }) {
  return (
    <TR className="hover:bg-transparent">
      <TD colSpan={cols} className="py-12 text-center text-sm text-muted-foreground">
        {text}
      </TD>
    </TR>
  );
}

// ── 1. Profit / Loss ──────────────────────────────────────────────────
export function ProfitLossPage() {
  const m = useMoney();
  return (
    <ReportShell title="Profit / Loss Report" description="Sales, purchases, expenses and net profit for the period.">
      {(filters) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { data } = useQuery({ queryKey: ['r-profit-loss', filters], queryFn: () => getProfitLoss(filters) });
        const d = data ?? {
          totalSell: 0, sellReturn: 0, totalPurchase: 0, purchaseReturn: 0, totalExpense: 0, grossProfit: 0, netProfit: 0,
        };
        return (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Total Sales" value={m(d.totalSell)} icon={ArrowUpCircle} tone="emerald" hint={`Returns ${m(d.sellReturn)}`} />
            <StatCard label="Total Purchase" value={m(d.totalPurchase)} icon={ArrowDownCircle} tone="indigo" hint={`Returns ${m(d.purchaseReturn)}`} />
            <StatCard label="Total Expense" value={m(d.totalExpense)} icon={MinusCircle} tone="amber" />
            <StatCard label="Gross Profit" value={m(d.grossProfit)} icon={TrendingUp} tone="emerald" hint="Revenue − cost of goods sold" />
            <StatCard
              label="Net Profit"
              value={m(d.netProfit)}
              icon={d.netProfit >= 0 ? TrendingUp : TrendingDown}
              tone={d.netProfit >= 0 ? 'emerald' : 'rose'}
              hint="Gross profit − expenses"
            />
          </div>
        );
      }}
    </ReportShell>
  );
}

// ── 2. Purchase & Sale ────────────────────────────────────────────────
export function PurchaseSalePage() {
  const m = useMoney();
  return (
    <ReportShell title="Purchase & Sale Report" description="Totals, payments received/made and outstanding dues.">
      {(filters) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { data } = useQuery({ queryKey: ['r-purchase-sale', filters], queryFn: () => getPurchaseSale(filters) });
        const z = { total: 0, paid: 0, due: 0, returnTotal: 0 };
        const d = data ?? { purchase: z, sale: z };
        const Block = ({ title, s, tone }: { title: string; s: typeof z; tone: 'indigo' | 'emerald' }) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label={`${title} — Total`} value={m(s.total)} icon={tone === 'emerald' ? ArrowUpCircle : ArrowDownCircle} tone={tone} />
            <StatCard label={`${title} — Return`} value={m(s.returnTotal)} icon={Receipt} tone="blue" />
            <StatCard label={`${title} — Paid`} value={m(s.paid)} icon={Wallet} tone="emerald" />
            <StatCard label={`${title} — Due`} value={m(s.due)} icon={Coins} tone={s.due > 0 ? 'rose' : 'blue'} />
          </div>
        );
        return (
          <div className="space-y-6">
            <Block title="Purchase" s={d.purchase} tone="indigo" />
            <Block title="Sale" s={d.sale} tone="emerald" />
          </div>
        );
      }}
    </ReportShell>
  );
}

// ── 3. Tax Report ─────────────────────────────────────────────────────
export function TaxReportPage() {
  const m = useMoney();
  return (
    <ReportShell title="Tax Report" description="Output tax collected on sales vs input tax paid on purchases.">
      {(filters) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { data } = useQuery({ queryKey: ['r-tax', filters], queryFn: () => getTaxReport(filters) });
        const d = data ?? { outputTax: 0, inputTax: 0, taxDue: 0 };
        return (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Output Tax (Sales)" value={m(d.outputTax)} icon={ArrowUpCircle} tone="emerald" />
            <StatCard label="Input Tax (Purchases)" value={m(d.inputTax)} icon={ArrowDownCircle} tone="indigo" />
            <StatCard
              label="Tax Payable"
              value={m(d.taxDue)}
              icon={Percent}
              tone={d.taxDue >= 0 ? 'amber' : 'emerald'}
              hint="Output − input"
            />
          </div>
        );
      }}
    </ReportShell>
  );
}

// ── 4. Stock Report ───────────────────────────────────────────────────
export function StockReportPage() {
  const m = useMoney();
  return (
    <ReportShell
      title="Stock Report"
      description="On-hand quantity and value per product."
      filterConfig={{ category: true, brand: true, unit: true, hideDate: true }}
      onExport={() => {
        const d = stockCache;
        if (!d?.data.length) return null;
        return {
          filename: 'stock-report',
          headers: ['Product', 'SKU', 'Current stock', 'Unit purchase', 'Unit sell', 'Stock value', 'Potential value'],
          rows: d.data.map((r) => [r.product, r.sku, r.currentStock, r.unitPurchasePrice, r.unitSellPrice, r.stockValue, r.potentialValue]),
        };
      }}
    >
      {(filters) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { data } = useQuery({ queryKey: ['r-stock', filters], queryFn: () => getStockReport(filters) });
        stockCache = data;
        return (
          <>
            <div className="mb-4 grid gap-4 sm:grid-cols-3">
              <StatCard label="Stock value (at cost)" value={m(data?.totals.stockValueByPurchase ?? 0)} icon={Boxes} tone="indigo" />
              <StatCard label="Potential sale value" value={m(data?.totals.stockValueBySale ?? 0)} icon={Coins} tone="emerald" />
              <StatCard label="Potential profit" value={m(data?.totals.potentialProfit ?? 0)} icon={TrendingUp} tone="emerald" />
            </div>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <Table>
                <THead>
                  <TR className="bg-muted/40 hover:bg-muted/40">
                    <TH>Product</TH>
                    <TH>SKU</TH>
                    <TH className="text-right">Stock</TH>
                    <TH className="text-right">Unit purchase</TH>
                    <TH className="text-right">Unit sell</TH>
                    <TH className="text-right">Stock value</TH>
                    <TH className="text-right">Potential</TH>
                  </TR>
                </THead>
                <TBody>
                  {(data?.data ?? []).length === 0 ? (
                    <Empty cols={7} />
                  ) : (
                    data!.data.map((r, i) => (
                      <TR key={i}>
                        <TD className="font-medium">{r.product}</TD>
                        <TD className="text-muted-foreground">{r.sku}</TD>
                        <TD className="text-right">{r.currentStock}</TD>
                        <TD className="text-right">{m(r.unitPurchasePrice)}</TD>
                        <TD className="text-right">{m(r.unitSellPrice)}</TD>
                        <TD className="text-right">{m(r.stockValue)}</TD>
                        <TD className="text-right">{m(r.potentialValue)}</TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </div>
          </>
        );
      }}
    </ReportShell>
  );
}
let stockCache: Awaited<ReturnType<typeof getStockReport>> | undefined;

// ── 5. Trending Products ──────────────────────────────────────────────
export function TrendingProductsPage() {
  return (
    <ReportShell
      title="Trending Products"
      description="Best-selling products by quantity for the period."
      filterConfig={{ category: true, brand: true }}
      onExport={() =>
        trendingCache?.data.length
          ? { filename: 'trending-products', headers: ['Product', 'SKU', 'Units sold'], rows: trendingCache.data.map((r) => [r.product, r.sku, r.unitsSold]) }
          : null
      }
    >
      {(filters) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { data } = useQuery({ queryKey: ['r-trending', filters], queryFn: () => getTrending(filters) });
        trendingCache = data;
        const rows = data?.data ?? [];
        const max = Math.max(1, ...rows.map((r) => r.unitsSold));
        return (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Table>
              <THead>
                <TR className="bg-muted/40 hover:bg-muted/40">
                  <TH className="w-10 text-right">#</TH>
                  <TH>Product</TH>
                  <TH>SKU</TH>
                  <TH className="text-right">Units sold</TH>
                  <TH className="w-40">Share</TH>
                </TR>
              </THead>
              <TBody>
                {rows.length === 0 ? (
                  <Empty cols={5} />
                ) : (
                  rows.map((r, i) => (
                    <TR key={i}>
                      <TD className="text-right text-muted-foreground">{i + 1}</TD>
                      <TD className="font-medium">{r.product}</TD>
                      <TD className="text-muted-foreground">{r.sku}</TD>
                      <TD className="text-right font-medium">{r.unitsSold}</TD>
                      <TD>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-primary" style={{ width: `${(r.unitsSold / max) * 100}%` }} />
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        );
      }}
    </ReportShell>
  );
}
let trendingCache: Awaited<ReturnType<typeof getTrending>> | undefined;

// ── 6. Items Report ───────────────────────────────────────────────────
export function ItemsReportPage() {
  return (
    <ReportShell
      title="Items Report"
      description="Purchased vs sold vs on-hand quantity per product."
      onExport={() =>
        itemsCache?.data.length
          ? { filename: 'items-report', headers: ['Product', 'SKU', 'Purchased', 'Sold', 'Current stock'], rows: itemsCache.data.map((r) => [r.product, r.sku, r.totalPurchased, r.totalSold, r.currentStock]) }
          : null
      }
    >
      {(filters) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { data } = useQuery({ queryKey: ['r-items', filters], queryFn: () => getItems(filters) });
        itemsCache = data;
        const rows = data?.data ?? [];
        return (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Table>
              <THead>
                <TR className="bg-muted/40 hover:bg-muted/40">
                  <TH>Product</TH>
                  <TH>SKU</TH>
                  <TH className="text-right">Purchased</TH>
                  <TH className="text-right">Sold</TH>
                  <TH className="text-right">Current stock</TH>
                </TR>
              </THead>
              <TBody>
                {rows.length === 0 ? (
                  <Empty cols={5} />
                ) : (
                  rows.map((r, i) => (
                    <TR key={i}>
                      <TD className="font-medium">{r.product}</TD>
                      <TD className="text-muted-foreground">{r.sku}</TD>
                      <TD className="text-right">{r.totalPurchased}</TD>
                      <TD className="text-right">{r.totalSold}</TD>
                      <TD className="text-right">{r.currentStock}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        );
      }}
    </ReportShell>
  );
}
let itemsCache: Awaited<ReturnType<typeof getItems>> | undefined;

// ── 7. Expense Report ─────────────────────────────────────────────────
export function ExpenseReportPage() {
  const m = useMoney();
  return (
    <ReportShell
      title="Expense Report"
      description="Expenses grouped by category for the period."
      onExport={() =>
        expenseCache?.data.length
          ? { filename: 'expense-report', headers: ['Category', 'Count', 'Amount'], rows: expenseCache.data.map((r) => [r.category, r.count, r.amount]) }
          : null
      }
    >
      {(filters) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { data } = useQuery({ queryKey: ['r-expense', filters], queryFn: () => getExpenseReport(filters) });
        expenseCache = data;
        const rows = data?.data ?? [];
        return (
          <>
            <div className="mb-4">
              <StatCard label="Total Expense" value={m(data?.total ?? 0)} icon={MinusCircle} tone="amber" />
            </div>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <Table>
                <THead>
                  <TR className="bg-muted/40 hover:bg-muted/40">
                    <TH>Category</TH>
                    <TH className="text-right">Entries</TH>
                    <TH className="text-right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.length === 0 ? <Empty cols={3} /> : rows.map((r, i) => (
                    <TR key={i}>
                      <TD className="font-medium">{r.category}</TD>
                      <TD className="text-right">{r.count}</TD>
                      <TD className="text-right">{m(r.amount)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        );
      }}
    </ReportShell>
  );
}
let expenseCache: Awaited<ReturnType<typeof getExpenseReport>> | undefined;

// ── 8. Sales Representative ───────────────────────────────────────────
export function SalesRepPage() {
  const m = useMoney();
  return (
    <ReportShell
      title="Sales Representative Report"
      description="Sells and expenses booked per user."
      filterConfig={{ user: true }}
      onExport={() =>
        salesRepCache?.data.length
          ? { filename: 'sales-representative', headers: ['User', 'Sells', 'Sell count', 'Expenses', 'Net'], rows: salesRepCache.data.map((r) => [r.user, r.totalSell, r.sellCount, r.totalExpense, r.net]) }
          : null
      }
    >
      {(filters) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { data } = useQuery({ queryKey: ['r-sales-rep', filters], queryFn: () => getSalesRep(filters) });
        salesRepCache = data;
        const rows = data?.data ?? [];
        return (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Table>
              <THead>
                <TR className="bg-muted/40 hover:bg-muted/40">
                  <TH>User</TH>
                  <TH className="text-right">Total sells</TH>
                  <TH className="text-right">Sell count</TH>
                  <TH className="text-right">Total expenses</TH>
                  <TH className="text-right">Net</TH>
                </TR>
              </THead>
              <TBody>
                {rows.length === 0 ? <Empty cols={5} /> : rows.map((r, i) => (
                  <TR key={i}>
                    <TD className="font-medium">{r.user || '—'}</TD>
                    <TD className="text-right">{m(r.totalSell)}</TD>
                    <TD className="text-right">{r.sellCount}</TD>
                    <TD className="text-right">{m(r.totalExpense)}</TD>
                    <TD className="text-right font-medium">{m(r.net)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        );
      }}
    </ReportShell>
  );
}
let salesRepCache: Awaited<ReturnType<typeof getSalesRep>> | undefined;

// ── 9. Customer & Supplier ────────────────────────────────────────────
export function CustomerSupplierPage() {
  const m = useMoney();
  return (
    <ReportShell
      title="Customer & Supplier Report"
      description="Totals, payments and outstanding dues per contact."
      filterConfig={{ contactType: true }}
      onExport={() =>
        contactCache?.data.length
          ? { filename: 'customer-supplier', headers: ['Contact', 'Documents', 'Total', 'Paid', 'Due'], rows: contactCache.data.map((r) => [r.contact, r.documents, r.total, r.paid, r.due]) }
          : null
      }
    >
      {(filters) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { data } = useQuery({ queryKey: ['r-contacts', filters], queryFn: () => getCustomerSupplier(filters) });
        contactCache = data;
        const rows = data?.data ?? [];
        const isSupplier = data?.contactType === 'supplier';
        return (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Table>
              <THead>
                <TR className="bg-muted/40 hover:bg-muted/40">
                  <TH>{isSupplier ? 'Supplier' : 'Customer'}</TH>
                  <TH className="text-right">{isSupplier ? 'Purchases' : 'Sales'}</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Paid</TH>
                  <TH className="text-right">Due</TH>
                </TR>
              </THead>
              <TBody>
                {rows.length === 0 ? <Empty cols={5} /> : rows.map((r, i) => (
                  <TR key={i}>
                    <TD className="font-medium">{r.contact}</TD>
                    <TD className="text-right">{r.documents}</TD>
                    <TD className="text-right">{m(r.total)}</TD>
                    <TD className="text-right">{m(r.paid)}</TD>
                    <TD className="text-right font-medium">{m(r.due)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        );
      }}
    </ReportShell>
  );
}
let contactCache: Awaited<ReturnType<typeof getCustomerSupplier>> | undefined;

// ── 10. Register Report (cash register module not built) ──────────────
export function RegisterReportPage() {
  return (
    <ReportShell title="Register Report" description="Cash register open/close sessions and takings.">
      {() => (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Briefcase className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Not available yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            The Register Report reads cash-register sessions (open/close, cash in/out). The Cash
            Register module isn&apos;t built yet, so there&apos;s no data to show — this report will
            light up automatically once it lands.
          </p>
        </div>
      )}
    </ReportShell>
  );
}
