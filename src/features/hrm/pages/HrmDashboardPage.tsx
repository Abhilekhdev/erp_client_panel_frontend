import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Coins, LogOut, Target, UserCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatMoney } from '@/lib/currency';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/useAuth';
import { HrmTabs } from '../components/HrmTabs';
import { getHrmDashboard } from '../hrm-dashboard.api';

function NoData({ colSpan = 1 }: { colSpan?: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-6 text-center text-sm text-muted-foreground">
        No data
      </td>
    </tr>
  );
}

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground';
const td = 'px-3 py-2 text-sm border-t border-border';

export function HrmDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = Boolean(user?.isBusinessAdmin);
  const { data } = useQuery({ queryKey: ['hrm-dashboard'], queryFn: getHrmDashboard });

  return (
    <div>
      <PageHeader title="HR Dashboard" breadcrumbs={[{ label: 'HRM' }]} />
      <HrmTabs />

      {/* Row 1 — visible to everyone */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* My leaves */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 border-b pb-3">
            <LogOut className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">My leaves</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <tbody>
                <NoData colSpan={2} />
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* My sales targets */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 border-b pb-3">
            <Target className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">My sales targets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-semibold">Target achieved last month:</p>
                <p className="text-lg font-semibold text-emerald-600">{formatMoney(0)}</p>
              </div>
              <div>
                <p className="text-sm font-semibold">Target achieved this month:</p>
                <p className="text-lg font-semibold text-emerald-600">{formatMoney(0)}</p>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Targets</th>
                  <th className={th}>Commission percent</th>
                </tr>
              </thead>
              <tbody>
                <NoData colSpan={2} />
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* My Payrolls */}
        <div className="flex items-center justify-center py-4">
          <Button variant="success" size="lg" onClick={() => navigate('/hrm/payroll')}>
            <Coins className="h-5 w-5" />
            My Payrolls
          </Button>
        </div>
      </div>

      {/* Admin summary */}
      {isAdmin && (
        <>
          <div className="my-6 border-t border-border" />
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Users + departments */}
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center gap-3 rounded-lg bg-sky-500/10 p-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500 text-white">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Users
                    </p>
                    <p className="text-xl font-semibold">{data?.userCount ?? 0}</p>
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={th}>Department</th>
                      <th className={th}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.departments.length ? (
                      data.departments.map((d) => (
                        <tr key={d.id}>
                          <td className={td}>{d.name}</td>
                          <td className={td}>{d.userCount}</td>
                        </tr>
                      ))
                    ) : (
                      <NoData colSpan={2} />
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Leaves today / upcoming */}
            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0 border-b pb-3">
                <LogOut className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Leaves</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <th className="bg-muted/50 px-3 py-1.5 text-left text-xs font-semibold" colSpan={2}>
                        Today
                      </th>
                    </tr>
                    <NoData colSpan={2} />
                    <tr>
                      <th className="bg-muted/50 px-3 py-1.5 text-left text-xs font-semibold" colSpan={2}>
                        Upcoming
                      </th>
                    </tr>
                    <NoData colSpan={2} />
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Today's attendance */}
            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0 border-b pb-3">
                <UserCheck className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Today's attendance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={th}>Employee</th>
                      <th className={th}>Clock in</th>
                      <th className={th}>Clock out</th>
                    </tr>
                  </thead>
                  <tbody>
                    <NoData colSpan={3} />
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Day's off */}
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0 border-b pb-3">
                <CalendarClock className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Day's Off</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full">
                  <tbody>
                    <NoData colSpan={2} />
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
