import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  createAccount,
  getAccount,
  groupedAccountTypes,
  updateAccount,
  type AccountDetailRow,
  type SaveAccountBody,
} from '../accounts.api';

export function AccountFormModal({
  open,
  accountId,
  onClose,
}: {
  open: boolean;
  accountId: number | null; // null = create
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = accountId != null;

  const { data: types } = useQuery({ queryKey: ['account-types-grouped'], queryFn: groupedAccountTypes, enabled: open });
  const { data: existing } = useQuery({
    queryKey: ['account', accountId],
    queryFn: () => getAccount(accountId as number),
    enabled: open && isEdit,
  });

  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountTypeId, setAccountTypeId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [note, setNote] = useState('');
  const [details, setDetails] = useState<AccountDetailRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (isEdit && existing) {
      setName(existing.name);
      setAccountNumber(existing.accountNumber);
      setAccountTypeId(existing.accountTypeId ? String(existing.accountTypeId) : '');
      setNote(existing.note ?? '');
      setDetails(existing.accountDetails ?? []);
    } else if (!isEdit) {
      setName('');
      setAccountNumber('');
      setAccountTypeId('');
      setOpeningBalance('');
      setNote('');
      setDetails([]);
    }
    setError('');
  }, [open, isEdit, existing]);

  const save = useMutation({
    mutationFn: () => {
      const body: SaveAccountBody = {
        name: name.trim(),
        accountNumber: accountNumber.trim(),
        accountTypeId: accountTypeId ? Number(accountTypeId) : null,
        accountDetails: details.filter((d) => d.label || d.value),
        note: note.trim() || null,
        ...(isEdit ? {} : { openingBalance: openingBalance ? Number(openingBalance) : 0 }),
      };
      return isEdit ? updateAccount(accountId as number, body) : createAccount(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save account')),
  });

  const onSave = () => {
    if (!name.trim()) return setError('Account name is required');
    if (!accountNumber.trim()) return setError('Account number is required');
    setError('');
    save.mutate();
  };

  const setDetail = (i: number, patch: Partial<AccountDetailRow>) =>
    setDetails((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Account' : 'Add Account'}
      className="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} isLoading={save.isPending}>
            {isEdit ? 'Update' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>
            Name <span className="text-destructive">*</span>
          </Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cash in hand" />
        </div>
        <div className="space-y-1.5">
          <Label>
            Account Number <span className="text-destructive">*</span>
          </Label>
          <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Account Type</Label>
          <Select value={accountTypeId} onChange={(e) => setAccountTypeId(e.target.value)}>
            <option value="">— None —</option>
            {(types ?? []).map((p) =>
              p.children.length ? (
                <optgroup key={p.id} label={p.name}>
                  <option value={p.id}>{p.name}</option>
                  {p.children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ),
            )}
          </Select>
        </div>
        {!isEdit && (
          <div className="space-y-1.5">
            <Label>Opening Balance</Label>
            <Input type="number" step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Note</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="sm:col-span-2">
          <div className="mb-1.5 flex items-center justify-between">
            <Label>Account Details</Label>
            {details.length < 6 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDetails((r) => [...r, { label: '', value: '' }])}
              >
                <Plus className="h-4 w-4" /> Add row
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {details.map((d, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Label" value={d.label} onChange={(e) => setDetail(i, { label: e.target.value })} />
                <Input placeholder="Value" value={d.value} onChange={(e) => setDetail(i, { value: e.target.value })} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDetails((rows) => rows.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      </div>
    </Modal>
  );
}
