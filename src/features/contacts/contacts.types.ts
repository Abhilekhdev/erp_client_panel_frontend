export type ContactListType = 'supplier' | 'customer';

export interface ContactListItem {
  id: number;
  contactId: string;
  type: string;
  supplierBusinessName: string;
  name: string;
  email: string;
  taxNumber: string;
  mobile: string;
  payTermNumber: number | null;
  payTermType: string | null;
  creditLimit: number | null;
  customerGroup: string;
  customerGroupId: number | null;
  address: string;
  advanceBalance: number;
  contactStatus: string;
  isDefault: boolean;
  createdAt: string | null;
  customFields: string[];
  // Deferred (transaction-derived) — null until the Sales/Purchase module exists.
  openingBalance: number | null;
  totalPurchaseDue: number | null;
  totalPurchaseReturnDue: number | null;
  totalSaleDue: number | null;
  totalSellReturnDue: number | null;
  rewardPoints: number | null;
}

export interface ContactDetail {
  id: number;
  type: string;
  contactTypeRadio: 'individual' | 'business';
  supplierBusinessName: string;
  prefix: string;
  firstName: string;
  middleName: string;
  lastName: string;
  name: string;
  contactId: string;
  contactStatus: string;
  email: string;
  taxNumber: string;
  customerGroupId: number | null;
  customerGroup: string;
  payTermNumber: number | null;
  payTermType: string | null;
  creditLimit: number | null;
  mobile: string;
  landline: string;
  alternateNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  dob: string;
  customField1: string;
  customField2: string;
  customField3: string;
  customField4: string;
  customField5: string;
  customField6: string;
  customField7: string;
  customField8: string;
  customField9: string;
  customField10: string;
  shippingAddress: string;
  position: string;
  isExport: boolean;
  isDefault: boolean;
  advanceBalance: number;
  /** What the contact still owes on their opening balance (gross minus paid). */
  openingBalance: number;
  assignedToUsers: number[];
  createdAt: string | null;
}

export interface IdName {
  id: number;
  name: string;
}

export interface ContactMeta {
  customerGroups: IdName[];
  users: IdName[];
}

/** Snake_case payload matching the backend SaveContactDto. */
export interface ContactFormBody {
  type: string;
  contact_type_radio: 'individual' | 'business';
  supplier_business_name?: string | null;
  prefix?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  contact_id?: string | null;
  email?: string | null;
  tax_number?: string | null;
  customer_group_id?: number | null;
  pay_term_number?: number | null;
  pay_term_type?: string | null;
  credit_limit?: number | null;
  mobile: string;
  landline?: string | null;
  alternate_number?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip_code?: string | null;
  dob?: string | null;
  custom_field1?: string | null;
  custom_field2?: string | null;
  custom_field3?: string | null;
  custom_field4?: string | null;
  shipping_address?: string | null;
  assigned_to_users?: number[];
  opening_balance?: number | null;
}
