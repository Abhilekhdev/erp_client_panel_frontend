export type UserStatus = 'active' | 'inactive' | 'terminated';
export type UserType = 'user' | 'user_customer';

export interface AuthBusiness {
  id: number;
  name: string;
  logo?: string | null;
}

/** The authenticated user shape returned by GET /auth/me and POST /auth/login. */
export interface AuthUser {
  id: number;
  firstName: string;
  lastName?: string | null;
  surname?: string | null;
  email: string;
  username?: string | null;
  userType: UserType;
  status: UserStatus;
  businessId: number | null;
  language: string;
  /** True when the user holds the tenant Admin role (Laravel `Gate::before` wildcard). */
  isBusinessAdmin: boolean;
  roles: string[];
  permissions: string[];
  business?: AuthBusiness | null;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Currency {
  id: number;
  country: string;
  currency: string;
  code: string;
  symbol: string;
}
