import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { store } from '@/app/store';
import { logout, setAccessToken } from '@/features/auth/authSlice';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true, // send/receive the httpOnly refresh cookie
});

// Attach the in-memory access token to every request + drop empty filter params.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = store.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // An unset filter is "no filter", not an empty value: sending `?status=` makes the API's
  // enum/regex validators reject the request. Strip '' / null / undefined before it goes out.
  if (config.params && typeof config.params === 'object' && !(config.params instanceof URLSearchParams)) {
    const params = config.params as Record<string, unknown>;
    config.params = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined),
    );
  }
  return config;
});

// Single-flight refresh: many parallel 401s trigger only one /auth/refresh call.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const res = await axios.post<{ success: boolean; data: { accessToken: string } }>(
    `${baseURL}/auth/refresh`,
    {},
    { withCredentials: true },
  );
  const token = res.data.data.accessToken;
  store.dispatch(setAccessToken(token));
  return token;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const token = await refreshPromise;
        refreshPromise = null;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshError) {
        refreshPromise = null;
        store.dispatch(logout());
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

const FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  username: 'Username',
  password: 'Password',
  roleId: 'Role',
  cmmsnPercent: 'Commission %',
  maxSalesDiscountPercent: 'Max sales discount %',
  parentId: 'Manager',
  name: 'Name',
};

function humanizeField(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const spaced = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Pull a readable message out of our `{ success:false, error }` envelope. When the API returns
 * field-level validation `details` (zod issues), format them as "Field: message" so the user sees
 * exactly what to fix instead of a generic "Validation failed".
 */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    // 413 bodies are produced by the proxy/server, not our API, so they carry no `error.message`
    // and would otherwise surface as a bare "Request failed with status code 413".
    if (error.response?.status === 413) {
      return 'That file is too large to upload. Please upload a file under 5 MB.';
    }
    if (!error.response && error.code === 'ERR_NETWORK') {
      return 'Could not reach the server. Check your connection and try again.';
    }
    const data = error.response?.data as
      | { error?: { message?: string; details?: unknown } }
      | undefined;
    const details = data?.error?.details;
    if (Array.isArray(details) && details.length) {
      const messages = details
        .map((d) => {
          const issue = d as { path?: (string | number)[]; message?: string };
          if (!issue.message) return '';
          const key =
            Array.isArray(issue.path) && issue.path.length
              ? String(issue.path[issue.path.length - 1])
              : '';
          return key ? `${humanizeField(key)}: ${issue.message}` : issue.message;
        })
        .filter(Boolean);
      if (messages.length) return [...new Set(messages)].join('\n');
    }
    return data?.error?.message ?? error.message ?? fallback;
  }
  return fallback;
}
