import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type StatTone = 'indigo' | 'violet' | 'emerald' | 'blue' | 'orange' | 'rose' | 'amber' | 'sky';

const TONE_BG: Record<StatTone, string> = {
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
};

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  tone?: StatTone;
  change?: string;
  changeUp?: boolean;
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'indigo',
  change,
  changeUp = true,
  loading,
}: StatCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className={cn('grid h-12 w-12 place-items-center rounded-full text-white', TONE_BG[tone])}>
            <Icon className="h-6 w-6" />
          </div>
          {change && (
            <span
              className={cn(
                'flex items-center gap-0.5 text-xs font-medium',
                changeUp ? 'text-emerald-600' : 'text-rose-600',
              )}
            >
              {changeUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {change}
            </span>
          )}
        </div>
        {loading ? (
          <Skeleton className="mt-4 h-8 w-24" />
        ) : (
          <div className="mt-4 text-2xl font-bold tracking-tight">{value}</div>
        )}
        <p className="mt-1 text-sm text-muted-foreground">{hint ?? label}</p>
      </CardContent>
    </Card>
  );
}
