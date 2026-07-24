import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import { deleteSell, listSuspendedSells } from '../sells.api';

const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

/** GOURI's suspended-sales list — parked POS bills you can resume into the till or discard. */
export function PosSuspendedModal({ locationId, onClose, onResume }: {
  locationId?: number;
  onClose: () => void;
  onResume: (id: number) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data = [], isLoading } = useQuery({
    queryKey: ['suspended-sells', locationId],
    queryFn: () => listSuspendedSells(locationId),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteSell(id),
    onSuccess: () => { toast.success('Suspended sale discarded'); qc.invalidateQueries({ queryKey: ['suspended-sells'] }); },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not discard')),
  });

  return (
    <Modal open onClose={onClose} title="Suspended sales" description="Parked bills — resume one into the till or discard it." className="max-w-2xl">
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No suspended sales.</p>
      ) : (
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {data.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  <span className="font-mono">{s.refNo}</span>
                  <span className="text-muted-foreground">· {s.customer || 'Walk-In Customer'}</span>
                </div>
                <div className="text-xs text-muted-foreground">{fmtDate(s.transactionDate)} · {s.items} item(s){s.note ? ` · ${s.note}` : ''}</div>
              </div>
              <div className="text-right text-sm font-semibold tabular-nums">{formatMoney(s.finalTotal)}</div>
              <Button type="button" size="sm" onClick={() => onResume(s.id)}><RotateCcw className="h-4 w-4" />Resume</Button>
              <Button type="button" variant="destructive" size="sm" title="Discard" onClick={() => window.confirm(`Discard ${s.refNo}?`) && remove.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
