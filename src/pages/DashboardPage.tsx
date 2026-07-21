import {
  AlertCircle,
  CalendarDays,
  FileText,
  MinusCircle,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Undo2,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useAppSelector } from '@/app/hooks';
import { useCurrency } from '@/hooks/useCurrency';
import { ChartCard } from '@/components/common/ChartCard';
import { StatCard, type StatTone } from '@/components/common/StatCard';
import { TablePanel } from '@/components/common/TablePanel';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

// Mirrors GOURI_DEV's home dashboard tiles (zeroed until module data is wired). Amounts are rendered
// with the tenant's currency symbol rather than a hardcoded '$'.
const STATS: Array<{ label: string; amount: number; icon: LucideIcon; tone: StatTone }> = [
  { label: 'Total Sales', amount: 0, icon: ShoppingCart, tone: 'blue' },
  { label: 'Net', amount: 0, icon: Wallet, tone: 'emerald' },
  { label: 'Invoices Due', amount: 0, icon: FileText, tone: 'amber' },
  { label: 'Total Sale Return', amount: 0, icon: RotateCcw, tone: 'rose' },
  { label: 'Total Purchase', amount: 0, icon: ShoppingBag, tone: 'sky' },
  { label: 'Purchase Due', amount: 0, icon: AlertCircle, tone: 'orange' },
  { label: 'Total Purchase Return', amount: 0, icon: Undo2, tone: 'rose' },
  { label: 'Expense', amount: 0, icon: MinusCircle, tone: 'rose' },
];

export function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const { format } = useCurrency();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Welcome {user?.business?.name ?? 'there'},
        </h1>
        <div className="flex items-center gap-2">
          <div className="w-44">
            <Select defaultValue="">
              <option value="">All locations</option>
            </Select>
          </div>
          <Button variant="dark" size="sm">
            <CalendarDays className="h-4 w-4" />
            Filter by date
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <StatCard key={s.label} label={s.label} value={format(s.amount)} icon={s.icon} tone={s.tone} />
        ))}
      </div>

      <ChartCard title="Sales Last 30 Days" />
      <ChartCard title="Current Financial Year Sales" />

      <div className="grid gap-4 lg:grid-cols-2">
        <TablePanel title="Sales Payment Due" columns={['Customer', 'Invoice No', 'Due Amount', 'Action']} />
        <TablePanel
          title="Purchase Payment Due"
          columns={['Supplier', 'Reference No', 'Due Amount', 'Action']}
        />
      </div>

      <TablePanel title="Product Stock Alert" columns={['Product', 'Location', 'Current Stock']} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TablePanel title="Sales Order" columns={['Action', 'Date', 'Order No', 'Customer', 'Status']} />
        <TablePanel
          title="Pending Shipments"
          columns={['Action', 'Date', 'Customer', 'Location', 'Status']}
        />
      </div>
    </div>
  );
}
