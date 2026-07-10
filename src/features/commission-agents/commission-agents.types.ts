export interface CommissionAgentListItem {
  id: number;
  name: string;
  email: string;
  contactNo: string;
  address: string;
  cmmsnPercent: number;
}

export interface CommissionAgentDetail {
  id: number;
  surname: string;
  firstName: string;
  lastName: string;
  email: string;
  contactNo: string;
  address: string;
  cmmsnPercent: number;
}

// Numeric/text coercion is handled by the backend zod schema.
export interface CommissionAgentFormBody {
  surname?: string;
  firstName: string;
  lastName?: string;
  email: string;
  contactNo?: string;
  address?: string;
  cmmsnPercent?: string;
}
