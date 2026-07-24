import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import { closeRegister, getRegisterDetails, openRegister, type RegisterDetails } from '../cash-register.api';

/** Open a register with a starting cash float — GOURI's `cash_register.create`. */
export function PosRegisterOpenModal({ locations, defaultLocationId, onClose, onOpened }: {
  locations: { id: number; name: string }[];
  defaultLocationId?: number;
  onClose: () => void;
  onOpened: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [locationId, setLocationId] = useState(defaultLocationId ? String(defaultLocationId) : '');
  const [amount, setAmount] = useState('0');

  const open = useMutation({
    mutationFn: () => openRegister({ location_id: locationId ? Number(locationId) : undefined, initial_amount: Number(amount) || 0 }),
    onSuccess: () => { toast.success('Register opened'); qc.invalidateQueries({ queryKey: ['register-current'] }); onOpened(); },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not open the register')),
  });

  return (
    <Modal open onClose={onClose} title="Open register" description="Start a shift by entering the cash currently in the drawer." className="max-w-md">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); open.mutate(); }}>
        <div>
          <Label htmlFor="rg-loc">Location</Label>
          <Select id="rg-loc" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">—</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="rg-amt">Cash in hand</Label>
          <Input id="rg-amt" type="number" step="0.0001" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={open.isPending}>{open.isPending ? 'Opening…' : 'Open register'}</Button>
        </div>
      </form>
    </Modal>
  );
}

/** Live register details (the POS "briefcase" button). */
export function PosRegisterDetailsModal({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['register-details'], queryFn: getRegisterDetails });
  return (
    <Modal open onClose={onClose} title="Register details" description={data ? `Opened ${new Date(data.openedAt).toLocaleString()}` : undefined} className="max-w-lg">
      {isLoading || !data ? <div className="flex justify-center py-10"><Spinner /></div> : <RegisterBreakdown d={data} />}
    </Modal>
  );
}

/** Close the register — enter what was physically counted. */
export function PosRegisterCloseModal({ onClose, onClosed }: { onClose: () => void; onClosed: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data, isLoading } = useQuery({ queryKey: ['register-details'], queryFn: getRegisterDetails });
  const [amount, setAmount] = useState<string | null>(null);
  const [cardSlips, setCardSlips] = useState<string | null>(null);
  const [cheques, setCheques] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const close = useMutation({
    mutationFn: () => closeRegister({
      closing_amount: Number(amount ?? data?.expectedCash ?? 0),
      total_card_slips: Number(cardSlips ?? data?.cardSlips ?? 0),
      total_cheques: Number(cheques ?? data?.chequeCount ?? 0),
      closing_note: note || undefined,
    }),
    onSuccess: () => { toast.success('Register closed'); qc.invalidateQueries({ queryKey: ['register-current'] }); onClosed(); },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not close the register')),
  });

  return (
    <Modal open onClose={onClose} title="Close register" description="Enter the counted totals to close the shift." className="max-w-lg">
      {isLoading || !data ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); close.mutate(); }}>
          <RegisterBreakdown d={data} />
          <div className="grid gap-3 sm:grid-cols-3 border-t pt-3">
            <div>
              <Label htmlFor="cl-amt">Total cash (counted)</Label>
              <Input id="cl-amt" type="number" step="0.0001" min="0" value={amount ?? String(data.expectedCash)} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cl-cards">Card slips</Label>
              <Input id="cl-cards" type="number" min="0" value={cardSlips ?? String(data.cardSlips)} onChange={(e) => setCardSlips(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cl-chq">Cheques</Label>
              <Input id="cl-chq" type="number" min="0" value={cheques ?? String(data.chequeCount)} onChange={(e) => setCheques(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="cl-note">Closing note</Label>
            <Input id="cl-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="destructive" size="sm" disabled={close.isPending}>{close.isPending ? 'Closing…' : 'Close register'}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function RegisterBreakdown({ d }: { d: RegisterDetails }) {
  const methods = Array.from(new Set([...Object.keys(d.saleByMethod), ...Object.keys(d.refundByMethod), ...Object.keys(d.expenseByMethod)]));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Cash in hand" value={formatMoney(d.cashInHand)} />
        <Tile label="Total sale" value={formatMoney(d.totalSale)} />
        <Tile label="Refunds" value={formatMoney(d.totalRefund)} />
        <Tile label="Expected cash" value={formatMoney(d.expectedCash)} strong />
      </div>
      {methods.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">Method</th><th className="px-3 py-2 text-right">Sales</th><th className="px-3 py-2 text-right">Refunds</th><th className="px-3 py-2 text-right">Expenses</th></tr>
            </thead>
            <tbody className="divide-y">
              {methods.map((m) => (
                <tr key={m}>
                  <td className="px-3 py-2 capitalize">{m.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(d.saleByMethod[m] ?? 0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(d.refundByMethod[m] ?? 0)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMoney(d.expenseByMethod[m] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="rounded-lg border px-3 py-2"><div className="text-xs text-muted-foreground">{label}</div><div className={`tabular-nums ${strong ? 'text-base font-semibold' : 'text-sm'}`}>{value}</div></div>;
}
