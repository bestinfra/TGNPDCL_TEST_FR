/**
 * Shared drill-down table config for DTR dashboard stat cards → `/dtr-table`.
 * URL `type` (e.g. total-lt-feeders) is NOT appended to the API path.
 */

export const DTR_STATS_DRILL_TYPES = [
    "total-dtrs",
    "total-lt-feeders",
    "total-fuse-blown",
    "overloaded-dtrs",
    "underloaded-dtrs",
    "lt-side-fuse-blown",
    "unbalanced-dtrs",
    "power-failure-feeders",
    "ht-side-fuse-blown",
] as const;

export type DtrStatsDrillType = (typeof DTR_STATS_DRILL_TYPES)[number];

/** Backward-compatible `type` query values from older URLs / circle-wise export. */
export const LEGACY_DTR_STATS_TYPE_ALIASES: Record<string, DtrStatsDrillType> = {
    "fuse-blown": "total-fuse-blown",
    "overloaded-feeders": "overloaded-dtrs",
    "underloaded-feeders": "underloaded-dtrs",
    "lt-fuse-blown": "lt-side-fuse-blown",
    "ht-fuse-blown": "ht-side-fuse-blown",
};

/**
 * Card `type` query param → backend list path (under `/api`).
 * Paths are verified against the running API — never `/dtrs/{type}`.
 */
export const DTR_STATS_ENDPOINT_MAP: Record<DtrStatsDrillType, string> = {
    "total-dtrs": "/dtrs",
    /** `/dtrs/lt-feeders` → 404; backend exposes `/dtrs/all-meters`. */
    "total-lt-feeders": "/dtrs/all-meters",
    /** `/dtrs/fuse-blown` → 404; backend exposes `/dtrs/fuse-blown-meters`. */
    "total-fuse-blown": "/dtrs/fuse-blown-meters",
    "overloaded-dtrs": "/dtrs/overloaded-dtrs",
    "underloaded-dtrs": "/dtrs/underloaded-dtrs",
    "lt-side-fuse-blown": "/dtrs/lt-fuse-blown",
    "unbalanced-dtrs": "/dtrs/unbalanced-dtrs",
    "power-failure-feeders": "/dtrs/power-failure-feeders",
    "ht-side-fuse-blown": "/dtrs/ht-fuse-blown",
};

/** @deprecated Use `DTR_STATS_ENDPOINT_MAP` */
export const DTR_STATS_TYPE_TO_API_PATH = DTR_STATS_ENDPOINT_MAP;

export const DTR_STATS_DRILL_TABLE_COLUMNS = [
    { key: "sNo", label: "S.No" },
    { key: "discom", label: "DISCOM" },
    { key: "circle", label: "Circle" },
    { key: "division", label: "Division" },
    { key: "subDivision", label: "Sub-Division" },
    { key: "section", label: "Section" },
    { key: "substation", label: "Substation" },
    { key: "feeder", label: "Feeder" },
    { key: "dtrLocation", label: "DTR Location" },
    { key: "dtrNumber", label: "DTR Number" },
    { key: "meterNumber", label: "Meter Number" },
    { key: "capacityKva", label: "Capacity (kVA)" },
    {
        key: "communicationStatus",
        label: "Communication Status",
        statusIndicator: {},
        isActive: (value: string | number | boolean | null | undefined) =>
            String(value).toLowerCase() === "active" ||
            String(value).toLowerCase() === "communicating",
    },
    { key: "lastCommunicationDate", label: "Last Communication Date" },
    { key: "fuseType", label: "Fuse Type" },
    { key: "blownTime", label: "Blown Time" },
    { key: "status", label: "Status" },
] as const;

function pickField(
    raw: Record<string, unknown>,
    ...keys: string[]
): string | number | boolean | null | undefined {
    for (const k of keys) {
        const v = raw[k];
        if (v === undefined || v === null) continue;
        const s = String(v).trim();
        if (s === "" || s.toLowerCase() === "na" || s.toLowerCase() === "n/a") {
            continue;
        }
        return v as string | number | boolean;
    }
    return "";
}

export function normalizeDtrStatsCardType(
    type: string | null | undefined,
): string {
    const normalized = (type ?? "").toLowerCase().trim();
    if (!normalized) return "";
    return LEGACY_DTR_STATS_TYPE_ALIASES[normalized] ?? normalized;
}

export function isDtrStatsDrillType(type: string | null | undefined): boolean {
    const normalized = normalizeDtrStatsCardType(type);
    return (DTR_STATS_DRILL_TYPES as readonly string[]).includes(normalized);
}

/** Resolve backend path for a card `type` (logs type + endpoint for debugging). */
export function resolveDtrStatsEndpoint(
    type: string | null | undefined,
): string | null {
    const normalized = normalizeDtrStatsCardType(type);
    if (!isDtrStatsDrillType(normalized)) return null;
    const endpoint =
        DTR_STATS_ENDPOINT_MAP[normalized as DtrStatsDrillType];
    console.log("[DTR stats drill] type", normalized);
    console.log("[DTR stats drill] endpoint", endpoint);
    return endpoint;
}

export function buildDtrStatsListApiUrl(
    backendUrl: string,
    cardType: string,
    page: number,
    pageSize: number,
    search?: string,
    hierarchyId?: string | null,
): string | null {
    const path = resolveDtrStatsEndpoint(cardType);
    if (!path) return null;

    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("pageSize", String(pageSize));
    if (search) params.append("search", search);
    if (hierarchyId) params.append("hierarchyId", hierarchyId);

    const url = `${backendUrl}${path}?${params.toString()}`;
    console.log("[DTR stats drill] full URL", url);
    return url;
}

/** Map list API rows to unified drill-down columns (preserves numeric `id` for navigation). */
export function mapApiRowToDtrStatsTableRow(
    raw: Record<string, unknown>,
    sNo: number,
): Record<string, string | number | boolean | null | undefined> {
    return {
        sNo,
        id: pickField(raw, "id", "dtrDbId"),
        discom: pickField(raw, "discom", "discomName", "DISCOM") || "TGNPDCL",
        circle: pickField(raw, "circle", "circleName", "Circle"),
        division: pickField(raw, "division", "divisionName", "Division"),
        subDivision: pickField(
            raw,
            "subDivision",
            "sub_division",
            "subDivisionName",
            "Sub-Division",
        ),
        section: pickField(raw, "section", "sectionName", "Section"),
        substation: pickField(
            raw,
            "substation",
            "substationName",
            "Substation",
        ),
        feeder: pickField(
            raw,
            "feeder",
            "feederName",
            "feederNo",
            "Feeder",
        ),
        dtrLocation: pickField(
            raw,
            "dtrLocation",
            "location",
            "dtrName",
            "meterlocation",
            "DTR Location",
        ),
        dtrNumber: pickField(
            raw,
            "dtrNumber",
            "dtrNo",
            "dtrId",
            "dtr_id",
            "DTR Number",
        ),
        meterNumber: pickField(
            raw,
            "meterNumber",
            "meterNo",
            "meter_number",
            "Meter Number",
        ),
        capacityKva: pickField(
            raw,
            "capacityKva",
            "capacity",
            "capacity_kva",
            "kva",
            "Capacity (kVA)",
        ),
        communicationStatus: pickField(
            raw,
            "communicationStatus",
            "commStatus",
            "comm_status",
            "Communication Status",
        ),
        lastCommunicationDate: pickField(
            raw,
            "lastCommunicationDate",
            "lastCommunication",
            "lastReadingDate",
            "last_communication_date",
            "Last Communication Date",
        ),
        fuseType: pickField(raw, "fuseType", "fuse_type", "Fuse Type"),
        blownTime: pickField(
            raw,
            "blownTime",
            "blown_time",
            "failureTime",
            "tamperDatetime",
            "occuredOn",
            "Blown Time",
        ),
        status: pickField(
            raw,
            "loadStatus",
            "tamperStatus",
            "alertStatus",
            "fuseStatus",
            "Status",
        ),
    };
}

export function mapDtrStatsTableRows(
    rows: Record<string, unknown>[],
    page: number,
    pageSize: number,
): Record<string, string | number | boolean | null | undefined>[] {
    return rows.map((raw, idx) =>
        mapApiRowToDtrStatsTableRow(raw, (page - 1) * pageSize + idx + 1),
    );
}

/** Feeder/meter label from GET /dtrs/:id `feeders[]` (Karimnagar / fuse-blown flow). */
export function pickFeederMeterDisplay(
    feeder: Record<string, unknown>,
): string {
    const value = pickField(
        feeder,
        "meterNumber",
        "meterNo",
        "meter_number",
        "Meter Number",
        "serialNumber",
        "serial_number",
        "Serial Number",
    );
    return typeof value === "string" ? value : String(value ?? "").trim();
}

/** DTR Detail → DTR Feeders table row (single standard mapper for all entry paths). */
export function mapDtrApiFeederToFeedersTableRow(
    feeder: Record<string, unknown>,
    index: number,
) {
    const feederName = pickFeederMeterDisplay(feeder);
    const meterNumber = pickField(
        feeder,
        "meterNumber",
        "meterNo",
        "meter_number",
    );
    const serialNumber = pickField(feeder, "serialNumber", "serial_number");
    const rawFeederId = pickField(feeder, "feederId", "id", "meterId");
    const feederId =
        rawFeederId !== "" && Number.isFinite(Number(rawFeederId))
            ? Number(rawFeederId)
            : undefined;
    const location = feeder.location;
    const status = pickField(feeder, "status", "loadStatus", "condition");

    return {
        sNo: index + 1,
        feederName,
        meterNumber: meterNumber ? String(meterNumber) : undefined,
        serialNumber: serialNumber ? String(serialNumber) : undefined,
        feederId,
        loadStatus: status ? String(status) : "",
        condition: status ? String(status) : "",
        capacity: "",
        address:
            (typeof location === "string"
                ? location
                : (location as { name?: string } | null)?.name) ||
            pickField(feeder, "city") ||
            "",
    };
}

/** Route param for `/dtr-detail/:dtrId` — DB id preferred, else DTR number string. */
export function resolveDtrDetailRouteParam(
    row: Record<string, unknown> | null | undefined,
): string | null {
    if (!row) return null;
    const dbId = pickField(row, "id", "dtrDbId", "dtr_id");
    if (dbId !== "") return String(dbId);
    const dtrNumber = pickField(
        row,
        "dtrNumber",
        "dtrId",
        "dtrNo",
        "dtr_id",
        "DTR Number",
    );
    if (dtrNumber !== "") return String(dtrNumber);
    return null;
}
