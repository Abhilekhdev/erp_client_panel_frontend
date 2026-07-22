import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader, type Crumb } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ComingSoonPageProps {
  title: string;
  /** One line on what this screen will do once it exists. */
  description: string;
  /** Why it isn't here yet — name the thing it depends on, not "coming soon". */
  blockedBy: string;
  /** What the user can do in the meantime. */
  alternatives?: { label: string; to: string }[];
  breadcrumbs?: Crumb[];
}

/**
 * An honest placeholder for a screen that is deliberately not built yet.
 *
 * The generic list scaffold used to render here instead — a fake empty table with working-looking
 * "New" and "Import" buttons — which reads as a broken feature rather than an unbuilt one.
 */
export function ComingSoonPage({ title, description, blockedBy, alternatives = [], breadcrumbs }: ComingSoonPageProps) {
  return (
    <div>
      <PageHeader title={title} description={description} breadcrumbs={breadcrumbs} />
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="h-6 w-6" />
          </span>
          <div className="max-w-lg space-y-1.5">
            <p className="text-base font-medium">Not available yet</p>
            <p className="text-sm text-muted-foreground">{blockedBy}</p>
          </div>
          {alternatives.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {alternatives.map((a) => (
                <Link key={a.to} to={a.to}>
                  <Button variant="outline" size="sm">
                    {a.label}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
