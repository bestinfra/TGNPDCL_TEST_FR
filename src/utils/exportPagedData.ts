/** Matches backend PaginationService max page size for GET /assets */
const EXPORT_PAGE_SIZE = 100;

const getAuthHeaders = (): Record<string, string> => {
    const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("GMRAccesstoken");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export type PaginatedApiResponse<T> = {
    success?: boolean;
    message?: string;
    data?: T[];
    pagination?: {
        currentPage?: number;
        totalPages?: number;
        totalCount?: number;
        pageSize?: number;
        limit?: number;
        hasNextPage?: boolean;
        hasPrevPage?: boolean;
    };
};

export type FetchAllPaginatedOptions = {
    /** Table footer total — used to keep fetching until all rows are loaded */
    expectedTotalCount?: number;
};

function hasMorePages(
    pagination: PaginatedApiResponse<unknown>["pagination"],
    fetchedCount: number,
    lastPageRowCount: number,
    pageSize: number,
): boolean {
    if (!pagination) {
        return lastPageRowCount >= pageSize;
    }

    const currentPage = Number(pagination.currentPage ?? 1);
    const totalPages = Number(pagination.totalPages ?? 0);
    const totalCount = Number(pagination.totalCount ?? 0);

    if (pagination.hasNextPage === true) return true;
    if (totalPages > 0 && currentPage < totalPages) return true;
    if (totalCount > 0 && fetchedCount < totalCount) return true;

    return lastPageRowCount >= pageSize;
}

/**
 * Fetch every page from a paginated list API for Excel export.
 * Continues until API pagination says done or fetched count reaches totalCount.
 */
export async function fetchAllPaginatedRows<T = Record<string, unknown>>(
    buildUrl: (page: number, pageSize: number) => string,
    options?: FetchAllPaginatedOptions,
): Promise<T[]> {
    const all: T[] = [];
    let page = 1;
    let apiTotalCount =
        options?.expectedTotalCount != null && options.expectedTotalCount > 0
            ? options.expectedTotalCount
            : null;

    while (page <= 10_000) {
        const response = await fetch(buildUrl(page, EXPORT_PAGE_SIZE), {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
        });

        if (!response.ok) {
            throw new Error(`Export fetch failed (HTTP ${response.status})`);
        }

        const data = (await response.json()) as PaginatedApiResponse<T>;
        if (!data?.success) {
            throw new Error(
                (typeof data?.message === "string" && data.message) ||
                    "Export fetch failed",
            );
        }

        const rows: T[] = Array.isArray(data.data) ? data.data : [];
        all.push(...rows);

        const pg = data.pagination;
        if (pg?.totalCount != null && Number(pg.totalCount) >= 0) {
            apiTotalCount = Number(pg.totalCount);
        }

        const fetchedEnough =
            apiTotalCount != null && apiTotalCount > 0 && all.length >= apiTotalCount;

        if (
            rows.length === 0 ||
            fetchedEnough ||
            !hasMorePages(pg, all.length, rows.length, EXPORT_PAGE_SIZE)
        ) {
            break;
        }

        page = Number(pg?.currentPage ?? page) + 1;
    }

    return all;
}

export { EXPORT_PAGE_SIZE };
