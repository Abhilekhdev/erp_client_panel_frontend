import { Coins, Layers, Wallet } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { HrmSubTabs } from '../components/HrmSubTabs';
import { HrmTabs } from '../components/HrmTabs';
import { AllPayrollsTab } from '../payroll/AllPayrollsTab';
import { PayComponentsTab } from '../payroll/PayComponentsTab';
import { PayrollGroupsTab } from '../payroll/PayrollGroupsTab';

const SUB_TABS = [
  { key: 'all', label: 'All Payrolls', icon: <Wallet className="h-4 w-4" /> },
  { key: 'groups', label: 'Payroll Groups', icon: <Layers className="h-4 w-4" /> },
  { key: 'components', label: 'Pay Components', icon: <Coins className="h-4 w-4" /> },
];

export function PayrollPage() {
  const [tab, setTab] = useState('all');

  return (
    <div>
      <PageHeader title="Payroll" breadcrumbs={[{ label: 'HRM', to: '/hrm' }, { label: 'Payroll' }]} />
      <HrmTabs />
      <HrmSubTabs tabs={SUB_TABS} active={tab} onChange={setTab} />
      {tab === 'all' && <AllPayrollsTab />}
      {tab === 'groups' && <PayrollGroupsTab />}
      {tab === 'components' && <PayComponentsTab />}
    </div>
  );
}
