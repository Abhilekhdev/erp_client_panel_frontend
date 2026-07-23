import { api } from '@/lib/api/axios';

export interface IdName {
  id: number;
  name: string;
}

export interface ReportMeta {
  locations: IdName[];
  categories: IdName[];
  brands: IdName[];
  units: IdName[];
  taxRates: IdName[];
  users: IdName[];
  suppliers: IdName[];
  customers: IdName[];
}

/** Shared filter shape sent to every report endpoint (each report reads only what it needs). */
export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  locationId?: number;
  categoryId?: number;
  brandId?: number;
  unitId?: number;
  contactId?: number;
  userId?: number;
  contactType?: 'supplier' | 'customer';
  limit?: number;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

const get = async <T>(path: string, filters?: ReportFilters): Promise<T> => {
  const { data } = await api.get<Envelope<T>>(`/reports/${path}`, { params: filters });
  return data.data;
};

export const getReportMeta = () => get<ReportMeta>('meta');

export interface ProfitLoss {
  totalSell: number;
  sellReturn: number;
  totalPurchase: number;
  purchaseReturn: number;
  totalExpense: number;
  grossProfit: number;
  netProfit: number;
}
export const getProfitLoss = (f: ReportFilters) => get<ProfitLoss>('profit-loss', f);

export interface PurchaseSaleSide {
  total: number;
  paid: number;
  due: number;
  returnTotal: number;
}
export interface PurchaseSale {
  purchase: PurchaseSaleSide;
  sale: PurchaseSaleSide;
}
export const getPurchaseSale = (f: ReportFilters) => get<PurchaseSale>('purchase-sale', f);

export interface TaxReport {
  outputTax: number;
  inputTax: number;
  taxDue: number;
}
export const getTaxReport = (f: ReportFilters) => get<TaxReport>('tax', f);

export interface StockRow {
  product: string;
  sku: string;
  currentStock: number;
  unitPurchasePrice: number;
  unitSellPrice: number;
  stockValue: number;
  potentialValue: number;
}
export interface StockReport {
  totals: { stockValueByPurchase: number; stockValueBySale: number; potentialProfit: number };
  data: StockRow[];
}
export const getStockReport = (f: ReportFilters) => get<StockReport>('stock', f);

export interface TrendingRow {
  product: string;
  sku: string;
  unitsSold: number;
}
export const getTrending = (f: ReportFilters) => get<{ data: TrendingRow[] }>('trending', f);

export interface ItemRow {
  product: string;
  sku: string;
  totalPurchased: number;
  totalSold: number;
  currentStock: number;
}
export const getItems = (f: ReportFilters) => get<{ data: ItemRow[] }>('items', f);

export interface ExpenseRow {
  category: string;
  count: number;
  amount: number;
}
export const getExpenseReport = (f: ReportFilters) =>
  get<{ total: number; data: ExpenseRow[] }>('expense', f);

export interface SalesRepRow {
  user: string;
  totalSell: number;
  sellCount: number;
  totalExpense: number;
  net: number;
}
export const getSalesRep = (f: ReportFilters) => get<{ data: SalesRepRow[] }>('sales-rep', f);

export interface ContactRow {
  contact: string;
  documents: number;
  total: number;
  paid: number;
  due: number;
}
export const getCustomerSupplier = (f: ReportFilters) =>
  get<{ contactType: string; data: ContactRow[] }>('customer-supplier', f);
