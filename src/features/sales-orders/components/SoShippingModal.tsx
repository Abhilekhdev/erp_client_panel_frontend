import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api/axios';
import { updateSoShipping, type SalesOrderListItem, type ShippingStatus } from '../orders.api';

const SHIPPING: ShippingStatus[] = ['ordered', 'packed', 'shipped', 'delivered', 'cancelled'];

export function SoShippingModal({ order, onClose }: { order: SalesOrderListItem | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState<ShippingStatus>('ordered');
  const [deliveredTo, setDeliveredTo] = useState('');
  useEffect(() => { if (order) { setStatus(order.shippingStatus ?? 'ordered'); setDeliveredTo(''); } }, [order?.id]);

  const save = useMutation({
    mutationFn: () => updateSoShipping(order!.id, { shipping_status: status, delivered_to: deliveredTo || undefined }),
    onSuccess: () => { toast.success('Shipping updated'); qc.invalidateQueries({ queryKey: ['sales-orders'] }); onClose(); },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not update shipping')),
  });

  return (
    <Modal open={order != null} onClose={onClose} title="Edit shipping" description={order ? `Order ${order.refNo}` : undefined}
      footer={<><Button variant="outline" size="sm" onClick={onClose}>Cancel</Button><Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Update'}</Button></>}>
      <div className="space-y-3">
        <div><Label htmlFor="ss">Shipping status</Label><Select id="ss" value={status} onChange={(e) => setStatus(e.target.value as ShippingStatus)}>{SHIPPING.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</Select></div>
        <div><Label htmlFor="dt">Delivered to</Label><Input id="dt" value={deliveredTo} onChange={(e) => setDeliveredTo(e.target.value)} /></div>
      </div>
    </Modal>
  );
}
