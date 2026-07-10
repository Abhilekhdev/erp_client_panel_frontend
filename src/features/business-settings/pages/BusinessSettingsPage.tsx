import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api/axios';
import { getBusinessSettings, updateBusinessSettings } from '../business-settings.api';
import { buildDefaults, toPayload } from '../business-settings.mapping';
import type { SettingsFormValues } from '../business-settings.types';
import { SETTINGS_TABS } from '../components/tabs';

export function BusinessSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['business-settings'],
    queryFn: getBusinessSettings,
  });

  const defaults = useMemo(
    () => (data ? buildDefaults(data.business) : undefined),
    [data],
  );
  const methods = useForm<SettingsFormValues>({ values: defaults });

  const [active, setActive] = useState('business');
  const [banner, setBanner] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);

  const save = useMutation({
    mutationFn: (values: SettingsFormValues) => updateBusinessSettings(toPayload(values)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['business-settings'] });
      setBanner({ type: 'success', msg: 'Business settings saved successfully.' });
    },
    onError: (e) => setBanner({ type: 'error', msg: getApiErrorMessage(e, 'Could not save settings') }),
  });

  const onSubmit = methods.handleSubmit(
    (values) => {
      setBanner(null);
      save.mutate(values);
    },
    () => setBanner({ type: 'error', msg: 'Please fix the highlighted fields.' }),
  );

  const ActiveTab = SETTINGS_TABS.find((t) => t.key === active)?.Component;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Business Settings"
        description="Configure your business, taxes, products, POS, and more."
        breadcrumbs={[{ label: 'Settings' }, { label: 'Business Settings' }]}
        actions={
          <Button onClick={onSubmit} isLoading={save.isPending} disabled={isLoading}>
            Save Settings
          </Button>
        }
      />

      {banner && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
            banner.type === 'error'
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          }`}
        >
          {banner.type === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>{banner.msg}</span>
        </div>
      )}

      {isLoading || !data || !ActiveTab ? (
        <div className="flex gap-5">
          <Skeleton className="h-96 w-52 shrink-0 rounded-xl" />
          <Skeleton className="h-96 flex-1 rounded-xl" />
        </div>
      ) : (
        <FormProvider {...methods}>
          <form onSubmit={onSubmit} className="flex flex-col gap-5 md:flex-row">
            {/* Left vertical tab rail (ConnectCRM style) */}
            <nav className="flex shrink-0 gap-1 overflow-x-auto rounded-xl border bg-card p-2 md:w-52 md:flex-col md:overflow-visible">
              {SETTINGS_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActive(t.key)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    active === t.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            {/* Active tab content */}
            <div className="min-w-0 flex-1">
              <ActiveTab options={data.options} business={data.business} />
              <div className="flex justify-end">
                <Button type="submit" isLoading={save.isPending}>
                  Save Settings
                </Button>
              </div>
            </div>
          </form>
        </FormProvider>
      )}
    </div>
  );
}
