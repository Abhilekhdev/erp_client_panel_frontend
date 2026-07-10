import { useState, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { TemplateView } from '../notification-templates.types';
import { TemplateFields } from './TemplateFields';

/** A titled card with one tab per template (mirrors notification_template/partials/tabs.blade.php). */
export function NotificationSection({
  title,
  templates,
  footer,
}: {
  title: string;
  templates: TemplateView[];
  footer?: ReactNode;
}) {
  const [active, setActive] = useState(templates[0]?.key ?? '');
  if (templates.length === 0) return null;
  const activeTemplate = templates.find((t) => t.key === active) ?? templates[0];

  return (
    <Card className="mb-5">
      <CardContent className="pt-6">
        <h3 className="mb-4 border-b pb-3 text-sm font-semibold">{title}</h3>

        {/* Tab rail */}
        <div className="mb-5 flex flex-wrap gap-1 border-b">
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`-mb-px whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTemplate.key === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Active template fields — all remain mounted (registered) so every tab persists on save */}
        {templates.map((t) => (
          <div key={t.key} className={t.key === activeTemplate.key ? '' : 'hidden'}>
            <TemplateFields template={t} />
          </div>
        ))}

        {footer}
      </CardContent>
    </Card>
  );
}
