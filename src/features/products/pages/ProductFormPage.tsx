import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Plus, Save, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api/axios';
import {
  createProduct,
  getComboVariations,
  getProduct,
  getProductMeta,
  updateProduct,
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
  single: { purchase: string; sell: string; groupPrices: GroupPrices };
  variations: AttrRow[];
  combo: { components: ComboComp[]; sell: string; groupPrices: GroupPrices };
}

const emptyValue = (): ValueRow => ({ value: '', purchase: '', sell: '', groupPrices: {} });
const BLANK: FormState = {
  name: '', sku: '', barcodeType: 'C128', unitId: '', categoryId: '', subCategoryId: '', brandId: '',
  tax: '', taxType: 'exclusive', enableStock: true, alertQuantity: '', warrantyId: '', notForSelling: false,
  description: '', type: 'single',
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
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: meta } = useQuery({ queryKey: ['product-meta'], queryFn: getProductMeta });
  const [form, setForm] = useState<FormState>(BLANK);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(!editingId);
  const [comboSearch, setComboSearch] = useState('');

  const { data: comboResults } = useQuery({
    queryKey: ['combo-variations', comboSearch],
    queryFn: () => getComboVariations(comboSearch),
    enabled: form.type === 'combo' && comboSearch.trim().length >= 1,
  });

  useQuery({
    queryKey: ['product', editingId],
    queryFn: async () => {
      const p = await getProduct(editingId as number);
      const gp = (arr: { priceGroupId: number; priceIncTax: number }[]): GroupPrices =>
        Object.fromEntries(arr.map((x) => [x.priceGroupId, String(x.priceIncTax)]));
      const type = p.type === 'variable' ? 'variable' : p.type === 'combo' ? 'combo' : 'single';
      const firstVar = p.productVariations[0]?.variations[0];
      setForm({
        name: p.name, sku: p.sku, barcodeType: p.barcodeType,
        unitId: p.unitId ? String(p.unitId) : '', categoryId: p.categoryId ? String(p.categoryId) : '',
        subCategoryId: p.subCategoryId ? String(p.subCategoryId) : '', brandId: p.brandId ? String(p.brandId) : '',
        tax: p.tax ? String(p.tax) : '', taxType: p.taxType === 'inclusive' ? 'inclusive' : 'exclusive',
        enableStock: p.enableStock, alertQuantity: p.alertQuantity != null ? String(p.alertQuantity) : '',
        warrantyId: p.warrantyId ? String(p.warrantyId) : '', notForSelling: p.notForSelling, description: p.productDescription,
        type,
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
    enabled: Boolean(editingId),
  });

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
                            <Label className="text-xs">Purchase (exc)</Label>
                            <Input type="number" step="0.01" value={val.purchase} onChange={(e) => patchValue(i, vi, { purchase: e.target.value })} />
                          </div>
                          <div className="col-span-3 space-y-1">
                            <Label className="text-xs">Sell (exc)</Label>
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
