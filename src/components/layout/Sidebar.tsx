import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NAVIGATION, type NavEntry } from '@/config/navigation';
import { usePermissions } from '@/features/auth/usePermission';
import { cn } from '@/lib/utils';

function useVisibleNav(): NavEntry[] {
  const { has } = usePermissions();
  return useMemo(
    () =>
      NAVIGATION.map((entry) => {
        if (entry.children) {
          const children = entry.children.filter((c) => !c.permission || has(c.permission));
          return children.length ? { ...entry, children } : null;
        }
        return !entry.permission || has(entry.permission) ? entry : null;
      }).filter((e): e is NavEntry => e !== null),
    [has],
  );
}

// ConnectCRM look: white rail, slate idle text, light-violet active pill with violet text.
const itemBase =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
const itemIdle = 'text-muted-foreground hover:bg-primary/5 hover:text-foreground';
const itemActive = 'bg-primary/10 text-primary';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const nav = useVisibleNav();
  const { pathname } = useLocation();

  const activeGroup = nav.find((e) => e.children?.some((c) => c.to === pathname))?.label;
  const [open, setOpen] = useState<Record<string, boolean>>(activeGroup ? { [activeGroup]: true } : {});
  const toggle = (label: string) => setOpen((o) => ({ ...o, [label]: !o[label] }));

  const main = nav.filter((e) => (e.section ?? 'main') === 'main');
  const setup = nav.filter((e) => e.section === 'setup');

  const renderEntry = (entry: NavEntry) => {
    const Icon = entry.icon;

    if (!entry.children) {
      return (
        <NavLink
          key={entry.label}
          to={entry.to ?? '/'}
          end={entry.to === '/'}
          onClick={onNavigate}
          className={({ isActive }) => cn(itemBase, isActive ? itemActive : itemIdle)}
        >
          {({ isActive }) => (
            <>
              <Icon className={cn('h-[18px] w-[18px]', isActive ? 'text-primary' : 'text-muted-foreground')} />
              {entry.label}
            </>
          )}
        </NavLink>
      );
    }

    const isOpen = Boolean(open[entry.label]);
    const groupActive = entry.children.some((c) => c.to === pathname);
    return (
      <div key={entry.label}>
        <button
          type="button"
          onClick={() => toggle(entry.label)}
          className={cn(itemBase, 'w-full justify-between', groupActive ? itemActive : itemIdle)}
        >
          <span className="flex items-center gap-3">
            <Icon className={cn('h-[18px] w-[18px]', groupActive ? 'text-primary' : 'text-muted-foreground')} />
            {entry.label}
          </span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <div className="mb-1 ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3.5">
            {entry.children.map((child) => {
              const ChildIcon = child.icon;
              return (
                <NavLink
                  key={child.to}
                  to={child.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors',
                      isActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground',
                    )
                  }
                >
                  <ChildIcon className="h-4 w-4" />
                  {child.label}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="flex h-16 flex-shrink-0 items-center border-b border-border px-5">
        <img src="/olympas-logo.png" alt="OlympasLLC" className="h-9 w-auto object-contain" />
      </div>

      <nav className="scroll-light flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Main Menu
        </p>
        {main.map(renderEntry)}

        {setup.length > 0 && (
          <>
            <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Setup
            </p>
            {setup.map(renderEntry)}
          </>
        )}
      </nav>
    </div>
  );
}
