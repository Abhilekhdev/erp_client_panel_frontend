import { z } from 'zod';

/** Mirrors the backend login DTO. Shared shape keeps client + server validation in sync. */
export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Mirrors the backend register DTO — creates a business + its owner (admin). */
export const registerSchema = z.object({
  businessName: z.string().min(2, 'Business name is required').max(191),
  ownerFirstName: z.string().min(1, 'First name is required').max(191),
  ownerLastName: z.string().max(191).optional(),
  email: z.string().min(1, 'Email is required').email('Enter a valid email').max(191),
  password: z.string().min(8, 'Use at least 8 characters').max(191),
  currencyId: z.coerce.number({ invalid_type_error: 'Select a currency' }).int().positive('Select a currency'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
