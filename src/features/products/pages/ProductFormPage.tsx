import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileText, ImageIcon, Plus, Save, Search, Trash2 } from 'lucide-react';
import { useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api/axios';
import { fileUrl } from '@/lib/fileUrl';
import {
  createProduct,
  getComboVariations,
  getProduct,
  getProductMeta,
  deleteProductMedia,
  listProductMedia,
  updateProduct,
  uploadProductImage,
  uploadProductMedia,
  type PriceLineBody,
  type ProductMeta,
  type SaveProductBody,
} from '../products.api';

type GroupPrices = Record<number, string>; // priceGroupId -> price (inc tax)
interface ValueRow {
  value: string;
  purchase: string;
  sell: string;
  groupPrices: GroupPrices;
}
interface AttrRow {
  templateId: string;
  name: string;
  values: ValueRow[];
}
interface ComboComp {
  variationId: number;
  label: string;
  quantity: string;
  purchasePrice: number;
  unitId: number | null;
}
interface FormState {
  name: string;
  sku: string;
  barcodeType: string;
  unitId: string;
  categoryId: string;
  subCategoryId: string;
  brandId: string;
  tax: string;
  taxType: 'inclusive' | 'exclusive';
  enableStock: boolean;
  alertQuantity: string;
  warrantyId: string;
  notForSelling: boolean;
  description: string;
  type: 'single' | 'variable' | 'combo';
  // Fields GOURI has that this form was missing entirely.
  secondaryUnitId: string;
  subUnitIds: number[];
  expiryPeriod: string;
  expiryPeriodType: '' | 'days' | 'months';
  enableSrNo: boolean;
  weight: string;
  customField1: string;
  customField2: string;
  customField3: string;
  customField4: string;
  preparationTime: string;
  image: string;
  locationIds: number[];
  /** Keyed by location id — one rack row per location, as GOURI renders it. */
  racks: Record<string, { rack: string; row: string; position: string }>;
  single: { purchase: string; sell: string; groupPrices: GroupPrices };
  variations: AttrRow[];
  combo: { components: ComboComp[]; sell: string; groupPrices: GroupPrices };
}

const emptyValue = (): ValueRow => ({ value: '', purchase: '', sell: '', groupPrices: {} });
const BLANK: FormState = {
  name: '', sku: '', barcodeType: 'C128', unitId: '', categoryId: '', subCategoryId: '', brandId: '',
  tax: '', taxType: 'exclusive', enableStock: true, alertQuantity: '', warrantyId: '', notForSelling: false,
  description: '', type: 'single',
  secondaryUnitId: '', subUnitIds: [], expiryPeriod: '', expiryPeriodType: '', enableSrNo: false, weight: '',
  customField1: '', customField2: '', customField3: '', customField4: '', preparationTime: '',
  image: '', locationIds: [], racks: {},
  single: { purchase: '', sell: '', groupPrices: {} },
  variations: [{ templateId: '', name: '', values: [emptyValue()] }],
  combo: { components: [], sell: '', groupPrices: {} },
};

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Reusable per-selling-price-group price inputs (one box per active group). */
function GroupPriceInputs({ meta, value, onChange }: { meta?: ProductMeta; value: GroupPrices; onChange: (g: GroupPrices) => void }) {
  if (!meta?.priceGroups.length) return null;
  return (
    <div className="mt-2 rounded-md border border-dashed border-border bg-muted/30 p-2.5">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Price group rates (inc. tax)</p>
      <div className="flex flex-wrap gap-3">
        {meta.priceGroups.map((g) => (
          <div key={g.id} className="space-y-1">
            <Label className="text-xs">{g.name}</Label>
            <Input
              type="number"
              step="0.01"
              className="h-8 w-28"
              value={value[g.id] ?? ''}
              onChange={(e) => onChange({ ...value, [g.id]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductFormPage() {
  const { id } = useParams();
  const editingId = id ? Number(id) : undefined;
  // GOURI's "Duplicate Product" (`/products/create?d={id}`): load the source, then clear the fields
  // that must be unique so the save creates a new product instead of colliding.
  const [searchParams] = useSearchParams();
  const duplicateOf = searchParams.get('duplicate') ? Number(searchParams.get('duplicate')) : undefined;
  const sourceId = editingId ?? duplicateOf;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: meta } = useQuery({ queryKey: ['product-meta'], queryFn: getProductMeta });
  const [form, setForm] = useState<FormState>(BLANK);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(!sourceId);
  const [comboSearch, setComboSearch] = useState('');

  const { data: comboResults } = useQuery({
    queryKey: ['combo-variations', comboSearch],
    queryFn: () => getComboVariations(comboSearch),
    enabled: form.type === 'combo' && comboSearch.trim().length >= 1,
  });

  useQuery({
    queryKey: ['product', sourceId],
    queryFn: async () => {
      const p = await getProduct(sourceId as number);
      const gp = (arr: { priceGroupId: number; priceIncTax: number }[]): GroupPrices =>
        Object.fromEntries(arr.map((x) => [x.priceGroupId, String(x.priceIncTax)]));
      const type = p.type === 'variable' ? 'variable' : p.type === 'combo' ? 'combo' : 'single';
      const firstVar = p.productVariations[0]?.variations[0];
      setForm({
        // A duplicate must not inherit the SKU (it is unique); GOURI also suffixes the name.
        name: duplicateOf ? `${p.name} (copy)` : p.name,
        sku: duplicateOf ? '' : p.sku,
        barcodeType: p.barcodeType,
        unitId: p.unitId ? String(p.unitId) : '', categoryId: p.categoryId ? String(p.categoryId) : '',
        subCategoryId: p.subCategoryId ? String(p.subCategoryId) : '', brandId: p.brandId ? String(p.brandId) : '',
        tax: p.tax ? String(p.tax) : '', taxType: p.taxType === 'inclusive' ? 'inclusive' : 'exclusive',
        enableStock: p.enableStock, alertQuantity: p.alertQuantity != null ? String(p.alertQuantity) : '',
        warrantyId: p.warrantyId ? String(p.warrantyId) : '', notForSelling: p.notForSelling, description: p.productDescription,
        type,
        secondaryUnitId: p.secondaryUnitId ? String(p.secondaryUnitId) : '',
        subUnitIds: p.subUnitIds ?? [],
        expiryPeriod: p.expiryPeriod != null ? String(p.expiryPeriod) : '',
        expiryPeriodType: p.expiryPeriodType === 'days' || p.expiryPeriodType === 'months' ? p.expiryPeriodType : '',
        enableSrNo: p.enableSrNo,
        weight: p.weight ?? '',
        customField1: p.productCustomField1 ?? '', customField2: p.productCustomField2 ?? '',
        customField3: p.productCustomField3 ?? '', customField4: p.productCustomField4 ?? '',
        preparationTime: p.preparationTimeInMinutes != null ? String(p.preparationTimeInMinutes) : '',
        image: p.image ?? '',
        locationIds: p.productLocations ?? [],
        racks: p.productRacks ?? {},
        single: { purchase: firstVar?.defaultPurchasePrice != null ? String(firstVar.defaultPurchasePrice) : '', sell: firstVar?.defaultSellPrice != null ? String(firstVar.defaultSellPrice) : '', groupPrices: firstVar ? gp(firstVar.groupPrices) : {} },
        variations: type === 'variable'
          ? p.productVariations.map((pv) => ({
              templateId: pv.variationTemplateId ? String(pv.variationTemplateId) : '',
              name: pv.name,
              values: pv.variations.map((v) => ({ value: v.name, purchase: v.defaultPurchasePrice != null ? String(v.defaultPurchasePrice) : '', sell: v.defaultSellPrice != null ? String(v.defaultSellPrice) : '', groupPrices: gp(v.groupPrices) })),
            }))
          : BLANK.variations,
        combo: type === 'combo'
          ? {
              components: (firstVar?.comboVariations ?? []).map((c) => ({ variationId: c.variation_id, label: `Variation #${c.variation_id}`, quantity: String(c.quantity), purchasePrice: 0, unitId: c.unit_id })),
              sell: firstVar?.defaultSellPrice != null ? String(firstVar.defaultSellPrice) : '',
              groupPrices: firstVar ? gp(firstVar.groupPrices) : {},
            }
          : BLANK.combo,
      });
      setLoaded(true);
      return p;
    },
    enabled: Boolean(sourceId),
  });

  // Until meta loads, assume GOURI's defaults so the form doesn't flash sections in and out.
  const settings = meta?.settings ?? {
    enableBrand: true, enableCategory: true, enableSubCategory: true, enablePriceTax: true,
    enableSubUnits: false, enableRacks: false, enableRow: false, enablePosition: false,
    enableProductExpiry: false, defaultProfitPercent: 0, defaultUnitId: null,
  };
  const showRacks = settings.enableRacks || settings.enableRow || settings.enablePosition;
  /** A unit qualifies as a sub-unit of the selected one when its base IS the selected unit. */
  const subUnitOptions = useMemo(
    () => (meta?.units ?? []).filter((u) => form.unitId && u.baseUnitId === Number(form.unitId)),
    [meta, form.unitId],
  );

  // Attachments live in their own table, so they save immediately rather than with the form.
  const { data: media } = useQuery({
    queryKey: ['product-media', editingId],
    queryFn: () => listProductMedia(editingId as number),
    enabled: Boolean(editingId),
  });
  const brochure = media?.find((m) => m.kind === 'product_brochure');
  const invalidateMedia = () => qc.invalidateQueries({ queryKey: ['product-media', editingId] });
  const uploadBrochure = useMutation({
    mutationFn: (file: File) => uploadProductMedia(editingId as number, file, 'product_brochure'),
    onSuccess: invalidateMedia,
    onError: (e: unknown) => setError(getApiErrorMessage(e, 'Could not upload the brochure')),
  });
  const removeBrochure = useMutation({
    mutationFn: (id: number) => deleteProductMedia(id),
    onSuccess: invalidateMedia,
    onError: (e: unknown) => setError(getApiErrorMessage(e, 'Could not remove the brochure')),
  });

  const [uploading, setUploading] = useState(false);
  const onPickImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { path } = await uploadProductImage(file);
      setF('image', path);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUploading(false);
      e.target.value = ''; // let the same file be re-picked after an error
    }
  };

  const taxPct = useMemo(() => meta?.taxRates.find((r) => r.id === Number(form.tax))?.amount ?? 0, [meta, form.tax]);
  const inc = (excl: number) => (form.taxType === 'inclusive' ? excl : excl * (1 + taxPct / 100));
  const subCategories = useMemo(() => (meta?.categories ?? []).filter((c) => c.parentId === Number(form.categoryId)), [meta, form.categoryId]);
  const comboTotal = useMemo(() => form.combo.components.reduce((s, c) => s + c.purchasePrice * Number(c.quantity || 0), 0), [form.combo.components]);

  const priceLine = (purchase: number, sell: number, groupPrices: GroupPrices): PriceLineBody => ({
    default_purchase_price: purchase,
    dpp_inc_tax: Math.round(inc(purchase) * 100) / 100,
    profit_percent: purchase > 0 ? Math.round(((sell - purchase) / purchase) * 10000) / 100 : 0,
    default_sell_price: sell,
    sell_price_inc_tax: Math.round(inc(sell) * 100) / 100,
    group_prices: Object.entries(groupPrices)
      .filter(([, v]) => v !== '' && v != null)
      .map(([pgId, v]) => ({ price_group_id: Number(pgId), price_inc_tax: Number(v) })),
  });

  const save = useMutation({
    mutationFn: () => {
      const base = {
        name: form.name.trim(), type: form.type,
        unit_id: form.unitId ? Number(form.unitId) : null, brand_id: form.brandId ? Number(form.brandId) : null,
        category_id: form.categoryId ? Number(form.categoryId) : null, sub_category_id: form.subCategoryId ? Number(form.subCategoryId) : null,
        tax: form.tax ? Number(form.tax) : null, tax_type: form.taxType, enable_stock: form.enableStock,
        alert_quantity: form.alertQuantity ? Number(form.alertQuantity) : null, sku: form.sku.trim() || undefined,
        barcode_type: form.barcodeType, warranty_id: form.warrantyId ? Number(form.warrantyId) : null,
        not_for_selling: form.notForSelling, product_description: form.description.trim() || undefined,
        secondary_unit_id: form.secondaryUnitId ? Number(form.secondaryUnitId) : null,
        sub_unit_ids: form.subUnitIds,
        // GOURI clears both when either is blank — a period with no unit means nothing.
        expiry_period: form.expiryPeriodType && form.expiryPeriod ? Number(form.expiryPeriod) : null,
        expiry_period_type: form.expiryPeriodType || undefined,
        enable_sr_no: form.enableSrNo,
        weight: form.weight.trim() || undefined,
        product_custom_field1: form.customField1.trim() || undefined,
        product_custom_field2: form.customField2.trim() || undefined,
        product_custom_field3: form.customField3.trim() || undefined,
        product_custom_field4: form.customField4.trim() || undefined,
        preparation_time_in_minutes: form.preparationTime ? Number(form.preparationTime) : null,
        image: form.image,
        product_locations: form.locationIds,
        product_racks: form.racks,
      };
      let body: SaveProductBody;
      if (form.type === 'single') {
        body = { ...base, single: priceLine(Number(form.single.purchase || 0), Number(form.single.sell || 0), form.single.groupPrices) };
      } else if (form.type === 'variable') {
        body = {
          ...base,
          variations: form.variations.map((a) => ({
            variation_template_id: a.templateId ? Number(a.templateId) : null,
            name: a.name.trim(),
            values: a.values.filter((v) => v.value.trim()).map((v) => ({ value: v.value.trim(), ...priceLine(Number(v.purchase || 0), Number(v.sell || 0), v.groupPrices) })),
          })),
        };
      } else {
        body = {
          ...base,
          combo: {
            ...priceLine(comboTotal, Number(form.combo.sell || 0), form.combo.groupPrices),
            composition: form.combo.components.map((c) => ({ variation_id: c.variationId, quantity: Number(c.quantity || 1), unit_id: c.unitId ?? undefined })),
          },
        };
      }
      return editingId ? updateProduct(editingId, body) : createProduct(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      navigate('/products');
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not save product')),
  });

  const onSave = () => {
    if (!form.name.trim()) return setError('Product name is required');
    if (!form.unitId) return setError('Unit is required');
    if (form.type === 'single' && (!form.single.purchase || !form.single.sell)) return setError('Enter the purchase and selling price');
    if (form.type === 'variable' && !form.variations.some((a) => a.name.trim() && a.values.some((v) => v.value.trim()))) return setError('Add at least one variation with a value');
    if (form.type === 'combo' && form.combo.components.length === 0) return setError('Add at least one combo component');
    setError('');
    save.mutate();
  };

  // ── variable helpers ──
  const patchAttr = (i: number, patch: Partial<AttrRow>) => setForm((f) => ({ ...f, variations: f.variations.map((a, j) => (j === i ? { ...a, ...patch } : a)) }));
  const pickTemplate = (i: number, templateId: string) => {
    const t = meta?.variationTemplates.find((x) => x.id === Number(templateId));
    patchAttr(i, { templateId, name: t ? t.name : form.variations[i].name, values: t ? t.values.map((v) => ({ ...emptyValue(), value: v })) : form.variations[i].values });
  };
  const patchValue = (i: number, vi: number, patch: Partial<ValueRow>) => patchAttr(i, { values: form.variations[i].values.map((v, k) => (k === vi ? { ...v, ...patch } : v)) });

  // ── combo helpers ──
  const addComponent = (o: { id: number; label: string; purchasePrice: number; unitId: number | null }) => {
    if (form.combo.components.some((c) => c.variationId === o.id)) return;
    setForm((f) => ({ ...f, combo: { ...f.combo, components: [...f.combo.components, { variationId: o.id, label: o.label, quantity: '1', purchasePrice: o.purchasePrice, unitId: o.unitId }] } }));
    setComboSearch('');
  };
  const patchComponent = (i: number, patch: Partial<ComboComp>) => setForm((f) => ({ ...f, combo: { ...f.combo, components: f.combo.components.map((c, j) => (j === i ? { ...c, ...patch } : c)) } }));

  if (!loaded) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  const setF = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={editingId ? 'Edit Product' : 'Add Product'} breadcrumbs={[{ label: 'Products', to: '/products' }, { label: editingId ? 'Edit' : 'Add' }]} />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* General */}
      <Card className="mb-5">
        <CardHeader className="pb-3"><CardTitle className="text-base">General</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label>Product name<span className="text-destructive"> *</span></Label>
            <Input value={form.name} onChange={(e) => setF('name', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>SKU (blank = auto)</Label>
            <Input value={form.sku} onChange={(e) => setF('sku', e.target.value)} placeholder="Auto-generated" />
          </div>
          <div className="space-y-2">
            <Label>Unit<span className="text-destructive"> *</span></Label>
            <Select value={form.unitId} onChange={(e) => setF('unitId', e.target.value)}>
              <option value="">Select unit…</option>
              {meta?.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </div>
          {settings.enableSubUnits && (
            <div className="space-y-2">
              <Label>Related sub-units</Label>
              {/* Only units whose base IS the selected unit can be sub-units of it. */}
              <MultiSelect
                options={subUnitOptions.map((u) => ({ value: u.id, label: u.name }))}
                value={form.subUnitIds}
                onChange={(ids) => setF('subUnitIds', ids)}
                placeholder={form.unitId ? 'Select sub-units…' : 'Pick a unit first'}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Secondary unit</Label>
            <Select value={form.secondaryUnitId} onChange={(e) => setF('secondaryUnitId', e.target.value)}>
              <option value="">None</option>
              {meta?.units.filter((u) => String(u.id) !== form.unitId).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value, subCategoryId: '' }))}>
              <option value="">None</option>
              {meta?.categories.filter((c) => c.parentId == null).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sub-category</Label>
            <Select value={form.subCategoryId} onChange={(e) => setF('subCategoryId', e.target.value)} disabled={!form.categoryId}>
              <option value="">None</option>
              {subCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Brand</Label>
            <Select value={form.brandId} onChange={(e) => setF('brandId', e.target.value)}>
              <option value="">None</option>
              {meta?.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Barcode type</Label>
            <Select value={form.barcodeType} onChange={(e) => setF('barcodeType', e.target.value)}>
              {meta?.barcodeTypes.map((b) => <option key={b} value={b}>{b}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tax</Label>
            <Select value={form.tax} onChange={(e) => setF('tax', e.target.value)}>
              <option value="">None</option>
              {meta?.taxRates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.amount}%)</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tax type</Label>
            <Select value={form.taxType} onChange={(e) => setF('taxType', e.target.value as FormState['taxType'])}>
              <option value="exclusive">Exclusive</option>
              <option value="inclusive">Inclusive</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Warranty</Label>
            <Select value={form.warrantyId} onChange={(e) => setF('warrantyId', e.target.value)}>
              <option value="">None</option>
              {meta?.warranties.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </div>
          <div className="flex items-end gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={form.enableStock} onChange={(e) => setF('enableStock', e.target.checked)} />
              Manage stock
            </label>
            {form.enableStock && (
              <div className="space-y-1">
                <Label className="text-xs">Alert quantity</Label>
                <Input type="number" className="w-32" value={form.alertQuantity} onChange={(e) => setF('alertQuantity', e.target.value)} />
              </div>
            )}
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={form.notForSelling} onChange={(e) => setF('notForSelling', e.target.checked)} />
              Not for selling
            </label>
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setF('description', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Details — GOURI's second card. Each block is gated by the same business setting it is there. */}
      <Card className="mb-5">
        <CardHeader className="pb-3"><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {settings.enableProductExpiry && (
            <div className="space-y-2">
              <Label>Expires in</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  className="w-24"
                  value={form.expiryPeriod}
                  onChange={(e) => setF('expiryPeriod', e.target.value)}
                  disabled={!form.expiryPeriodType || !form.enableStock}
                />
                <Select
                  className="flex-1"
                  value={form.expiryPeriodType}
                  // Clearing the unit clears the period too — GOURI stores neither without both.
                  onChange={(e) => {
                    const t = e.target.value as FormState['expiryPeriodType'];
                    setForm((f) => ({ ...f, expiryPeriodType: t, expiryPeriod: t ? f.expiryPeriod : '' }));
                  }}
                  disabled={!form.enableStock}
                >
                  <option value="">Not applicable</option>
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                </Select>
              </div>
              {!form.enableStock && <p className="text-xs text-muted-foreground">Turn on Manage stock to set an expiry.</p>}
            </div>
          )}
          <div className="space-y-2">
            <Label>Weight</Label>
            <Input value={form.weight} onChange={(e) => setF('weight', e.target.value)} placeholder="e.g. 2.5 kg" />
          </div>
          <div className="space-y-2">
            <Label>Preparation time (minutes)</Label>
            <Input type="number" min={0} value={form.preparationTime} onChange={(e) => setF('preparationTime', e.target.value)} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" checked={form.enableSrNo} onChange={(e) => setF('enableSrNo', e.target.checked)} />
              Enable IMEI / Serial number
            </label>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Business locations</Label>
            <MultiSelect
              options={(meta?.locations ?? []).map((l) => ({ value: l.id, label: l.name }))}
              value={form.locationIds}
              onChange={(ids) => setF('locationIds', ids)}
              placeholder="All locations (none selected)"
            />
            <p className="text-xs text-muted-foreground">Where this product is available. Leave empty to leave it unassigned.</p>
          </div>

          {/* Product image — uploaded on select, so the save stays a plain JSON call. */}
          <div className="space-y-2">
            <Label>Product image</Label>
            <div className="flex items-center gap-3">
              {form.image ? (
                <img
                  src={fileUrl(form.image) ?? ''}
                  alt="Product"
                  className="h-14 w-14 rounded-md border object-cover"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-md border border-dashed text-muted-foreground">
                  <ImageIcon className="h-5 w-5" />
                </div>
              )}
              <div className="space-y-1">
                <Input type="file" accept="image/*" className="h-9 text-xs" disabled={uploading} onChange={onPickImage} />
                {form.image && (
                  <button type="button" className="text-xs text-destructive hover:underline" onClick={() => setF('image', '')}>
                    Remove image
                  </button>
                )}
                {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
              </div>
            </div>
          </div>

          {/* Brochure needs a product id to attach to, so it appears once the product exists. */}
          {editingId && (
            <div className="space-y-2">
              <Label>Product brochure</Label>
              {brochure ? (
                <div className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a href={brochure.url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:underline">
                    {brochure.fileName}
                  </a>
                  <button type="button" className="text-destructive" onClick={() => removeBrochure.mutate(brochure.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.csv,.zip,image/*"
                  className="h-9 text-xs"
                  disabled={uploadBrochure.isPending}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadBrochure.mutate(f);
                    e.target.value = '';
                  }}
                />
              )}
              <p className="text-xs text-muted-foreground">PDF, Word, image, CSV or ZIP.</p>
            </div>
          )}

          <div className="space-y-2 sm:col-span-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Custom fields</Label>
            <div className="grid gap-3 sm:grid-cols-4">
              <Input placeholder="Custom field 1" value={form.customField1} onChange={(e) => setF('customField1', e.target.value)} />
              <Input placeholder="Custom field 2" value={form.customField2} onChange={(e) => setF('customField2', e.target.value)} />
              <Input placeholder="Custom field 3" value={form.customField3} onChange={(e) => setF('customField3', e.target.value)} />
              <Input placeholder="Custom field 4" value={form.customField4} onChange={(e) => setF('customField4', e.target.value)} />
            </div>
          </div>

          {showRacks && (meta?.locations.length ?? 0) > 0 && (
            <div className="space-y-2 sm:col-span-3">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Rack details</Label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {meta?.locations.map((l) => {
                  const r = form.racks[l.id] ?? { rack: '', row: '', position: '' };
                  const setRack = (key: 'rack' | 'row' | 'position', v: string) =>
                    setForm((f) => ({ ...f, racks: { ...f.racks, [l.id]: { ...r, [key]: v } } }));
                  return (
                    <div key={l.id} className="rounded-md border border-dashed p-3">
                      <p className="mb-2 text-sm font-medium">{l.name}</p>
                      <div className="space-y-2">
                        {settings.enableRacks && <Input className="h-9" placeholder="Rack" value={r.rack} onChange={(e) => setRack('rack', e.target.value)} />}
                        {settings.enableRow && <Input className="h-9" placeholder="Row" value={r.row} onChange={(e) => setRack('row', e.target.value)} />}
                        {settings.enablePosition && <Input className="h-9" placeholder="Position" value={r.position} onChange={(e) => setRack('position', e.target.value)} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Type + pricing */}
      <Card className="mb-5">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Pricing</CardTitle>
          <Select className="w-40" value={form.type} onChange={(e) => setF('type', e.target.value as FormState['type'])} disabled={Boolean(editingId)}>
            <option value="single">Single</option>
            <option value="variable">Variable</option>
            <option value="combo">Combo</option>
          </Select>
        </CardHeader>
        <CardContent>
          {form.type === 'single' && (
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>Purchase price (exc. tax)<span className="text-destructive"> *</span></Label>
                <Input type="number" step="0.01" value={form.single.purchase} onChange={(e) => setForm((f) => ({ ...f, single: { ...f.single, purchase: e.target.value } }))} />
                <p className="text-xs text-muted-foreground">Inc. tax: {money(inc(Number(form.single.purchase || 0)))}</p>
              </div>
              <div className="space-y-2">
                <Label>Selling price (exc. tax)<span className="text-destructive"> *</span></Label>
                <Input type="number" step="0.01" value={form.single.sell} onChange={(e) => setForm((f) => ({ ...f, single: { ...f.single, sell: e.target.value } }))} />
                <p className="text-xs text-muted-foreground">Inc. tax: {money(inc(Number(form.single.sell || 0)))}</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Margin</Label>
                <p className="pt-2 text-sm">{Number(form.single.purchase) > 0 ? `${(((Number(form.single.sell) - Number(form.single.purchase)) / Number(form.single.purchase)) * 100).toFixed(2)}%` : '—'}</p>
              </div>
              <div className="sm:col-span-4">
                <GroupPriceInputs meta={meta} value={form.single.groupPrices} onChange={(g) => setForm((f) => ({ ...f, single: { ...f.single, groupPrices: g } }))} />
              </div>
            </div>
          )}

          {form.type === 'variable' && (
            <div className="space-y-5">
              {form.variations.map((attr, i) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <div className="mb-3 flex flex-wrap items-end gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Use a variation template</Label>
                      <Select className="w-48" value={attr.templateId} onChange={(e) => pickTemplate(i, e.target.value)}>
                        <option value="">Custom…</option>
                        {meta?.variationTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Variation name</Label>
                      <Input className="w-48" value={attr.name} onChange={(e) => patchAttr(i, { name: e.target.value })} placeholder="e.g. Colour" />
                    </div>
                    {form.variations.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => setF('variations', form.variations.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {attr.values.map((val, vi) => (
                      <div key={vi} className="rounded-md border border-border/60 p-2.5">
                        <div className="grid grid-cols-12 items-end gap-2">
                          <div className="col-span-4 space-y-1">
                            <Label className="text-xs">Value</Label>
                            <Input value={val.value} onChange={(e) => patchValue(i, vi, { value: e.target.value })} placeholder="e.g. Red" />
                          </div>
                          <div className="col-span-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Purchase (exc)</Label>
                              {/* GOURI's "Apply all" — copy this cell down the column instead of retyping it. */}
                              {vi === 0 && attr.values.length > 1 && (
                                <button
                                  type="button"
                                  className="text-[11px] text-primary hover:underline"
                                  onClick={() => patchAttr(i, { values: attr.values.map((v) => ({ ...v, purchase: val.purchase })) })}
                                >
                                  Apply all
                                </button>
                              )}
                            </div>
                            <Input type="number" step="0.01" value={val.purchase} onChange={(e) => patchValue(i, vi, { purchase: e.target.value })} />
                          </div>
                          <div className="col-span-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Sell (exc)</Label>
                              {vi === 0 && attr.values.length > 1 && (
                                <button
                                  type="button"
                                  className="text-[11px] text-primary hover:underline"
                                  onClick={() => patchAttr(i, { values: attr.values.map((v) => ({ ...v, sell: val.sell })) })}
                                >
                                  Apply all
                                </button>
                              )}
                            </div>
                            <Input type="number" step="0.01" value={val.sell} onChange={(e) => patchValue(i, vi, { sell: e.target.value })} />
                          </div>
                          <div className="col-span-1 pb-1 text-xs text-muted-foreground">= {money(inc(Number(val.sell || 0)))}</div>
                          <div className="col-span-1 flex justify-end pb-1">
                            {attr.values.length > 1 && (
                              <button type="button" onClick={() => patchAttr(i, { values: attr.values.filter((_, k) => k !== vi) })} className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <GroupPriceInputs meta={meta} value={val.groupPrices} onChange={(g) => patchValue(i, vi, { groupPrices: g })} />
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => patchAttr(i, { values: [...attr.values, emptyValue()] })}>
                      <Plus className="h-3.5 w-3.5" />
                      Add value
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setF('variations', [...form.variations, { templateId: '', name: '', values: [emptyValue()] }])}>
                <Plus className="h-4 w-4" />
                Add another variation
              </Button>
            </div>
          )}

          {form.type === 'combo' && (
            <div className="space-y-4">
              <div className="relative max-w-md">
                <Label className="text-xs">Add product to the combo</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" value={comboSearch} onChange={(e) => setComboSearch(e.target.value)} placeholder="Search products by name / SKU…" />
                </div>
                {comboSearch.trim() && (comboResults?.length ?? 0) > 0 && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-input bg-popover shadow-md">
                    {comboResults?.map((o) => (
                      <button key={o.id} type="button" onClick={() => addComponent(o)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent">
                        <span>{o.label}</span>
                        <span className="text-xs text-muted-foreground">buy {money(o.purchasePrice)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {comboSearch.trim() && (comboResults?.length ?? 0) === 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border border-input bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
                    No products found. Create Single/Variable products first — a combo bundles existing products.
                  </div>
                )}
              </div>

              {form.combo.components.length === 0 && (
                <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  A combo bundles existing products. Search above to add component products (create some
                  Single/Variable products first if the search is empty).
                </p>
              )}

              {form.combo.components.length > 0 && (
                <div className="space-y-2">
                  {form.combo.components.map((c, i) => (
                    <div key={c.variationId} className="grid grid-cols-12 items-end gap-2 rounded-md border border-border p-2.5">
                      <div className="col-span-6 text-sm font-medium">{c.label}</div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input type="number" step="0.01" min="0" value={c.quantity} onChange={(e) => patchComponent(i, { quantity: e.target.value })} />
                      </div>
                      <div className="col-span-3 pb-1 text-sm text-muted-foreground">
                        line: {money(c.purchasePrice * Number(c.quantity || 0))}
                      </div>
                      <div className="col-span-1 flex justify-end pb-1">
                        <button type="button" onClick={() => setForm((f) => ({ ...f, combo: { ...f.combo, components: f.combo.components.filter((_, j) => j !== i) } }))} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Total purchase price</Label>
                  <p className="pt-2 text-sm font-medium">{money(comboTotal)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Selling price (exc. tax)<span className="text-destructive"> *</span></Label>
                  <Input type="number" step="0.01" value={form.combo.sell} onChange={(e) => setForm((f) => ({ ...f, combo: { ...f.combo, sell: e.target.value } }))} />
                  <p className="text-xs text-muted-foreground">Inc. tax: {money(inc(Number(form.combo.sell || 0)))}</p>
                </div>
                <div className="sm:col-span-4">
                  <GroupPriceInputs meta={meta} value={form.combo.groupPrices} onChange={(g) => setForm((f) => ({ ...f, combo: { ...f.combo, groupPrices: g } }))} />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/products')}>Cancel</Button>
        <Button onClick={onSave} isLoading={save.isPending}>
          <Save className="h-4 w-4" />
          {editingId ? 'Update product' : 'Save product'}
        </Button>
      </div>
    </div>
  );
}
