import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, ArrowRight, Building2, Check, Lock, Mail } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api/axios';
import { cn } from '@/lib/utils';
import { getCurrencies } from '../auth.api';
import { REGISTER_STEP_FIELDS, registerSchema, type RegisterInput } from '../auth.schemas';
import { useAuth } from '../useAuth';

const STEPS = [
  { key: 'business', title: 'Business', blurb: 'Tell us about your company' },
  { key: 'owner', title: 'Your account', blurb: 'How you will sign in' },
] as const;

/** A short, sane list — the browser's own zone if we can read it, then common ones. */
function timeZones(): string[] {
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const common = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney', 'UTC'];
  return Array.from(new Set([local, ...common].filter(Boolean)));
}

export function RegisterForm() {
  const { register: registerAccount } = useAuth();
  const [step, setStep] = useState(0);

  const { data: currencies, isLoading: currenciesLoading } = useQuery({
    queryKey: ['currencies'],
    queryFn: getCurrencies,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      businessName: '', ownerFirstName: '', ownerLastName: '', ownerSurname: '',
      email: '', password: '', confirmPassword: '',
      website: '', mobile: '', alternateNumber: '',
      country: '', state: '', city: '', zipCode: '', landmark: '',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    },
  });

  useEffect(() => {
    if (currencies?.length) setValue('currencyId', currencies[0].id);
  }, [currencies, setValue]);

  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  /** Only advance when this step's own fields are valid — never validate step 3 from step 1. */
  const next = async () => {
    const fields = REGISTER_STEP_FIELDS[STEPS[step].key] as readonly string[];
    const valid = await trigger(fields as FieldPath<RegisterInput>[]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const isLast = step === STEPS.length - 1;
  const passwordsMismatch = Boolean(confirmPassword) && confirmPassword !== password;

  return (
    <form
      onSubmit={handleSubmit((values) => registerAccount.mutate(values))}
      className="space-y-6"
      noValidate
    >
      {/* Progress: a numbered rail so people can see how short this actually is. */}
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.key} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                // Going back is always safe; jumping forward would skip validation.
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary text-primary',
                  !done && !active && 'border-border text-muted-foreground',
                  i < step && 'cursor-pointer',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </button>
              <div className="hidden min-w-0 flex-1 sm:block">
                <p className={cn('truncate text-xs font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>
                  {s.title}
                </p>
              </div>
              {i < STEPS.length - 1 && <div className={cn('h-px flex-1', done ? 'bg-primary' : 'bg-border')} />}
            </li>
          );
        })}
      </ol>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">{STEPS[step].title}</h2>
        <p className="text-sm text-muted-foreground">{STEPS[step].blurb}</p>
      </div>

      {registerAccount.isError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{getApiErrorMessage(registerAccount.error, 'Could not create account')}</span>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18 }}
          className="space-y-4"
        >
          {step === 0 && (
            <>
              <Field label="Business name" required error={errors.businessName?.message}>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Olympas Trading Co." className="pl-9" {...register('businessName')} />
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Currency" required error={errors.currencyId?.message}>
                  <Select disabled={currenciesLoading} {...register('currencyId')}>
                    {currenciesLoading && <option>Loading…</option>}
                    {currencies?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.country} — {c.currency} ({c.code})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Time zone" error={errors.timeZone?.message}>
                  <Select {...register('timeZone')}>
                    {timeZones().map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </Select>
                </Field>
              </div>

              <details className="rounded-lg border">
                <summary className="cursor-pointer select-none px-3 py-2.5 text-sm font-medium">
                  Contact &amp; address <span className="font-normal text-muted-foreground">— optional, you can add this later</span>
                </summary>
                <div className="space-y-4 border-t p-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Phone" error={errors.mobile?.message}>
                      <Input placeholder="+91 98765 43210" {...register('mobile')} />
                    </Field>
                    <Field label="Alternate number" error={errors.alternateNumber?.message}>
                      <Input {...register('alternateNumber')} />
                    </Field>
                  </div>
                  <Field label="Website" error={errors.website?.message}>
                    <Input placeholder="https://example.com" {...register('website')} />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Country" error={errors.country?.message}>
                      <Input {...register('country')} />
                    </Field>
                    <Field label="State" error={errors.state?.message}>
                      <Input {...register('state')} />
                    </Field>
                    <Field label="City" error={errors.city?.message}>
                      <Input {...register('city')} />
                    </Field>
                    <Field label="Zip / postal code" error={errors.zipCode?.message}>
                      <Input {...register('zipCode')} />
                    </Field>
                  </div>
                  <Field label="Landmark" error={errors.landmark?.message}>
                    <Input {...register('landmark')} />
                  </Field>
                  <p className="text-xs text-muted-foreground">
                    This becomes your first business location — you can rename it or add more later.
                  </p>
                </div>
              </details>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid gap-4 sm:grid-cols-[5rem_1fr_1fr]">
                <Field label="Prefix" error={errors.ownerSurname?.message}>
                  <Input placeholder="Mr" {...register('ownerSurname')} />
                </Field>
                <Field label="First name" required error={errors.ownerFirstName?.message}>
                  <Input {...register('ownerFirstName')} />
                </Field>
                <Field label="Last name" error={errors.ownerLastName?.message}>
                  <Input {...register('ownerLastName')} />
                </Field>
              </div>

              <Field label="Email" required error={errors.email?.message} hint="You will sign in with this.">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" autoComplete="email" className="pl-9" {...register('email')} />
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Password" required error={errors.password?.message}>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="password" autoComplete="new-password" className="pl-9" {...register('password')} />
                  </div>
                </Field>
                <Field
                  label="Confirm password"
                  required
                  error={errors.confirmPassword?.message ?? (passwordsMismatch ? 'Passwords do not match' : undefined)}
                >
                  <Input type="password" autoComplete="new-password" {...register('confirmPassword')} />
                </Field>
              </div>

              <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                You will be the owner of this workspace, with full access. You can invite your team once you are in.
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {isLast ? (
          <Button type="submit" isLoading={registerAccount.isPending} disabled={passwordsMismatch}>
            Create business
          </Button>
        ) : (
          <Button type="button" onClick={next}>
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
