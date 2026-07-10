import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Power } from 'lucide-react';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  activateDeactivateLocation,
  getLocationOptions,
  listLocations,
} from '../business-locations.api';
import type { LocationRow } from '../business-locations.types';
import { LocationFormModal } from '../components/LocationFormModal';

const dash = (v: string | null) => (v && v.trim() !== '' ? v : '—');

export function BusinessLocationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['business-locations', page, pageSize, search],
    queryFn: () => listLocations({ page, pageSize, search }),
  });

  const { data: options } = useQuery({
    queryKey: ['business-location-options'],
    queryFn: getLocationOptions,
  });

  const toggle = useMutation({
    mutationFn: (id: number) => activateDeactivateLocation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['business-locations'] }),
    onError: (e) => window.alert(getApiErrorMessage(e, 'Could not update location status')),
  });

  const openCreate = () => {
    setEditingId(null);
    setOpen(true);
  };
  const openEdit = (id: number) => {
    setEditingId(id);
    setOpen(true);
  };

  const columns: Column<LocationRow>[] = [
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'locationId', header: 'Location ID', render: (r) => dash(r.locationId) },
    { key: 'landmark', header: 'Landmark', render: (r) => dash(r.landmark) },
    { key: 'city', header: 'City', render: (r) => dash(r.city) },
    { key: 'zipCode', header: 'Zip Code', render: (r) => dash(r.zipCode) },
    { key: 'state', header: 'State', render: (r) => dash(r.state) },
    { key: 'country', header: 'Country', render: (r) => dash(r.country) },
    { key: 'priceGroup', header: 'Price Group', render: (r) => dash(r.priceGroup) },
    { key: 'invoiceScheme', header: 'Invoice Scheme', render: (r) => dash(r.invoiceScheme) },
    { key: 'invoiceLayout', header: 'Invoice Layout for POS', render: (r) => dash(r.invoiceLayout) },
    { key: 'saleInvoiceLayout', header: 'Invoice Layout for Sale', render: (r) => dash(r.saleInvoiceLayout) },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(r.id)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant={r.isActive ? 'destructive' : 'default'}
            size="sm"
            isLoading={toggle.isPending && toggle.variables === r.id}
            onClick={() => toggle.mutate(r.id)}
          >
            <Power className="h-4 w-4" />
            {r.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Business Locations"
        description="Manage your business locations."
        breadcrumbs={[{ label: 'Settings' }, { label: 'Business Locations' }]}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(r) => r.id}
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
        searchPlaceholder="Search locations…"
      />

      {options && (
        <LocationFormModal
          open={open}
          onClose={() => setOpen(false)}
          editingId={editingId}
          options={options}
        />
      )}
    </div>
  );
}
