/** Row shape for navigating to `/dtr-detail/:id` (numeric database id). */
export type DtrNavRow = Record<
    string,
    string | number | boolean | null | undefined
>;

/** Numeric DB primary key from list/search/detail row. */
export function resolveDtrDbId(
    row: DtrNavRow | null | undefined,
): string | null {
    if (!row) return null;
    const id = row.id;
    if (id === undefined || id === null || String(id).trim() === "") {
        return null;
    }
    return String(id);
}

export function navigateToDtrDetail(
    navigate: (path: string) => void,
    row: DtrNavRow,
    context = "DTR detail",
): boolean {
    console.log("Selected DTR Row:", row);
    const dbId = resolveDtrDbId(row);
    if (!dbId) {
        console.error("Missing DTR ID", row, context);
        return false;
    }
    console.log("Navigating with ID:", dbId);
    navigate(`/dtr-detail/${dbId}`);
    return true;
}

/** Route param is numeric DB id (stored in `:dtrId` param name). */
export function resolveDtrDetailRouteId(
    routeParam: string | undefined,
): string | null {
    const trimmed = routeParam?.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) {
        return null;
    }
    return trimmed;
}
