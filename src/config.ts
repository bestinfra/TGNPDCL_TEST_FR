/** Local backend (Swagger: http://localhost:4249/api/sub-app/auth/login). */
export const LOCAL_API_BASE_URL = "http://localhost:4249/api";

/** Live TGNPDCL API (production nginx). */
export const LIVE_API_BASE_URL = "https://api.bestinfra.app/tgnpdcl/api";

/**
 * API root — all routes are `${API_BASE_URL}/...`
 * e.g. login → http://localhost:4249/api/sub-app/auth/login
 */
export const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.DEV ? LOCAL_API_BASE_URL : LIVE_API_BASE_URL);

/** Same as API_BASE_URL (legacy imports: Tickets, Meters, logger, etc.). */
export const BACKEND_URL = API_BASE_URL;

export default BACKEND_URL;
