import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import { createUser, getUser, getUserMeta, updateUser } from '../users.api';
import type { UserDetail, UserFormBody } from '../users.types';

interface FormState {
  surname: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  allowLogin: boolean;
  isActive: boolean;
  roleId: string;
  accessAllLocations: boolean;
  locationIds: number[];
  cmmsnPercent: string;
  maxSalesDiscountPercent: string;
  parentId: string;
  essentialsDepartmentId: string;
  essentialsDesignationId: string;
  essentialsSalary: string;
  essentialsPayPeriod: string;
  primaryLocationId: string;
  activityCodes: number[];
  payComponents: number[];
  leaveTypeIds: number[];
  dob: string;
  gender: string;
  maritalStatus: string;
  bloodGroup: string;
  contactNumber: string;
  altNumber: string;
  familyNumber: string;
  fbLink: string;
  twitterLink: string;
  socialMedia1: string;
  socialMedia2: string;
  customField1: string;
  customField2: string;
  customField3: string;
  customField4: string;
  guardianName: string;
  idProofName: string;
  idProofNumber: string;
  permanentAddress: string;
  currentAddress: string;
  bankAccountHolderName: string;
  bankAccountNumber: string;
  bankName: string;
  bankCode: string;
  bankBranch: string;
  bankTaxPayerId: string;
}

const EMPTY: FormState = {
  surname: '', firstName: '', lastName: '', email: '', username: '', password: '',
  allowLogin: true, isActive: true, roleId: '', accessAllLocations: false, locationIds: [],
  cmmsnPercent: '', maxSalesDiscountPercent: '', parentId: '',
  essentialsDepartmentId: '', essentialsDesignationId: '', essentialsSalary: '',
  essentialsPayPeriod: '', primaryLocationId: '',
  activityCodes: [], payComponents: [], leaveTypeIds: [],
  dob: '', gender: '', maritalStatus: '', bloodGroup: '', contactNumber: '', altNumber: '',
  familyNumber: '', fbLink: '', twitterLink: '', socialMedia1: '', socialMedia2: '',
  customField1: '', customField2: '', customField3: '', customField4: '', guardianName: '',
  idProofName: '', idProofNumber: '', permanentAddress: '', currentAddress: '',
  bankAccountHolderName: '', bankAccountNumber: '', bankName: '', bankCode: '', bankBranch: '',
  bankTaxPayerId: '',
};

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// meta lists are `{id, name}` (IdName); MultiSelect wants `{value, label}`.
const toOptions = (items: { id: number; name: string }[]) =>
  items.map((i) => ({ value: i.id, label: i.name }));

function hydrate(u: UserDetail): FormState {
  return {
    surname: u.surname ?? '', firstName: u.firstName, lastName: u.lastName ?? '', email: u.email,
    username: u.username ?? '', password: '', allowLogin: u.allowLogin, isActive: u.isActive,
    roleId: u.roleId ? String(u.roleId) : '', accessAllLocations: u.accessAllLocations,
    locationIds: u.locationIds,
    cmmsnPercent: u.cmmsnPercent ? String(u.cmmsnPercent) : '',
    maxSalesDiscountPercent: u.maxSalesDiscountPercent != null ? String(u.maxSalesDiscountPercent) : '',
    parentId: u.parentId ? String(u.parentId) : '',
    essentialsDepartmentId: u.essentialsDepartmentId ? String(u.essentialsDepartmentId) : '',
    essentialsDesignationId: u.essentialsDesignationId ? String(u.essentialsDesignationId) : '',
    essentialsSalary: u.essentialsSalary != null ? String(u.essentialsSalary) : '',
    essentialsPayPeriod: u.essentialsPayPeriod ?? '',
    primaryLocationId: u.locationId ? String(u.locationId) : '',
    activityCodes: u.activityCodes ?? [], payComponents: u.payComponents ?? [],
    leaveTypeIds: u.leaveTypeIds ?? [],
    dob: u.dob, gender: u.gender,
    maritalStatus: u.maritalStatus, bloodGroup: u.bloodGroup, contactNumber: u.contactNumber,
    altNumber: u.altNumber, familyNumber: u.familyNumber, fbLink: u.fbLink, twitterLink: u.twitterLink,
    socialMedia1: u.socialMedia1, socialMedia2: u.socialMedia2, customField1: u.customField1,
    customField2: u.customField2, customField3: u.customField3, customField4: u.customField4,
    guardianName: u.guardianName, idProofName: u.idProofName, idProofNumber: u.idProofNumber,
    permanentAddress: u.permanentAddress, currentAddress: u.currentAddress,
    bankAccountHolderName: u.bankDetails?.accountHolderName ?? '',
    bankAccountNumber: u.bankDetails?.accountNumber ?? '', bankName: u.bankDetails?.bankName ?? '',
    bankCode: u.bankDetails?.bankCode ?? '', bankBranch: u.bankDetails?.branch ?? '',
    bankTaxPayerId: u.bankDetails?.taxPayerId ?? '',
  };
}

function toBody(f: FormState): UserFormBody {
  return {
    surname: f.surname, firstName: f.firstName, lastName: f.lastName, email: f.email,
    username: f.username, password: f.password || undefined,
    allowLogin: f.allowLogin, isActive: f.isActive, roleId: Number(f.roleId),
    accessAllLocations: f.accessAllLocations, locationIds: f.locationIds,
    cmmsnPercent: f.cmmsnPercent,
    maxSalesDiscountPercent: f.maxSalesDiscountPercent,
    parentId: f.parentId ? Number(f.parentId) : null,
    essentialsDepartmentId: f.essentialsDepartmentId ? Number(f.essentialsDepartmentId) : null,
    essentialsDesignationId: f.essentialsDesignationId ? Number(f.essentialsDesignationId) : null,
    essentialsSalary: f.essentialsSalary === '' ? null : Number(f.essentialsSalary),
    essentialsPayPeriod: f.essentialsPayPeriod,
    locationId: f.primaryLocationId ? Number(f.primaryLocationId) : null,
    activityCodes: f.activityCodes, payComponents: f.payComponents, leaveTypeIds: f.leaveTypeIds,
    dob: f.dob, gender: f.gender, maritalStatus: f.maritalStatus, bloodGroup: f.bloodGroup,
    contactNumber: f.contactNumber, altNumber: f.altNumber, familyNumber: f.familyNumber,
    fbLink: f.fbLink, twitterLink: f.twitterLink, socialMedia1: f.socialMedia1,
    socialMedia2: f.socialMedia2, customField1: f.customField1, customField2: f.customField2,
    customField3: f.customField3, customField4: f.customField4, guardianName: f.guardianName,
    idProofName: f.idProofName, idProofNumber: f.idProofNumber,
    permanentAddress: f.permanentAddress, currentAddress: f.currentAddress,
    bankDetails: {
      accountHolderName: f.bankAccountHolderName, accountNumber: f.bankAccountNumber,
      bankName: f.bankName, bankCode: f.bankCode, branch: f.bankBranch, taxPayerId: f.bankTaxPayerId,
    },
  };
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
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
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input accent-primary"
      />
      {label}
    </label>
  );
}

const textareaCls =
  'flex min-h-[76px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export function UserFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const userId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Pass the edited user id so the owner's own Admin role still appears on their form; it is never
  // offered when creating a user or editing anyone else.
  const { data: meta } = useQuery({ queryKey: ['user-meta', userId], queryFn: () => getUserMeta(userId) });
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId as number),
    enabled: isEdit,
  });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState('');
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (isEdit && user) setForm(hydrate(user));
  }, [isEdit, user]);

  const managerOptions = useMemo(
    () => (meta?.managers ?? []).filter((m) => m.id !== userId),
    [meta, userId],
  );

  const save = useMutation({
    mutationFn: () => {
      const body = toBody(form);
      return isEdit ? updateUser(userId as number, body) : createUser(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      navigate('/users');
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save user')),
  });

  const onSubmit = () => {
    if (!form.firstName.trim()) return setError('First name is required');
    if (!form.email.trim()) return setError('Email is required');
    if (!form.roleId) return setError('Please select a role');
    if (form.allowLogin && !isEdit && !form.password)
      return setError('Password is required when login is enabled');
    if (form.password && form.password.length < 8)
      return setError('Password must be at least 8 characters');
    setError('');
    save.mutate();
  };

  const loading = !meta || (isEdit && !user);
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title={isEdit ? 'Edit User' : 'Add User'}
          breadcrumbs={[{ label: 'Users', to: '/users' }, { label: isEdit ? 'Edit' : 'Add' }]}
        />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={isEdit ? 'Edit User' : 'Add User'}
        description="Set up login access, role, and profile details for this person."
        breadcrumbs={[{ label: 'Users', to: '/users' }, { label: isEdit ? 'Edit' : 'Add' }]}
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="whitespace-pre-line">{error}</span>
        </div>
      )}

      {/* Account & login */}
      <Section title="Account & login" description="Name and the credentials used to sign in.">
        <Field label="Prefix">
          <Input value={form.surname} onChange={(e) => set('surname', e.target.value)} placeholder="Mr / Ms" />
        </Field>
        <Field label="First name" required htmlFor="firstName">
          <Input id="firstName" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
        </Field>
        <Field label="Last name">
          <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
        </Field>
        <Field label="Email" required htmlFor="email">
          <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Username">
          <Input
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
            placeholder="Optional"
            disabled={!form.allowLogin}
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder={isEdit ? 'Leave blank to keep current' : 'At least 8 characters'}
            disabled={!form.allowLogin}
          />
        </Field>
        <div className="flex items-center gap-6 pt-1 sm:col-span-2 lg:col-span-3">
          <Toggle checked={form.allowLogin} onChange={(v) => set('allowLogin', v)} label="Allow login" />
          <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} label="Active" />
        </div>
      </Section>

      {/* Role & locations */}
      <Section title="Role & access" description="One role per user, plus the locations they can work in.">
        <Field label="Role" required htmlFor="role">
          <Select id="role" value={form.roleId} onChange={(e) => set('roleId', e.target.value)}>
            <option value="">Select a role…</option>
            {meta.roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
          {meta.roles.length === 0 && (
            <p className="mt-1.5 text-xs text-amber-600">
              No roles yet — create one under <Link to="/roles/create" className="font-medium underline">Roles → Add Role</Link>.
              The <strong>Admin</strong> role is reserved for the business owner and can't be assigned.
            </p>
          )}
        </Field>
        <Field label="Locations" className="sm:col-span-2 lg:col-span-2">
          <Toggle
            checked={form.accessAllLocations}
            onChange={(v) => set('accessAllLocations', v)}
            label="Access all locations"
          />
          {!form.accessAllLocations &&
            (meta.locations.length ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {meta.locations.map((loc) => (
                  <label key={loc.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-primary"
                      checked={form.locationIds.includes(loc.id)}
                      onChange={(e) =>
                        set(
                          'locationIds',
                          e.target.checked
                            ? [...form.locationIds, loc.id]
                            : form.locationIds.filter((x) => x !== loc.id),
                        )
                      }
                    />
                    {loc.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                No business locations yet — add one under Business Locations to grant per-location access.
              </p>
            ))}
        </Field>
      </Section>

      {/* Sales & hierarchy */}
      <Section title="Sales & hierarchy" description="Commission, discount limits, and reporting line.">
        <Field label="Commission (%)">
          <Input
            type="number"
            step="0.01"
            value={form.cmmsnPercent}
            onChange={(e) => set('cmmsnPercent', e.target.value)}
          />
        </Field>
        <Field label="Max sales discount (%)">
          <Input
            type="number"
            step="0.01"
            value={form.maxSalesDiscountPercent}
            onChange={(e) => set('maxSalesDiscountPercent', e.target.value)}
          />
        </Field>
        <Field label="Reports to (manager)">
          <Select value={form.parentId} onChange={(e) => set('parentId', e.target.value)}>
            <option value="">None</option>
            {managerOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      {/* Employment (HRM) */}
      <Section title="Employment" description="Department, designation, pay, and primary work location.">
        <Field label="Department">
          <Select
            value={form.essentialsDepartmentId}
            onChange={(e) => set('essentialsDepartmentId', e.target.value)}
          >
            <option value="">None</option>
            {meta.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Designation">
          <Select
            value={form.essentialsDesignationId}
            onChange={(e) => set('essentialsDesignationId', e.target.value)}
          >
            <option value="">None</option>
            {meta.designations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Primary work location">
          <Select
            value={form.primaryLocationId}
            onChange={(e) => set('primaryLocationId', e.target.value)}
          >
            <option value="">None</option>
            {meta.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Salary">
          <Input
            type="number"
            step="0.01"
            value={form.essentialsSalary}
            onChange={(e) => set('essentialsSalary', e.target.value)}
          />
        </Field>
        <Field label="Pay period">
          <Select
            value={form.essentialsPayPeriod}
            onChange={(e) => set('essentialsPayPeriod', e.target.value)}
          >
            <option value="">Not set</option>
            <option value="month">Per month</option>
            <option value="week">Per week</option>
            <option value="day">Per day</option>
          </Select>
        </Field>
        <Field label="Activity codes">
          <MultiSelect
            options={toOptions(meta.activityCodes)}
            value={form.activityCodes}
            onChange={(v) => set('activityCodes', v)}
            placeholder="Select activity codes…"
            emptyText="No activity codes defined"
          />
        </Field>
        <Field label="Pay components">
          <MultiSelect
            options={toOptions(meta.payComponents)}
            value={form.payComponents}
            onChange={(v) => set('payComponents', v)}
            placeholder="Select allowances / deductions…"
            emptyText="No pay components defined"
          />
        </Field>
        <Field label="Leave types">
          <MultiSelect
            options={toOptions(meta.leaveTypes)}
            value={form.leaveTypeIds}
            onChange={(v) => set('leaveTypeIds', v)}
            placeholder="Assign leave types…"
            emptyText="No leave types defined"
          />
        </Field>
      </Section>

      {/* Personal */}
      <Section title="Personal details">
        <Field label="Date of birth">
          <Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
        </Field>
        <Field label="Gender">
          <Select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="">Not specified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="others">Others</option>
          </Select>
        </Field>
        <Field label="Marital status">
          <Select value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)}>
            <option value="">Not specified</option>
            <option value="married">Married</option>
            <option value="unmarried">Unmarried</option>
            <option value="divorced">Divorced</option>
          </Select>
        </Field>
        <Field label="Blood group">
          <Select value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)}>
            <option value="">Not specified</option>
            {BLOOD_GROUPS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Contact number">
          <Input value={form.contactNumber} onChange={(e) => set('contactNumber', e.target.value)} />
        </Field>
        <Field label="Alternate number">
          <Input value={form.altNumber} onChange={(e) => set('altNumber', e.target.value)} />
        </Field>
        <Field label="Family number">
          <Input value={form.familyNumber} onChange={(e) => set('familyNumber', e.target.value)} />
        </Field>
        <Field label="Guardian name">
          <Input value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)} />
        </Field>
        <div className="hidden lg:block" />
        <Field label="ID proof name">
          <Input
            value={form.idProofName}
            onChange={(e) => set('idProofName', e.target.value)}
            placeholder="e.g. Passport"
          />
        </Field>
        <Field label="ID proof number">
          <Input value={form.idProofNumber} onChange={(e) => set('idProofNumber', e.target.value)} />
        </Field>
        <div className="hidden lg:block" />
        <Field label="Permanent address" className="sm:col-span-2 lg:col-span-3">
          <textarea
            className={textareaCls}
            value={form.permanentAddress}
            onChange={(e) => set('permanentAddress', e.target.value)}
          />
        </Field>
        <Field label="Current address" className="sm:col-span-2 lg:col-span-3">
          <textarea
            className={textareaCls}
            value={form.currentAddress}
            onChange={(e) => set('currentAddress', e.target.value)}
          />
        </Field>
      </Section>

      {/* Social & custom */}
      <Section title="Social & custom fields">
        <Field label="Facebook">
          <Input value={form.fbLink} onChange={(e) => set('fbLink', e.target.value)} />
        </Field>
        <Field label="Twitter / X">
          <Input value={form.twitterLink} onChange={(e) => set('twitterLink', e.target.value)} />
        </Field>
        <Field label="LinkedIn">
          <Input value={form.socialMedia1} onChange={(e) => set('socialMedia1', e.target.value)} />
        </Field>
        <Field label="Other social">
          <Input value={form.socialMedia2} onChange={(e) => set('socialMedia2', e.target.value)} />
        </Field>
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
      </Section>

      {/* Bank */}
      <Section title="Bank details">
        <Field label="Account holder name">
          <Input
            value={form.bankAccountHolderName}
            onChange={(e) => set('bankAccountHolderName', e.target.value)}
          />
        </Field>
        <Field label="Account number">
          <Input value={form.bankAccountNumber} onChange={(e) => set('bankAccountNumber', e.target.value)} />
        </Field>
        <Field label="Bank name">
          <Input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} />
        </Field>
        <Field label="Bank code / IFSC">
          <Input value={form.bankCode} onChange={(e) => set('bankCode', e.target.value)} />
        </Field>
        <Field label="Branch">
          <Input value={form.bankBranch} onChange={(e) => set('bankBranch', e.target.value)} />
        </Field>
        <Field label="Tax payer ID">
          <Input value={form.bankTaxPayerId} onChange={(e) => set('bankTaxPayerId', e.target.value)} />
        </Field>
      </Section>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/users')}>
          Cancel
        </Button>
        <Button onClick={onSubmit} isLoading={save.isPending}>
          {isEdit ? 'Update User' : 'Save User'}
        </Button>
      </div>
    </div>
  );
}
