// API Utilities for TGNPDCL
// This file provides utilities to connect to the backend API

import BACKEND_URL, { API_BASE_URL } from "../config";

const DEFAULT_REQUEST_TIMEOUT_MS = 20000;

const getAuthHeaders = (): Record<string, string> => {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('GMRAccesstoken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal ?? controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Make API requests to the backend
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a GET request
   */
  async get(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(options.headers as Record<string, string> | undefined),
      } as HeadersInit,
      credentials: 'include',
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async post(endpoint: string, data: any, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    // Check if data is FormData
    const isFormData = data instanceof FormData;

    const headers: Record<string, string> = {
      ...getAuthHeaders(),
      ...options.headers as Record<string, string>,
    };

    // Only set Content-Type to application/json if NOT FormData
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: isFormData ? data : JSON.stringify(data),
      credentials: 'include', // Include cookies for authentication
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Make a PUT request
   */
  async put(endpoint: string, data: any, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    // Check if data is FormData
    const isFormData = data instanceof FormData;

    const headers: Record<string, string> = {
      ...getAuthHeaders(),
      ...options.headers as Record<string, string>,
    };

    // Only set Content-Type to application/json if NOT FormData
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: isFormData ? data : JSON.stringify(data),
      credentials: 'include', // Include cookies for authentication
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Make a DELETE request
   */
  async delete(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(options.headers as Record<string, string> | undefined),
      } as HeadersInit,
      credentials: 'include', // Include cookies for authentication
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Check backend health
   */
  async healthCheck() {
    try {
      const health = await this.get('/api/health');
      return { status: 'healthy', data: health };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { status: 'unhealthy', error: errorMessage };
    }
  }

  /**
   * Get backend environment info
   */
  async getEnvironmentInfo() {
    try {
      const env = await this.get('/api/env');
      return { status: 'success', data: env };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { status: 'error', error: errorMessage };
    }
  }
}

// Create a default API client instance
export const apiClient = new ApiClient();

// Export commonly used API functions
export const api = {
  // Health check
  health: () => apiClient.healthCheck(),

  // Environment info
  env: () => apiClient.getEnvironmentInfo(),

  // Example API endpoints (customize based on your backend)
  users: {
    getAll: () => apiClient.get('/api/users'),
    getById: (id: string) => apiClient.get(`/api/users/${id}`),
    create: (data: any) => apiClient.post('/api/users', data),
    update: (id: string, data: any) => apiClient.put(`/api/users/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/users/${id}`),
  },

  // Example: posts, comments, etc.
};

// --- Estate / Meter Management: bulk upload (deep response parsing) ---

export type BulkUploadFailedRow = {
    row: number | string;
    error: string;
};

export type BulkUploadConsumersParsed = {
    ok: boolean;
    message: string;
    created: number;
    failed: number;
    failedRows: BulkUploadFailedRow[];
};

function bulkUploadNum(v: unknown): number {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return Boolean(v && typeof v === "object" && !Array.isArray(v));
}

function collectBulkUploadObjectLayers(
    root: unknown,
    maxDepth = 10,
    maxNodes = 300,
): Record<string, unknown>[] {
    const layers: Record<string, unknown>[] = [];
    const seen = new Set<unknown>();
    const queue: { node: Record<string, unknown>; depth: number }[] = [];

    if (isPlainObject(root)) {
        queue.push({ node: root, depth: 0 });
    }

    while (queue.length > 0 && layers.length < maxNodes) {
        const { node, depth } = queue.shift()!;
        if (seen.has(node)) continue;
        seen.add(node);
        layers.push(node);

        if (depth >= maxDepth) continue;

        for (const v of Object.values(node)) {
            if (isPlainObject(v)) {
                queue.push({ node: v, depth: depth + 1 });
            } else if (Array.isArray(v)) {
                for (const item of v) {
                    if (isPlainObject(item)) {
                        queue.push({ node: item, depth: depth + 1 });
                    }
                }
            }
        }
    }

    return layers;
}

function pickFirstNumericFromLayers(
    layers: Record<string, unknown>[],
    keys: string[],
): number {
    for (const key of keys) {
        for (const layer of layers) {
            if (!(key in layer)) continue;
            const v = layer[key];
            if (Array.isArray(v)) continue;
            if (v === null || v === undefined || v === "") continue;
            return bulkUploadNum(v);
        }
    }
    return 0;
}

function pickFirstNumericCaseInsensitive(
    layers: Record<string, unknown>[],
    aliases: string[],
): number {
    const want = new Set(aliases.map((a) => a.toLowerCase()));
    for (const layer of layers) {
        for (const [k, v] of Object.entries(layer)) {
            if (!want.has(k.toLowerCase())) continue;
            if (Array.isArray(v)) continue;
            if (v === null || v === undefined || v === "") continue;
            return bulkUploadNum(v);
        }
    }
    return 0;
}

function normalizeBulkUploadFailedRows(rows: unknown[]): BulkUploadFailedRow[] {
    const out: BulkUploadFailedRow[] = [];
    for (const item of rows) {
        if (!item || typeof item !== "object") continue;
        const row = item as Record<string, unknown>;
        const rowNum =
            row.row ??
            row.rowNumber ??
            row.line ??
            row.lineNumber ??
            row.index ??
            row.record ??
            row.sno ??
            "?";
        const err =
            row.error ??
            row.message ??
            row.reason ??
            row.description ??
            row.detail ??
            "Unknown error";
        out.push({
            row: rowNum as number | string,
            error: String(err),
        });
    }
    return out;
}

const BULK_UPLOAD_CREATED_NUM_KEYS = [
    "created",
    "createdCount",
    "totalCreated",
    "inserted",
    "insertedCount",
    "successCount",
    "recordsCreated",
    "imported",
    "importedCount",
    "added",
    "totalSuccess",
    "successfulCount",
    "created_count",
    "inserted_count",
    "rowsCreated",
    "rowsInserted",
    "metersCreated",
    "assetsCreated",
    "recordsInserted",
    "totalInserted",
    "numCreated",
    "numInserted",
    "successRecordsCount",
    "validCount",
    "processedSuccess",
];

const BULK_UPLOAD_FAILED_NUM_KEYS = [
    "failed",
    "failedCount",
    "failureCount",
    "totalFailed",
    "errorCount",
    "errorsCount",
    "recordsFailed",
    "rejected",
    "rejectedCount",
    "skipped",
    "skippedCount",
    "failed_count",
    "rowsFailed",
    "invalidCount",
    "validationErrorCount",
    "numFailed",
    "failedRecordsCount",
];

const BULK_UPLOAD_CREATED_ARRAY_KEYS = [
    "successful",
    "successRecords",
    "passed",
    "succeeded",
    "importedRows",
    "insertedRecords",
    "validRows",
    "createdRows",
    "successfulImports",
    "insertedRows",
    "validRecords",
];

const BULK_UPLOAD_FAILED_ARRAY_KEYS = [
    "failedRecords",
    "failedRows",
    "errors",
    "invalidRows",
    "rejectedRows",
    "validationErrors",
    "failureDetails",
    "errorDetails",
];

const CREATED_KEY_PATTERN =
    /^(total)?(created|inserted|imported|added)(count|records|rows)?$/i;
const FAILED_KEY_PATTERN =
    /^(total)?(failed|failure|error|rejected|invalid|skipped)(count|records|rows)?$/i;

function keyLooksLikeCreatedCount(key: string): boolean {
    const k = key.toLowerCase();
    if (/failed|failure|error|invalid|reject|skip|duplicate/.test(k))
        return false;
    return (
        CREATED_KEY_PATTERN.test(key) ||
        /^(num|total)?(created|inserted|imported)/i.test(k) ||
        (/(created|inserted|imported)/i.test(k) &&
            /count|total|rows|records|number/i.test(k))
    );
}

function keyLooksLikeFailedCount(key: string): boolean {
    const k = key.toLowerCase();
    if (keyLooksLikeCreatedCount(key)) {
        if (!k.includes("invalid") && !k.includes("error")) return false;
    }
    return (
        FAILED_KEY_PATTERN.test(key) ||
        /\b(failed|failure|errors?|rejected|skipped|invalid)\b/i.test(k)
    );
}

function scanNumericCountsByKeyHeuristic(
    layers: Record<string, unknown>[],
): { created: number; failed: number } {
    let created = 0;
    let failed = 0;
    for (const layer of layers) {
        for (const [key, val] of Object.entries(layer)) {
            if (Array.isArray(val) || val === null || val === undefined) continue;
            const n = bulkUploadNum(val);
            if (!Number.isFinite(n) || n < 0) continue;
            if (created === 0 && keyLooksLikeCreatedCount(key)) created = n;
            if (failed === 0 && keyLooksLikeFailedCount(key)) failed = n;
        }
        if (created > 0 && failed > 0) break;
    }
    return { created, failed };
}

function maxArrayLengthFromKeys(
    layers: Record<string, unknown>[],
    keys: string[],
): number {
    let max = 0;
    const keyLower = new Set(keys.map((k) => k.toLowerCase()));
    for (const layer of layers) {
        for (const [k, v] of Object.entries(layer)) {
            if (!Array.isArray(v) || v.length === 0) continue;
            if (
                keyLower.has(k.toLowerCase()) ||
                keys.some((alias) => k.toLowerCase() === alias.toLowerCase())
            ) {
                if (v.length > max) max = v.length;
            }
        }
    }
    return max;
}

export function parseBulkUploadConsumersResponse(
    raw: unknown,
    options?: { httpOk?: boolean },
): BulkUploadConsumersParsed {
    const empty: BulkUploadConsumersParsed = {
        ok: false,
        message: "Upload failed",
        created: 0,
        failed: 0,
        failedRows: [],
    };

    if (!raw || typeof raw !== "object") return empty;

    const root = raw as Record<string, unknown>;
    const layers = collectBulkUploadObjectLayers(root);

    const explicitFailure =
        root.success === false ||
        root.ok === false ||
        (isPlainObject(root.data) &&
            (root.data as Record<string, unknown>).success === false) ||
        (isPlainObject(root.data) &&
            (root.data as Record<string, unknown>).ok === false) ||
        root.status === "error" ||
        (typeof root.status === "string" &&
            root.status.toLowerCase() === "failed");

    const explicitSuccess =
        root.success === true ||
        root.ok === true ||
        root.status === "success" ||
        root.status === 200 ||
        (typeof root.status === "string" &&
            root.status.toLowerCase() === "success") ||
        (isPlainObject(root.data) &&
            (root.data as Record<string, unknown>).success === true) ||
        (isPlainObject(root.data) &&
            (root.data as Record<string, unknown>).ok === true);

    let successful: unknown[] = [];
    outerSuccess: for (const key of BULK_UPLOAD_CREATED_ARRAY_KEYS) {
        for (const layer of layers) {
            const arr = layer[key];
            if (Array.isArray(arr) && arr.length > 0) {
                successful = arr;
                break outerSuccess;
            }
        }
    }

    let failedRows: BulkUploadFailedRow[] = [];
    for (const layer of layers) {
        const f = layer.failed;
        if (Array.isArray(f) && f.length > 0 && typeof f[0] === "object") {
            failedRows = normalizeBulkUploadFailedRows(f);
            break;
        }
    }
    if (failedRows.length === 0) {
        for (const layer of layers) {
            const alt =
                layer.failedRows ??
                layer.errors ??
                layer.failures ??
                layer.validationErrors ??
                layer.failedList ??
                layer.errorList;
            if (Array.isArray(alt) && alt.length > 0) {
                failedRows = normalizeBulkUploadFailedRows(alt);
                break;
            }
        }
    }

    const createdFromList =
        successful.length > 0 ? successful.length : 0;
    const createdFromNumbers = pickFirstNumericFromLayers(
        layers,
        BULK_UPLOAD_CREATED_NUM_KEYS,
    );
    let created =
        createdFromList > 0 ? createdFromList : createdFromNumbers;
    if (created === 0) {
        created = pickFirstNumericCaseInsensitive(layers, [
            "created",
            "createdCount",
            "totalCreated",
            "inserted",
            "imported",
            "added",
            "successfulCount",
            "recordsCreated",
        ]);
    }
    if (created === 0) {
        created = maxArrayLengthFromKeys(
            layers,
            BULK_UPLOAD_CREATED_ARRAY_KEYS,
        );
    }
    if (created === 0) {
        const h = scanNumericCountsByKeyHeuristic(layers);
        if (h.created > 0) created = h.created;
    }

    let failed = failedRows.length;
    if (failed === 0) {
        for (const layer of layers) {
            const f = layer.failed;
            if (typeof f === "number" || typeof f === "string") {
                failed = bulkUploadNum(f);
                break;
            }
            if (Array.isArray(f) && f.length > 0 && typeof f[0] !== "object") {
                failed = f.length;
                break;
            }
        }
    }
    if (failed === 0) {
        failed = pickFirstNumericFromLayers(layers, BULK_UPLOAD_FAILED_NUM_KEYS);
    }
    if (failed === 0) {
        failed = pickFirstNumericCaseInsensitive(layers, [
            "failed",
            "failedCount",
            "failureCount",
            "totalFailed",
            "errorCount",
            "rejected",
            "skipped",
        ]);
    }
    if (failed === 0) {
        failed = maxArrayLengthFromKeys(
            layers,
            BULK_UPLOAD_FAILED_ARRAY_KEYS,
        );
    }
    if (failed === 0) {
        const h = scanNumericCountsByKeyHeuristic(layers);
        if (h.failed > 0) failed = h.failed;
    }

    if (failedRows.length > failed) {
        failed = failedRows.length;
    }

    const messageFromLayers = (): string => {
        for (const layer of layers) {
            if (typeof layer.message === "string" && layer.message.trim())
                return layer.message;
        }
        return "";
    };
    let messageRaw = messageFromLayers() || empty.message;

    if (
        messageRaw === empty.message &&
        (created > 0 || failed > 0 || failedRows.length > 0)
    ) {
        messageRaw = "Upload completed";
    }

    let ok = false;
    if (explicitFailure) {
        ok = false;
    } else if (explicitSuccess) {
        ok = true;
    } else if (created > 0 || failed > 0 || failedRows.length > 0) {
        ok = true;
    } else if (options?.httpOk === true) {
        const msg = messageRaw.toLowerCase();
        ok =
            /(completed|success|uploaded|processed|imported)/i.test(msg) ||
            (messageRaw !== empty.message && messageRaw.length > 0);
    }

    let outMessage = messageRaw;
    if (ok && outMessage === empty.message) {
        outMessage = "Upload completed";
    }

    return {
        ok,
        message: outMessage,
        created,
        failed,
        failedRows,
    };
}

function assetBulkAuthHeaders(json: boolean): HeadersInit {
    const h: Record<string, string> = {};
    if (json) h["Content-Type"] = "application/json";
    const token = localStorage.getItem("token");
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
}

export type AssetBulkUploadTemplateMeta = {
    sheetName: string;
    columns: string[];
};

const ASSET_BULK_TEMPLATE_SHEET = "Template";

export async function fetchAssetBulkUploadTemplateMeta(): Promise<AssetBulkUploadTemplateMeta> {
    const res = await fetch(`${BACKEND_URL}/assets/bulk-upload-columns`, {
        method: "GET",
        credentials: "include",
        headers: assetBulkAuthHeaders(true),
    });

    const raw = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(
            typeof (raw as { message?: string }).message === "string"
                ? (raw as { message: string }).message
                : `HTTP ${res.status}`,
        );
    }

    const root =
        raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const nested = isPlainObject(root.data) ? root.data : null;

    const pickColumns = (obj: Record<string, unknown>) =>
        Array.isArray(obj.columns)
            ? (obj.columns as unknown[]).filter(
                  (c): c is string => typeof c === "string",
              )
            : [];

    let columns = pickColumns(root);
    if (columns.length === 0 && nested) {
        columns = pickColumns(nested);
    }

    if (columns.length === 0) {
        throw new Error(
            typeof root.message === "string"
                ? root.message
                : "Invalid template response from server",
        );
    }

    return { sheetName: ASSET_BULK_TEMPLATE_SHEET, columns };
}

export async function postAssetsBulkUpload(
    file: File,
): Promise<{ parsed: BulkUploadConsumersParsed; raw: unknown }> {
    const fd = new FormData();
    fd.append("file", file);

    const headers: Record<string, string> = {};
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${BACKEND_URL}/bulk-upload`, {
        method: "POST",
        credentials: "include",
        headers,
        body: fd,
    });

    const raw = await res.json().catch(() => ({}));

    if (!res.ok) {
        const msg =
            raw &&
            typeof raw === "object" &&
            typeof (raw as { message?: string }).message === "string"
                ? (raw as { message: string }).message
                : `HTTP ${res.status}`;
        throw new Error(msg);
    }

    const parsed = parseBulkUploadConsumersResponse(raw, { httpOk: res.ok });
    return { parsed, raw };
}

export default apiClient;
