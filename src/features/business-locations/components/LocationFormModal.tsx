import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  checkLocationId,
  createLocation,
  getLocation,
  updateLocation,
} from '../business-locations.api';
import type {
  LocationOptions,
  PaymentAccountValue,
  SaveLocationPayload,
} from '../business-locations.types';

interface FormState {
  name: string;
  location_id: string;
  landmark: string;
  city: string;
  zip_code: string;
  state: string;
  country: string;
  mobile: string;
  alternate_number: string;
  email: string;
  website: string;
  invoice_scheme_id: string;
  invoice_layout_id: string;
  sale_invoice_layout_id: string;
  selling_price_group_id: string;
  custom_field1: string;
  custom_field2: string;
  custom_field3: string;
  custom_field4: string;
}

const EMPTY: FormState = {
  name: '',
  location_id: '',
  landmark: '',
  city: '',
  zip_code: '',
  state: '',
  country: '',
  mobile: '',
  alternate_number: '',
  email: '',
  website: '',
  invoice_scheme_id: '',
  invoice_layout_id: '',
  sale_invoice_layout_id: '',
  selling_price_group_id: '',
  custom_field1: '',
  custom_field2: '',
  custom_field3: '',
  custom_field4: '',
};

const numOrNull = (v: string): number | null => (v === '' ? null : Number(v));

// Field tooltips — verbatim from GOURI tooltip.php / lang_v1.php (HTML preserved where present).
const TT = {
  invoiceScheme:
    "Invoice Scheme means invoice numbering format. Select the scheme to be used for this business location<br><small class='text-muted'><i>You can add a new Invoice Scheme in Invoice Settings</i></small>",
  invoiceLayout:
    "Invoice Layout to be used for this business location<br><small class='text-muted'>(<i>You can add a new Invoice Layout in Invoice Settings</i>)</small>",
  saleInvoiceLayout: 'Invoice layout for direct sales',
  priceGroup: 'This price group will be used as the default price group in this location.',
  paymentOptions: 'Enable or disable payment methods for the location',
  defaultAccount:
    'Choose default account to be pre selected for the payment method. You can change it while adding payment',
};

export function LocationFormModal({
  open,
  onClose,
  editingId,
  options,
}: {
  open: boolean;
  onClose: () => void;
  editingId: number | null;
  options: LocationOptions;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [payments, setPayments] = useState<Record<string, PaymentAccountValue>>({});
  const [featuredProducts, setFeaturedProducts] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [locIdError, setLocIdError] = useState('');

  const set = (k: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Load detail when editing; reset to defaults (all payment types enabled) when creating.
  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['business-location', editingId],
    queryFn: () => getLocation(editingId as number),
    enabled: open && editingId != null,
  });

  useEffect(() => {
    if (!open) return;
    if (editingId == null) {
      setForm(EMPTY);
      setFeaturedProducts([]);
      // GOURI create form checks every payment method by default.
      const defaults: Record<string, PaymentAccountValue> = {};
      options.paymentTypes.forEach((p) => (defaults[p.key] = { is_enabled: true, account: null }));
      setPayments(defaults);
      setError('');
      setLocIdError('');
    }
  }, [open, editingId, options.paymentTypes]);

  useEffect(() => {
    if (detail) {
      setForm({
        name: detail.name,
        location_id: detail.locationId,
        landmark: detail.landmark,
        city: detail.city,
        zip_code: detail.zipCode,
        state: detail.state,
        country: detail.country,
        mobile: detail.mobile,
        alternate_number: detail.alternateNumber,
        email: detail.email,
        website: detail.website,
        invoice_scheme_id: detail.invoiceSchemeId ? String(detail.invoiceSchemeId) : '',
        invoice_layout_id: detail.invoiceLayoutId ? String(detail.invoiceLayoutId) : '',
        sale_invoice_layout_id: detail.saleInvoiceLayoutId ? String(detail.saleInvoiceLayoutId) : '',
        selling_price_group_id: detail.sellingPriceGroupId ? String(detail.sellingPriceGroupId) : '',
        custom_field1: detail.customField1,
        custom_field2: detail.customField2,
        custom_field3: detail.customField3,
        custom_field4: detail.customField4,
      });
      setFeaturedProducts(detail.featuredProducts ?? []);
      const merged: Record<string, PaymentAccountValue> = {};
      options.paymentTypes.forEach((p) => {
        const saved = detail.defaultPaymentAccounts?.[p.key];
        merged[p.key] = {
          is_enabled: Boolean(saved?.is_enabled),
          account: saved?.account ?? null,
        };
      });
      setPayments(merged);
      setError('');
      setLocIdError('');
    }
  }, [detail, options.paymentTypes]);

  const save = useMutation({
    mutationFn: () => {
      const payload: SaveLocationPayload = {
        name: form.name.trim(),
        location_id: form.location_id || null,
        landmark: form.landmark || null,
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        zip_code: form.zip_code.trim(),
        mobile: form.mobile || null,
        alternate_number: form.alternate_number || null,
        email: form.email || null,
        website: form.website || null,
        invoice_scheme_id: numOrNull(form.invoice_scheme_id),
        invoice_layout_id: numOrNull(form.invoice_layout_id),
        sale_invoice_layout_id: numOrNull(form.sale_invoice_layout_id),
        selling_price_group_id: numOrNull(form.selling_price_group_id),
        custom_field1: form.custom_field1 || null,
        custom_field2: form.custom_field2 || null,
        custom_field3: form.custom_field3 || null,
        custom_field4: form.custom_field4 || null,
        default_payment_accounts: payments,
        featured_products: featuredProducts,
      };
      return editingId != null ? updateLocation(editingId, payload) : createLocation(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-locations'] });
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save business location')),
  });

  const onLocIdBlur = async () => {
    const v = form.location_id.trim();
    if (!v) return setLocIdError('');
    try {
      const { valid } = await checkLocationId(v, editingId ?? undefined);
      setLocIdError(valid ? '' : 'This Location ID is already in use');
    } catch {
      /* non-blocking */
    }
  };

  const onSubmit = () => {
    if (!form.name.trim()) return setError('Name is required');
    if (!form.city.trim() || !form.state.trim() || !form.country.trim() || !form.zip_code.trim()) {
      return setError('City, State, Country and Zip Code are required');
    }
    if (locIdError) return setError(locIdError);
    setError('');
    save.mutate();
  };

  const togglePayment = (key: string, enabled: boolean) =>
    setPayments((p) => ({ ...p, [key]: { ...p[key], is_enabled: enabled } }));
  const setPaymentAccount = (key: string, account: number | null) =>
    setPayments((p) => ({ ...p, [key]: { ...p[key], account } }));

  const labels = options.customFieldLabels;
  const hasAccounts = options.accounts.length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="max-w-3xl"
      title={editingId != null ? 'Edit Business Location' : 'Add Business Location'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onSubmit} isLoading={save.isPending} disabled={loadingDetail}>
            Save
          </Button>
        </>
      }
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Field label="Name" required htmlFor="loc-name">
          <Input id="loc-name" value={form.name} onChange={set('name')} placeholder="Name" autoFocus />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location ID" htmlFor="loc-id" help={locIdError} error={!!locIdError}>
            <Input
              id="loc-id"
              value={form.location_id}
              onChange={set('location_id')}
              onBlur={onLocIdBlur}
              placeholder="Auto-generated if left blank"
            />
          </Field>
          <Field label="Landmark" htmlFor="loc-landmark">
            <Input id="loc-landmark" value={form.landmark} onChange={set('landmark')} placeholder="Landmark" />
          </Field>
          <Field label="City" required htmlFor="loc-city">
            <Input id="loc-city" value={form.city} onChange={set('city')} placeholder="City" />
          </Field>
          <Field label="Zip Code" required htmlFor="loc-zip">
            <Input id="loc-zip" value={form.zip_code} onChange={set('zip_code')} maxLength={7} placeholder="Zip Code" />
          </Field>
          <Field label="State" required htmlFor="loc-state">
            <Input id="loc-state" value={form.state} onChange={set('state')} placeholder="State" />
          </Field>
          <Field label="Country" required htmlFor="loc-country">
            <Input id="loc-country" value={form.country} onChange={set('country')} placeholder="Country" />
          </Field>
          <Field label="Mobile" htmlFor="loc-mobile">
            <Input id="loc-mobile" value={form.mobile} onChange={set('mobile')} placeholder="Mobile" />
          </Field>
          <Field label="Alternate contact number" htmlFor="loc-alt">
            <Input id="loc-alt" value={form.alternate_number} onChange={set('alternate_number')} placeholder="Alternate contact number" />
          </Field>
          <Field label="Email" htmlFor="loc-email">
            <Input id="loc-email" type="email" value={form.email} onChange={set('email')} placeholder="Email" />
          </Field>
          <Field label="Website" htmlFor="loc-website">
            <Input id="loc-website" value={form.website} onChange={set('website')} placeholder="Website" />
          </Field>

          <Field label="Invoice scheme" htmlFor="loc-scheme" tip={TT.invoiceScheme}>
            <LocSelect
              id="loc-scheme"
              value={form.invoice_scheme_id}
              onChange={set('invoice_scheme_id')}
              options={options.invoiceSchemes}
              emptyHint="No invoice schemes yet"
            />
          </Field>
          <Field label="Invoice layout for POS" htmlFor="loc-layout" tip={TT.invoiceLayout}>
            <LocSelect
              id="loc-layout"
              value={form.invoice_layout_id}
              onChange={set('invoice_layout_id')}
              options={options.invoiceLayouts}
              emptyHint="No invoice layouts yet"
            />
          </Field>
          <Field label="Invoice layout for sale" htmlFor="loc-sale-layout" tip={TT.saleInvoiceLayout}>
            <LocSelect
              id="loc-sale-layout"
              value={form.sale_invoice_layout_id}
              onChange={set('sale_invoice_layout_id')}
              options={options.invoiceLayouts}
              emptyHint="No invoice layouts yet"
            />
          </Field>
          <Field label="Default Selling Price Group" htmlFor="loc-spg" tip={TT.priceGroup}>
            <LocSelect
              id="loc-spg"
              value={form.selling_price_group_id}
              onChange={set('selling_price_group_id')}
              options={options.priceGroups}
              emptyHint="No price groups yet"
            />
          </Field>

          <Field label={labels.custom_field1} htmlFor="loc-cf1">
            <Input id="loc-cf1" value={form.custom_field1} onChange={set('custom_field1')} placeholder={labels.custom_field1} />
          </Field>
          <Field label={labels.custom_field2} htmlFor="loc-cf2">
            <Input id="loc-cf2" value={form.custom_field2} onChange={set('custom_field2')} placeholder={labels.custom_field2} />
          </Field>
          <Field label={labels.custom_field3} htmlFor="loc-cf3">
            <Input id="loc-cf3" value={form.custom_field3} onChange={set('custom_field3')} placeholder={labels.custom_field3} />
          </Field>
          <Field label={labels.custom_field4} htmlFor="loc-cf4">
            <Input id="loc-cf4" value={form.custom_field4} onChange={set('custom_field4')} placeholder={labels.custom_field4} />
          </Field>
        </div>

        {/* Payment options table (mirrors the payment_options section in the blade) */}
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold">
            Payment Options
            <InfoTooltip content={TT.paymentOptions} />
          </p>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Payment Method</th>
                  <th className="px-3 py-2 text-center font-medium">Enable</th>
                  <th className="px-3 py-2 text-left font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      Default Account
                      <InfoTooltip content={TT.defaultAccount} side="bottom" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {options.paymentTypes.map((p) => (
                  <tr key={p.key} className="border-t">
                    <td className="px-3 py-2">{p.label}</td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input accent-primary"
                        checked={Boolean(payments[p.key]?.is_enabled)}
                        onChange={(e) => togglePayment(p.key, e.target.checked)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select
                        value={payments[p.key]?.account != null ? String(payments[p.key]?.account) : ''}
                        onChange={(e) =>
                          setPaymentAccount(p.key, e.target.value ? Number(e.target.value) : null)
                        }
                        disabled={!hasAccounts}
                        title={hasAccounts ? undefined : 'Accounts module — coming soon'}
                      >
                        <option value="">None</option>
                        {options.accounts.map((a) => (
                          <option key={a.value} value={a.value}>
                            {a.label}
                          </option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Field({
  label,
  htmlFor,
  required,
  help,
  error,
  tip,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  help?: string;
  error?: boolean;
  tip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="inline-flex items-center gap-1.5">
        <span>
          {label} {required && <span className="text-destructive">*</span>}
        </span>
        {tip && <InfoTooltip content={tip} html />}
      </Label>
      {children}
      {help && <p className={`text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`}>{help}</p>}
    </div>
  );
}

function LocSelect({
  id,
  value,
  onChange,
  options,
  emptyHint,
}: {
  id: string;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  options: { value: number; label: string }[];
  emptyHint: string;
}) {
  return (
    <Select id={id} value={value} onChange={onChange}>
      <option value="">{options.length ? 'Please select' : emptyHint}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
