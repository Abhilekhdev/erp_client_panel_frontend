import { CalendarDays, CheckSquare, Clock, Upload, UserCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { usePermissions } from '@/features/auth/usePermission';
import { AllAttendanceTab } from '../attendance/AllAttendanceTab';
import { ClockInOut } from '../attendance/ClockInOut';
import { ByDateTab, ByShiftTab, ImportTab } from '../attendance/ReportTabs';
import { ShiftsTab } from '../attendance/ShiftsTab';
import { HrmSubTabs } from '../components/HrmSubTabs';
import { HrmTabs } from '../components/HrmTabs';

// Each sub-tab is gated by the permission its API actually enforces, so employees only see what they
// can use (the admin-only "by shift / by date / import / shifts" reports no longer 403 for them).
const VIEW_ALL = 'essentials.view_all_attendance';
const TAB_DEFS = [
  { key: 'shifts', label: 'Shifts', icon: <Clock className="h-4 w-4" />, perms: [VIEW_ALL] },
  { key: 'all', label: 'All Attendance', icon: <CheckSquare className="h-4 w-4" />, perms: [VIEW_ALL, 'essentials.view_own_attendance'] },
  { key: 'by-shift', label: 'Attendance by shift', icon: <UserCheck className="h-4 w-4" />, perms: [VIEW_ALL] },
  { key: 'by-date', label: 'Attendance by date', icon: <CalendarDays className="h-4 w-4" />, perms: [VIEW_ALL] },
  { key: 'import', label: 'Import Attendance', icon: <Upload className="h-4 w-4" />, perms: ['essentials.add_attendance'] },
];

export function AttendancePage() {
  const { hasAny } = usePermissions();
  const tabs = useMemo(() => TAB_DEFS.filter((t) => hasAny(t.perms)), [hasAny]);
  const [tab, setTab] = useState(() => tabs[0]?.key ?? 'all');

  // If the visible set changes (e.g. permissions load in), keep the active tab valid.
  const active = tabs.some((t) => t.key === tab) ? tab : (tabs[0]?.key ?? 'all');

  return (
    <div>
      <PageHeader title="Attendance" breadcrumbs={[{ label: 'HRM', to: '/hrm' }, { label: 'Attendance' }]} />
      <HrmTabs />
      <ClockInOut />
      {tabs.length > 0 && (
        <HrmSubTabs tabs={tabs.map(({ key, label, icon }) => ({ key, label, icon }))} active={active} onChange={setTab} />
      )}
      {active === 'shifts' && <ShiftsTab />}
      {active === 'all' && <AllAttendanceTab />}
      {active === 'by-shift' && <ByShiftTab />}
      {active === 'by-date' && <ByDateTab />}
      {active === 'import' && <ImportTab />}
    </div>
  );
}
