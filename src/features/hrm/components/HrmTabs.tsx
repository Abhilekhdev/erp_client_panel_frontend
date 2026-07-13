import { NavLink } from 'react-router-dom';
import { usePermissions } from '@/features/auth/usePermission';
import { cn } from '@/lib/utils';

interface HrmTab {
  label: string;
  to: string;
  perms?: string[]; // shown if the user has ANY of these (admin bypasses); undefined = always shown
}

// Mirrors GOURI's `nav_hrm.blade.php` pill bar EXACTLY — same sections, order, labels (from the
// essentials lang file) and permission gating. Every HRM screen renders this so the whole section
// navigates as one cohesive tab.
const HRM_TABS: HrmTab[] = [
  { label: 'Leave Type', to: '/hrm/leave-types', perms: ['essentials.crud_leave_type'] },
  { label: 'Leave', to: '/hrm/leaves', perms: ['essentials.crud_all_leave', 'essentials.crud_own_leave'] },
  {
    label: 'Attendance',
    to: '/hrm/attendance',
    perms: ['essentials.view_all_attendance', 'essentials.view_own_attendance'],
  },
  { label: 'Payroll', to: '/hrm/payroll', perms: ['essentials.view_all_payroll', 'essentials.create_payroll'] },
  { label: "Day's Off", to: '/hrm/holidays', perms: ['essentials.add_holiday', 'essentials.edit_holiday', 'essentials.delete_holiday'] },
  { label: 'Departments', to: '/hrm/departments', perms: ['essentials.crud_department'] },
  { label: 'Designations', to: '/hrm/designations', perms: ['essentials.crud_designation'] },
  { label: 'Structured Commission', to: '/hrm/sales-targets', perms: ['essentials.access_sales_target'] },
  { label: 'Settings', to: '/hrm/settings', perms: ['edit_essentials_settings'] },
  { label: 'Activity Code', to: '/hrm/activity-log', perms: ['essentials.activity_log'] },
];

export function HrmTabs() {
  const { hasAny } = usePermissions();
  const tabs = HRM_TABS.filter((t) => !t.perms || hasAny(t.perms));

  return (
    <div className="mb-5 flex flex-wrap gap-1.5 border-b border-border pb-4">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            cn(
              'whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
