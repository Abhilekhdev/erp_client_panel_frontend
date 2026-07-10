import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SubTab {
  key: string;
  label: string;
  icon?: ReactNode;
}

/**
 * Underline-style sub-tab bar used INSIDE an HRM page (Attendance, Payroll, Settings) to switch
 * between sections without leaving the page — mirrors GOURI's `nav-tabs-custom` sub-tabs.
 * State-driven (the parent owns `active`), so each sub-tab keeps its own table/filters/pagination.
 */
export function HrmSubTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: SubTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 flex flex-wrap gap-0.5 border-b border-border', className)}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            '-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            active === t.key
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}
