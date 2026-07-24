import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { createContact } from '@/features/contacts/contacts.api';
import { getApiErrorMessage } from '@/lib/api/axios';

/**
 * GOURI's quick "add customer" (+) button on the POS bar — create a walk-in-style customer without
 * leaving the till. Minimal fields (name + mobile); the full customer form lives under Contacts.
 * On success it hands the new customer's id back so the POS can pre-select it.
 */
export function PosAddCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number, name: string) => void }) {
  const toast = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  const create = useMutation({
    mutationFn: () =>
      createContact({
        type: 'customer',
        contact_type_radio: 'individual',
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        mobile: mobile.trim(),
        email: email.trim() || null,
      }),
    onSuccess: (c) => {
      toast.success(`Customer ${c.name} added`);
      onCreated(c.id, c.name);
    },
    onError: (e: unknown) => toast.error(getApiErrorMessage(e, 'Could not add customer')),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return toast.error('Enter a first name');
    if (!mobile.trim()) return toast.error('Enter a mobile number');
    create.mutate();
  };

  return (
    <Modal open onClose={onClose} title="Add customer" description="Quick-create a customer for this sale." className="max-w-lg">
      <form className="space-y-3" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="qc-fn">First name *</Label><Input id="qc-fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus /></div>
          <div><Label htmlFor="qc-ln">Last name</Label><Input id="qc-ln" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
          <div><Label htmlFor="qc-mob">Mobile *</Label><Input id="qc-mob" value={mobile} onChange={(e) => setMobile(e.target.value)} /></div>
          <div><Label htmlFor="qc-em">Email</Label><Input id="qc-em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={create.isPending}>{create.isPending ? 'Adding…' : 'Add customer'}</Button>
        </div>
      </form>
    </Modal>
  );
}
