import { Hammer } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { HrmTabs } from '../components/HrmTabs';

/**
 * HRM section that isn't built yet. It still renders the HRM breadcrumb + shared tab bar so the
 * whole HRM area navigates as one cohesive tab (matching GOURI's flow); the body is a placeholder
 * that gets replaced by the real screen as each sub-module lands.
 */
export function HrmPlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} breadcrumbs={[{ label: 'HRM', to: '/hrm' }, { label: title }]} />
      <HrmTabs />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10">
            <Hammer className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">{title} is being built</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This HRM section is next in the queue — the tab bar above already reflects the full flow.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
