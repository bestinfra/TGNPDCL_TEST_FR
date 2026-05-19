import * as XLSX from "xlsx";
import { apiClient } from "../api/apiUtils";
import {
    DTR_STATS_DRILL_TABLE_COLUMNS,
    DTR_STATS_ENDPOINT_MAP,
    mapApiRowToDtrStatsTableRow,
} from "./dtrStatsTable";

/** Row shape from Circle-wise table / API (matches dashboard `TableData`). */
export type CircleWiseTableRow = Record<
    string,
    string | number | boolean | null | undefined
>;

export type CircleWiseCircleOption = { value: string; label: string };

/**
 * Column key → backend resource id (same `type` / paths as Circle Card / `DTRTable`).
 * `meter-status` uses the Communication Status chart snapshot URL (comm. % export).
 */
export const columnToTypeMap = {
    totalDTRs: "total-dtrs",
    totalLTFeeders: "total-lt-feeders",
    totalFuseBlown: "total-fuse-blown",
    overloadedDTRs: "overloaded-dtrs",
    underloadedDTRs: "underloaded-dtrs",
    ltSideFuseBlown: "lt-side-fuse-blown",
    unbalancedDTRs: "unbalanced-dtrs",
    powerFailureFeeders: "power-failure-feeders",
    htSideFuseBlown: "ht-side-fuse-blown",
    communicating: "communicating-meters",
    notCommunicating: "non-communicating-meters",
    commPercentage: "meter-status",
} as const;

export type CircleWiseExcelExportColumnKey = keyof typeof columnToTypeMap;

export type CircleWiseExportApiKey =
    (typeof columnToTypeMap)[CircleWiseExcelExportColumnKey];

/** Base paths — keep in sync with `src/utils/dtrStatsTable.ts`. */
export const typeToApiMap: Record<CircleWiseExportApiKey, string> = {
    ...DTR_STATS_ENDPOINT_MAP,
    "communicating-meters": "/dtrs/communicating-meters",
    "non-communicating-meters": "/dtrs/non-communicating-meters",
    "meter-status": "/dtrs/meter-status",
};

/** Federated `Table` columns for circle-wise drill-down (`view=hierarchy` on `/dtr-table`). */
export const hierarchyDetailTableColumns = [...DTR_STATS_DRILL_TABLE_COLUMNS];

/** Normalize list API rows to hierarchy detail column keys (same labels as `hierarchyDetailTableColumns`). */
export function mapRowToHierarchyDetailTableRow(
    raw: Record<string, unknown>,
    sNo: number,
): Record<string, string | number | boolean | null | undefined> {
    return mapApiRowToDtrStatsTableRow(raw, sNo);
}

/** Remote `Table` sets `data-label={column.label}` on each `<td>`. */
export const circleWiseExportColumnLabelToKey: Record<
    string,
    CircleWiseExcelExportColumnKey
> = {
    "Total DTRs": "totalDTRs",
    "Total LT Feeders": "totalLTFeeders",
    "Total Fuse Blown": "totalFuseBlown",
    "Overloaded DTRs": "overloadedDTRs",
    "Underloaded DTRs": "underloadedDTRs",
    "LT Side Fuse Blown": "ltSideFuseBlown",
    "Unbalanced DTRs": "unbalancedDTRs",
    "Power Failure Feeders": "powerFailureFeeders",
    "HT Side Fuse Blown": "htSideFuseBlown",
    Communicating: "communicating",
    "Non-Communicating": "notCommunicating",
    "Comm. %": "commPercentage",
};

const EXPORT_PAGE_SIZE = 50_000;

function hierarchyIdFromRowFields(row: CircleWiseTableRow): string | null {
    const candidates: unknown[] = [
        row.circleId,
        row.circleID,
        row.hierarchyId,
        row.hierarchy_id,
        row.organizationId,
        row.organization_id,
        row.nodeId,
        row.node_id,
        row.areaId,
        row.area_id,
        row.parentId,
        row.parent_id,
        row.circle_id,
        row.id,
    ];
    for (const raw of candidates) {
        if (raw === undefined || raw === null) continue;
        const s = String(raw).trim();
        if (s !== "" && s !== "0") return s;
    }
    return null;
}

/** Resolve drill `hierarchyId` from row fields or Circle name → filter dropdown option value. */
export function resolveHierarchyId(
    row: CircleWiseTableRow,
    circleOptions: CircleWiseCircleOption[],
): string | null {
    const fromRow = hierarchyIdFromRowFields(row);
    if (fromRow) return fromRow;
    const name = String(row.circle ?? "").trim();
    if (!name) return null;
    const opt = circleOptions.find(
        (c) =>
            String(c.label ?? "").trim() === name || String(c.value) === name,
    );
    if (
        opt?.value != null &&
        String(opt.value).trim() !== "" &&
        opt.value !== "all"
    ) {
        return String(opt.value);
    }
    return null;
}

/** `type` query for `/dtr-table` — mirrors dashboard stat cards / `DTRTable`. */
export function getCardTableTypeForCircleWiseColumn(
    columnKey: CircleWiseExcelExportColumnKey,
): string | null {
    if (columnKey === "communicating") return "communicating-meters";
    if (columnKey === "notCommunicating") return "non-communicating-meters";
    if (columnKey === "commPercentage") return null;
    return columnToTypeMap[columnKey] ?? null;
}

export function getCircleWiseMetricTitle(
    columnKey: CircleWiseExcelExportColumnKey,
): string {
    const entry = Object.entries(circleWiseExportColumnLabelToKey).find(
        ([, k]) => k === columnKey,
    );
    return entry?.[0] ?? columnKey;
}

/** Table column `key` on circle-wise rows → export/drill column key. */
export const circleWiseTableColumnKeyToExportKey: Record<
    string,
    CircleWiseExcelExportColumnKey
> = {
    totalDTRs: "totalDTRs",
    totalLTFeeders: "totalLTFeeders",
    totalFuseBlown: "totalFuseBlown",
    overloadedDTRs: "overloadedDTRs",
    underloadedDTRs: "underloadedDTRs",
    ltSideFuseBlown: "ltSideFuseBlown",
    unbalancedDTRs: "unbalancedDTRs",
    powerFailureFeeders: "powerFailureFeeders",
    htSideFuseBlown: "htSideFuseBlown",
    communicating: "communicating",
    notCommunicating: "notCommunicating",
};

/** Shared `/dtr-table` URL builder (dashboard cards + circle-wise numeric cells). */
export function buildDtrTableDrillUrl(options: {
    type: string;
    title: string;
    circle?: string;
    hierarchyId?: string | null;
    lastSelectedId?: string | null;
}): string {
    const params = new URLSearchParams();
    params.set("type", options.type);
    params.set("title", options.title);
    const circleLabel = options.circle?.trim();
    if (circleLabel) params.set("circle", circleLabel);
    const hid =
        options.hierarchyId?.toString().trim() ||
        options.lastSelectedId?.toString().trim();
    if (hid) params.set("hierarchyId", hid);
    return `/dtr-table?${params.toString()}`;
}

/**
 * Circle-wise numeric cell → same drill-down table as dashboard stat cards.
 * Example: `/dtr-table?type=total-dtrs&title=Total+DTRs&circle=Hanumakonda&hierarchyId=…`
 */
export function buildCircleWiseStatDrillUrl(
    columnKey: CircleWiseExcelExportColumnKey,
    row: CircleWiseTableRow,
    circleOptions: CircleWiseCircleOption[],
    lastSelectedId?: string | null,
): string | null {
    const cardType = getCardTableTypeForCircleWiseColumn(columnKey);
    if (!cardType) return null;

    const circleLabel = String(row.circle ?? "").trim();
    const hierarchyId = resolveHierarchyId(row, circleOptions);

    return buildDtrTableDrillUrl({
        type: cardType,
        title: getCircleWiseMetricTitle(columnKey),
        circle: circleLabel || undefined,
        hierarchyId,
        lastSelectedId: hierarchyId ? null : lastSelectedId,
    });
}

/** @deprecated Use `buildCircleWiseStatDrillUrl` */
export function buildCircleWiseDrillTableUrl(
    columnKey: CircleWiseExcelExportColumnKey | "circle",
    row: CircleWiseTableRow,
    circleOptions: CircleWiseCircleOption[],
    lastSelectedId?: string | null,
): string | null {
    if (columnKey === "circle") {
        return buildCircleWiseStatDrillUrl(
            "totalDTRs",
            row,
            circleOptions,
            lastSelectedId,
        );
    }
    return buildCircleWiseStatDrillUrl(
        columnKey,
        row,
        circleOptions,
        lastSelectedId,
    );
}

export function isNumericCell(cellValue: unknown): boolean {
    if (cellValue === undefined || cellValue === null || cellValue === "")
        return false;
    if (typeof cellValue === "number") return Number.isFinite(cellValue);
    if (typeof cellValue !== "string") return false;
    const t = cellValue.trim().toUpperCase();
    if (t === "NA" || t === "N/A" || t === "-") return false;
    const normalized = t.replace(/,/g, "").replace(/\s+/g, "");
    if (normalized === "") return false;
    return !Number.isNaN(Number(normalized));
}

export function sanitizeFilename(value: string): string {
    const t = value.replace(/[^\w.-]+/g, "_").replace(/_+/g, "_");
    return (t.length > 0 ? t : "export").slice(0, 80);
}

/** Normalize `response.data` for `XLSX.utils.json_to_sheet` (object keys → column headers). */
export function normalizeRows(data: unknown): Record<string, unknown>[] {
    if (Array.isArray(data)) {
        return data.filter(
            (row): row is Record<string, unknown> =>
                row !== null && typeof row === "object" && !Array.isArray(row),
        ) as Record<string, unknown>[];
    }
    if (data !== null && typeof data === "object" && !Array.isArray(data)) {
        return [data as Record<string, unknown>];
    }
    return [];
}

/** Build `.xlsx` from row objects and trigger browser download (same as prior `exportRowsToExcel`). */
export function exportToExcel(
    rows: Record<string, unknown>[],
    fileBase: string,
): void {
    console.log("[Circle-wise export] exportToExcel", {
        rowCount: rows.length,
        fileBase,
    });
    try {
        const wb = XLSX.utils.book_new();
        const sheetRows =
            rows.length > 0 ? rows : [{ message: "No records" }];
        const ws = XLSX.utils.json_to_sheet(sheetRows);
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        const buf = XLSX.write(wb, {
            bookType: "xlsx",
            type: "array",
        });
        const blob = new Blob([buf as BlobPart], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        console.log("[Circle-wise export] workbook written", {
            byteLength:
                buf instanceof ArrayBuffer
                    ? buf.byteLength
                    : (buf as Uint8Array).byteLength,
        });
        const filename = `${sanitizeFilename(fileBase)}.xlsx`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.rel = "noopener";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log(
            "[Circle-wise export] download trigger finished",
            filename,
        );
    } catch (err) {
        console.error("[Circle-wise export] exportToExcel failed", err);
        throw err;
    }
}

/**
 * Fetch rows for one export: DTR list endpoints (page + pageSize + hierarchyId)
 * or meter-status snapshot (?hierarchyId= only), same URLs and params as before.
 */
export async function fetchExportData(
    columnKey: CircleWiseExcelExportColumnKey,
    hierarchyId: string,
): Promise<Record<string, unknown>[]> {
    const apiKey = columnToTypeMap[columnKey];
    const path = typeToApiMap[apiKey];

    if (apiKey === "meter-status") {
        const res = await apiClient.get(
            `${path}?hierarchyId=${encodeURIComponent(hierarchyId)}`,
        );
        if (!res?.success) {
            throw new Error(
                typeof res?.message === "string"
                    ? res.message
                    : "Failed to load meter status",
            );
        }
        return normalizeRows(res.data);
    }

    const params = new URLSearchParams({
        page: "1",
        pageSize: String(EXPORT_PAGE_SIZE),
        hierarchyId,
    });
    const res = await apiClient.get(`${path}?${params.toString()}`);
    if (!res?.success) {
        throw new Error(
            typeof res?.message === "string"
                ? res.message
                : "Failed to load details",
        );
    }
    const rows = normalizeRows(res.data);
    console.log("[Circle-wise export] API success (same as DTRTable)", {
        cardTableType: apiKey,
        rawDataType: Array.isArray(res.data) ? "array" : typeof res.data,
        normalizedRowCount: rows.length,
    });
    return rows;
}

/**
 * Fetch + filename + download. Caller should enforce lock / pre-resolve `hierarchyId`
 * (same as prior `handleCircleWiseExcelExport` + dashboard guard).
 */
export async function handleCircleWiseExport(params: {
    row: CircleWiseTableRow;
    columnKey: CircleWiseExcelExportColumnKey;
    hierarchyId: string;
}): Promise<void> {
    const { row, columnKey, hierarchyId } = params;
    const rowsOut = await fetchExportData(columnKey, hierarchyId);
    const circleLabel = sanitizeFilename(String(row.circle ?? "circle"));
    const fileBase = `${circleLabel}_${columnKey}`;
    console.log("[Circle-wise export] calling exportToExcel", {
        fileBase,
        rowsOut: rowsOut.length,
    });
    exportToExcel(rowsOut, fileBase);
}
