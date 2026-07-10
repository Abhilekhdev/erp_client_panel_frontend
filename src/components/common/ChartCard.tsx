import { LineChart } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function EmptyChart() {
  return (
    <div className="relative h-64 w-full">
      <div className="absolute inset-0 flex flex-col justify-between py-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-t border-dashed border-border/60" />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <LineChart className="h-8 w-8 opacity-40" strokeWidth={1.5} />
          <p className="text-sm">No data for this period</p>
        </div>
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function ChartCard({ title, actions, children }: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        {actions}
      </CardHeader>
      <CardContent>{children ?? <EmptyChart />}</CardContent>
    </Card>
  );
}
