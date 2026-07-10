import { Download, Plus, SlidersHorizontal } from 'lucide-react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader, type Crumb } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';

type Row = Record<string, unknown>;

const COLUMNS: Column<Row>[] = [
  { key: 'name', header: 'Name' },
  { key: 'status', header: 'Status' },
  { key: 'date', header: 'Date' },
  { key: 'owner', header: 'Owner' },
  { key: 'actions', header: 'Action', headerClassName: 'text-right' },
];

interface ModulePageProps {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
}

/**
 * Reusable list scaffold: branded header + a full server-side DataTable (search, filters,
 * export, selection, pagination) in a premium loading state. Real data is wired per module.
 */
export function ModulePage({ title, description, breadcrumbs }: ModulePageProps) {
  return (
    <div>
      <PageHeader
        title={title}
        description={description ?? `Manage ${title.toLowerCase()} for your business.`}
        breadcrumbs={breadcrumbs}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Import
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New
            </Button>
          </>
        }
      />
      <DataTable
        columns={COLUMNS}
        data={[]}
        rowKey={() => 0}
        selectable
        page={1}
        pageSize={10}
        total={0}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        onSearchChange={() => {}}
        searchPlaceholder={`Search ${title.toLowerCase()}…`}
        toolbar={
          <>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="h-4 w-4" />
              Advance Filter
            </Button>
            <Button variant="dark" size="sm">
              Export PDF
            </Button>
            <Button variant="dark" size="sm">
              Export Excel
            </Button>
          </>
        }
      />
    </div>
  );
}
