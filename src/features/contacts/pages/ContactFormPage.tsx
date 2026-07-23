import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api/axios';
import { cn } from '@/lib/utils';
import { createContact, getContact, getContactMeta, updateContact } from '../contacts.api';
import type { ContactDetail, ContactFormBody, ContactListType } from '../contacts.types';

interface FormState {
  type: string;
  contactTypeRadio: 'individual' | 'business';
  supplierBusinessName: string;
  prefix: string;
  firstName: string;
  middleName: string;
  lastName: string;
  contactId: string;
  mobile: string;
  alternateNumber: string;
  landline: string;
  email: string;
  dob: string;
  taxNumber: string;
  openingBalance: string;
  payTermNumber: string;
  payTermType: string;
  creditLimit: string;
  customerGroupId: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  customField1: string;
  customField2: string;
  customField3: string;
  customField4: string;
  shippingAddress: string;
  assignedToUsers: number[];
}

const empty = (listType: ContactListType): FormState => ({
  type: listType,
  contactTypeRadio: 'individual',
  supplierBusinessName: '', prefix: '', firstName: '', middleName: '', lastName: '',
  contactId: '', mobile: '', alternateNumber: '', landline: '', email: '', dob: '',
  taxNumber: '', openingBalance: '0', payTermNumber: '', payTermType: 'months',
  creditLimit: '', customerGroupId: '',
  addressLine1: '', addressLine2: '', city: '', state: '', country: '', zipCode: '',
  customField1: '', customField2: '', customField3: '', customField4: '',
  shippingAddress: '', assignedToUsers: [],
});

function hydrate(c: ContactDetail): FormState {
  return {
    type: c.type,
    contactTypeRadio: c.contactTypeRadio,
    supplierBusinessName: c.supplierBusinessName, prefix: c.prefix, firstName: c.firstName,
    middleName: c.middleName, lastName: c.lastName, contactId: c.contactId,
    mobile: c.mobile, alternateNumber: c.alternateNumber, landline: c.landline, email: c.email,
    dob: c.dob, taxNumber: c.taxNumber, openingBalance: c.openingBalance != null ? String(c.openingBalance) : '0',
    payTermNumber: c.payTermNumber != null ? String(c.payTermNumber) : '',
    payTermType: c.payTermType ?? 'months',
    creditLimit: c.creditLimit != null ? String(c.creditLimit) : '',
    customerGroupId: c.customerGroupId ? String(c.customerGroupId) : '',
    addressLine1: c.addressLine1, addressLine2: c.addressLine2, city: c.city, state: c.state,
    country: c.country, zipCode: c.zipCode,
    customField1: c.customField1, customField2: c.customField2, customField3: c.customField3,
    customField4: c.customField4, shippingAddress: c.shippingAddress,
    assignedToUsers: c.assignedToUsers,
  };
}

function toBody(f: FormState): ContactFormBody {
  const isBusiness = f.contactTypeRadio === 'business';
  return {
    type: f.type,
    contact_type_radio: f.contactTypeRadio,
    supplier_business_name: isBusiness ? f.supplierBusinessName : null,
    prefix: isBusiness ? null : f.prefix,
    first_name: isBusiness ? null : f.firstName,
    middle_name: isBusiness ? null : f.middleName,
    last_name: isBusiness ? null : f.lastName,
    contact_id: f.contactId || null,
    email: f.email || null,
    tax_number: f.taxNumber || null,
    customer_group_id: f.customerGroupId ? Number(f.customerGroupId) : null,
    pay_term_number: f.payTermNumber === '' ? null : Number(f.payTermNumber),
    pay_term_type: f.payTermNumber === '' ? null : f.payTermType,
    credit_limit: f.creditLimit === '' ? null : Number(f.creditLimit),
    opening_balance: f.openingBalance === '' ? 0 : Number(f.openingBalance),
    mobile: f.mobile,
    landline: f.landline || null,
    alternate_number: f.alternateNumber || null,
    address_line_1: f.addressLine1 || null,
    address_line_2: f.addressLine2 || null,
    city: f.city || null,
    state: f.state || null,
    country: f.country || null,
    zip_code: f.zipCode || null,
    dob: f.dob || null,
    custom_field1: f.customField1 || null,
    custom_field2: f.customField2 || null,
    custom_field3: f.customField3 || null,
    custom_field4: f.customField4 || null,
    shipping_address: f.shippingAddress || null,
    assigned_to_users: f.assignedToUsers,
  };
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="mb-5">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  required,
  htmlFor,
  className,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ContactFormPage({ listType }: { listType: ContactListType }) {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const contactId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const backTo = listType === 'supplier' ? '/suppliers' : '/customers';

  const { data: meta } = useQuery({ queryKey: ['contact-meta'], queryFn: getContactMeta });
  const { data: contact } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => getContact(contactId as number),
    enabled: isEdit,
  });

  const [form, setForm] = useState<FormState>(empty(listType));
  const [error, setError] = useState('');
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (isEdit && contact) setForm(hydrate(contact));
  }, [isEdit, contact]);

  const isCustomerType = form.type === 'customer' || form.type === 'both';
  const isBusiness = form.contactTypeRadio === 'business';

  const save = useMutation({
    mutationFn: () => {
      const body = toBody(form);
      return isEdit ? updateContact(contactId as number, body) : createContact(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      navigate(backTo);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save contact')),
  });

  const onSubmit = () => {
    if (isBusiness && !form.supplierBusinessName.trim()) return setError('Business name is required');
    if (!isBusiness && !form.firstName.trim()) return setError('First name is required');
    if (!form.mobile.trim()) return setError('Mobile is required');
    setError('');
    save.mutate();
  };

  const title = `${isEdit ? 'Edit' : 'Add'} ${listType === 'supplier' ? 'Supplier' : 'Customer'}`;
  const loading = !meta || (isEdit && !contact);
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title={title} breadcrumbs={[{ label: 'Contacts', to: backTo }, { label: isEdit ? 'Edit' : 'Add' }]} />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={title}
        description="Identity, contact details, terms and address."
        breadcrumbs={[{ label: 'Contacts', to: backTo }, { label: isEdit ? 'Edit' : 'Add' }]}
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="whitespace-pre-line">{error}</span>
        </div>
      )}

      <Section title="Contact information" description="Who this contact is and how to reach them.">
        <Field label="Contact type" required>
          <Select value={form.type} onChange={(e) => set('type', e.target.value)}>
            <option value="supplier">Supplier</option>
            <option value="customer">Customer</option>
            <option value="both">Both</option>
          </Select>
        </Field>
        <Field label="Individual / Business" className="sm:col-span-2">
          <div className="flex items-center gap-6 pt-2">
            {(['individual', 'business'] as const).map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm capitalize">
                <input
                  type="radio"
                  name="contactTypeRadio"
                  checked={form.contactTypeRadio === opt}
                  onChange={() => set('contactTypeRadio', opt)}
                  className="h-4 w-4 accent-primary"
                />
                {opt}
              </label>
            ))}
          </div>
        </Field>

        {isBusiness ? (
          <Field label="Business name" required className="sm:col-span-2 lg:col-span-3">
            <Input
              value={form.supplierBusinessName}
              onChange={(e) => set('supplierBusinessName', e.target.value)}
            />
          </Field>
        ) : (
          <>
            <Field label="Prefix">
              <Input value={form.prefix} onChange={(e) => set('prefix', e.target.value)} placeholder="Mr / Ms" />
            </Field>
            <Field label="First name" required>
              <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            </Field>
            <Field label="Middle name">
              <Input value={form.middleName} onChange={(e) => set('middleName', e.target.value)} />
            </Field>
            <Field label="Last name">
              <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
            </Field>
            {isBusiness && <div className="hidden lg:block" />}
          </>
        )}

        <Field label="Contact ID" hint="Leave empty to auto-generate">
          <Input value={form.contactId} onChange={(e) => set('contactId', e.target.value)} />
        </Field>
        <Field label="Mobile" required>
          <Input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
        </Field>
        <Field label="Alternate number">
          <Input value={form.alternateNumber} onChange={(e) => set('alternateNumber', e.target.value)} />
        </Field>
        <Field label="Landline">
          <Input value={form.landline} onChange={(e) => set('landline', e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        {!isBusiness && (
          <Field label="Date of birth">
            <Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
          </Field>
        )}
      </Section>

      <Section title="Tax & terms" description="Tax number, payment terms and credit.">
        <Field label="Tax number">
          <Input value={form.taxNumber} onChange={(e) => set('taxNumber', e.target.value)} />
        </Field>
        <Field
          label="Opening balance"
          hint="What this contact already owed you (customer) or you owed them (supplier) at start"
        >
          <Input
            type="number"
            step="0.0001"
            min="0"
            value={form.openingBalance}
            onChange={(e) => set('openingBalance', e.target.value)}
          />
        </Field>
        <Field label="Pay term">
          <div className="flex gap-2">
            <Input
              type="number"
              className="w-1/2"
              value={form.payTermNumber}
              onChange={(e) => set('payTermNumber', e.target.value)}
              placeholder="0"
            />
            <Select
              className="w-1/2"
              value={form.payTermType}
              onChange={(e) => set('payTermType', e.target.value)}
            >
              <option value="months">Months</option>
              <option value="days">Days</option>
            </Select>
          </div>
        </Field>
        {isCustomerType && (
          <>
            <Field label="Credit limit" hint="Leave empty for no limit">
              <Input
                type="number"
                step="0.01"
                value={form.creditLimit}
                onChange={(e) => set('creditLimit', e.target.value)}
              />
            </Field>
            <Field label="Customer group">
              <Select value={form.customerGroupId} onChange={(e) => set('customerGroupId', e.target.value)}>
                <option value="">None</option>
                {(meta?.customerGroups ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
      </Section>

      <Section title="Address">
        <Field label="Address line 1" className="sm:col-span-2 lg:col-span-3">
          <Input value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} />
        </Field>
        <Field label="Address line 2" className="sm:col-span-2 lg:col-span-3">
          <Input value={form.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} />
        </Field>
        <Field label="City">
          <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
        </Field>
        <Field label="State">
          <Input value={form.state} onChange={(e) => set('state', e.target.value)} />
        </Field>
        <Field label="Country">
          <Input value={form.country} onChange={(e) => set('country', e.target.value)} />
        </Field>
        <Field label="Zip code">
          <Input value={form.zipCode} onChange={(e) => set('zipCode', e.target.value)} />
        </Field>
        <Field label="Shipping address" className="sm:col-span-2">
          <Input value={form.shippingAddress} onChange={(e) => set('shippingAddress', e.target.value)} />
        </Field>
      </Section>

      <Section title="Custom fields & assignment">
        <Field label="Custom field 1">
          <Input value={form.customField1} onChange={(e) => set('customField1', e.target.value)} />
        </Field>
        <Field label="Custom field 2">
          <Input value={form.customField2} onChange={(e) => set('customField2', e.target.value)} />
        </Field>
        <Field label="Custom field 3">
          <Input value={form.customField3} onChange={(e) => set('customField3', e.target.value)} />
        </Field>
        <Field label="Custom field 4">
          <Input value={form.customField4} onChange={(e) => set('customField4', e.target.value)} />
        </Field>
        <Field label="Assigned to" className="sm:col-span-2">
          <MultiSelect
            options={(meta?.users ?? []).map((u) => ({ value: u.id, label: u.name }))}
            value={form.assignedToUsers}
            onChange={(v) => set('assignedToUsers', v)}
            placeholder="Assign team members…"
            emptyText="No users available"
          />
        </Field>
      </Section>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(backTo)}>
          Cancel
        </Button>
        <Button onClick={onSubmit} isLoading={save.isPending}>
          {isEdit ? 'Update' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
