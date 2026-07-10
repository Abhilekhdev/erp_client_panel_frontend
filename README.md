# ERP Panel — Frontend (React + Vite)

Premium, responsive SPA for the ERP. Workflows are modelled on the Laravel reference (`GOURI_DEV`) but the UI is redesigned (Stripe/Linear/Vercel feel) — **the Laravel Blade UI is not copied**.

## Stack
React 18 · Vite · TypeScript · Redux Toolkit (client/auth state) · TanStack Query (server state) ·
React Hook Form + Zod · Tailwind + shadcn-style components · React Router · Axios · Framer Motion · lucide-react.

## Structure (feature-based)
```
src/
  app/            store, query client, typed hooks, providers
  components/     ui/ (button, input, card…), theme/, ErrorBoundary
  features/
    auth/         authSlice, api, schemas, useAuth, usePermission,
                  ProtectedRoute, AuthBootstrap, LoginForm, LoginPage
  layouts/        AuthLayout (split-screen), AppLayout (sidebar + topbar)
  lib/            api/axios (token + single-flight refresh), utils(cn)
  pages/          DashboardPage, NotFoundPage
  types/          shared domain types
```

## Auth flow
- **Login** (`POST /auth/login`) → access token in Redux (memory), refresh token in an httpOnly cookie.
- **Silent restore** on load: `AuthBootstrap` calls `/auth/refresh` → `/auth/me`.
- **Axios** attaches the bearer token and, on `401`, runs a single-flight `/auth/refresh` + retry; on failure it logs out.
- **RBAC**: `usePermission()` mirrors Laravel's `Gate::before` — a tenant Admin passes every check; the sidebar and routes hide by permission.

## Getting started
```bash
cp .env.example .env
npm install
npm run dev        # http://localhost:5173  (proxies /api -> :4000)
```
Start the backend (`../backend`) first so login/refresh resolve.

## Theming
Light/dark via CSS variables + a `ThemeProvider` (persisted, system-aware). Toggle in the top bar.
```
