import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Barcode,
  Copy,
  Database,
  Download,
  Eye,
  History,
  Layers,
  MapPin,
  Package,
  Pencil,
  Plus,
  Power,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { RowActions } from '@/components/common/RowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { MultiSelect } from '@/components/ui/multi-select';
import { Select } from '@/components/ui/select';
import { usePermissions } from '@/features/auth/usePermission';
import { getApiErrorMessage } from '@/lib/api/axios';
import { cn } from '@/lib/utils';
import { GroupPricesModal } from '../components/GroupPricesModal';
import { OpeningStockModal } from '../components/OpeningStockModal';
import { ProductViewModal } from '../components/ProductViewModal';
import { StockReportTab } from '../components/StockReportTab';
import {
  deleteProduct,
  exportProducts,
  getProductMeta,
  listProducts,
  massDeleteProducts,
  massSetProductsActive,
  massUpdateProductLocations,
  toggleProduct,
  type ProductFilters,
  type ProductListRow,
} from '../products.api';

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Variable products span a range; a single price collapses to one number. */
const priceRange = (min: number | null, max: number | null) => {
  if (min == null || max == null) return '—';
  return min === max ? money(max) : `${money(min)} – ${money(max)}`;
};
const typeLabel: Record<string, string> = { single: 'Single', variable: 'Variable', combo: 'Combo' };

type BlankFilters = Omit<ProductFilters, 'page' | 'pageSize' | 'search'>;
const BLANK_FILTERS: BlankFilters = {
  categoryId: '', brandId: '', unitId: '', taxId: '', locationId: '', type: '', active: '', notForSelling: '',
};

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
  const [filters, setFilters] = useState<BlankFilters>(BLANK_FILTERS);
  const [selected, setSelected] = useState<Array<string | number>>([]);
  const [viewId, setViewId] = useState<number | null>(null);
  const [groupPricesId, setGroupPricesId] = useState<number | null>(null);
  const [openingStockId, setOpeningStockId] = useState<number | null>(null);
  const [tab, setTab] = useState<'products' | 'stock'>('products');
  const canSeeStockReport = has('stock_report.view');
  const canOpeningStock = has('product.opening_stock');
  const canView = has('product.view');
  const [locationModal, setLocationModal] = useState<null | 'add' | 'remove'>(null);
  const [locationIds, setLocationIds] = useState<number[]>([]);

  const { data: meta } = useQuery({ queryKey: ['product-meta'], queryFn: getProductMeta });
  const { data, isLoading } = useQuery({
    queryKey: ['products', page, pageSize, search, filters],
    queryFn: () => listProducts({ page, pageSize, search, ...filters }),
  });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['products'] });
    setSelected([]); // the ids may no longer exist (or no longer match the filters)
  };
  const ids = selected.map(Number);

  const massDelete = useMutation({
    mutationFn: () => massDeleteProducts(ids),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not delete')),
  });
  const massActivate = useMutation({
    mutationFn: (active: boolean) => massSetProductsActive(ids, active),
    onSuccess: invalidate,
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not update')),
  });
  const massLocations = useMutation({
    mutationFn: (mode: 'add' | 'remove') => massUpdateProductLocations(ids, locationIds, mode),
    onSuccess: () => {
      invalidate();
      setLocationModal(null);
      setLocationIds([]);
    },
    onError: (e: unknown) => window.alert(getApiErrorMessage(e, 'Could not update locations')),
  });

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

  const set = <K extends keyof BlankFilters>(k: K, v: BlankFilters[K]) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };
  const filtersActive = Object.values(filters).some((v) => v !== '');

  const columns: Column<ProductListRow>[] = [
    {
      key: 'image',
      header: '',
      title: 'Image',
      className: 'w-12',
      render: (p) =>
        p.image ? (
          <img src={`/uploads/${p.image}`} alt="" className="h-9 w-9 rounded border object-cover" />
        ) : (
          <div className="grid h-9 w-9 place-items-center rounded border border-dashed text-muted-foreground">
            <Package className="h-4 w-4" />
          </div>
        ),
    },
    {
      key: 'actions',
      header: 'Action',
      hideable: false,
      stopClick: true,
      headerClassName: 'text-right',
      className: 'text-right',
      render: (p: ProductListRow) => (
        <div className="flex justify-end">
          {/* GOURI's per-row "Actions" dropdown, ported 1:1 — the icon strip overflowed the cell. */}
          <RowActions
            actions={[
              { label: 'View', icon: <Eye className="h-4 w-4" />, onClick: () => setViewId(p.id), show: canView },
              { label: 'Labels', icon: <Barcode className="h-4 w-4" />, onClick: () => navigate(`/labels?productId=${p.id}`) },
              { label: 'Edit', icon: <Pencil className="h-4 w-4" />, onClick: () => navigate(`/products/${p.id}/edit`), show: canUpdate },
              {
                label: p.isInactive ? 'Reactivate' : 'Deactivate',
                icon: <Power className="h-4 w-4" />,
                onClick: () => toggle.mutate(p),
                show: canUpdate,
              },
              {
                label: 'Add or edit opening stock',
                icon: <Database className="h-4 w-4" />,
                onClick: () => setOpeningStockId(p.id),
                // GOURI: only for stock-tracked products, gated on product.opening_stock.
                show: canOpeningStock && p.enableStock,
                divider: true,
              },
              {
                label: 'Product stock history',
                icon: <History className="h-4 w-4" />,
                onClick: () => navigate(`/products/${p.id}/stock-history`),
                show: canView && p.enableStock,
              },
              {
                label: 'Add or edit Group Prices',
                icon: <Layers className="h-4 w-4" />,
                onClick: () => setGroupPricesId(p.id),
                show: canUpdate,
              },
              {
                label: 'Duplicate Product',
                icon: <Copy className="h-4 w-4" />,
                onClick: () => navigate(`/products/create?duplicate=${p.id}`),
                show: canCreate,
              },
              {
                label: 'Delete',
                icon: <Trash2 className="h-4 w-4" />,
                onClick: () => window.confirm(`Delete "${p.name}"?`) && remove.mutate(p.id),
                show: canDelete,
                destructive: true,
                divider: true,
              },
            ]}
          />
        </div>
      ),
    },
    { key: 'sku', header: 'SKU', render: (p) => <span className="font-mono text-xs">{p.sku}</span> },
    {
      key: 'name',
      header: 'Product',
      hideable: false,
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
      key: 'locations',
      header: 'Business location',
      render: (p) =>
        p.locations.length ? (
          <span className="text-xs">{p.locations.join(', ')}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Unassigned</span>
        ),
    },
    {
      key: 'currentStock',
      header: 'Current stock',
      className: 'text-right tabular-nums',
      headerClassName: 'text-right',
      // null = stock tracking off for this product, which is not the same as zero on hand.
      render: (p: ProductListRow) =>
        p.currentStock == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className={p.currentStock <= 0 ? 'text-destructive' : undefined}>
            {p.currentStock} {p.unit}
          </span>
        ),
    },
    ...([1, 2, 3, 4] as const).map((n) => ({
      key: `customField${n}`,
      header: `Custom field ${n}`,
      // Off by default via the column picker — most businesses label only the ones they use.
      render: (p: ProductListRow) => p[`customField${n}` as const] || '—',
    })),
    // GOURI hides each price column behind its own permission, so a user without it must not see
    // the column at all — the backend already sends null, this just drops the header too.
    ...(data?.can?.viewPurchasePrice
      ? [
          {
            key: 'purchasePrice',
            header: 'Purchase price',
            render: (p: ProductListRow) => priceRange(p.purchasePriceMin, p.purchasePriceMax),
          },
        ]
      : []),
    ...(data?.can?.viewSellingPrice
      ? [
          {
            key: 'price',
            header: 'Sell price (inc tax)',
            render: (p: ProductListRow) => priceRange(p.priceMin, p.priceMax),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        breadcrumbs={[{ label: 'Products' }, { label: 'All Products' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportProducts({ search, ...filters })}>
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
            {canCreate && (
              <Button size="sm" onClick={() => navigate('/products/create')}>
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            )}
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select className="w-36" value={filters.type} onChange={(e) => set('type', e.target.value)}>
              <option value="">All</option>
              <option value="single">Single</option>
              <option value="variable">Variable</option>
              <option value="combo">Combo</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select className="w-40" value={String(filters.categoryId)} onChange={(e) => set('categoryId', e.target.value ? Number(e.target.value) : '')}>
              <option value="">All</option>
              {meta?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Brand</Label>
            <Select className="w-40" value={String(filters.brandId)} onChange={(e) => set('brandId', e.target.value ? Number(e.target.value) : '')}>
              <option value="">All</option>
              {meta?.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select className="w-36" value={String(filters.unitId)} onChange={(e) => set('unitId', e.target.value ? Number(e.target.value) : '')}>
              <option value="">All</option>
              {meta?.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tax</Label>
            <Select className="w-36" value={String(filters.taxId)} onChange={(e) => set('taxId', e.target.value ? Number(e.target.value) : '')}>
              <option value="">All</option>
              {meta?.taxRates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Business location</Label>
            <Select
              className="w-44"
              value={String(filters.locationId)}
              onChange={(e) => set('locationId', e.target.value === 'none' ? 'none' : e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">All</option>
              {/* GOURI prepends this so you can find products that were never assigned anywhere. */}
              <option value="none">None (unassigned)</option>
              {meta?.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              className="w-32"
              value={filters.active === '' ? '' : filters.active ? 'active' : 'inactive'}
              onChange={(e) => set('active', e.target.value === '' ? '' : e.target.value === 'active')}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 pb-2.5 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={filters.notForSelling === true}
              onChange={(e) => set('notForSelling', e.target.checked ? true : '')}
            />
            Exclude from sales
          </label>
        </CardContent>
      </Card>

      {/* Mass actions — appear only with a selection, so the toolbar isn't dead weight. */}
      {selected.length > 0 && (canUpdate || canDelete) && (
        <Card className="mb-4 border-primary/40 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-2 py-3">
            <span className="mr-1 text-sm font-medium">{selected.length} selected</span>
            {canUpdate && (
              <>
                <Button variant="outline" size="sm" onClick={() => setLocationModal('add')}>
                  <MapPin className="h-4 w-4" /> Add to location
                </Button>
                <Button variant="outline" size="sm" onClick={() => setLocationModal('remove')}>
                  <MapPin className="h-4 w-4" /> Remove from location
                </Button>
                <Button variant="outline" size="sm" disabled={massActivate.isPending} onClick={() => massActivate.mutate(false)}>
                  <Power className="h-4 w-4" /> Deactivate selected
                </Button>
                <Button variant="outline" size="sm" disabled={massActivate.isPending} onClick={() => massActivate.mutate(true)}>
                  <Power className="h-4 w-4" /> Activate selected
                </Button>
              </>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                disabled={massDelete.isPending}
                onClick={() => window.confirm(`Delete ${selected.length} product(s)? This cannot be undone.`) && massDelete.mutate()}
              >
                <Trash2 className="h-4 w-4" /> Delete selected
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
          </CardContent>
        </Card>
      )}

      {/* GOURI puts a second tab here, sharing the same filter bar (product/index.blade.php:163-198). */}
      {canSeeStockReport && (
        <div className="mb-4 flex gap-1 border-b">
          {(['products', 'stock'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'products' ? 'All Products' : 'Stock Report'}
            </button>
          ))}
        </div>
      )}

      {tab === 'stock' ? (
        <StockReportTab
          filters={{
            categoryId: filters.categoryId,
            brandId: filters.brandId,
            unitId: filters.unitId,
            taxId: filters.taxId,
            // The report is per-location, so "unassigned" (an All-Products-only option) can't apply.
            locationId: filters.locationId === 'none' ? '' : filters.locationId,
            active: filters.active,
            notForSelling: filters.notForSelling,
          }}
          search={search}
          onSearchChange={(v) => setSearch(v)}
          onResetFilters={() => setFilters(BLANK_FILTERS)}
          filtersActive={filtersActive}
        />
      ) : (
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        rowKey={(p) => p.id}
        loading={isLoading}
        onRowClick={canView ? (p) => setViewId(p.id) : undefined}
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
        selectable={canUpdate || canDelete}
        selectedKeys={selected}
        onSelectionChange={setSelected}
        onResetFilters={() => {
          setFilters(BLANK_FILTERS);
          setPage(1);
        }}
        filtersActive={filtersActive}
        columnsStorageKey="products"
      />
      )}

      <ProductViewModal productId={viewId} onClose={() => setViewId(null)} />
      <GroupPricesModal productId={groupPricesId} onClose={() => setGroupPricesId(null)} />
      <OpeningStockModal productId={openingStockId} onClose={() => setOpeningStockId(null)} />

      <Modal
        open={locationModal !== null}
        onClose={() => setLocationModal(null)}
        title={locationModal === 'remove' ? 'Remove from locations' : 'Add to locations'}
        description={`${selected.length} product(s) selected`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLocationModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={locationIds.length === 0 || massLocations.isPending}
              onClick={() => massLocations.mutate(locationModal === 'remove' ? 'remove' : 'add')}
            >
              {locationModal === 'remove' ? 'Remove' : 'Add'}
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <Label>Business locations</Label>
          <MultiSelect
            options={(meta?.locations ?? []).map((l) => ({ value: l.id, label: l.name }))}
            value={locationIds}
            onChange={setLocationIds}
            placeholder="Select locations…"
          />
        </div>
      </Modal>
    </div>
  );
}
