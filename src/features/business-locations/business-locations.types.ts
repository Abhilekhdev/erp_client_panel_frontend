/** Business Locations — API + form types. Mirrors the NestJS business-locations module. */

export interface Option {
  value: number;
  label: string;
}

export interface PaymentType {
  key: string;
  label: string;
}

export interface LocationOptions {
  invoiceSchemes: Option[];
  invoiceLayouts: Option[];
  priceGroups: Option[];
  accounts: Option[];
  paymentTypes: PaymentType[];
  customFieldLabels: {
    custom_field1: string;
    custom_field2: string;
    custom_field3: string;
    custom_field4: string;
  };
}

/** A row in the locations DataTable. */
export interface LocationRow {
  id: number;
  name: string;
  locationId: string | null;
  landmark: string | null;
  city: string;
  zipCode: string;
  state: string;
  country: string;
  priceGroup: string | null;
  invoiceScheme: string | null;
  invoiceLayout: string | null;
  saleInvoiceLayout: string | null;
  sellingPriceGroupId: number | null;
  invoiceSchemeId: number;
  invoiceLayoutId: number;
  saleInvoiceLayoutId: number | null;
  isActive: boolean;
}

export interface PaymentAccountValue {
  is_enabled: boolean;
  account: number | null;
}

/** Full location detail (edit form source). */
export interface LocationDetail {
  id: number;
  name: string;
  locationId: string;
  landmark: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  mobile: string;
  alternateNumber: string;
  email: string;
  website: string;
  invoiceSchemeId: number;
  invoiceLayoutId: number;
  saleInvoiceLayoutId: number | null;
  sellingPriceGroupId: number | null;
  customField1: string;
  customField2: string;
  customField3: string;
  customField4: string;
  defaultPaymentAccounts: Record<string, PaymentAccountValue>;
  featuredProducts: number[];
  isActive: boolean;
}

/** Save payload — snake_case keys matching SaveBusinessLocationDto. */
export interface SaveLocationPayload {
  name: string;
  location_id?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  mobile?: string | null;
  alternate_number?: string | null;
  email?: string | null;
  website?: string | null;
  invoice_scheme_id?: number | null;
  invoice_layout_id?: number | null;
  sale_invoice_layout_id?: number | null;
  selling_price_group_id?: number | null;
  custom_field1?: string | null;
  custom_field2?: string | null;
  custom_field3?: string | null;
  custom_field4?: string | null;
  default_payment_accounts?: Record<string, PaymentAccountValue> | null;
  featured_products?: number[] | null;
}

export interface Paginated<T> {
  data: T[];
  total: number;
}
