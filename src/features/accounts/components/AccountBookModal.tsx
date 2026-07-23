import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import { deleteAccountTransaction, getAccountBook } from '../accounts.api';
import { money, subTypeLabel } from '../format';

export function AccountBookModal({ accountId, onClose }: { accountId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { has } = usePermissions();
  const canDelete = has('delete_account_transaction');
  const { data, isLoading } = useQuery({
    queryKey: ['account-book', accountId],
    queryFn: () => getAccountBook(accountId),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteAccountTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-book', accountId] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={data ? `Account Book — ${data.account.name}` : 'Account Book'}
      description={data ? `Current balance: ${money(data.account.balance)}` : undefined}
      className="max-w-3xl"
    >
      <div className="max-h-[60vh] overflow-auto rounded-lg border">
        <Table>
          <THead>
            <TR className="bg-muted/40 hover:bg-muted/40">
              <TH>Date</TH>
              <TH>Type</TH>
              <TH>Ref</TH>
              <TH className="text-right">Debit</TH>
              <TH className="text-right">Credit</TH>
              <TH className="text-right">Balance</TH>
              {canDelete && <TH />}
            </TR>
          </THead>
          <TBody>
            {isLoading ? (
              <TR>
                <TD colSpan={7} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TD>
              </TR>
            ) : (data?.ledger ?? []).length === 0 ? (
              <TR className="hover:bg-transparent">
                <TD colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No transactions on this account yet.
                </TD>
              </TR>
            ) : (
              data!.ledger.map((r) => (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</TD>
                  <TD>
                    <Badge variant="secondary">{subTypeLabel(r.subType, r.transactionType)}</Badge>
                  </TD>
                  <TD className="text-muted-foreground">{r.refNo ?? '—'}</TD>
                  <TD className="text-right tabular-nums">{r.debit ? money(r.debit) : '—'}</TD>
                  <TD className="text-right tabular-nums">{r.credit ? money(r.credit) : '—'}</TD>
                  <TD className="text-right font-medium tabular-nums">{money(r.balance)}</TD>
                  {canDelete && (
                    <TD className="text-right">
                      {r.editable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.confirm('Delete this entry?') && remove.mutate(r.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TD>
                  )}
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </div>
    </Modal>
  );
}
