/** Notification Templates — API + form types. Mirrors the NestJS notification-templates module. */

/** One template: its definition (name/tags) merged with saved/default content. */
export interface TemplateView {
  key: string;
  name: string;
  extra_tags: string[][];
  help_text?: string;
  hide_sms_whatsapp: boolean;
  subject: string;
  email_body: string;
  sms_body: string;
  whatsapp_text: string;
  cc: string;
  bcc: string;
  auto_send: boolean;
  auto_send_sms: boolean;
  auto_send_wa_notif: boolean;
}

export interface NotificationTemplatesResponse {
  general_notifications: TemplateView[];
  customer_notifications: TemplateView[];
  supplier_notifications: TemplateView[];
}

/** Editable per-template fields (form state, keyed by template_for). */
export interface TemplateFormValue {
  subject: string;
  cc: string;
  bcc: string;
  email_body: string;
  sms_body: string;
  whatsapp_text: string;
  auto_send: boolean;
  auto_send_sms: boolean;
  auto_send_wa_notif: boolean;
}

export type TemplatesFormValues = Record<string, TemplateFormValue>;

/** POST payload row — matches SaveNotificationTemplatesDto.templates[]. */
export interface TemplateSaveRow extends TemplateFormValue {
  template_for: string;
}

export interface SaveNotificationTemplatesPayload {
  templates: TemplateSaveRow[];
}
