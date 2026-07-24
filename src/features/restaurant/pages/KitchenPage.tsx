import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChefHat, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api/axios';
import { kitchenOrders, markCooked } from '../restaurant.api';
import { LineOrdersTable } from '../components/LineOrdersTable';

/** GOURI's Kitchen screen — the queue of ordered ("received") lines waiting to be cooked. */
export function KitchenPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => kitchenOrders(),
    refetchInterval: 30_000, // GOURI auto-refreshes the kitchen board.
  });

  const cook = useMutation({
    mutationFn: (lineId: number) => markCooked(lineId),
    onSuccess: () => { toast.success('Marked cooked'); qc.invalidateQueries({ queryKey: ['kitchen-orders'] }); },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not update')),
  });

  return (
    <div>
      <PageHeader
        title="Kitchen"
        description="Ordered items waiting to be cooked."
        breadcrumbs={[{ label: 'Restaurant' }, { label: 'Kitchen' }]}
        actions={<Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className="h-4 w-4" />Refresh</Button>}
      />
      <LineOrdersTable
        rows={data}
        loading={isLoading}
        emptyMessage="No items in the kitchen queue."
        action={(r) => (
          <Button size="sm" disabled={cook.isPending} onClick={() => cook.mutate(r.lineId)}><ChefHat className="h-4 w-4" />Mark cooked</Button>
        )}
      />
    </div>
  );
}
