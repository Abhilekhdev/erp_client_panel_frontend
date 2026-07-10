import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, FileText, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  deleteInvoiceScheme,
  listInvoiceSchemes,
  setDefaultInvoiceScheme,
} from '../invoice-schemes.api';
import type { InvoiceScheme } from '../invoice-schemes.types';
import { SchemeFormModal } from '../components/SchemeFormModal';

// Column-header tooltips — verbatim from GOURI tooltip.php (invoice_scheme_*). HTML preserved.
const TT = {
  name: 'Give a short meaningful name to the Invoice Scheme.',
  prefix:
    'Prefix for an Invoice Scheme.<br>A Prefix can be a custom text or current year. Ex: #XXXX0001, #2018-0002',
  start:
    "Start number for invoice numbering. <br><small class='text-muted'>You can make it 1 or any other number from which numbering will start.</small>",
  count: 'Total number of invoices generated for the Invoice Scheme',
  digits: 'Length of the Invoice Number excluding Invoice Prefix',
};

type Tab = 'schemes' | 'layouts';

export function InvoiceSettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('schemes');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: schemes, isLoading } = useQuery({
    queryKey: ['invoice-schemes'],
    queryFn: listInvoiceSchemes,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['invoice-schemes'] });
    qc.invalidateQueries({ queryKey: ['business-location-options'] });
  };

  const remove = useMutation({
    mutationFn: (id: number) => deleteInvoiceScheme(id),
    onSuccess: invalidate,
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not delete invoice scheme')),
  });
  const setDefault = useMutation({
    mutationFn: (id: number) => setDefaultInvoiceScheme(id),
    onSuccess: invalidate,
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not set default')),
  });

  const openCreate = () => {
    setEditingId(null);
    setOpen(true);
  };
  const openEdit = (id: number) => {
    setEditingId(id);
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Invoice Settings"
        description="Manage your invoice schemes and layouts."
        breadcrumbs={[{ label: 'Settings' }, { label: 'Invoice Settings' }]}
      />

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b">
        {(
          [
            { key: 'schemes', label: 'Invoice Schemes' },
            { key: 'layouts', label: 'Invoice Layouts' },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'schemes' ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">All your invoice schemes</h3>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <Th tip={TT.name}>Name</Th>
                      <Th tip={TT.prefix}>Prefix</Th>
                      <Th tip={TT.start}>Start from</Th>
                      <Th tip={TT.count}>Invoice Count</Th>
                      <Th tip={TT.digits}>Number of digits</Th>
                      <th className="px-4 py-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(schemes ?? []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                          No invoice schemes yet. Click “Add” to create one.
                        </td>
                      </tr>
                    )}
                    {(schemes ?? []).map((s: InvoiceScheme) => (
                      <tr key={s.id} className="border-t">
                        <td className="px-4 py-3">
                          <span className="font-medium">{s.name}</span>
                          {s.isDefault && (
                            <Badge variant="success" className="ml-2">
                              Default
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{s.prefixDisplay || '—'}</td>
                        <td className="px-4 py-3">{s.startNumber}</td>
                        <td className="px-4 py-3">{s.invoiceCount}</td>
                        <td className="px-4 py-3">{s.totalDigits}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(s.id)}>
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>
                            {s.isDefault ? (
                              <Button variant="success" size="sm" disabled>
                                <CheckSquare className="h-4 w-4" />
                                Default
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                isLoading={setDefault.isPending && setDefault.variables === s.id}
                                onClick={() => setDefault.mutate(s.id)}
                              >
                                <Star className="h-4 w-4" />
                                Set as default
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={s.isDefault}
                              isLoading={remove.isPending && remove.variables === s.id}
                              onClick={() =>
                                window.confirm(`Delete invoice scheme "${s.name}"?`) &&
                                remove.mutate(s.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Invoice Layouts</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Invoice layout design is a separate module and will be available soon. Invoice schemes
            (numbering) are fully manageable in the first tab.
          </p>
        </div>
      )}

      <SchemeFormModal open={open} onClose={() => setOpen(false)} editingId={editingId} />
    </div>
  );
}

function Th({ children, tip }: { children: React.ReactNode; tip: string }) {
  return (
    <th className="px-4 py-3 font-medium">
      <span className="inline-flex items-center gap-1.5">
        {children}
        <InfoTooltip content={tip} html side="bottom" />
      </span>
    </th>
  );
}
