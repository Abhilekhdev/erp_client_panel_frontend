import { Badge } from '@/components/ui/badge';
import type { PaymentStatus, SellStatus } from '../sells.api';

export function SellStatusBadge({ status }: { status: SellStatus }) {
  if (status === 'final') return <Badge variant="success">Final</Badge>;
  if (status === 'quotation') return <Badge variant="default">Quotation</Badge>;
  if (status === 'proforma') return <Badge variant="default">Proforma</Badge>;
  return <Badge variant="secondary">Draft</Badge>;
}

export function PaymentBadge({ status, overdue }: { status: PaymentStatus; overdue?: boolean }) {
  if (overdue && status !== 'paid') {
    return <Badge variant="destructive" title="Past the agreed pay term">{status === 'partial' ? 'Partial · Overdue' : 'Overdue'}</Badge>;
  }
  if (status === 'paid') return <Badge variant="success">Paid</Badge>;
  if (status === 'partial') return <Badge variant="default">Partial</Badge>;
  return <Badge variant="warning">Due</Badge>;
}
