/** Invoice Schemes — API + form types. Mirrors the NestJS invoice-schemes module. */

export type SchemeType = 'blank' | 'year';

export interface InvoiceScheme {
  id: number;
  name: string;
  schemeType: SchemeType;
  prefix: string;
  /** Prefix as displayed in the list (year schemes include current year + separator). */
  prefixDisplay: string;
  startNumber: number;
  invoiceCount: number;
  totalDigits: number;
  isDefault: boolean;
}

export interface SaveInvoiceSchemePayload {
  name: string;
  scheme_type: SchemeType;
  prefix?: string | null;
  start_number?: number | null;
  total_digits?: number | null;
  is_default?: boolean;
}
