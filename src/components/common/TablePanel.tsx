import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

interface TablePanelProps {
  title: string;
  columns: string[];
  actions?: ReactNode;
  children?: ReactNode; // rows; omit for the empty state
  footer?: ReactNode;
}

/** Compact dashboard table panel (title + columns) with a clean "No data" empty state. */
export function TablePanel({ title, columns, actions, children, footer }: TablePanelProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold">{title}</h3>
        {actions}
      </div>
      <Table>
        <THead>
          <TR className="bg-muted/40 hover:bg-muted/40">
            {columns.map((c) => (
              <TH key={c}>{c}</TH>
            ))}
          </TR>
        </THead>
        <TBody>
          {children ?? (
            <TR className="hover:bg-transparent">
              <TD colSpan={columns.length} className="py-12">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Inbox className="h-9 w-9 opacity-40" strokeWidth={1.5} />
                  <p className="text-sm">No data available in table</p>
                </div>
              </TD>
            </TR>
          )}
        </TBody>
      </Table>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        {footer ?? 'Showing 0 to 0 of 0 entries'}
      </div>
    </Card>
  );
}
