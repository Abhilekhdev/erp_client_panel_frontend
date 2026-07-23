import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api/axios';
import { accountsDropdown, deposit, fundTransfer } from '../accounts.api';

/** Fund Transfer (from → to) and Deposit (into, optionally from) share this form. */
export function MoveMoneyModal({
  open,
  mode,
  onClose,
}: {
  open: boolean;
  mode: 'transfer' | 'deposit';
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: accounts } = useQuery({ queryKey: ['accounts-dropdown'], queryFn: accountsDropdown, enabled: open });

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setFromId('');
      setToId('');
      setAmount('');
      setNote('');
      setError('');
    }
  }, [open]);

  const save = useMutation({
    mutationFn: () => {
      const amt = Number(amount);
      if (mode === 'transfer') {
        return fundTransfer({ fromAccountId: Number(fromId), toAccountId: Number(toId), amount: amt, note });
      }
      return deposit({
        toAccountId: Number(toId),
        fromAccountId: fromId ? Number(fromId) : null,
        amount: amt,
        note,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not complete')),
  });

  const onSave = () => {
    if (mode === 'transfer' && !fromId) return setError('Choose the source account');
    if (!toId) return setError('Choose the destination account');
    if (!amount || Number(amount) <= 0) return setError('Enter an amount greater than zero');
    setError('');
    save.mutate();
  };

  const opts = accounts ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'transfer' ? 'Fund Transfer' : 'Deposit'}
      description={
        mode === 'transfer'
          ? 'Move money from one account to another.'
          : 'Add money to an account (optionally drawn from another).'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} isLoading={save.isPending}>
            {mode === 'transfer' ? 'Transfer' : 'Deposit'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>
            {mode === 'transfer' ? 'From account' : 'From account (optional)'}
            {mode === 'transfer' && <span className="text-destructive"> *</span>}
          </Label>
          <Select value={fromId} onChange={(e) => setFromId(e.target.value)}>
            <option value="">{mode === 'transfer' ? 'Select account' : '— None —'}</option>
            {opts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>
            {mode === 'transfer' ? 'To account' : 'Deposit to'} <span className="text-destructive">*</span>
          </Label>
          <Select value={toId} onChange={(e) => setToId(e.target.value)}>
            <option value="">Select account</option>
            {opts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>
            Amount <span className="text-destructive">*</span>
          </Label>
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Note</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      </div>
    </Modal>
  );
}
