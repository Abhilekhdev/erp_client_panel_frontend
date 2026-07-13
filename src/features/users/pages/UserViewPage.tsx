import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  Building2,
  CalendarDays,
  CreditCard,
  Droplet,
  Facebook,
  Fingerprint,
  Heart,
  KeyRound,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Twitter,
  User as UserIcon,
  Users,
  Wallet,
} from 'lucide-react';
import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getUser, getUserMeta } from '../users.api';
import type { UserDetail, UserMeta } from '../users.types';

// Theme gradient (violet/indigo) — used for hero + avatar so the page matches the brand.
const HERO_GRADIENT = 'from-indigo-600 via-violet-600 to-indigo-700';

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}
const idToName = (list: { id: number; name: string }[], id: number | null | undefined) =>
  id == null ? null : (list.find((x) => x.id === id)?.name ?? null);
const idsToNames = (list: { id: number; name: string }[], ids: number[]) =>
  ids.map((id) => list.find((x) => x.id === id)?.name).filter((n): n is string => Boolean(n));
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Label / value row — stacks on mobile, two-column on larger screens (no overlap on long values). */
function Row({
  icon: Icon,
  label,
  value,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
}) {
  const empty = value == null || value === '' || (Array.isArray(value) && value.length === 0);
  return (
    <div className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="h-4 w-4 shrink-0 opacity-70" />}
        {label}
      </span>
      <span
        className={cn(
          'break-words text-sm font-medium sm:max-w-[62%] sm:text-right',
          empty && 'font-normal text-muted-foreground/60',
        )}
      >
        {empty ? '—' : value}
      </span>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y pt-0">{children}</CardContent>
    </Card>
  );
}

function Chips({ items }: { items: string[] }) {
  if (!items.length) return <p className="py-2 text-sm text-muted-foreground/60">None assigned</p>;
  return (
    <div className="flex flex-wrap gap-1.5 py-2">
      {items.map((t) => (
        <span key={t} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {t}
        </span>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-6xl">
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="mt-4 h-10 w-full max-w-md rounded-lg" />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

type TabKey = 'overview' | 'employment' | 'personal' | 'finance';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'employment', label: 'Employment & HR' },
  { key: 'personal', label: 'Personal' },
  { key: 'finance', label: 'Bank & Social' },
];

export function UserViewPage() {
  const { id } = useParams();
  const userId = Number(id);
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('overview');

  const { data: user, isLoading, isError } = useQuery<UserDetail>({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId),
  });
  const { data: meta } = useQuery<UserMeta>({ queryKey: ['user-meta'], queryFn: getUserMeta });

  const fullName = useMemo(
    () => (user ? [user.surname, user.firstName, user.lastName].filter(Boolean).join(' ').trim() : ''),
    [user],
  );

  if (isLoading || !meta) return <LoadingState />;

  if (isError || !user) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader title="User not found" breadcrumbs={[{ label: 'Users', to: '/users' }, { label: 'Not found' }]} />
        <Button variant="outline" onClick={() => navigate('/users')}>
          <ArrowLeft className="h-4 w-4" /> Back to users
        </Button>
      </div>
    );
  }

  const roleName = idToName(meta.roles, user.roleId) ?? '—';
  const isAdmin = roleName === 'Admin';
  const department = idToName(meta.departments, user.essentialsDepartmentId);
  const designation = idToName(meta.designations, user.essentialsDesignationId);
  const primaryLocation = idToName(meta.locations, user.locationId);
  const manager = idToName(meta.managers, user.parentId);
  const assignedLocations = user.accessAllLocations
    ? ['All locations']
    : idsToNames(meta.locations, user.locationIds);
  const leaveTypes = idsToNames(meta.leaveTypes, user.leaveTypeIds);
  const payComponents = idsToNames(meta.payComponents, user.payComponents);
  const activityCodes = idsToNames(meta.activityCodes, user.activityCodes);
  const bank = user.bankDetails;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="User profile"
        breadcrumbs={[{ label: 'User Management' }, { label: 'Users', to: '/users' }, { label: fullName || 'Profile' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/users')}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => navigate(`/users/${user.id}/edit`)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </div>
        }
      />

      {/* Hero */}
      <Card className="overflow-hidden">
        <div className={cn('h-24 bg-gradient-to-r sm:h-28', HERO_GRADIENT)} />
        <CardContent className="pt-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div
              className={cn(
                '-mt-12 grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-3xl font-bold text-white shadow-lg ring-4 ring-card',
                HERO_GRADIENT,
              )}
            >
              {initials(fullName || user.email)}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{fullName || '—'}</h2>
                {isAdmin ? <Badge variant="secondary">{roleName}</Badge> : <Badge>{roleName}</Badge>}
                {user.isActive ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
                {user.isCmmsnAgnt && <Badge variant="warning">Commission agent</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" /> {user.email}
                </span>
                {user.username && (
                  <span className="flex items-center gap-1.5">
                    <UserIcon className="h-4 w-4" /> @{user.username}
                  </span>
                )}
                {user.contactNumber && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" /> {user.contactNumber}
                  </span>
                )}
                <span
                  className={cn(
                    'flex items-center gap-1.5',
                    user.allowLogin ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                  )}
                >
                  <KeyRound className="h-4 w-4" />
                  {user.allowLogin ? 'Login enabled' : 'Login disabled'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab bar */}
      <div className="mt-5 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {tab === 'overview' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Account & access" icon={ShieldCheck}>
              <Row icon={ShieldCheck} label="Role" value={roleName} />
              <Row icon={KeyRound} label="Login" value={user.allowLogin ? 'Enabled' : 'Disabled'} />
              <Row icon={UserIcon} label="Username" value={user.username} />
              <Row icon={Mail} label="Email" value={user.email} />
              <Row icon={MapPin} label="Location access" value={assignedLocations.join(', ')} />
              <Row icon={Users} label="Selected contacts only" value={user.selectedContacts ? 'Yes' : 'No'} />
            </Section>
            <Section title="Sales & commission" icon={CreditCard}>
              <Row icon={CreditCard} label="Commission agent" value={user.isCmmsnAgnt ? 'Yes' : 'No'} />
              <Row icon={Wallet} label="Commission %" value={user.cmmsnPercent ? `${user.cmmsnPercent}%` : null} />
              <Row
                icon={CreditCard}
                label="Max sales discount"
                value={user.maxSalesDiscountPercent != null ? `${user.maxSalesDiscountPercent}%` : null}
              />
            </Section>
          </div>
        )}

        {tab === 'employment' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Employment" icon={Briefcase}>
              <Row icon={Building2} label="Department" value={department} />
              <Row icon={Briefcase} label="Designation" value={designation} />
              <Row icon={MapPin} label="Primary location" value={primaryLocation} />
              <Row icon={Users} label="Reports to" value={manager} />
              <Row
                icon={Wallet}
                label="Salary"
                value={user.essentialsSalary != null ? user.essentialsSalary.toLocaleString() : null}
              />
              <Row icon={CalendarDays} label="Pay period" value={user.essentialsPayPeriod} />
            </Section>
            <Section title="HR assignments" icon={CalendarDays}>
              <div className="py-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Leave types</p>
                <Chips items={leaveTypes} />
              </div>
              <div className="py-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pay components</p>
                <Chips items={payComponents} />
              </div>
              <div className="py-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Activity codes</p>
                <Chips items={activityCodes} />
              </div>
            </Section>
          </div>
        )}

        {tab === 'personal' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Personal details" icon={UserIcon}>
              <Row icon={CalendarDays} label="Date of birth" value={user.dob} />
              <Row icon={UserIcon} label="Gender" value={user.gender && capitalize(user.gender)} />
              <Row icon={Heart} label="Marital status" value={user.maritalStatus && capitalize(user.maritalStatus)} />
              <Row icon={Droplet} label="Blood group" value={user.bloodGroup} />
              <Row icon={Users} label="Guardian" value={user.guardianName} />
              <Row icon={Fingerprint} label={user.idProofName || 'ID proof'} value={user.idProofNumber} />
            </Section>
            <Section title="Contact & address" icon={Phone}>
              <Row icon={Phone} label="Contact number" value={user.contactNumber} />
              <Row icon={Phone} label="Alternate number" value={user.altNumber} />
              <Row icon={Phone} label="Family number" value={user.familyNumber} />
              <Row icon={MapPin} label="Permanent address" value={user.permanentAddress} />
              <Row icon={MapPin} label="Current address" value={user.currentAddress} />
            </Section>
          </div>
        )}

        {tab === 'finance' && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Section title="Bank details" icon={Banknote}>
              <Row icon={UserIcon} label="Account holder" value={bank?.accountHolderName} />
              <Row icon={CreditCard} label="Account number" value={bank?.accountNumber} />
              <Row icon={Building2} label="Bank name" value={bank?.bankName} />
              <Row icon={Banknote} label="Bank code / IFSC" value={bank?.bankCode} />
              <Row icon={MapPin} label="Branch" value={bank?.branch} />
              <Row icon={Fingerprint} label="Tax payer ID" value={bank?.taxPayerId} />
            </Section>
            <Section title="Social" icon={Link2}>
              <Row icon={Facebook} label="Facebook" value={user.fbLink} />
              <Row icon={Twitter} label="Twitter / X" value={user.twitterLink} />
              <Row icon={Link2} label="LinkedIn" value={user.socialMedia1} />
              <Row icon={Link2} label="Other" value={user.socialMedia2} />
            </Section>
            <Section title="Custom fields" icon={Fingerprint}>
              <Row label="Custom field 1" value={user.customField1} />
              <Row label="Custom field 2" value={user.customField2} />
              <Row label="Custom field 3" value={user.customField3} />
              <Row label="Custom field 4" value={user.customField4} />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
