import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  getNotificationTemplates,
  saveNotificationTemplates,
} from '../notification-templates.api';
import { NotificationSection } from '../components/NotificationSection';
import type {
  NotificationTemplatesResponse,
  TemplatesFormValues,
  TemplateView,
} from '../notification-templates.types';

/** Flatten the three groups into a single {key -> editable fields} form state. */
function buildDefaults(res: NotificationTemplatesResponse): TemplatesFormValues {
  const all: TemplateView[] = [
    ...res.general_notifications,
    ...res.customer_notifications,
    ...res.supplier_notifications,
  ];
  const values: TemplatesFormValues = {};
  for (const t of all) {
    values[t.key] = {
      subject: t.subject ?? '',
      cc: t.cc ?? '',
      bcc: t.bcc ?? '',
      email_body: t.email_body ?? '',
      sms_body: t.sms_body ?? '',
      whatsapp_text: t.whatsapp_text ?? '',
      auto_send: Boolean(t.auto_send),
      auto_send_sms: Boolean(t.auto_send_sms),
      auto_send_wa_notif: Boolean(t.auto_send_wa_notif),
    };
  }
  return values;
}

function toPayload(values: TemplatesFormValues) {
  return {
    templates: Object.entries(values).map(([template_for, v]) => ({ template_for, ...v })),
  };
}

export function NotificationTemplatesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: getNotificationTemplates,
  });

  const defaults = useMemo(() => (data ? buildDefaults(data) : undefined), [data]);
  const methods = useForm<TemplatesFormValues>({ values: defaults });
  const [banner, setBanner] = useState<{ type: 'error' | 'success'; msg: string } | null>(null);

  const save = useMutation({
    mutationFn: (values: TemplatesFormValues) => saveNotificationTemplates(toPayload(values)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-templates'] });
      setBanner({ type: 'success', msg: 'Notification templates saved successfully.' });
    },
    onError: (e) =>
      setBanner({ type: 'error', msg: getApiErrorMessage(e, 'Could not save notification templates') }),
  });

  const onSubmit = methods.handleSubmit((values) => {
    setBanner(null);
    save.mutate(values);
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Notification Templates"
        description="Configure the email, SMS and WhatsApp templates sent to customers and suppliers."
        breadcrumbs={[{ label: 'Notification Templates' }]}
        actions={
          <Button onClick={onSubmit} isLoading={save.isPending} disabled={isLoading}>
            Save
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

      {isLoading || !data ? (
        <div className="space-y-5">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <FormProvider {...methods}>
          <form onSubmit={onSubmit} className="space-y-5">
            <NotificationSection title="Notifications" templates={data.general_notifications} />
            <NotificationSection
              title="Customer Notifications"
              templates={data.customer_notifications}
            />
            <NotificationSection
              title="Supplier Notifications"
              templates={data.supplier_notifications}
              footer={
                <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  Business logo will not work in SMS
                </div>
              }
            />

            <div className="flex justify-center">
              <Button type="submit" isLoading={save.isPending}>
                Save
              </Button>
            </div>
          </form>
        </FormProvider>
      )}
    </div>
  );
}
