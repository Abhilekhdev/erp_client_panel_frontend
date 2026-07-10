import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api/axios';
import { cn } from '@/lib/utils';
import {
  createCommissionAgent,
  getCommissionAgent,
  updateCommissionAgent,
} from '../commission-agents.api';
import type { CommissionAgentDetail, CommissionAgentFormBody } from '../commission-agents.types';

interface FormState {
  surname: string;
  firstName: string;
  lastName: string;
  email: string;
  contactNo: string;
  address: string;
  cmmsnPercent: string;
}

const EMPTY: FormState = {
  surname: '',
  firstName: '',
  lastName: '',
  email: '',
  contactNo: '',
  address: '',
  cmmsnPercent: '',
};

function hydrate(a: CommissionAgentDetail): FormState {
  return {
    surname: a.surname ?? '',
    firstName: a.firstName,
    lastName: a.lastName ?? '',
    email: a.email,
    contactNo: a.contactNo ?? '',
    address: a.address ?? '',
    cmmsnPercent: a.cmmsnPercent ? String(a.cmmsnPercent) : '',
  };
}

function toBody(f: FormState): CommissionAgentFormBody {
  return {
    surname: f.surname,
    firstName: f.firstName,
    lastName: f.lastName,
    email: f.email,
    contactNo: f.contactNo,
    address: f.address,
    cmmsnPercent: f.cmmsnPercent,
  };
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

const textareaCls =
  'flex min-h-[76px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export function CommissionAgentFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const agentId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: agent } = useQuery({
    queryKey: ['commission-agent', agentId],
    queryFn: () => getCommissionAgent(agentId as number),
    enabled: isEdit,
  });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState('');
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (isEdit && agent) setForm(hydrate(agent));
  }, [isEdit, agent]);

  const save = useMutation({
    mutationFn: () => {
      const body = toBody(form);
      return isEdit ? updateCommissionAgent(agentId as number, body) : createCommissionAgent(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commission-agents'] });
      navigate('/commission-agents');
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save commission agent')),
  });

  const onSubmit = () => {
    if (!form.firstName.trim()) return setError('First name is required');
    if (!form.email.trim()) return setError('Email is required');
    setError('');
    save.mutate();
  };

  if (isEdit && !agent) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Edit Commission Agent"
          breadcrumbs={[{ label: 'Commission Agents', to: '/commission-agents' }, { label: 'Edit' }]}
        />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isEdit ? 'Edit Commission Agent' : 'Add Commission Agent'}
        description="Commission agents don't log in — they're tracked for sales commission only."
        breadcrumbs={[
          { label: 'Commission Agents', to: '/commission-agents' },
          { label: isEdit ? 'Edit' : 'Add' },
        ]}
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="whitespace-pre-line">{error}</span>
        </div>
      )}

      <Card className="mb-5">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Agent details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <Field label="Contact number">
            <Input value={form.contactNo} onChange={(e) => set('contactNo', e.target.value)} />
          </Field>
          <Field label="Commission (%)">
            <Input
              type="number"
              step="0.01"
              value={form.cmmsnPercent}
              onChange={(e) => set('cmmsnPercent', e.target.value)}
            />
          </Field>
          <Field label="Address" className="sm:col-span-2 lg:col-span-3">
            <textarea
              className={textareaCls}
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/commission-agents')}>
          Cancel
        </Button>
        <Button onClick={onSubmit} isLoading={save.isPending}>
          {isEdit ? 'Update Agent' : 'Save Agent'}
        </Button>
      </div>
    </div>
  );
}
