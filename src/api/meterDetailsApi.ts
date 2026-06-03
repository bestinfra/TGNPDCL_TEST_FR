import { apiClient } from "./apiUtils";

export type MeterDetailsRecord = {
    meterNumber: string;
    circle?: string;
    division?: string;
    subDivision?: string;
    section?: string;
    substation?: string;
    dtrNumber?: string;
    circleId?: string | number;
    divisionId?: string | number;
    subDivisionId?: string | number;
    sectionId?: string | number;
    substationId?: string | number;
    dtrId?: string | number;
    capacity?: number | null;
    isMapped?: boolean;
    [key: string]: unknown;
};

function extractMeterActionRecord(
    result: unknown,
): Record<string, unknown> | null {
    if (!result || typeof result !== "object") {
        return null;
    }

    const payload = result as Record<string, unknown>;
    const data = payload.data;

    if (data && typeof data === "object" && !Array.isArray(data)) {
        return data as Record<string, unknown>;
    }

    return null;
}

export function normalizeMeterDetailsRecord(
    row: Record<string, unknown>,
): MeterDetailsRecord {
    const dtrNumericId =
        row.dtrId != null &&
        row.dtrId !== "" &&
        typeof row.dtrId !== "string"
            ? row.dtrId
            : row.id != null && row.id !== ""
              ? row.id
              : undefined;

    const dtrDisplayNumber =
        row.dtrNumber != null
            ? String(row.dtrNumber)
            : typeof row.dtrId === "string"
              ? String(row.dtrId)
              : undefined;

    return {
        ...row,
        meterNumber: String(
            row.meterNumber ?? row.meterNo ?? row.meterSerialNo ?? "",
        ),
        circle:
            row.circleName != null
                ? String(row.circleName)
                : row.circle != null
                  ? String(row.circle)
                  : undefined,
        division:
            row.divisionName != null
                ? String(row.divisionName)
                : row.division != null
                  ? String(row.division)
                  : undefined,
        subDivision:
            row.subDivisionName != null
                ? String(row.subDivisionName)
                : row.subDivision != null
                  ? String(row.subDivision)
                  : row.subdivision != null
                    ? String(row.subdivision)
                    : undefined,
        section:
            row.sectionName != null
                ? String(row.sectionName)
                : row.section != null
                  ? String(row.section)
                  : undefined,
        substation:
            row.substationName != null
                ? String(row.substationName)
                : row.substation != null
                  ? String(row.substation)
                  : undefined,
        dtrNumber: dtrDisplayNumber,
        circleId: row.circleId as string | number | undefined,
        divisionId: row.divisionId as string | number | undefined,
        subDivisionId: row.subDivisionId as string | number | undefined,
        sectionId: row.sectionId as string | number | undefined,
        substationId: row.substationId as string | number | undefined,
        dtrId: dtrNumericId as string | number | undefined,
        capacity: (() => {
            if (row.capacity == null || row.capacity === "") return undefined;
            const parsed = Number(row.capacity);
            return Number.isFinite(parsed) ? parsed : undefined;
        })(),
        isMapped:
            typeof row.isMapped === "boolean"
                ? row.isMapped
                : row.isMapped != null
                  ? String(row.isMapped).toLowerCase() === "true"
                  : undefined,
    };
}

/** Meter Action read — GET /meters/details/:meterNumber */
export async function fetchMeterDetailsByNumber(
    meterNumber: string,
): Promise<MeterDetailsRecord | null> {
    const trimmed = meterNumber.trim();
    if (!trimmed) {
        return null;
    }

    const result = await apiClient.get(
        `/meters/details/${encodeURIComponent(trimmed)}`,
    );

    if (result?.success === false) {
        throw new Error(result?.message || "Failed to fetch meter details.");
    }

    const record = extractMeterActionRecord(result);
    if (!record) {
        return null;
    }

    return normalizeMeterDetailsRecord(record);
}

export type UpdateMeterDetailsPayload = {
    meterNumber: string;
    isMapped: boolean;
    circleId?: number;
    divisionId?: number;
    subDivisionId?: number;
    sectionId?: number;
    substationId?: number;
    dtrId?: number;
    capacity?: number;
};

export async function updateMeterDetails(body: UpdateMeterDetailsPayload) {
    return apiClient.put("/meters/details", body);
}
