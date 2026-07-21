/**
 * Build a loadable URL for a stored upload path (e.g. `products/2-uuid.png`).
 *
 * Uploads are served by the API at `/uploads/*` — OUTSIDE the `/api` prefix — so the base is
 * `VITE_API_URL` with its trailing `/api` stripped. When `VITE_API_URL` is unset the result is a
 * plain `/uploads/...`, which the Vite dev server forwards to the backend (see the `/uploads`
 * proxy in vite.config.ts) and which resolves same-origin in production.
 *
 * Works unchanged whether the backend stores files on local disk or S3: in S3 mode the backend
 * answers `/uploads/<path>` with a 302 to a short-lived presigned URL and the browser follows it.
 */
const UPLOADS_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '');

export function fileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  // Already absolute (presigned S3 link) or a local object URL from a just-picked file.
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
  return `${UPLOADS_BASE}/uploads/${path}`;
}
