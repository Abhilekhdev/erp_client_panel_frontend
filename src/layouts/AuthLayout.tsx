import { BarChart3, ShieldCheck, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { ThemeToggle } from '@/components/theme/theme-toggle';

const highlights = [
  { icon: ShieldCheck, label: 'Enterprise-grade security & role-based access' },
  { icon: Zap, label: 'Real-time operations, notifications & queues' },
  { icon: BarChart3, label: 'Actionable analytics across every module' },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-primary/70 p-12 text-primary-foreground lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-black/10 blur-3xl" />

        <div className="relative w-fit rounded-lg bg-white px-5 py-3.5 shadow-sm">
          <img src="/olympas-logo.png" alt="OlympasLLC" className="h-10 w-auto object-contain" />
        </div>

        <div className="relative max-w-md space-y-8">
          <h2 className="text-3xl font-semibold leading-tight">
            Run your entire business from one modern workspace.
          </h2>
          <ul className="space-y-4">
            {highlights.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3 text-sm text-primary-foreground/90">
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs uppercase tracking-widest text-primary-foreground/70">
          HRM · CRM · Sales · Purchase · Inventory · Accounts · Payroll
        </p>
      </div>

      {/* Content panel */}
      <div className="relative flex flex-col p-6">
        <div className="flex items-center justify-between">
          <img src="/olympas-logo.png" alt="OlympasLLC" className="h-9 w-auto object-contain lg:invisible" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">{children}</div>
      </div>
    </div>
  );
}
