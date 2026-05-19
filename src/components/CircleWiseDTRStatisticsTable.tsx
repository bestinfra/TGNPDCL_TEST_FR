import React, {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { apiClient } from "@/api/apiUtils";

const Table = lazy(() => import("SuperAdmin/Table"));

interface TableData {
    [key: string]: string | number | boolean | null | undefined;
}

export interface CircleWiseStatRow {
    sNo: number;
    circle: string;
    totalDTRs: number;
    totalLTFeeders: number;
    totalFuseBlown: number;
    overloadedDTRs: number;
    underloadedDTRs: number;
    ltSideFuseBlown: number;
    unbalancedDTRs: number;
    powerFailureFeeders: number;
    htSideFuseBlown: number;
    communicating: number;
    notCommunicating: number;
    commPercentage: string;
}

/** Column definitions passed to federated Table — mirrors prior Circle-wise / dashboard labels. */
const TABLE_COLUMNS = [
    { key: "sNo", label: "S.No", align: "center" as const },
    { key: "circle", label: "Circle" },
    { key: "totalDTRs", label: "Total DTRs", align: "center" as const },
    { key: "totalLTFeeders", label: "Total LT Feeders", align: "center" as const },
    { key: "totalFuseBlown", label: "Total Fuse Blown", align: "center" as const },
    { key: "overloadedDTRs", label: "Overloaded DTRs", align: "center" as const },
    {
        key: "underloadedDTRs",
        label: "Underloaded DTRs",
        align: "center" as const,
    },
    {
        key: "ltSideFuseBlown",
        label: "LT Side Fuse Blown",
        align: "center" as const,
    },
    { key: "unbalancedDTRs", label: "Unbalanced DTRs", align: "center" as const },
    {
        key: "powerFailureFeeders",
        label: "Power Failure Feeders",
        align: "center" as const,
    },
    {
        key: "htSideFuseBlown",
        label: "HT Side Fuse Blown",
        align: "center" as const,
    },
    { key: "communicating", label: "Communicating", align: "center" as const },
    {
        key: "notCommunicating",
        label: "Non-Communicating",
        align: "center" as const,
    },
    { key: "commPercentage", label: "Comm. %", align: "center" as const },
];

function mapApiRow(raw: Record<string, unknown>): CircleWiseStatRow {
    const int = (v: unknown): number => {
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (v === undefined || v === null || v === "") return 0;
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };
    return {
        sNo: int(raw.sNo),
        circle: raw.circle == null ? "" : String(raw.circle).trim(),
        totalDTRs: int(raw.totalDTRs),
        totalLTFeeders: int(raw.totalLTFeeders),
        totalFuseBlown: int(raw.totalFuseBlown),
        overloadedDTRs: int(raw.overloadedDTRs),
        underloadedDTRs: int(raw.underloadedDTRs),
        ltSideFuseBlown: int(raw.ltSideFuseBlown),
        unbalancedDTRs: int(raw.unbalancedDTRs),
        powerFailureFeeders: int(raw.powerFailureFeeders),
        htSideFuseBlown: int(raw.htSideFuseBlown),
        communicating: int(raw.communicating),
        notCommunicating: int(raw.notCommunicating),
        commPercentage:
            raw.commPercentage != null && String(raw.commPercentage) !== ""
                ? String(raw.commPercentage)
                : "0.00",
    };
}

export interface CircleWiseDTRStatisticsTableProps {
    className?: string;
}

const CircleWiseDTRStatisticsTable: React.FC<
    CircleWiseDTRStatisticsTableProps
> = ({ className = "" }) => {
    const [rows, setRows] = useState<CircleWiseStatRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            const q = debouncedSearch.trim();
            if (q) params.set("search", q);

            const data = (await apiClient.get(
                `/dtrs/circle-wise-stats?${params.toString()}`,
            )) as {
                success?: boolean;
                message?: string;
                data?: unknown[];
                pagination?: Record<string, unknown>;
            };
            if (!data?.success) {
                throw new Error(
                    data?.message ||
                        "Failed to fetch Circle-wise DTR Statistics",
                );
            }
            const rawRows = Array.isArray(data.data) ? data.data : [];
            setRows(
                rawRows.map((r: unknown) =>
                    mapApiRow(r as Record<string, unknown>),
                ),
            );
        } catch (e) {
            setRows([]);
            setError(
                e instanceof Error ? e.message : "Failed to load statistics.",
            );
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const id = window.setTimeout(() => {
            const next = searchInput.trim();
            setDebouncedSearch(next);
        }, 350);
        return () => window.clearTimeout(id);
    }, [searchInput]);

    const tableData: TableData[] = useMemo(
        () => rows as unknown as TableData[],
        [rows],
    );

    const handleSearch = useCallback((value: string) => {
        setSearchInput(value ?? "");
    }, []);

    return (
        <div className={`w-full min-w-0 ${className}`.trim()}>
            {error ? (
                <p className="mb-2 font-manrope text-sm text-red-600 dark:text-red-400">
                    {error}
                </p>
            ) : null}
            <Suspense
                fallback={
                    <div className="flex min-h-[200px] items-center justify-center p-8 font-manrope text-secondary dark:text-subinfo">
                        Loading...
                    </div>
                }
            >
                <Table
                    data={tableData}
                    columns={TABLE_COLUMNS}
                    showHeader={true}
                    headerTitle="Circle-wise DTR Statistics"
                    searchable={true}
                    sortable={true}
                    pagination={false}
                    showPagination={false}
                    loading={loading}
                    emptyMessage="No data found"
                    showActions={false}
                    availableTimeRanges={[]}
                    onSearch={handleSearch}
                    enableHorizontalScroll={true}
                    searchPlaceholder="Search by Circle..."
                    className="min-w-0 w-full"
                />
            </Suspense>
        </div>
    );
};

export default CircleWiseDTRStatisticsTable;
