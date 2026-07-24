import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Upload, UserCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { setUser } from '@/features/auth/authSlice';
import { useAuth } from '@/features/auth/useAuth';
import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile,
  uploadMyPhoto,
  type MyProfile,
  type ProfileUpdate,
} from '@/features/auth/profile.api';
import { getApiErrorMessage } from '@/lib/api/axios';
import { fileUrl } from '@/lib/fileUrl';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'ar', label: 'Arabic' },
];

type FormState = ProfileUpdate;

const blankForm = (p: MyProfile): FormState => ({
  surname: p.surname,
  firstName: p.firstName,
  lastName: p.lastName,
  email: p.email,
  language: p.language || 'en',
  dob: p.dob,
  gender: p.gender,
  maritalStatus: p.maritalStatus,
  bloodGroup: p.bloodGroup,
  contactNumber: p.contactNumber,
  altNumber: p.altNumber,
  familyNumber: p.familyNumber,
  fbLink: p.fbLink,
  twitterLink: p.twitterLink,
  socialMedia1: p.socialMedia1,
  socialMedia2: p.socialMedia2,
  customField1: p.customField1,
  customField2: p.customField2,
  customField3: p.customField3,
  customField4: p.customField4,
  guardianName: p.guardianName,
  idProofName: p.idProofName,
  idProofNumber: p.idProofNumber,
  permanentAddress: p.permanentAddress,
  currentAddress: p.currentAddress,
  bankDetails: p.bankDetails ?? {},
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function ProfilePage() {
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({ queryKey: ['my-profile'], queryFn: getMyProfile });
  const [form, setForm] = useState<FormState | null>(null);
  useEffect(() => {
    if (profile) setForm(blankForm(profile));
  }, [profile]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));
  const setBank = (k: string, v: string) =>
    setForm((f) => (f ? { ...f, bankDetails: { ...(f.bankDetails ?? {}), [k]: v } } : f));

  const refreshUser = (u: Parameters<typeof setUser>[0]) => {
    dispatch(setUser(u));
    qc.invalidateQueries({ queryKey: ['my-profile'] });
  };

  const save = useMutation({
    mutationFn: () => updateMyProfile(form as ProfileUpdate),
    onSuccess: (u) => {
      refreshUser(u);
      toast.success('Profile updated');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not update profile')),
  });

  // ── Photo upload ─────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const photo = useMutation({
    mutationFn: (file: File) => uploadMyPhoto(file),
    onSuccess: (u) => {
      refreshUser(u);
      toast.success('Photo updated');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not upload photo')),
  });

  // ── Change password ──────────────────────────────────
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const changePw = useMutation({
    mutationFn: () => changeMyPassword(pw),
    onSuccess: () => {
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed');
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not change password')),
  });

  const avatarUrl = fileUrl(user?.avatar) ?? profile?.avatarUrl ?? null;
  const initial = (form?.firstName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase();

  if (isLoading || !form) {
    return (
      <div>
        <PageHeader title="My Profile" breadcrumbs={[{ label: 'My Profile' }]} />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" breadcrumbs={[{ label: 'My Profile' }]} />

      {/* Identity + photo */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6 sm:flex-row sm:items-center">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                {initial}
              </span>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-lg font-semibold">
              {[form.surname, form.firstName, form.lastName].filter(Boolean).join(' ')}
            </p>
            <p className="text-sm text-muted-foreground">{form.email}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {user?.isBusinessAdmin ? 'Super Admin' : (user?.roles?.[0] ?? 'Member')}
            </p>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) photo.mutate(f);
                e.target.value = '';
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              isLoading={photo.isPending}
            >
              <Upload className="h-4 w-4" />
              Change photo
            </Button>
            <p className="mt-1 text-center text-[11px] text-muted-foreground">Max 2 MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Edit profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="h-4 w-4" /> Edit profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Prefix">
              <Input value={form.surname} onChange={(e) => set('surname', e.target.value)} placeholder="Mr / Mrs" />
            </Field>
            <Field label="First name *">
              <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            </Field>
            <Field label="Last name">
              <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
            </Field>
            <Field label="Email *">
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Language">
              <Select value={form.language} onChange={(e) => set('language', e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Marital status">
              <Select value={form.maritalStatus} onChange={(e) => set('maritalStatus', e.target.value)}>
                <option value="">Select…</option>
                <option value="married">Married</option>
                <option value="unmarried">Unmarried</option>
                <option value="divorced">Divorced</option>
              </Select>
            </Field>
            <Field label="Blood group">
              <Input value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} />
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
            <Field label="ID proof name">
              <Input value={form.idProofName} onChange={(e) => set('idProofName', e.target.value)} />
            </Field>
            <Field label="ID proof number">
              <Input value={form.idProofNumber} onChange={(e) => set('idProofNumber', e.target.value)} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Permanent address">
              <Textarea rows={2} value={form.permanentAddress} onChange={(e) => set('permanentAddress', e.target.value)} />
            </Field>
            <Field label="Current address">
              <Textarea rows={2} value={form.currentAddress} onChange={(e) => set('currentAddress', e.target.value)} />
            </Field>
          </div>

          {/* Social */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Social links</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Facebook">
                <Input value={form.fbLink} onChange={(e) => set('fbLink', e.target.value)} />
              </Field>
              <Field label="Twitter / X">
                <Input value={form.twitterLink} onChange={(e) => set('twitterLink', e.target.value)} />
              </Field>
              <Field label="Social media 1">
                <Input value={form.socialMedia1} onChange={(e) => set('socialMedia1', e.target.value)} />
              </Field>
              <Field label="Social media 2">
                <Input value={form.socialMedia2} onChange={(e) => set('socialMedia2', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Custom fields */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Custom fields</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            </div>
          </div>

          {/* Bank details */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Bank details</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Account holder name">
                <Input value={form.bankDetails?.accountHolderName ?? ''} onChange={(e) => setBank('accountHolderName', e.target.value)} />
              </Field>
              <Field label="Account number">
                <Input value={form.bankDetails?.accountNumber ?? ''} onChange={(e) => setBank('accountNumber', e.target.value)} />
              </Field>
              <Field label="Bank name">
                <Input value={form.bankDetails?.bankName ?? ''} onChange={(e) => setBank('bankName', e.target.value)} />
              </Field>
              <Field label="Bank code / IFSC">
                <Input value={form.bankDetails?.bankCode ?? ''} onChange={(e) => setBank('bankCode', e.target.value)} />
              </Field>
              <Field label="Branch">
                <Input value={form.bankDetails?.branch ?? ''} onChange={(e) => setBank('branch', e.target.value)} />
              </Field>
              <Field label="Tax payer ID">
                <Input value={form.bankDetails?.taxPayerId ?? ''} onChange={(e) => setBank('taxPayerId', e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} isLoading={save.isPending}>
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> Change password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Current password">
              <Input
                type="password"
                value={pw.currentPassword}
                onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
              />
            </Field>
            <Field label="New password">
              <Input
                type="password"
                value={pw.newPassword}
                onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                value={pw.confirmPassword}
                onChange={(e) => setPw((p) => ({ ...p, confirmPassword: e.target.value }))}
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            At least 8 characters with a letter, a number and a special character.
          </p>
          <div className="flex justify-end">
            <Button
              onClick={() => changePw.mutate()}
              isLoading={changePw.isPending}
              disabled={!pw.currentPassword || !pw.newPassword || !pw.confirmPassword}
            >
              Update password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
