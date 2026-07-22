import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { getApiErrorMessage } from '@/lib/api/axios';
import { formatMoney } from '@/lib/currency';
import {
  deleteContact,
  getContactMeta,
  listContacts,
  toggleContactStatus,
} from '../contacts.api';
import type { ContactListItem, ContactListType } from '../contacts.types';

const CONFIG = {
  supplier: {
    title: 'Suppliers',
    description: 'Vendors you purchase goods and services from.',
    group: 'Contacts',
    base: '/suppliers',
    dueLabel: 'Purchase Due',
  },
  customer: {
    title: 'Customers',
    description: 'People and businesses you sell to.',
    group: 'Contacts',
    base: '/customers',
    dueLabel: 'Sale Due',
  },
} as const;

/** "—" placeholder for transaction-derived figures not yet available. */
const Pending = () => (
  <span className="text-muted-foreground" title="Available once the Sales/Purchase module is built">
    —
  </span>
);

export function ContactsListPage({ listType }: { listType: ContactListType }) {
  const cfg = CONFIG[listType];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
  const [customerGroupId, setCustomerGroupId] = useState<string>('');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: meta } = useQuery({ queryKey: ['contact-meta'], queryFn: getContactMeta });

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', listType, page, pageSize, search, status, customerGroupId],
    queryFn: () =>
      listContacts({
        type: listType,
        page,
        pageSize,
        search,
        status: status || undefined,
        customerGroupId: customerGroupId ? Number(customerGroupId) : undefined,
      }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteContact(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts', listType] }),
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete contact')),
  });

  const toggle = useMutation({
    mutationFn: (id: number) => toggleContactStatus(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts', listType] }),
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not update status')),
  });

  const columns: Column<ContactListItem>[] = useMemo(() => {
    const base: Column<ContactListItem>[] = [
      {
        key: 'contact',
        header: 'Contact',
        hideable: false,
        render: (c) => (
          <div className="min-w-0">
            <div className="truncate font-medium">
              {c.supplierBusinessName || c.name || '—'}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {c.contactId ? `#${c.contactId}` : ''}
              {c.supplierBusinessName && c.name ? ` · ${c.name}` : ''}
            </div>
          </div>
        ),
      },
      { key: 'mobile', header: 'Mobile', render: (c) => c.mobile || '—' },
      {
        key: 'email',
        header: 'Email',
        render: (c) => <span className="text-muted-foreground">{c.email || '—'}</span>,
      },
    ];

    const customerCols: Column<ContactListItem>[] = [
      { key: 'group', header: 'Customer Group', render: (c) => c.customerGroup || '—' },
      {
        key: 'credit',
        header: 'Credit Limit',
        className: 'text-right tabular-nums',
        headerClassName: 'text-right',
        render: (c) => (c.creditLimit == null ? 'No limit' : formatMoney(c.creditLimit)),
      },
    ];

    const supplierCols: Column<ContactListItem>[] = [
      { key: 'tax', header: 'Tax No.', render: (c) => c.taxNumber || '—' },
      {
        key: 'payterm',
        header: 'Pay Term',
        render: (c) => (c.payTermNumber ? `${c.payTermNumber} ${c.payTermType ?? ''}` : '—'),
      },
    ];

    const tail: Column<ContactListItem>[] = [
      {
        key: 'advance',
        header: 'Advance',
        className: 'text-right tabular-nums',
        headerClassName: 'text-right',
        render: (c) => formatMoney(c.advanceBalance),
      },
      {
        key: 'due',
        header: cfg.dueLabel,
        className: 'text-right tabular-nums',
        headerClassName: 'text-right',
        // Purchase due is real now; sale due waits on the Sells module.
        render: (c) =>
          listType === 'supplier' && c.totalPurchaseDue != null ? (
            <span className={c.totalPurchaseDue > 0 ? 'text-destructive' : undefined}>
              {formatMoney(c.totalPurchaseDue)}
            </span>
          ) : (
            <Pending />
          ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (c) =>
          c.contactStatus === 'active' ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          ),
      },
      {
        key: 'actions',
        header: 'Action',
        hideable: false,
        headerClassName: 'text-right',
        className: 'text-right',
        render: (c) => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`${cfg.base}/${c.id}/edit`)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              title={c.contactStatus === 'active' ? 'Deactivate' : 'Activate'}
              onClick={() => toggle.mutate(c.id)}
            >
              <Power className="h-4 w-4" />
            </Button>
            {!c.isDefault && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  window.confirm(`Delete "${c.supplierBusinessName || c.name}"?`) && remove.mutate(c.id)
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ];

    return [...base, ...(listType === 'customer' ? customerCols : supplierCols), ...tail];
  }, [listType, cfg, navigate, remove, toggle]);

  return (
    <div>
      <PageHeader
        title={cfg.title}
        description={cfg.description}
        breadcrumbs={[{ label: cfg.group }, { label: cfg.title }]}
        actions={
          <Button size="sm" onClick={() => navigate(`${cfg.base}/create`)}>
            <Plus className="h-4 w-4" />
            Add {listType === 'supplier' ? 'Supplier' : 'Customer'}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(c) => c.id}
        loading={isLoading}
        page={page}
        pageSize={pageSize}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder={`Search ${cfg.title.toLowerCase()}…`}
        columnsStorageKey={`contacts-${listType}`}
        filtersActive={Boolean(search || status || (listType === 'customer' && customerGroupId))}
        onResetFilters={() => {
          setSearch('');
          setStatus('');
          setCustomerGroupId('');
          setPage(1);
        }}
        toolbar={
          <>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as '' | 'active' | 'inactive');
                setPage(1);
              }}
              className="h-9 w-36"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            {listType === 'customer' && (
              <Select
                value={customerGroupId}
                onChange={(e) => {
                  setCustomerGroupId(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-44"
              >
                <option value="">All groups</option>
                {(meta?.customerGroups ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            )}
          </>
        }
      />
    </div>
  );
}
