import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertCircle, Building2, Lock, Mail, User } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/axios';
import { getCurrencies } from '../auth.api';
import { registerSchema, type RegisterInput } from '../auth.schemas';
import { useAuth } from '../useAuth';

export function RegisterForm() {
  const { register: registerAccount } = useAuth();
  const {
    data: currencies,
    isLoading: currenciesLoading,
    isError: currenciesError,
  } = useQuery({ queryKey: ['currencies'], queryFn: getCurrencies });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { businessName: '', ownerFirstName: '', ownerLastName: '', email: '', password: '' },
  });

  useEffect(() => {
    if (currencies?.length) setValue('currencyId', currencies[0].id);
  }, [currencies, setValue]);

  return (
    <form
      onSubmit={handleSubmit((values) => registerAccount.mutate(values))}
      className="space-y-4"
      noValidate
    >
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

      <div className="space-y-2">
        <Label htmlFor="businessName">Business name</Label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="businessName" placeholder="OlympasLLC" className="pl-9" {...register('businessName')} />
        </div>
        {errors.businessName && <p className="text-xs text-destructive">{errors.businessName.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="ownerFirstName">First name</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="ownerFirstName" placeholder="Abhilekh" className="pl-9" {...register('ownerFirstName')} />
          </div>
          {errors.ownerFirstName && (
            <p className="text-xs text-destructive">{errors.ownerFirstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerLastName">Last name</Label>
          <Input id="ownerLastName" placeholder="Singh" {...register('ownerLastName')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="email" type="email" placeholder="you@company.com" className="pl-9" {...register('email')} />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            className="pl-9"
            {...register('password')}
          />
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="currencyId">Base currency</Label>
        <select
          id="currencyId"
          disabled={currenciesLoading || currenciesError}
          className={cn(
            'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
          )}
          {...register('currencyId')}
        >
          <option value="" disabled>
            {currenciesLoading ? 'Loading currencies…' : 'Select a currency'}
          </option>
          {currencies?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.country} ({c.symbol})
            </option>
          ))}
        </select>
        {currenciesError && (
          <p className="text-xs text-destructive">
            Couldn't load currencies. Is the API running? Try refreshing.
          </p>
        )}
        {errors.currencyId && <p className="text-xs text-destructive">{errors.currencyId.message}</p>}
      </div>

      <Button type="submit" size="lg" className="w-full" isLoading={registerAccount.isPending}>
        Create business account
      </Button>
    </form>
  );
}
