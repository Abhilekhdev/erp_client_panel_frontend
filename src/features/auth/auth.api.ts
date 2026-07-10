import { api } from '@/lib/api/axios';
import type { AuthUser, Currency, LoginResponse } from '@/types/auth';
import type { LoginInput, RegisterInput } from './auth.schemas';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function loginRequest(input: LoginInput): Promise<LoginResponse> {
  const { data } = await api.post<Envelope<LoginResponse>>('/auth/login', input);
  return data.data;
}

export async function registerRequest(input: RegisterInput): Promise<LoginResponse> {
  const { data } = await api.post<Envelope<LoginResponse>>('/auth/register', input);
  return data.data;
}

export async function getCurrencies(): Promise<Currency[]> {
  const { data } = await api.get<Envelope<Currency[]>>('/auth/currencies');
  return data.data;
}

export async function meRequest(): Promise<AuthUser> {
  const { data } = await api.get<Envelope<AuthUser>>('/auth/me');
  return data.data;
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout');
}

export async function refreshRequest(): Promise<string> {
  const { data } = await api.post<Envelope<{ accessToken: string }>>('/auth/refresh');
  return data.data.accessToken;
}
