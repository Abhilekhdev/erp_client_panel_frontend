import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NAVIGATION, type NavEntry } from '@/config/navigation';
import { usePermissions } from '@/features/auth/usePermission';
import { cn } from '@/lib/utils';

/**
 * Resolve which single nav destination is "active" — the MOST SPECIFIC match wins.
 * NavLink's default prefix matching would light up both `/products` and `/products/create`
 * when on the latter; picking the longest matching `to` keeps exactly one item highlighted,
 * while still highlighting the list item on unlisted detail routes (e.g. /products/12/edit).
 */
function useActivePath(): string | null {
  const { pathname } = useLocation();
  return useMemo(() => {
    const all: string[] = [];
    NAVIGATION.forEach((e) => {
      if (e.to) all.push(e.to);
      e.children?.forEach((c) => all.push(c.to));
    });

    let best: string | null = null;
    for (const to of all) {
      const matches = pathname === to || (to !== '/' && pathname.startsWith(`${to}/`));
      if (matches && (!best || to.length > best.length)) best = to;
    }
    return best;
  }, [pathname]);
}

function useVisibleNav(): NavEntry[] {
  const { has, hasAny } = usePermissions();
  return useMemo(() => {
    // Visible if it declares no gate, or the user holds its `permission` / ANY of its `permissions`.
    const allowed = (item: { permission?: string; permissions?: string[] }): boolean =>
      (!item.permission && !item.permissions) ||
      (item.permission ? has(item.permission) : false) ||
      (item.permissions ? hasAny(item.permissions) : false);

    return NAVIGATION.map((entry) => {
      // A group must first pass its OWN gate — otherwise an un-permissioned child would leak it in.
      if (!allowed(entry)) return null;
      if (entry.children) {
        const children = entry.children.filter(allowed);
        return children.length ? { ...entry, children } : null;
      }
      return entry;
    }).filter((e): e is NavEntry => e !== null);
  }, [has, hasAny]);
}

// ConnectCRM look: white rail, slate idle text, light-violet active pill with violet text.
const itemBase =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
const itemIdle = 'text-muted-foreground hover:bg-primary/5 hover:text-foreground';
const itemActive = 'bg-primary/10 text-primary';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const nav = useVisibleNav();
  const activePath = useActivePath();

  const activeGroup = nav.find((e) => e.children?.some((c) => c.to === activePath))?.label;
  const [open, setOpen] = useState<Record<string, boolean>>(activeGroup ? { [activeGroup]: true } : {});
  const toggle = (label: string) => setOpen((o) => ({ ...o, [label]: !o[label] }));

  // Keep the group holding the current route expanded as you navigate.
  useEffect(() => {
    if (activeGroup) setOpen((o) => (o[activeGroup] ? o : { ...o, [activeGroup]: true }));
  }, [activeGroup]);

  const main = nav.filter((e) => (e.section ?? 'main') === 'main');
  const setup = nav.filter((e) => e.section === 'setup');

  const renderEntry = (entry: NavEntry) => {
    const Icon = entry.icon;

    if (!entry.children) {
      const isActive = entry.to === activePath;
      return (
        <NavLink
          key={entry.label}
          to={entry.to ?? '/'}
          onClick={onNavigate}
          className={cn(itemBase, isActive ? itemActive : itemIdle)}
        >
          <Icon className={cn('h-[18px] w-[18px]', isActive ? 'text-primary' : 'text-muted-foreground')} />
          {entry.label}
        </NavLink>
      );
    }

    const isOpen = Boolean(open[entry.label]);
    const groupActive = entry.children.some((c) => c.to === activePath);
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
              const childActive = child.to === activePath;
              return (
                <NavLink
                  key={child.to}
                  to={child.to}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors',
                    childActive
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground',
                  )}
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
