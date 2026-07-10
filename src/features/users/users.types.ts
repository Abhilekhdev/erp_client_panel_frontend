export interface UserListItem {
  id: number;
  name: string;
  email: string;
  username: string | null;
  allowLogin: boolean;
  status: string; // 'active' | 'inactive'
  role: string;
  isAdmin: boolean;
}

export interface BankDetails {
  accountHolderName?: string;
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  branch?: string;
  taxPayerId?: string;
}

export interface UserDetail {
  id: number;
  surname: string | null;
  firstName: string;
  lastName: string | null;
  email: string;
  username: string | null;
  allowLogin: boolean;
  isActive: boolean;
  roleId: number | null;
  isCmmsnAgnt: boolean;
  cmmsnPercent: number;
  maxSalesDiscountPercent: number | null;
  parentId: number | null;
  essentialsDepartmentId: number | null;
  essentialsDesignationId: number | null;
  essentialsSalary: number | null;
  essentialsPayPeriod: string;
  locationId: number | null;
  activityCodes: number[];
  payComponents: number[];
  leaveTypeIds: number[];
  dob: string;
  gender: string;
  maritalStatus: string;
  bloodGroup: string;
  contactNumber: string;
  altNumber: string;
  familyNumber: string;
  fbLink: string;
  twitterLink: string;
  socialMedia1: string;
  socialMedia2: string;
  customField1: string;
  customField2: string;
  customField3: string;
  customField4: string;
  guardianName: string;
  idProofName: string;
  idProofNumber: string;
  permanentAddress: string;
  currentAddress: string;
  bankDetails: BankDetails | null;
  accessAllLocations: boolean;
  locationIds: number[];
  selectedContacts: boolean;
  contactIds: number[];
}

export interface IdName {
  id: number;
  name: string;
}

export interface UserMeta {
  roles: IdName[];
  locations: IdName[];
  managers: IdName[];
  departments: IdName[];
  designations: IdName[];
  activityCodes: IdName[];
  payComponents: IdName[];
  leaveTypes: IdName[];
}

// Payload sent to the API. Numeric/text coercion is handled by the backend zod schema.
export interface UserFormBody {
  surname?: string;
  firstName: string;
  lastName?: string;
  email: string;
  username?: string;
  password?: string;
  allowLogin: boolean;
  isActive: boolean;
  roleId: number;
  accessAllLocations: boolean;
  locationIds: number[];
  cmmsnPercent?: string;
  maxSalesDiscountPercent?: string;
  parentId?: number | null;
  essentialsDepartmentId?: number | null;
  essentialsDesignationId?: number | null;
  essentialsSalary?: number | null;
  essentialsPayPeriod?: string;
  locationId?: number | null;
  activityCodes?: number[];
  payComponents?: number[];
  leaveTypeIds?: number[];
  dob?: string;
  gender?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  contactNumber?: string;
  altNumber?: string;
  familyNumber?: string;
  fbLink?: string;
  twitterLink?: string;
  socialMedia1?: string;
  socialMedia2?: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  customField4?: string;
  guardianName?: string;
  idProofName?: string;
  idProofNumber?: string;
  permanentAddress?: string;
  currentAddress?: string;
  bankDetails?: BankDetails;
}
