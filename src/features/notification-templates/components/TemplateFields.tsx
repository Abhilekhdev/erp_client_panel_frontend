import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { TemplateView } from '../notification-templates.types';

/** Renders the editable fields for a single notification template (mirrors tabs.blade.php). */
export function TemplateFields({ template }: { template: TemplateView }) {
  const { register } = useFormContext();
  const k = template.key;

  return (
    <div className="space-y-5">
      {/* Available tags */}
      {template.extra_tags.length > 0 && (
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-semibold text-foreground">Available Tags</p>
          <div className="space-y-1">
            {template.extra_tags.map((group, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {group.join(', ')}
              </p>
            ))}
          </div>
        </div>
      )}
      {template.help_text && <p className="text-xs text-muted-foreground">{template.help_text}</p>}

      {/* Email subject */}
      <div className="space-y-1.5">
        <Label htmlFor={`${k}_subject`}>Email Subject</Label>
        <Input id={`${k}_subject`} placeholder="Email Subject" {...register(`${k}.subject`)} />
      </div>

      {/* CC / BCC */}
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${k}_cc`}>CC</Label>
          <Input id={`${k}_cc`} type="email" placeholder="CC" {...register(`${k}.cc`)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${k}_bcc`}>BCC</Label>
          <Input id={`${k}_bcc`} type="email" placeholder="BCC" {...register(`${k}.bcc`)} />
        </div>
      </div>

      {/* Email body */}
      <div className="space-y-1.5">
        <Label htmlFor={`${k}_email_body`}>Email Body</Label>
        <Textarea id={`${k}_email_body`} placeholder="Email Body" {...register(`${k}.email_body`)} />
      </div>

      {/* SMS + WhatsApp (hidden for send_ledger, matching the blade `hide` class) */}
      {!template.hide_sms_whatsapp && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`${k}_sms_body`}>SMS Body</Label>
            <Textarea id={`${k}_sms_body`} placeholder="SMS Body" {...register(`${k}.sms_body`)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${k}_whatsapp_text`}>Whatsapp Text</Label>
            <Textarea
              id={`${k}_whatsapp_text`}
              placeholder="Whatsapp Text"
              {...register(`${k}.whatsapp_text`)}
            />
          </div>
        </>
      )}

      {/* Auto-send toggles */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            {...register(`${k}.auto_send`)}
          />
          Auto Send Email
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            {...register(`${k}.auto_send_sms`)}
          />
          Auto Send SMS
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            {...register(`${k}.auto_send_wa_notif`)}
          />
          Auto send Whatsapp notification
        </label>
      </div>
    </div>
  );
}
