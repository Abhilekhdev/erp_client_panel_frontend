import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  deleteProduct,
  getProductMeta,
  listProducts,
  toggleProduct,
  type ProductListRow,
} from '../products.api';

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const typeLabel: Record<string, string> = { single: 'Single', variable: 'Variable', combo: 'Combo' };

export function ProductsListPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { has } = usePermissions();
  const canCreate = has('product.create');
  const canUpdate = has('product.update');
  const canDelete = has('product.delete');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ categoryId: '' as number | '', brandId: '' as number | '', type: '' });

  const { data: meta } = useQuery({ queryKey: ['product-meta'], queryFn: getProductMeta });
  const { data, isLoading } = useQuery({
    queryKey: ['products', page, pageSize, search, filters],
    queryFn: () => listProducts({ page, pageSize, search, ...filters }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['products'] });

  const toggle = useMutation({
    mutationFn: (p: ProductListRow) => toggleProduct(p.id, p.isInactive),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not update')),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });

  const set = (k: keyof typeof filters, v: string | number) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  const columns: Column<ProductListRow>[] = [
    { key: 'sku', header: 'SKU', render: (p) => <span className="font-mono text-xs">{p.sku}</span> },
    {
      key: 'name',
      header: 'Product',
      render: (p) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{p.name}</span>
          {p.isInactive && <Badge variant="secondary">Inactive</Badge>}
          {p.notForSelling && <Badge variant="secondary">Not for selling</Badge>}
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (p) => (p.type ? typeLabel[p.type] ?? p.type : '—') },
    { key: 'category', header: 'Category', render: (p) => p.category || '—' },
    { key: 'brand', header: 'Brand', render: (p) => p.brand || '—' },
    { key: 'unit', header: 'Unit', render: (p) => p.unit || '—' },
    { key: 'tax', header: 'Tax', render: (p) => (p.tax ? `${p.tax} (${p.taxAmount}%)` : '—') },
    {
      key: 'price',
      header: 'Sell price (inc tax)',
      render: (p) => (p.priceMin === p.priceMax ? money(p.priceMax) : `${money(p.priceMin)} – ${money(p.priceMax)}`),
    },
    ...(canUpdate || canDelete
      ? [
          {
            key: 'actions',
            header: 'Action',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (p: ProductListRow) => (
              <div className="flex justify-end gap-2">
                {canUpdate && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/products/${p.id}/edit`)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggle.mutate(p)}
                      title={p.isInactive ? 'Activate' : 'Deactivate'}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {canDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => window.confirm(`Delete "${p.name}"?`) && remove.mutate(p.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ),
          } as Column<ProductListRow>,
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        breadcrumbs={[{ label: 'Products' }, { label: 'All Products' }]}
        actions={
          canCreate && (
            <Button size="sm" onClick={() => navigate('/products/create')}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          )
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select className="w-44" value={String(filters.categoryId)} onChange={(e) => set('categoryId', e.target.value ? Number(e.target.value) : '')}>
              <option value="">All</option>
              {meta?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Brand</Label>
            <Select className="w-44" value={String(filters.brandId)} onChange={(e) => set('brandId', e.target.value ? Number(e.target.value) : '')}>
              <option value="">All</option>
              {meta?.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select className="w-40" value={filters.type} onChange={(e) => set('type', e.target.value)}>
              <option value="">All</option>
              <option value="single">Single</option>
              <option value="variable">Variable</option>
              <option value="combo">Combo</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(p) => p.id}
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
        searchPlaceholder="Search name / SKU…"
      />
    </div>
  );
}
