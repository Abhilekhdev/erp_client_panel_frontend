import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, BookOpen, Lock, PiggyBank, Plus, Trash2, Unlock } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api/axios';
import { activateAccount, closeAccount, deleteAccount, listAccounts, type Account } from '../accounts.api';
import { AccountBookModal } from '../components/AccountBookModal';
import { AccountFormModal } from '../components/AccountFormModal';
import { AccountTypesTab } from '../components/AccountTypesTab';
import { MoveMoneyModal } from '../components/MoveMoneyModal';
import { money } from '../format';

type Tab = 'accounts' | 'types';

export function AccountsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('accounts');
  const { data, isLoading } = useQuery({ queryKey: ['accounts'], queryFn: () => listAccounts(true) });

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [move, setMove] = useState<'transfer' | 'deposit' | null>(null);
  const [bookId, setBookId] = useState<number | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['accounts'] });
  const toggleClosed = useMutation({
    mutationFn: (a: Account) => (a.isClosed ? activateAccount(a.id) : closeAccount(a.id)),
    onSuccess: invalidate,
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not update')),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteAccount(id),
    onSuccess: invalidate,
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });

  const openCreate = () => {
    setEditId(null);
    setFormOpen(true);
  };
  const openEdit = (id: number) => {
    setEditId(id);
    setFormOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Payment Accounts"
        description="Bank, cash and capital accounts — balances, transfers, deposits and their ledgers."
        breadcrumbs={[{ label: 'Payment Accounts' }]}
        actions={
          tab === 'accounts' && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setMove('transfer')}>
                <ArrowLeftRight className="h-4 w-4" /> Fund Transfer
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMove('deposit')}>
                <PiggyBank className="h-4 w-4" /> Deposit
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add Account
              </Button>
            </div>
          )
        }
      />

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b">
        {(['accounts', 'types'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'accounts' ? 'Accounts' : 'Account Types'}
          </button>
        ))}
      </div>

      {tab === 'types' ? (
        <AccountTypesTab />
      ) : (
        <>
          {data && data.unlinkedPaymentCount > 0 && (
            <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              {data.unlinkedPaymentCount} payment(s) are not linked to any account. Pick a Payment Account when
              recording payments so they show up here.
            </div>
          )}

          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Table>
              <THead>
                <TR className="bg-muted/40 hover:bg-muted/40">
                  <TH>Name</TH>
                  <TH>Account Number</TH>
                  <TH>Type</TH>
                  <TH className="text-right">Balance</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {isLoading ? (
                  <TR>
                    <TD colSpan={6} className="py-10 text-center text-muted-foreground">
                      Loading…
                    </TD>
                  </TR>
                ) : (data?.data ?? []).length === 0 ? (
                  <TR className="hover:bg-transparent">
                    <TD colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No accounts yet. Add your first payment account.
                    </TD>
                  </TR>
                ) : (
                  data!.data.map((a) => (
                    <TR key={a.id} className={a.isClosed ? 'opacity-60' : ''}>
                      <TD className="font-medium">{a.name}</TD>
                      <TD className="text-muted-foreground">{a.accountNumber}</TD>
                      <TD className="text-muted-foreground">{a.accountType ?? '—'}</TD>
                      <TD className="text-right font-medium tabular-nums">{money(a.balance)}</TD>
                      <TD>
                        {a.isClosed ? (
                          <Badge variant="secondary">Closed</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </TD>
                      <TD className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="outline" size="sm" onClick={() => setBookId(a.id)} title="Account book">
                            <BookOpen className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEdit(a.id)} title="Edit">
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleClosed.mutate(a)}
                            title={a.isClosed ? 'Activate' : 'Close'}
                          >
                            {a.isClosed ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => window.confirm(`Delete "${a.name}"?`) && remove.mutate(a.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </>
      )}

      <AccountFormModal open={formOpen} accountId={editId} onClose={() => setFormOpen(false)} />
      {move && <MoveMoneyModal open mode={move} onClose={() => setMove(null)} />}
      {bookId != null && <AccountBookModal accountId={bookId} onClose={() => setBookId(null)} />}
    </div>
  );
}
