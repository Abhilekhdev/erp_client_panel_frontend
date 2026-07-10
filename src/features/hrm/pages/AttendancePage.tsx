import { CalendarDays, CheckSquare, Clock, Download, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { AllAttendanceTab } from '../attendance/AllAttendanceTab';
import { ClockInOut } from '../attendance/ClockInOut';
import { ByDateTab, ByShiftTab, ImportTab } from '../attendance/ReportTabs';
import { ShiftsTab } from '../attendance/ShiftsTab';
import { HrmSubTabs } from '../components/HrmSubTabs';
import { HrmTabs } from '../components/HrmTabs';

const SUB_TABS = [
  { key: 'shifts', label: 'Shifts', icon: <Clock className="h-4 w-4" /> },
  { key: 'all', label: 'All Attendance', icon: <CheckSquare className="h-4 w-4" /> },
  { key: 'by-shift', label: 'Attendance by shift', icon: <UserCheck className="h-4 w-4" /> },
  { key: 'by-date', label: 'Attendance by date', icon: <CalendarDays className="h-4 w-4" /> },
  { key: 'import', label: 'Import Attendance', icon: <Download className="h-4 w-4" /> },
];

export function AttendancePage() {
  const [tab, setTab] = useState('shifts');

  return (
    <div>
      <PageHeader title="Attendance" breadcrumbs={[{ label: 'HRM', to: '/hrm' }, { label: 'Attendance' }]} />
      <HrmTabs />
      <ClockInOut />
      <HrmSubTabs tabs={SUB_TABS} active={tab} onChange={setTab} />
      {tab === 'shifts' && <ShiftsTab />}
      {tab === 'all' && <AllAttendanceTab />}
      {tab === 'by-shift' && <ByShiftTab />}
      {tab === 'by-date' && <ByDateTab />}
      {tab === 'import' && <ImportTab />}
    </div>
  );
}
