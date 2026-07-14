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
  priceMin: number;
  priceMax: number;
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
  productVariations: ProductVariationGroup[];
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
  type?: string;
}

export async function listProducts(params: ProductFilters): Promise<Paginated<ProductListRow>> {
  const { data } = await api.get<Envelope<Paginated<ProductListRow>>>('/products', { params });
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
