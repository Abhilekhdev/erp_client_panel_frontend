import { z } from 'zod';

/** Mirrors the backend login DTO. Shared shape keeps client + server validation in sync. */
export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

const opt = z.string().max(191).optional();

/**
 * Mirrors the backend register DTO — creates a business, its owner (admin) and the first location.
 * Split across the wizard's two steps, in the same order the form asks for them.
 *
 * Signup asks only for what the tenant cannot be created without. The start date defaults to today,
 * and the logo, tax labels/numbers, financial year and accounting method are all set later from
 * Settings → Business.
 */
export const registerSchema = z.object({
  // Step 1 — business
  businessName: z.string().min(2, 'Business name is required').max(191),
  currencyId: z.coerce.number({ invalid_type_error: 'Select a currency' }).int().positive('Select a currency'),
  website: opt,
  mobile: opt,
  alternateNumber: opt,
  country: opt,
  state: opt,
  city: opt,
  zipCode: z.string().max(20).optional(),
  landmark: opt,
  timeZone: opt,

  // Step 2 — owner
  ownerSurname: z.string().max(10).optional(),
  ownerFirstName: z.string().min(1, 'First name is required').max(191),
  ownerLastName: opt,
  email: z.string().min(1, 'Email is required').email('Enter a valid email').max(191),
  password: z.string().min(8, 'Use at least 8 characters').max(191),
  confirmPassword: z.string().optional(),
});

/** Which fields each wizard step owns — the step gate validates only these. */
export const REGISTER_STEP_FIELDS = {
  business: ['businessName', 'currencyId', 'website', 'mobile', 'alternateNumber', 'country', 'state', 'city', 'zipCode', 'landmark', 'timeZone'],
  owner: ['ownerSurname', 'ownerFirstName', 'ownerLastName', 'email', 'password', 'confirmPassword'],
} as const;

export type RegisterInput = z.infer<typeof registerSchema>;
