/**
 * Central API configuration — single source of truth for backend URLs.
 * Override via VITE_API_BASE_URL (e.g. http://localhost:4249/api).
 */

export const LOCAL_API_BASE_URL = "http://localhost:4249/api";

export const LIVE_API_BASE_URL = "https://api.bestinfra.app/tgnpdcl/api";

export const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    (import.meta.env.DEV ? LOCAL_API_BASE_URL : LIVE_API_BASE_URL);

/** Legacy alias used across pages — prefer API_BASE_URL in new code. */
export const BACKEND_URL = API_BASE_URL;

export default BACKEND_URL;

export const API_REQUEST_TIMEOUT_MS = Number(
    import.meta.env.VITE_API_TIMEOUT ?? 20_000,
);

/**
 * Build a full API URL from a path (with or without leading slash).
 * @example buildApiUrl('tickets') → 'http://localhost:4249/api/tickets'
 */
export function buildApiUrl(path: string): string {
    const base = API_BASE_URL.replace(/\/$/, "");
    const normalized = path.replace(/^\//, "");
    return `${base}/${normalized}`;
}
