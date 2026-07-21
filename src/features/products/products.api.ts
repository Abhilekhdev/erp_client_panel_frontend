import { api } from '@/lib/api/axios';

export interface ProductListRow {
  id: number;
  name: string;
  sku: string;
  type: string | null;
  image: string | null;
  unit: string;
  category: string;
  brand: string;
  tax: string;
  taxAmount: number;
  taxType: string;
  enableStock: boolean;
  isInactive: boolean;
  notForSelling: boolean;
  /** null when the caller lacks `access_default_selling_price` — hide the column, don't show 0. */
  priceMin: number | null;
  priceMax: number | null;
  /** null when the caller lacks `view_purchase_price`. */
  purchasePriceMin: number | null;
  purchasePriceMax: number | null;
  /** Names of the business locations this product is sold at. */
  locations: string[];
  customField1: string;
  customField2: string;
  customField3: string;
  customField4: string;
}

export interface ProductGroupPrice {
  priceGroupId: number;
  priceIncTax: number;
}
export interface ProductVariationRow {
  id: number;
  name: string;
  subSku: string;
  variationValueId: number | null;
  defaultPurchasePrice: number | null;
  dppIncTax: number;
  profitPercent: number;
  defaultSellPrice: number | null;
  sellPriceIncTax: number | null;
  comboVariations: { variation_id: number; quantity: number; unit_id: number | null }[] | null;
  groupPrices: ProductGroupPrice[];
}
export interface ProductVariationGroup {
  id: number;
  name: string;
  isDummy: boolean;
  variationTemplateId: number | null;
  variations: ProductVariationRow[];
}
export interface ProductDetail {
  id: number;
  name: string;
  type: string;
  unitId: number | null;
  secondaryUnitId: number | null;
  subUnitIds: number[];
  brandId: number | null;
  categoryId: number | null;
  subCategoryId: number | null;
  tax: number | null;
  taxType: string;
  enableStock: boolean;
  alertQuantity: number | null;
  sku: string;
  barcodeType: string;
  expiryPeriod: number | null;
  expiryPeriodType: string | null;
  enableSrNo: boolean;
  weight: string;
  productDescription: string;
  warrantyId: number | null;
  isInactive: boolean;
  notForSelling: boolean;
  preparationTimeInMinutes: number | null;
  image: string;
  productLocations: number[];
  /** Keyed by location id. */
  productRacks: Record<string, { rack: string; row: string; position: string }>;
  productCustomField1: string;
  productCustomField2: string;
  productCustomField3: string;
  productCustomField4: string;
  productVariations: ProductVariationGroup[];
}

/** Business settings that decide which sections of the product form even render (GOURI parity). */
export interface ProductFormSettings {
  enableBrand: boolean;
  enableCategory: boolean;
  enableSubCategory: boolean;
  enablePriceTax: boolean;
  enableSubUnits: boolean;
  enableRacks: boolean;
  enableRow: boolean;
  enablePosition: boolean;
  enableProductExpiry: boolean;
  defaultProfitPercent: number;
  defaultUnitId: number | null;
}

export interface IdName {
  id: number;
  name: string;
}
export interface ProductMeta {
  units: { id: number; name: string; baseUnitId: number | null }[];
  categories: { id: number; name: string; parentId: number | null }[];
  brands: IdName[];
  taxRates: { id: number; name: string; amount: number }[];
  warranties: IdName[];
  priceGroups: IdName[];
  variationTemplates: { id: number; name: string; values: string[] }[];
  barcodeTypes: string[];
  locations: IdName[];
  settings: ProductFormSettings;
}

// Body shapes (snake_case → matches the backend DTO)
export interface PriceLineBody {
  default_purchase_price?: number;
  dpp_inc_tax?: number;
  profit_percent?: number;
  default_sell_price?: number;
  sell_price_inc_tax?: number;
  group_prices?: { price_group_id: number; price_inc_tax: number }[];
}
export interface SaveProductBody {
  name: string;
  type: 'single' | 'variable' | 'combo';
  unit_id?: number | null;
  brand_id?: number | null;
  category_id?: number | null;
  sub_category_id?: number | null;
  tax?: number | null;
  tax_type: 'inclusive' | 'exclusive';
  enable_stock: boolean;
  alert_quantity?: number | null;
  sku?: string;
  barcode_type: string;
  warranty_id?: number | null;
  not_for_selling: boolean;
  product_description?: string;
  secondary_unit_id?: number | null;
  sub_unit_ids?: number[];
  expiry_period?: number | null;
  expiry_period_type?: 'days' | 'months';
  enable_sr_no?: boolean;
  weight?: string;
  product_custom_field1?: string;
  product_custom_field2?: string;
  product_custom_field3?: string;
  product_custom_field4?: string;
  preparation_time_in_minutes?: number | null;
  image?: string;
  product_locations?: number[];
  product_racks?: Record<string, { rack?: string; row?: string; position?: string }>;
  single?: PriceLineBody;
  variations?: { variation_template_id?: number | null; name: string; values: (PriceLineBody & { value: string; sub_sku?: string })[] }[];
  combo?: PriceLineBody & { composition: { variation_id: number; quantity: number; unit_id?: number | null }[] };
}

interface Envelope<T> {
  success: boolean;
  data: T;
}
interface Paginated<T> {
  data: T[];
  total: number;
}

export interface ProductFilters {
  page: number;
  pageSize: number;
  search: string;
  categoryId?: number | '';
  brandId?: number | '';
  unitId?: number | '';
  taxId?: number | '';
  /** A location id, or 'none' to find products assigned to no location at all. */
  locationId?: number | 'none' | '';
  type?: string;
  /** '' = any, true = active only, false = inactive only. */
  active?: boolean | '';
  notForSelling?: boolean | '';
}

/** The list also reports which price columns the caller is allowed to see. */
export interface ProductListResult extends Paginated<ProductListRow> {
  can: { viewPurchasePrice: boolean; viewSellingPrice: boolean };
}

export async function listProducts(params: ProductFilters): Promise<ProductListResult> {
  const { data } = await api.get<Envelope<ProductListResult>>('/products', { params });
  return data.data;
}

// ── attachments (brochure / variation images) ─────────
export interface ProductMediaFile {
  id: number;
  kind: string | null;
  path: string;
  url: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
}

export async function listProductMedia(productId: number): Promise<ProductMediaFile[]> {
  const { data } = await api.get<Envelope<{ data: ProductMediaFile[] }>>(`/products/${productId}/media`);
  return data.data.data;
}

export async function uploadProductMedia(
  productId: number,
  file: File,
  kind: 'product_brochure' | 'variation_image',
): Promise<ProductMediaFile> {
  const form = new FormData();
  form.append('file', file);
  form.append('kind', kind);
  const { data } = await api.post<Envelope<ProductMediaFile>>(`/products/${productId}/media`, form);
  return data.data;
}

export async function deleteProductMedia(mediaId: number): Promise<void> {
  await api.delete(`/products/media/${mediaId}`);
}

/** Upload first, then submit the returned path as the product's `image`. */
export async function uploadProductImage(file: File): Promise<{ path: string; url: string }> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<Envelope<{ path: string; url: string }>>('/products/image', form);
  return data.data;
}
export async function getProductMeta(): Promise<ProductMeta> {
  const { data } = await api.get<Envelope<ProductMeta>>('/products/meta');
  return data.data;
}

export interface ComboVariationOption {
  id: number;
  label: string;
  productName: string;
  variationName: string;
  sku: string;
  barcodeType: string;
  purchasePrice: number;
  sellPrice: number;
  sellPriceIncTax: number;
  unitId: number | null;
}
export async function getComboVariations(search: string): Promise<ComboVariationOption[]> {
  const { data } = await api.get<Envelope<{ data: ComboVariationOption[] }>>('/products/variations', {
    params: { search },
  });
  return data.data.data;
}
export async function getProduct(id: number): Promise<ProductDetail> {
  const { data } = await api.get<Envelope<ProductDetail>>(`/products/${id}`);
  return data.data;
}
export async function createProduct(body: SaveProductBody): Promise<ProductDetail> {
  const { data } = await api.post<Envelope<ProductDetail>>('/products', body);
  return data.data;
}
export async function updateProduct(id: number, body: SaveProductBody): Promise<ProductDetail> {
  const { data } = await api.patch<Envelope<ProductDetail>>(`/products/${id}`, body);
  return data.data;
}
export async function toggleProduct(id: number, isActive: boolean): Promise<ProductDetail> {
  const { data } = await api.post<Envelope<ProductDetail>>(`/products/${id}/toggle-active`, { isActive });
  return data.data;
}
export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/products/${id}`);
}

// ── mass actions ──────────────────────────────────────
// These return `{success, count, msg}` un-enveloped — the interceptor passes through any object
// that already carries `success` (same convention as the single-row delete).
interface MassResult {
  success: boolean;
  count: number;
  msg: string;
}

export async function massDeleteProducts(ids: number[]): Promise<MassResult> {
  const { data } = await api.post<MassResult>('/products/mass-delete', { ids });
  return data;
}
export async function massSetProductsActive(ids: number[], active: boolean): Promise<MassResult> {
  const { data } = await api.post<MassResult>('/products/mass-activate', { ids, active });
  return data;
}
export async function massUpdateProductLocations(
  ids: number[],
  locationIds: number[],
  mode: 'add' | 'remove',
): Promise<MassResult> {
  const { data } = await api.post<MassResult>('/products/mass-locations', {
    ids,
    location_ids: locationIds,
    mode,
  });
  return data;
}

/** Downloads the CURRENT filter set as .xlsx (not just the visible page). */
export async function exportProducts(params: Omit<ProductFilters, 'page' | 'pageSize'>): Promise<void> {
  const res = await api.get('/products/export', { params, responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `products-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
