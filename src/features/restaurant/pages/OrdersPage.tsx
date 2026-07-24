import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api/axios';
import { listServiceStaff, markServed, waiterOrders } from '../restaurant.api';
import { LineOrdersTable } from '../components/LineOrdersTable';

/** GOURI's Orders screen — a waiter's line orders (cooked / received), with "Mark as served". */
export function OrdersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [waiterId, setWaiterId] = useState('');

  const { data: staff = [] } = useQuery({ queryKey: ['res-service-staff', undefined], queryFn: () => listServiceStaff() });
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['waiter-orders', waiterId],
    queryFn: () => waiterOrders({ waiterId: waiterId ? Number(waiterId) : undefined }),
    refetchInterval: 30_000,
  });

  const serve = useMutation({
    mutationFn: (lineId: number) => markServed(lineId),
    onSuccess: () => { toast.success('Marked served'); qc.invalidateQueries({ queryKey: ['waiter-orders'] }); },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not update')),
  });

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Items to be served to tables."
        breadcrumbs={[{ label: 'Restaurant' }, { label: 'Orders' }]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={waiterId} onChange={(e) => setWaiterId(e.target.value)} className="h-9 w-44">
              <option value="">All staff</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className="h-4 w-4" />Refresh</Button>
          </div>
        }
      />
      <LineOrdersTable
        rows={data}
        loading={isLoading}
        emptyMessage="No orders to serve."
        action={(r) => (
          <Button size="sm" disabled={serve.isPending} onClick={() => serve.mutate(r.lineId)}><CheckCircle2 className="h-4 w-4" />Mark served</Button>
        )}
      />
    </div>
  );
}
