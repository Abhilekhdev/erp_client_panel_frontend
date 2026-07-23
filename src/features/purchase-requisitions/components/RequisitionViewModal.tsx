import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { getRequisition } from '../requisitions.api';

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '—';

export function RequisitionViewModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data: r, isLoading } = useQuery({
    queryKey: ['requisition', id],
    queryFn: () => getRequisition(id as number),
    enabled: id != null,
  });

  return (
    <Modal
      open={id != null}
      onClose={onClose}
      title={r ? `Requisition ${r.refNo}` : 'Requisition'}
      description={r ? `${r.location} · required by ${formatDate(r.deliveryDate)}` : undefined}
      className="max-w-3xl"
    >
      {isLoading || !r ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={r.status === 'completed' ? 'success' : r.status === 'partial' ? 'warning' : 'default'}>
              {r.status}
            </Badge>
            <span className="text-muted-foreground">Raised by {r.addedBy || '—'}</span>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-right">Alert qty</th>
                  <th className="px-3 py-2 text-right">Required</th>
                  <th className="px-3 py-2 text-right" title="Still to be ordered">
                    Remaining
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {r.lines.map((l, i) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{l.product}</div>
                      {l.variation && <div className="text-xs text-muted-foreground">{l.variation}</div>}
                      <div className="text-xs text-muted-foreground">{l.sku}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {l.alertQuantity ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.quantityRemaining}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {r.additionalNotes && (
            <div className="rounded-lg border p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{r.additionalNotes}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
