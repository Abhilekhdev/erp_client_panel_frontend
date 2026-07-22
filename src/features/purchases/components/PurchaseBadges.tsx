import { Badge } from '@/components/ui/badge';
import type { PaymentStatus, PurchaseStatus } from '../purchases.api';

const STATUS_LABEL: Record<PurchaseStatus, string> = {
  received: 'Received',
  pending: 'Pending',
  ordered: 'Ordered',
};

/** GOURI's colours: received green, pending red, ordered aqua. */
const STATUS_VARIANT: Record<PurchaseStatus, 'success' | 'destructive' | 'default'> = {
  received: 'success',
  pending: 'destructive',
  ordered: 'default',
};

export function StatusBadge({ status }: { status: PurchaseStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

/**
 * Payment state. `overdue` is not stored — it is due/partial past the credit term, so it is
 * passed in alongside rather than folded into the status itself.
 */
export function PaymentBadge({
  status,
  overdue,
}: {
  status: PaymentStatus;
  overdue?: boolean;
}) {
  if (overdue && status !== 'paid') {
    return (
      <Badge variant="destructive" title="Past the agreed pay term">
        {status === 'partial' ? 'Partial · Overdue' : 'Overdue'}
      </Badge>
    );
  }
  if (status === 'paid') return <Badge variant="success">Paid</Badge>;
  if (status === 'partial') return <Badge variant="default">Partial</Badge>;
  return <Badge variant="warning">Due</Badge>;
}

export function ApprovalBadge({ isApproved }: { isApproved: boolean }) {
  return isApproved ? (
    <Badge variant="success">Approved</Badge>
  ) : (
    <Badge variant="destructive" title="Stock is not counted until this is approved">
      Pending
    </Badge>
  );
}
