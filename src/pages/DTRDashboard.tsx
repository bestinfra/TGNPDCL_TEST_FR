import { lazy } from "react";
import React, {
    useState,
    useEffect,
    useLayoutEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
interface TableData {
    [key: string]: string | number | boolean | null | undefined;
}
import { useNavigate } from "react-router-dom";
const Page = lazy(() => import("SuperAdmin/Page"));
import { exportChartData } from "../utils/excelExport";
import { apiClient } from "../api/apiUtils";
import {
    buildCircleWiseStatDrillUrl,
    buildDtrTableDrillUrl,
    circleWiseExportColumnLabelToKey,
    isNumericCell,
    type CircleWiseExcelExportColumnKey,
} from "../utils/circleWiseExport";
import { resolveDtrDetailRouteParam } from "../utils/dtrStatsTable";
import { useHierarchyFilters } from "../context/HierarchyFilterContext";
import {
    computeLastSelectedId,
    hasActiveHierarchyFilters,
    rebuildCascadeFilterOptions,
    type HierarchyFilterValues,
} from "../utils/hierarchyFilters";
import { io, Socket } from "socket.io-client";
import "./DTRDashboard.circleWiseTable.css";
import { applyCircleWiseTotalsRowHighlight } from "../utils/circleWiseTableHighlight";

/** Stat from `/dtrs/stats` row1; use `??` semantics so `0` is not replaced by a fallback. */
function pickStat(
    stats: Record<string, unknown> | null | undefined,
    key: string,
    fallback: string | number = 0,
): string | number {
    if (stats == null || typeof stats !== "object") return fallback;
    if (
        Object.prototype.hasOwnProperty.call(stats, key) &&
        stats[key] !== undefined &&
        stats[key] !== null
    ) {
        return stats[key] as string | number;
    }
    const row1 = stats.row1 as Record<string, unknown> | undefined;
    if (
        row1 &&
        typeof row1 === "object" &&
        row1[key] !== undefined &&
        row1[key] !== null
    ) {
        return row1[key] as string | number;
    }
    return fallback;
}

/** Pass through API row fields; `sNo` is derived for circle rows only (totals row has no S.No). */
function mapCircleWiseRowToTableData(
    row: Record<string, unknown>,
    sNo?: number,
): TableData {
    if (row.isTotal === true) {
        return {
            ...(row as TableData),
            sNo: null,
            isTotal: true,
        };
    }
    const resolvedSNo =
        sNo ??
        (typeof row.sNo === "number" && Number.isFinite(row.sNo)
            ? row.sNo
            : undefined);
    return {
        ...(row as TableData),
        sNo: resolvedSNo ?? 0,
    };
}

const emptyDtrStatsData = {
    totalDtrs: "0",
    totalLtFeeders: "0",
    totalFuseBlown: "0",
    fuseBlownPercentage: "0",
    overloadedFeeders: "0",
    overloadedPercentage: "0",
    underloadedFeeders: "0",
    underloadedPercentage: "0",
    ltSideFuseBlown: "0",
    unbalancedDtrs: "0",
    unbalancedPercentage: "0",
    powerFailureFeeders: "0",
    powerFailurePercentage: "0",
    htSideFuseBlown: "0",
};

const emptyFilterOptions = {
    discoms: [{ value: "all", label: "All DISCOMs" }],
    circles: [{ value: "all", label: "All Circles" }],
    divisions: [{ value: "all", label: "All Divisions" }],
    subDivisions: [{ value: "all", label: "All Sub-Divisions" }],
    sections: [{ value: "all", label: "All Sections" }],
    substations: [{ value: "all", label: "All Substations" }],
};

const emptyDtrConsumptionData = {
    daily: {
        totalKwh: "0",
        totalKvah: "0",
        totalKvarh: "0",
        totalKw: "0",
        totalKva: "0",
        totalKvar: "0",
    },
    monthly: {
        totalKwh: "0",
        totalKvah: "0",
        totalKvarh: "0",
        totalKw: "0",
        totalKva: "0",
        totalKvar: "0",
    },
    currentDay: {
        totalKwh: "0",
        totalKvah: "0",
        totalKvarh: "0",
        totalKw: "0",
        totalKva: "0",
        totalKvar: "0",
        latestKwTimestamp: null,
        latestKvaTimestamp: null,
    },
};

/** Reuse in-flight dashboard init across React StrictMode remount (same page load). */
let dtrDashboardInitPromise: Promise<void> | null = null;

// Utility function to format timestamp
const formatTimestamp = (timestamp: string | null | undefined): string => {
    if (!timestamp) return "No data available";

    try {
        // Parse the ISO string and format it to show the time as it appears in the string
        const date = new Date(timestamp);

        // Extract date components
        const day = date.getUTCDate().toString().padStart(2, "0");
        const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
        const year = date.getUTCFullYear();
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes().toString().padStart(2, "0");

        // Format time in 12-hour format
        const ampm = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;

        return `${day}/${month}/${year}, ${displayHours}:${minutes} ${ampm}`;
    } catch (error) {
        return "Invalid timestamp";
    }
};

const DTRDashboard: React.FC = () => {
    const navigate = useNavigate();
    const {
        filterValues,
        setFilterValues,
        lastSelectedId,
        filtersApplied,
        applyFilters,
        resetHierarchyFilters,
    } = useHierarchyFilters();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isSocketConnected, setIsSocketConnected] = useState(false);

    const [selectedTimeRange, setSelectedTimeRange] = useState<
        "Daily" | "Monthly"
    >("Daily");

    const [selectedChartTimeRange, setSelectedChartTimeRange] = useState<
        "Daily" | "Weekly" | "Monthly"
    >("Daily");

    const [filterOptions, setFilterOptions] = useState(emptyFilterOptions);
    const [originalApiData, setOriginalApiData] = useState<any[]>([]);
    const [dtrStatsData, setDtrStatsData] = useState<any>(emptyDtrStatsData);
    const [dtrConsumptionData, setDtrConsumptionData] = useState<{
        daily: {
            totalKwh: string | number;
            totalKvah: string | number;
            totalKvarh: string | number;
            totalKw: string | number;
            totalKva: string | number;
            totalKvar: string | number;
        };
        monthly: {
            totalKwh: string | number;
            totalKvah: string | number;
            totalKvarh: string | number;
            totalKw: string | number;
            totalKva: string | number;
            totalKvar: string | number;
        };
        currentDay?: {
            totalKwh: string | number;
            totalKvah: string | number;
            totalKvarh: string | number;
            totalKw: string | number;
            totalKva: string | number;
            totalKvar: string | number;
            latestKwTimestamp?: string | null;
            latestKvaTimestamp?: string | null;
        };
    }>(emptyDtrConsumptionData);
    const [dtrTableData, setDtrTableData] = useState<TableData[]>([]);
    const [dtrMapData, setDtrMapData] = useState<TableData[]>([]);

    const [alertsData, setAlertsData] = useState<any[]>([]);

    const [serverPagination, setServerPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10,
        hasNextPage: false,
        hasPrevPage: false,
    });
    const [circleWiseTableData, setCircleWiseTableData] = useState<TableData[]>(
        [],
    );
    const [isCircleWiseTableLoading, setIsCircleWiseTableLoading] =
        useState(true);
    const [dtrTableSearch, setDtrTableSearch] = useState("");



    const [chartMonths, setChartMonths] = useState<string[]>([]);
    const [chartSeries, setChartSeries] = useState<
        { name: string; data: number[] }[]
    >([]);
    const alertColors = [
        "#163b7c",
        "#ed8c22",
        "#55b56c",
        "#9467bd",
        "#dc272c",
        "#8c564b",
        "#e377c2",
        "#7f7f7f",
        "#bcbd22",
        "#17becf",
    ];
    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [isTableLoading, setIsTableLoading] = useState(true);
    const [isAlertsLoading, setIsAlertsLoading] = useState(true);
    const [isChartLoading, setIsChartLoading] = useState(true);
    const [isFiltersLoading, setIsFiltersLoading] = useState(true);
    const [isMeterStatusLoading, setIsMeterStatusLoading] = useState(true);
    const [meterStatus, setMeterStatus] = useState<any>(null);
    const [failedApis, setFailedApis] = useState<
        Array<{
            id: string;
            name: string;
            retryFunction: (lastSelectedId?: string) => Promise<void>;
            errorMessage: string;
        }>
    >([]);

    const hierarchyLevels = [
        { filterName: "discom", levelName: "DISCOM", optionKey: "discoms", allLabel: "All DISCOMs" },
        { filterName: "circle", levelName: "Circle", optionKey: "circles", allLabel: "All Circles" },
        { filterName: "division", levelName: "Division", optionKey: "divisions", allLabel: "All Divisions" },
        { filterName: "subDivision", levelName: "Sub division", optionKey: "subDivisions", allLabel: "All Sub-Divisions" },
        { filterName: "section", levelName: "Section", optionKey: "sections", allLabel: "All Sections" },
        { filterName: "substation", levelName: "Substation", optionKey: "substations", allLabel: "All Substations" },
    ] as const;

    const getStoredUser = () => {
        try {
            const user = localStorage.getItem("user");
            return user ? JSON.parse(user) : null;
        } catch {
            return null;
        }
    };

    // Map-related state
    const [mapCenter, setMapCenter] = useState({
        lat: 17.992887,
        lng: 79.550835,
    });
    const [mapZoom, setMapZoom] = useState(13);

    const buildDtrTableUrl = (type: string, title: string) =>
        buildDtrTableDrillUrl({
            type,
            title,
            lastSelectedId,
            filterValues,
        });

    // Function to calculate map center and zoom based on DTR locations
    const calculateMapCenterAndZoom = (dtrData: any[]) => {
        const validLocations = dtrData.filter((dtr) => {
            // Check direct coordinates
            const lat =
                dtr.latitude ||
                dtr.lat ||
                dtr.lat_coordinate ||
                dtr.latitude_coordinate;
            const lng =
                dtr.longitude ||
                dtr.lng ||
                dtr.lng_coordinate ||
                dtr.longitude_coordinate;

            // Also check meterlocation string format
            const meterlocationCoords = parseCoordinates(dtr.meterlocation);

            return (
                (lat && lng && lat !== 0 && lng !== 0) || meterlocationCoords
            );
        });

        if (validLocations.length === 0) {
            return { center: { lat: 17.992887, lng: 79.550835 }, zoom: 13 };
        }

        if (validLocations.length === 1) {
            // Try direct coordinates first
            let lat =
                validLocations[0].latitude ||
                validLocations[0].lat ||
                validLocations[0].lat_coordinate ||
                validLocations[0].latitude_coordinate;
            let lng =
                validLocations[0].longitude ||
                validLocations[0].lng ||
                validLocations[0].lng_coordinate ||
                validLocations[0].longitude_coordinate;

            // If no direct coordinates, try parsing meterlocation
            if (!lat || !lng || lat === 0 || lng === 0) {
                const meterlocationCoords = parseCoordinates(
                    validLocations[0].meterlocation,
                );
                if (meterlocationCoords) {
                    lat = meterlocationCoords.lat;
                    lng = meterlocationCoords.lng;
                }
            }

            return {
                center: { lat: lat, lng: lng },
                zoom: 15,
            };
        }

        // Calculate bounds for multiple locations
        const lats = validLocations.map((dtr) => {
            // Try direct coordinates first
            let lat =
                dtr.latitude ||
                dtr.lat ||
                dtr.lat_coordinate ||
                dtr.latitude_coordinate;
            let lng =
                dtr.longitude ||
                dtr.lng ||
                dtr.lng_coordinate ||
                dtr.longitude_coordinate;

            // If no direct coordinates, try parsing meterlocation
            if (!lat || !lng || lat === 0 || lng === 0) {
                const meterlocationCoords = parseCoordinates(dtr.meterlocation);
                if (meterlocationCoords) {
                    lat = meterlocationCoords.lat;
                }
            }

            return lat;
        });

        const lngs = validLocations.map((dtr) => {
            // Try direct coordinates first
            let lat =
                dtr.latitude ||
                dtr.lat ||
                dtr.lat_coordinate ||
                dtr.latitude_coordinate;
            let lng =
                dtr.longitude ||
                dtr.lng ||
                dtr.lng_coordinate ||
                dtr.longitude_coordinate;

            // If no direct coordinates, try parsing meterlocation
            if (!lat || !lng || lat === 0 || lng === 0) {
                const meterlocationCoords = parseCoordinates(dtr.meterlocation);
                if (meterlocationCoords) {
                    lng = meterlocationCoords.lng;
                }
            }

            return lng;
        });

        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;

        // Calculate zoom based on the span of coordinates
        const latSpan = maxLat - minLat;
        const lngSpan = maxLng - minLng;
        const maxSpan = Math.max(latSpan, lngSpan);

        let zoom = 13;
        if (maxSpan > 0.1) zoom = 10;
        else if (maxSpan > 0.05) zoom = 11;
        else if (maxSpan > 0.01) zoom = 12;
        else if (maxSpan > 0.005) zoom = 14;
        else if (maxSpan > 0.001) zoom = 15;

        return { center: { lat: centerLat, lng: centerLng }, zoom };
    };

    // Function to parse coordinates from meterlocation string
    const parseCoordinates = (meterlocation: string) => {
        if (!meterlocation || typeof meterlocation !== "string") return null;

        // Handle format: "17.9964, 79.5336" (lat, lng)
        const parts = meterlocation.split(",").map((part) => part.trim());
        if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
                return { lat, lng };
            }
        }
        return null;
    };

    const getMarkerIcon = (status: unknown) => {
        const normalized = String(status || "normal")
            .trim()
            .toLowerCase();
        if (normalized === "overload") {
            return "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
        }
        if (normalized === "active") {
            return "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
        }
        return "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
    };

    // Function to generate markers from DTR data
    const generateDTRMarkers = (dtrData: any[]) => {
        return dtrData
            .filter((dtr) => {
                // Check for various possible latitude/longitude field names
                const lat =
                    dtr.latitude ||
                    dtr.lat ||
                    dtr.lat_coordinate ||
                    dtr.latitude_coordinate;
                const lng =
                    dtr.longitude ||
                    dtr.lng ||
                    dtr.lng_coordinate ||
                    dtr.longitude_coordinate;

                // Also check meterlocation string format
                const meterlocationCoords = parseCoordinates(dtr.meterlocation);

                return (
                    (lat && lng && lat !== 0 && lng !== 0) ||
                    meterlocationCoords
                );
            })
            .map((dtr) => {
                // Try direct coordinates first
                let lat =
                    dtr.latitude ||
                    dtr.lat ||
                    dtr.lat_coordinate ||
                    dtr.latitude_coordinate;
                let lng =
                    dtr.longitude ||
                    dtr.lng ||
                    dtr.lng_coordinate ||
                    dtr.longitude_coordinate;

                // If no direct coordinates, try parsing meterlocation
                if (!lat || !lng || lat === 0 || lng === 0) {
                    const meterlocationCoords = parseCoordinates(
                        dtr.meterlocation,
                    );
                    if (meterlocationCoords) {
                        lat = meterlocationCoords.lat;
                        lng = meterlocationCoords.lng;
                    }
                }

                const markerStatus = String(
                    dtr.status || dtr.commStatus || "normal",
                )
                    .trim()
                    .toLowerCase();

                return {
                    position: { lat: lat, lng: lng },
                    title: dtr.dtrName || `DTR ${dtr.dtrId}`,
                    id: dtr.id,
                    idLabel: "DTR ID",
                    status: markerStatus,
                    icon: getMarkerIcon(markerStatus),
                    feeders: dtr.feedersCount || 0,
                    lastComm: dtr.lastCommunication || "N/A",
                    // Set latestAlert only if there's an active tamper event (for red marker)
                    // If undefined, marker will be default blue
                    latestAlert:
                        dtr.hasTamperEvent && dtr.tamperStatus === "Active"
                            ? "Tamper Alert"
                            : undefined,
                    alertType: dtr.tamperTypeDescription || undefined,
                    tamperDescription: dtr.tamperTypeDescription || undefined,
                    alertTime: dtr.tamperDatetime || undefined,
                };
            });
    };

    const dtrMapMarkers = useMemo(
        () => generateDTRMarkers(dtrMapData),
        [dtrMapData],
    );

    const retryFiltersAPI = async () => {
        // setIsFiltersLoading(true);
        // try {
        //   const response = await apiClient.get("/dtrs/filter-options");
        //   if (!response.ok) throw new Error("Failed to fetch filter options");
        //   const contentType = response.headers.get("content-type");
        //   if (!contentType || !contentType.includes("application/json")) {
        //     throw new Error("Invalid response format");
        //   }
        //   const data = await response.json();
        //   if (data.success) {
        //     setFilterOptions(data.data || dummyFilterOptions);
        //     setFailedApis((prev) => prev.filter((api) => api.id !== "filters"));
        //   } else {
        //     throw new Error(data.message || "Failed to fetch filter options");
        //   }
        // } catch (err: any) {
        //   console.error("Error in Filters API:", err);
        //   setFilterOptions(dummyFilterOptions);
        // } finally {
        //   setTimeout(() => {
        //     setIsFiltersLoading(false);
        //   }, 1000);
        // }
    };

    const retryStatsAPI = async (lastSelectedId?: string) => {
        setIsStatsLoading(true);
        try {
            const endpoint = lastSelectedId
                ? `/dtrs/stats?hierarchyId=${lastSelectedId}`
                : "/dtrs/stats";

            const data = await apiClient.get(endpoint);
            if (data.success) {
                const row1 = data.data?.row1 || {};
                const row2 = data.data?.row2 || {};
                setDtrStatsData(row1);

                setDtrConsumptionData({
                    daily: row2.daily || {
                        totalKwh: 0,
                        totalKvah: 0,
                        totalKvarh: 0,
                        totalKw: 0,
                        totalKva: 0,
                        totalKvar: 0,
                    },
                    monthly: row2.monthly || {
                        totalKwh: 0,
                        totalKvah: 0,
                        totalKvarh: 0,
                        totalKw: 0,
                        totalKva: 0,
                        totalKvar: 0,
                    },
                    currentDay: row2.currentDay || {
                        totalKwh: 0,
                        totalKvah: 0,
                        totalKvarh: 0,
                        totalKw: 0,
                        totalKva: 0,
                        totalKvar: 0,
                        latestKwTimestamp: null,
                        latestKvaTimestamp: null,
                    },
                });
                setFailedApis((prev) =>
                    prev.filter((api) => api.id !== "stats"),
                );
            } else {
                throw new Error(data.message || "Failed to fetch DTR stats");
            }
        } catch (err: any) {
            setDtrStatsData(emptyDtrStatsData);
            setDtrConsumptionData(emptyDtrConsumptionData);
        } finally {
            setIsStatsLoading(false);
        }
    };


    const fetchAllDTRsForMap = async (lastSelectedId?: string | null) => {
        try {
            const params = new URLSearchParams();
            params.append("page", "1");
            params.append("pageSize", "5000");
            if (lastSelectedId) {
                params.append("lastSelectedId", lastSelectedId);
            }

            const data = await apiClient.get(`/dtrs?${params.toString()}`);
            if (data.success) {
                setDtrMapData(data.data || []);
            }
        } catch {
            // Keep existing map data when refresh fails.
        }
    };

    const retryTableAPI = async (
        lastSelectedId?: string,
        page = 1,
        pageSize = serverPagination.limit || 10,
        searchTerm = dtrTableSearch,
    ) => {
        setIsTableLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("page", String(page));
            params.append("pageSize", String(pageSize));
            if (searchTerm && searchTerm.trim()) {
                params.append("search", searchTerm.trim());
            }

            // Add lastSelectedId if available
            if (lastSelectedId) {
                params.append("hierarchyId", lastSelectedId);
            }

            const data = await apiClient.get(`/dtrs?${params.toString()}`);

            if (data.success) {
                setDtrTableData(data.data);
                const pagination = data.pagination || {};
                setServerPagination({
                    currentPage: pagination.currentPage || data.page || 1,
                    totalPages:
                        pagination.totalPages ||
                        Math.ceil((data.total || 0) / (data.pageSize || 10)) ||
                        1,
                    totalCount: pagination.totalCount || data.total || 0,
                    limit: pagination.limit || data.pageSize || 10,
                    hasNextPage: pagination.hasNextPage || data.hasNextPage || false,
                    hasPrevPage: pagination.hasPrevPage || data.hasPrevPage || false,
                });
                setFailedApis((prev) =>
                    prev.filter((api) => api.id !== "table"),
                );
            } else {
                throw new Error(data.message || "Failed to fetch DTR table");
            }
        } catch (err: any) {
            setDtrTableData([]);
        } finally {
            setIsTableLoading(false);
        }
    };

    const retryCircleWiseStatsAPI = async () => {
        setIsCircleWiseTableLoading(true);
        try {
            const data = await apiClient.get("/dtrs/circle-wise-stats");

            let rows: any[] = [];

            if (data && typeof data === "object" && !Array.isArray(data)) {
                const body = data as Record<string, any>;
                if (body.success === false) {
                    throw new Error(
                        body.message ||
                            "Failed to fetch circle-wise DTR statistics",
                    );
                }
                if (Array.isArray(body.data)) {
                    rows = body.data;
                } else if (Array.isArray(body.rows)) {
                    rows = body.rows;
                } else if (Array.isArray(body.circles)) {
                    rows = body.circles;
                }
            } else if (Array.isArray(data)) {
                rows = data;
            } else {
                throw new Error(
                    (data as any)?.message ||
                        "Failed to fetch circle-wise DTR statistics",
                );
            }

            const mapped: TableData[] = rows.map((raw, idx) =>
                mapCircleWiseRowToTableData(
                    raw as Record<string, unknown>,
                    idx + 1,
                ),
            );

            const totalsRow = (data as Record<string, unknown>)?.totals;
            if (
                totalsRow &&
                typeof totalsRow === "object" &&
                !Array.isArray(totalsRow)
            ) {
                mapped.push(
                    mapCircleWiseRowToTableData({
                        ...(totalsRow as Record<string, unknown>),
                        isTotal: true,
                    }),
                );
            }

            setCircleWiseTableData(mapped);
            setFailedApis((prev) =>
                prev.filter((api) => api.id !== "circleWiseStats"),
            );
        } catch {
            setCircleWiseTableData([]);
            setFailedApis((prev) => {
                if (!prev.find((api) => api.id === "circleWiseStats")) {
                    return [
                        ...prev,
                        {
                            id: "circleWiseStats",
                            name: "Circle-wise DTR Statistics",
                            retryFunction: retryCircleWiseStatsAPI,
                            errorMessage:
                                "Failed to load Circle-wise DTR Statistics. Please try again.",
                        },
                    ];
                }
                return prev;
            });
        } finally {
            setIsCircleWiseTableLoading(false);
        }
    };

    const retryAlertsAPI = async (lastSelectedId?: string) => {
        setIsAlertsLoading(true);
        try {
            const endpoint = lastSelectedId
                ? `/dtrs/alerts?hierarchyId=${lastSelectedId}`
                : "/dtrs/alerts";

            const data = await apiClient.get(endpoint);
            if (data.success) {
                setAlertsData(data.data);
                setFailedApis((prev) =>
                    prev.filter((api) => api.id !== "alerts"),
                );
            } else {
                throw new Error(data.message || "Failed to fetch DTR alerts");
            }
        } catch (err: any) {
            setAlertsData([]);
        } finally {
            setIsAlertsLoading(false);
        }
    };

    const retryChartAPI = async (
        lastSelectedId?: string,
        timeRange?: string,
    ) => {
        setIsChartLoading(true);
        try {
            const params = new URLSearchParams();
            if (lastSelectedId) {
                params.append("hierarchyId", lastSelectedId);
            }
            if (timeRange) {
                params.append("timeRange", timeRange);
            }

            const endpoint = `/dtrs/alerts/trends?${params.toString()}`;
            const data = await apiClient.get(endpoint);

            if (data.success) {
                const rows = data.data || [];
                const periodsList = rows.map((r: any) => r.period);

                // Extract all possible alert types from the data
                const allAlertTypes = new Set<string>();
                rows.forEach((row: any) => {
                    Object.keys(row).forEach((key) => {
                        if (key.endsWith("_count") && key !== "period") {
                            const alertType = key
                                .replace("_count", "")
                                .replace(/\s+/g, " ")
                                .toUpperCase();
                            allAlertTypes.add(alertType);
                        }
                    });
                });

                const alertTypesArray = Array.from(allAlertTypes);
                // setAlertTypes(alertTypesArray);

                // Create dynamic series data based on actual alert types
                const seriesData = alertTypesArray.map((alertType, index) => {
                    const dataKey =
                        alertType.toLowerCase().replace(/\s+/g, "_") + "_count";
                    const data = rows.map((r: any) => r[dataKey] || 0);
                    return {
                        name: alertType,
                        data: data,
                        color: alertColors[index % alertColors.length],
                    };
                });

                setChartMonths(periodsList);
                setChartSeries(seriesData);
                setFailedApis((prev) =>
                    prev.filter((api) => api.id !== "chart"),
                );
            } else {
                throw new Error(
                    data.message || "Failed to fetch DTR alerts trends",
                );
            }
        } catch (err: any) {
            setChartMonths([]);
            setChartSeries([]);
        } finally {
            setIsChartLoading(false);
        }
    };

    const retryMeterStatusAPI = async (lastSelectedId?: string) => {
        setIsMeterStatusLoading(true);
        try {
            const endpoint = lastSelectedId
                ? `/dtrs/meter-status?hierarchyId=${lastSelectedId}`
                : "/dtrs/meter-status";

            const data = await apiClient.get(endpoint);

            if (data.success) {
                setMeterStatus(data.data);
                setFailedApis((prev) =>
                    prev.filter((api) => api.id !== "meterStatus"),
                );
            } else {
                throw new Error(data.message || "Failed to fetch meter status");
            }
        } catch (err: any) {
            setMeterStatus(null);
        } finally {
            setIsMeterStatusLoading(false);
        }
    };

    const retrySpecificAPI = (apiId: string) => {
        const api = failedApis.find((a) => a.id === apiId);
        if (api) {
            api.retryFunction();
        }
    };

    const fetchFilterOptions = async (opts?: {
        skipUserLocation?: boolean;
        restoreValues?: HierarchyFilterValues;
    }) => {
        setIsFiltersLoading(true);
        try {
            const data = await apiClient.get("/dtrs/filter/filter-options");
            if (data.success) {
                const apiData = data.data || [];
                setOriginalApiData(apiData);

                if (
                    opts?.restoreValues &&
                    hasActiveHierarchyFilters(opts.restoreValues)
                ) {
                    setFilterOptions((prev) => ({
                        ...prev,
                        ...rebuildCascadeFilterOptions(
                            apiData,
                            opts.restoreValues!,
                            hierarchyLevels,
                        ),
                    }));
                    setFilterValues(opts.restoreValues);
                    return apiData;
                }

                const transformedData = hierarchyLevels.reduce((acc: any, level) => {
                    const normalizedTargetLevel = level.levelName.toLowerCase().replace(/[\s-]/g, "");
                    acc[level.optionKey] = [
                        { value: "all", label: level.allLabel },
                        ...apiData
                            .filter((item: any) => {
                                const normalizedItemLevel = item.levelName?.toLowerCase().replace(/[\s-]/g, "");
                                return normalizedItemLevel === normalizedTargetLevel;
                            })
                            .map((item: any) => ({
                                value: item.id.toString(),
                                label: item.name,
                            })),
                    ];
                    return acc;
                }, {});

                setFilterOptions(transformedData);

                const user = getStoredUser();
                const userLocationId = user?.locationId?.toString();
                const isAdmin =
                    user?.accessLevel === "ADMIN" ||
                    user?.accessLevel === "SUPER_ADMIN" ||
                    user?.role === "ADMIN" ||
                    user?.role === "admin";

                if (userLocationId && !isAdmin && !opts?.skipUserLocation) {
                    const userLocation = apiData.find(
                        (item: any) => item.id.toString() === userLocationId
                    );

                    if (userLocation) {
                        const selectedPath: any = {
                            discom: "all",
                            circle: "all",
                            division: "all",
                            subDivision: "all",
                            section: "all",
                            substation: "all",
                        };
                        let currentItem = userLocation;

                        while (currentItem) {
                            const level = hierarchyLevels.find((l) => {
                                const normalizedL = l.levelName.toLowerCase().replace(/[\s-]/g, "");
                                const normalizedItem = currentItem.levelName?.toLowerCase().replace(/[\s-]/g, "");
                                return normalizedL === normalizedItem;
                            });
                            if (level) {
                                selectedPath[level.filterName] = currentItem.id.toString();
                            }

                            currentItem = currentItem.parentId
                                ? apiData.find((item: any) => item.id === currentItem.parentId)
                                : null;
                        }

                        setFilterOptions((prev) => ({
                            ...prev,
                            ...rebuildCascadeFilterOptions(
                                apiData,
                                selectedPath,
                                hierarchyLevels,
                            ),
                        }));
                        applyFilters(selectedPath);
                    }
                }
            } else {
                throw new Error(
                    data.message || "Failed to fetch filter options",
                );
            }
        } catch (error) {
            setFailedApis((prev) => {
                if (!prev.find((api) => api.id === "filters")) {
                    return [
                        ...prev,
                        {
                            id: "filters",
                            name: "Filter Options",
                            retryFunction: retryFiltersAPI,
                            errorMessage:
                                "Failed to load Filter Options. Please try again.",
                        },
                    ];
                }
                return prev;
            });
        } finally {
            setIsFiltersLoading(false);
        }
    };

    const skipChartEffectOnMountRef = useRef(true);

    useEffect(() => {
        const runDashboardInit = async () => {
            const restoreValues = filtersApplied ? filterValues : undefined;
            await fetchFilterOptions({
                skipUserLocation: filtersApplied,
                restoreValues,
            });

            const hierarchyId = filtersApplied ? lastSelectedId : null;
            const chartRange = selectedChartTimeRange.toLowerCase();

            if (filtersApplied && hierarchyId) {
                await Promise.all([
                    retryStatsAPI(hierarchyId),
                    retryTableAPI(hierarchyId),
                    retryAlertsAPI(hierarchyId),
                    retryChartAPI(hierarchyId, chartRange),
                    retryMeterStatusAPI(hierarchyId),
                    fetchAllDTRsForMap(hierarchyId),
                    retryCircleWiseStatsAPI(),
                ]);
                return;
            }

            await Promise.all([
                retryStatsAPI(),
                retryTableAPI(),
                retryAlertsAPI(),
                retryChartAPI(undefined, chartRange),
                retryMeterStatusAPI(),
                fetchAllDTRsForMap(),
                retryCircleWiseStatsAPI(),
            ]);
        };

        if (!dtrDashboardInitPromise) {
            dtrDashboardInitPromise = runDashboardInit().finally(() => {
                dtrDashboardInitPromise = null;
            });
        }

        return () => {
            const pending = dtrDashboardInitPromise;
            window.setTimeout(() => {
                if (dtrDashboardInitPromise === pending) {
                    dtrDashboardInitPromise = null;
                }
            }, 500);
        };
    }, []);

    // Refetch chart when time range or hierarchy scope changes (initial load handled by init)
    useEffect(() => {
        if (skipChartEffectOnMountRef.current) {
            skipChartEffectOnMountRef.current = false;
            return;
        }
        if (selectedChartTimeRange) {
            retryChartAPI(
                lastSelectedId || undefined,
                selectedChartTimeRange.toLowerCase(),
            );
        }
    }, [selectedChartTimeRange, lastSelectedId]);

    // Update map center and zoom when DTR table data changes
    useEffect(() => {
        if (dtrMapData && dtrMapData.length > 0) {
            const { center, zoom } = calculateMapCenterAndZoom(dtrMapData);
            setMapCenter(center);
            setMapZoom(zoom);
        }
    }, [dtrMapData]);

    // Initialize Socket.IO connection
    useEffect(() => {
        const socketInstance = io("http://localhost:4250", {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        socketInstance.on("connect", () => {
            setIsSocketConnected(true);
        });

        socketInstance.on("disconnect", () => {
            setIsSocketConnected(false);
        });

        // socketInstance.on("connect_error", (error) => {
        //     // Socket connection error handled silently
        // });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    // Socket listener for real-time tamper event updates
    useEffect(() => {
        if (!socket || !isSocketConnected) {
            return;
        }

        const handleDTRAlertUpdate = (alertData: any) => {
            // Update DTR table data with new tamper event
            setDtrTableData((prevData) =>
                prevData.map((dtr) => {
                    // Match by dtrId or dtrNumber
                    const dtrMatch =
                        String(dtr.dtrId) === String(alertData.dtrNumber) ||
                        String(dtr.dtrId).includes(String(alertData.dtrNumber));

                    if (dtrMatch) {
                        return {
                            ...dtr,
                            hasTamperEvent: true,
                            tamperCode: alertData.tamperType,
                            tamperTypeDescription:
                                alertData.tamperTypeDescription,
                            tamperDatetime: alertData.tamperDatetime,
                            tamperStatus:
                                alertData.tamperStatus === 0
                                    ? "Active"
                                    : "Resolved",
                        };
                    }
                    return dtr;
                }),
            );

            // Refresh alerts table
            retryAlertsAPI(lastSelectedId || undefined);
        };

        socket.on("dtr-alert-update", handleDTRAlertUpdate);

        return () => {
            socket.off("dtr-alert-update", handleDTRAlertUpdate);
        };
    }, [socket, isSocketConnected, lastSelectedId]);

    const handleChartDownload = () => {
        exportChartData(chartMonths, chartSeries, "dtr-alerts-trends");
    };

    const handleMeterStatusDownload = () => {
        // The PieChart component will handle the actual export based on the data structure
        // This handler is kept for compatibility but the PieChart will detect meterNumbers and export accordingly
    };

    const handleViewDTR = (row: TableData) => {
        const dtrRouteId = resolveDtrDetailRouteParam(
            row as Record<string, unknown>,
        );
        if (!dtrRouteId) return;
        navigate(`/dtr-detail/${dtrRouteId}`);
    };

    const handleViewFeeder = (row: TableData) => {
        // Extract DTR ID from dtrNumber if dtrId is not available
        const dtrId =
            row.dtrId ||
            (row.dtrNumber ? String(row.dtrNumber).replace("DTR-", "") : null);

        if (!dtrId) {
            return;
        }

        // Navigate to feeders page with DTR ID and feeder data
        navigate(`/feeder/${dtrId}`, {
            state: {
                feederData: {
                    feederName: row.feederName,
                    dtrNumber: row.dtrNumber,
                    dtrId: dtrId,
                    alertType: row.type,
                    alertId: row.alertId,
                    occuredOn: row.occuredOn,
                },
                dtrId: dtrId,
                dtrName: row.dtrNumber,
            },
        });
    };

    const handleViewAllAlerts = () => {
        // Navigate to DTR table with alerts tab
        navigate("/dtr-table?tab=alerts");
    };

    const handlePageChange = (page: number, limit?: number) => {
        const pageSize =
            typeof limit === "number" && limit > 0
                ? limit
                : serverPagination.limit || 10;
        retryTableAPI(undefined, page, pageSize, dtrTableSearch);
    };

    const handleRowsPerPageChange = (limit: number) => {
        retryTableAPI(undefined, 1, limit, dtrTableSearch);
    };

    const handleSearch = (searchTerm: string) => {
        setDtrTableSearch(searchTerm || "");
        retryTableAPI(undefined, 1, serverPagination.limit || 10, searchTerm);
    };

    const handleTimeRangeChange = (range: string) => {
        setSelectedTimeRange(range as "Daily" | "Monthly");
    };

    const handleChartTimeRangeChange = (range: string) => {
        setSelectedChartTimeRange(range as "Daily" | "Weekly" | "Monthly");
        // Refetch chart data with new time range
        retryChartAPI(lastSelectedId || undefined, range.toLowerCase());
    };

    const updateFilterOptions = async (
        filterName: string,
        selectedValue: any,
    ) => {
        const name = selectedValue.target?.value || selectedValue;
        const value = selectedValue.target?.value || selectedValue;
        if (name === "all") return;

        try {
            const params = new URLSearchParams();
            params.append("parentId", value);

            const data = await apiClient.get(
                `/dtrs/filter/filter-options?${params.toString()}`,
            );

            if (data.success) {
                const newOptions = data.data || [];

                switch (filterName) {
                    case "discom":
                        setFilterOptions((prev) => ({
                            ...prev,

                            circles: [
                                { value: "all", label: "All Circles" },
                                ...newOptions.map((item: any) => ({
                                    value: item.id.toString(),
                                    label: item.name,
                                })),
                            ],
                        }));
                        // Reset dependent filters
                        setFilterValues((prev) => ({
                            ...prev,
                            circle: "all",
                            division: "all",
                            subDivision: "all",
                            section: "all",
                            substation: "all",
                        }));
                        // Clear dependent dropdowns
                        setFilterOptions((prev) => ({
                            ...prev,
                            divisions: [
                                { value: "all", label: "All Divisions" },
                            ],
                            subDivisions: [
                                { value: "all", label: "All Sub-Divisions" },
                            ],
                            sections: [{ value: "all", label: "All Sections" }],
                            substations: [
                                { value: "all", label: "All Substations" },
                            ],
                        }));
                        break;

                    case "circle":
                        setFilterOptions((prev) => ({
                            ...prev,
                            divisions: [
                                { value: "all", label: "All Divisions" },
                                ...newOptions.map((item: any) => ({
                                    value: item.id.toString(),
                                    label: item.name,
                                })),
                            ],
                        }));
                        // Reset dependent filters
                        setFilterValues((prev) => ({
                            ...prev,
                            division: "all",
                            subDivision: "all",
                            section: "all",
                            substation: "all",
                        }));
                        // Clear dependent dropdowns
                        setFilterOptions((prev) => ({
                            ...prev,
                            subDivisions: [
                                { value: "all", label: "All Sub-Divisions" },
                            ],
                            sections: [{ value: "all", label: "All Sections" }],
                            substations: [
                                { value: "all", label: "All Substations" },
                            ],
                        }));
                        break;

                    case "division":
                        setFilterOptions((prev) => ({
                            ...prev,
                            subDivisions: [
                                { value: "all", label: "All Sub-Divisions" },
                                ...newOptions.map((item: any) => ({
                                    value: item.id.toString(),
                                    label: item.name,
                                })),
                            ],
                        }));
                        // Reset dependent filters
                        setFilterValues((prev) => ({
                            ...prev,
                            subDivision: "all",
                            section: "all",
                            substation: "all",
                        }));
                        // Clear dependent dropdowns
                        setFilterOptions((prev) => ({
                            ...prev,
                            sections: [{ value: "all", label: "All Sections" }],
                            substations: [
                                { value: "all", label: "All Substations" },
                            ],
                        }));
                        break;

                    case "subDivision":
                        setFilterOptions((prev) => ({
                            ...prev,
                            sections: [
                                { value: "all", label: "All Sections" },
                                ...newOptions.map((item: any) => ({
                                    value: item.id.toString(),
                                    label: item.name,
                                })),
                            ],
                        }));
                        // Reset dependent filters
                        setFilterValues((prev) => ({
                            ...prev,
                            section: "all",
                            substation: "all",
                        }));
                        // Clear dependent dropdowns
                        setFilterOptions((prev) => ({
                            ...prev,
                            substations: [
                                { value: "all", label: "All Substations" },
                            ],
                        }));
                        break;

                    case "section":
                        setFilterOptions((prev) => ({
                            ...prev,
                            substations: [
                                { value: "all", label: "All Substations" },
                                ...newOptions.map((item: any) => ({
                                    value: item.id.toString(),
                                    label: item.name,
                                })),
                            ],
                        }));
                        // Reset dependent filters
                        setFilterValues((prev) => ({
                            ...prev,
                            substation: "all",
                        }));
                        break;
                }
            }
        } catch (error) {
            // Error updating filter options handled silently
        }
    };

    // Helper function to find all parent values when child is selected
    const findAllParentValues = (
        childFilterName: string,
        childValue: string,
    ) => {
        if (childValue === "all" || !originalApiData.length) return {};

        // Find the selected child item
        const childLevel = hierarchyLevels.find(
            (level) => level.filterName === childFilterName,
        );
        if (!childLevel) return {};

        const childItem = originalApiData.find((item: any) => {
            const normalizedItemLevel = item.levelName?.toLowerCase().replace(/[\s-]/g, "");
            const normalizedChildLevel = childLevel.levelName.toLowerCase().replace(/[\s-]/g, "");
            return (
                normalizedItemLevel === normalizedChildLevel &&
                item.id.toString() === childValue
            );
        });

        if (!childItem) return {};

        const parentValues: { [key: string]: string } = {};
        let currentItem = childItem;
        let currentLevelIndex = hierarchyLevels.findIndex(
            (level) => level.filterName === childFilterName,
        );

        while (currentItem && currentItem.parentId && currentLevelIndex > 0) {
            const parentLevel = hierarchyLevels[currentLevelIndex - 1];

            const parentItem = originalApiData.find((item: any) => {
                const normalizedItemLevel = item.levelName?.toLowerCase().replace(/[\s-]/g, "");
                const normalizedParentLevel = parentLevel.levelName.toLowerCase().replace(/[\s-]/g, "");
                return (
                    normalizedItemLevel === normalizedParentLevel &&
                    item.id === currentItem.parentId
                );
            });
            if (parentItem) {
                parentValues[parentLevel.filterName] = parentItem.id.toString();
                currentItem = parentItem;
                currentLevelIndex--;
            } else {
                break;
            }
        }

        return parentValues;
    };

    // Filter change handlers
    const handleFilterChange = async (
        filterName: string,
        value: string | { target: { value: string } },
    ) => {
        const selectedValue =
            typeof value === "string" ? value : value.target.value;

        const parentValues = findAllParentValues(filterName, selectedValue);

        const newFilterValues: any = {
            [filterName]: selectedValue,
            ...parentValues, // Spread all parent values
        };

        setFilterValues((prev) => ({
            ...prev,
            ...newFilterValues,
        }));

        // Update dependent filter options - create event-like object for compatibility
        const eventObject = { target: { value: selectedValue } };
        await updateFilterOptions(filterName, eventObject);
    };

    // Handle Get Data button click
    const handleGetData = async () => {
        const lastId = computeLastSelectedId(filterValues);
        applyFilters(filterValues);

        try {
            const chartRange = selectedChartTimeRange.toLowerCase();
            const hierarchyId = lastId || undefined;
            await Promise.all([
                retryStatsAPI(hierarchyId),
                retryTableAPI(hierarchyId),
                retryAlertsAPI(hierarchyId),
                retryChartAPI(hierarchyId, chartRange),
                retryMeterStatusAPI(hierarchyId),
                fetchAllDTRsForMap(hierarchyId ?? null),
                retryCircleWiseStatsAPI(),
            ]);
        } catch (error) {
            // Error applying filters handled silently
        }
    };

    // Handle Reset button click
    const handleResetFilters = async () => {
        resetHierarchyFilters();
        await fetchFilterOptions();

        const chartRange = selectedChartTimeRange.toLowerCase();
        await Promise.all([
            retryStatsAPI(),
            retryTableAPI(),
            retryAlertsAPI(),
            retryChartAPI(undefined, chartRange),
            retryMeterStatusAPI(),
            fetchAllDTRsForMap(),
            retryCircleWiseStatsAPI(),
        ]);
    };

    // DTR statistics cards data - Using API data
    const dtrStatsCards = [
        {
            title: "Total DTRs",
            value: pickStat(dtrStatsData, "totalDtrs", "0"),
            icon: "icons/dtr.svg",
            subtitle1: "Total Transformer Units",
            onValueClick: () =>
                navigate(buildDtrTableUrl("total-dtrs", "Total DTRs")),
            bg: "bg-stat-icon-gradient",
            loading: isStatsLoading,
        },
        {
            title: "Total LT Feeders",
            value: pickStat(dtrStatsData, "totalLtFeeders", "0"),
            icon: "icons/feeder.svg",
            subtitle1: "Connected to DTRs",
            onValueClick: () =>
                navigate(
                    buildDtrTableUrl("total-lt-feeders", "Total LT Feeders"),
                ),
            loading: isStatsLoading,
        },
        {
            title: "Total Fuse Blown",
            value: pickStat(dtrStatsData, "totalFuseBlown", "0"),
            icon: "icons/power_failure.svg",
            subtitle1: `${pickStat(dtrStatsData, "fuseBlownPercentage", "0")}% of Total Feeders`,
            onValueClick: () =>
                navigate(buildDtrTableUrl("fuse-blown", "Today's Fuse Blown")),
            loading: isStatsLoading,
        },
        {
            title: "Overloaded DTRs",
            value: pickStat(dtrStatsData, "overloadedFeeders", 0),
            icon: "icons/dtr.svg",
            subtitle1: (() => {
                const count = pickStat(dtrStatsData, "overloadedFeeders", 0);
                if (count === 0) {
                    return "No DTRs with load > 90%";
                }
                return `No of DTRs with load > 90%`;
                // {dtrStatsData.overloadedPercentage || dtrStatsData?.row1?.overloadedPercentage || 0}
            })(),
            onValueClick: () =>
                navigate(
                    buildDtrTableUrl(
                        "overloaded-feeders",
                        "Overloaded Feeders",
                    ),
                ),
            loading: isStatsLoading,
        },
        {
            title: "Underloaded DTRs",
            value: pickStat(dtrStatsData, "underloadedFeeders", 0),
            icon: "icons/dtr.svg",
            subtitle1: "No of DTRs with load < 30%",
            // subtitle1: (() => {
            //   const count = dtrStatsData.underloadedFeeders || dtrStatsData?.row1?.underloadedFeeders || 0;
            //   if (count === 0) {
            //     return "No of DTRs with load < 30%";
            //   }
            //   return `${dtrStatsData.underloadedPercentage || dtrStatsData?.row1?.underloadedPercentage || 0}% of Total Feeders`;
            // })(),

            onValueClick: () =>
                navigate(
                    buildDtrTableUrl(
                        "underloaded-feeders",
                        "Underloaded Feeders",
                    ),
                ),
            loading: isStatsLoading,
        },
        {
            title: "LT Side Fuse Blown",
            value: pickStat(dtrStatsData, "ltSideFuseBlown", "0"),
            icon: "icons/power_failure.svg",
            subtitle1: "Incidents Today",
            onValueClick: () =>
                navigate(
                    buildDtrTableUrl("lt-fuse-blown", "LT Side Fuse Blown"),
                ),
            loading: isStatsLoading,
        },
        {
            title: "Unbalanced DTRs",
            value: pickStat(dtrStatsData, "unbalancedDtrs", "0"),
            icon: "icons/dtr.svg",
            subtitle1: `${pickStat(dtrStatsData, "unbalancedPercentage", "0")}% of Total DTRs`,
            onValueClick: () =>
                navigate(
                    buildDtrTableUrl("unbalanced-dtrs", "Unbalanced DTRs"),
                ),
            loading: isStatsLoading,
        },
        {
            title: "Power Failure Feeders",
            value: pickStat(dtrStatsData, "powerFailureFeeders", "0"),
            icon: "icons/power_failure.svg",
            subtitle1: `
        LT Feeders`,
            // {dtrStatsData.powerFailurePercentage ||
            // dtrStatsData?.row1?.powerFailurePercentage ||
            // ""}
            onValueClick: () =>
                navigate(
                    buildDtrTableUrl(
                        "power-failure-feeders",
                        "Power Failure Feeders",
                    ),
                ),
            loading: isStatsLoading,
        },
        {
            title: "HT Side Fuse Blown",
            value: pickStat(dtrStatsData, "htSideFuseBlown", "0"),
            icon: "icons/dtr.svg",
            subtitle1: "Incidents Today",
            onValueClick: () =>
                navigate(
                    buildDtrTableUrl("ht-fuse-blown", "HT Side Fuse Blown"),
                ),
            loading: isStatsLoading,
        },
    ];

    const monthlyConsumptionCards = [
        {
            title: "Total kW",
            value: String(dtrConsumptionData.monthly.totalKw || "0"),
            icon: "icons/consumption.svg",
            subtitle1: "Monthly Average Power",
            bg: "bg-stat-icon-gradient",
            loading: isStatsLoading,
        },
        {
            title: "Total kWh",
            value: String(dtrConsumptionData.monthly.totalKwh || "0"),
            icon: "icons/consumption.svg",
            subtitle1: "Monthly Active Energy",
            bg: "bg-stat-icon-gradient",
            loading: isStatsLoading,
        },
        {
            title: "Total kVA",
            value: String(dtrConsumptionData.monthly.totalKva || "0"),
            icon: "icons/consumption.svg",
            subtitle1: "Monthly Average Apparent",
            bg: "bg-stat-icon-gradient",
            loading: isStatsLoading,
        },
        {
            title: "Total kVAh",
            value: String(dtrConsumptionData.monthly.totalKvah || "0"),
            icon: "icons/consumption.svg",
            subtitle1: "Monthly Apparent Energy",
            bg: "bg-stat-icon-gradient",
            loading: isStatsLoading,
        },
        {
            title: "Total kVAR",
            value: String(dtrConsumptionData.monthly.totalKvar || "0"),
            icon: "icons/consumption.svg",
            subtitle1: "Monthly Reactive Power",
            bg: "bg-stat-icon-gradient",
            loading: isStatsLoading,
        },
        {
            title: "Total kVARh",
            value: String(dtrConsumptionData.monthly.totalKvarh || "0"),
            icon: "icons/consumption.svg",
            subtitle1: "Monthly Reactive Energy",
            bg: "bg-stat-icon-gradient",
            loading: isStatsLoading,
        },
    ];

    // Get current consumption cards data based on selected time range
    const getCurrentConsumptionCards = (): Array<{
        title: string;
        value: string | number;
        icon: string;
        subtitle1: string;
        bg: string;
        loading: boolean;
        onValueClick?: () => void;
        iconStyle?: any;
    }> => {
        if (selectedTimeRange === "Daily") {
            // For daily, use currentDay data if available, otherwise fall back to daily
            const currentDayData = dtrConsumptionData.currentDay || {
                ...dtrConsumptionData.daily,
                latestKwTimestamp: null,
                latestKvaTimestamp: null,
            };
            return [
                {
                    title: "Total kW",
                    value: String(currentDayData.totalKw || "0"),
                    icon: "icons/energy.svg",
                    //subtitle1: `Current Active Power${currentDayData.latestKwTimestamp ? ` (${formatTimestamp(currentDayData.latestKwTimestamp)})` : ""}`,
                    subtitle1: `${
                        currentDayData.latestKwTimestamp
                            ? ` ${formatTimestamp(
                                  currentDayData.latestKwTimestamp,
                              )}`
                            : ""
                    }`,
                    bg: "bg-stat-icon-gradient",
                    loading: isStatsLoading,
                },
                {
                    title: "Total kWh",
                    value: String(currentDayData.totalKwh || "0"),
                    icon: "icons/energy.svg",
                    subtitle1: "Today's Active Energy",
                    bg: "bg-stat-icon-gradient",
                    loading: isStatsLoading,
                },
                {
                    title: "Total kVA",
                    value: String(currentDayData.totalKva || "0"),
                    icon: "icons/energy.svg",
                    //subtitle1: `Current Apparent Power${currentDayData.latestKvaTimestamp ? ` (${formatTimestamp(currentDayData.latestKvaTimestamp)})` : ""}`,
                    subtitle1: `${
                        currentDayData.latestKvaTimestamp
                            ? ` ${formatTimestamp(
                                  currentDayData.latestKvaTimestamp,
                              )}`
                            : ""
                    }`,
                    bg: "bg-stat-icon-gradient",
                    loading: isStatsLoading,
                },
                {
                    title: "Total kVAh",
                    value: String(currentDayData.totalKvah || "0"),
                    icon: "icons/energy.svg",
                    subtitle1: "Today's Apparent Energy",
                    bg: "bg-stat-icon-gradient",
                    loading: isStatsLoading,
                },
                {
                    title: "Total kVAR",
                    value: String(currentDayData.totalKvar || "0"),
                    icon: "icons/consumption.svg",
                    subtitle1: "Today's Reactive Power",
                    bg: "bg-stat-icon-gradient",
                    loading: isStatsLoading,
                },
                {
                    title: "Total kVARh",
                    value: String(currentDayData.totalKvarh || "0"),
                    icon: "icons/consumption.svg",
                    subtitle1: "Today's Reactive Energy",
                    bg: "bg-stat-icon-gradient",
                    loading: isStatsLoading,
                },
            ];
        } else {
            // For monthly, use monthly data
            return monthlyConsumptionCards;
        }
    };

    // Dummy data for DTRs table
    const dtrTableColumns = [
        { key: "sNo", label: "S.No" },
        { key: "dtrId", label: "DTR ID" },
        { key: "dtrName", label: "DTR Name" },
        { key: "feedersCount", label: "Feeders Count" },
        { key: "meterlocation", label: "Coordinates" },
        // { key: "city", label: "City" },
        {
            key: "commStatus",
            label: "Communication Status",
            statusIndicator: {},
            isActive: (value: string | number | boolean | null | undefined) =>
                String(value).toLowerCase() === "active",
        },
        { key: "lastCommunication", label: "Last Communication" },
    ];

    const alertsTableColumns = [
        { key: "sNo", label: "S.No" },
        //{ key: "alertId", label: "Alert ID" },
        { key: "type", label: "Event Type" },
        { key: "feederName", label: "Meter Number" },
        { key: "dtrNumber", label: "DTR Number" },
        { key: "occuredOn", label: "Occured On" },
        { key: "duration", label: "Duration" },
        // { key: "status", label: "Status" },
    ];

    const handleCircleWiseNumericCellClick = useCallback(
        (
            row: TableData,
            exportKey: CircleWiseExcelExportColumnKey,
            cellValue: unknown,
        ) => {
            if (!isNumericCell(cellValue)) return;
            const url = buildCircleWiseStatDrillUrl(
                exportKey,
                row,
                filterOptions.circles,
                lastSelectedId,
                filterValues,
            );
            if (url) navigate(url);
        },
        [filterOptions.circles, lastSelectedId, filterValues, navigate],
    );

    useLayoutEffect(() => {
        const onClickCapture = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const cell = target.closest("td[data-label]");
            if (!cell) return;

            const label = cell.getAttribute("data-label");
            if (!label || label === "S.No" || label === "Circle" || label === "Comm. %") {
                return;
            }

            const exportKey = circleWiseExportColumnLabelToKey[label];
            if (!exportKey || exportKey === "commPercentage") return;

            const rowEl = cell.closest("tr");
            const tbody = rowEl?.closest("tbody");
            if (!rowEl || !tbody) return;

            const rowIndex = Array.from(tbody.querySelectorAll("tr")).indexOf(
                rowEl as HTMLTableRowElement,
            );
            if (rowIndex < 0) return;

            const row = circleWiseTableData[rowIndex];
            if (!row?.circle || !("totalDTRs" in row)) return;
            if (row.isTotal || row.circle === "All Circles") return;

            const cellValue = cell.textContent?.trim() ?? "";
            if (!isNumericCell(cellValue)) return;

            e.preventDefault();
            e.stopPropagation();
            handleCircleWiseNumericCellClick(row, exportKey, cellValue);
        };

        document.addEventListener("click", onClickCapture, true);
        return () => document.removeEventListener("click", onClickCapture, true);
    }, [circleWiseTableData, handleCircleWiseNumericCellClick]);

    useLayoutEffect(() => {
        if (isCircleWiseTableLoading || circleWiseTableData.length === 0) return;

        const run = () => applyCircleWiseTotalsRowHighlight();
        run();
        const frameId = requestAnimationFrame(run);
        return () => cancelAnimationFrame(frameId);
    }, [circleWiseTableData, isCircleWiseTableLoading]);

    const circleWiseTableColumns = [
        { key: "sNo", label: "S.No" },
        { key: "circle", label: "Circle" },
        { key: "totalDTRs", label: "Total DTRs" },
        { key: "totalLTFeeders", label: "Total LT Feeders" },
        { key: "totalFuseBlown", label: "Total Fuse Blown" },
        { key: "overloadedDTRs", label: "Overloaded DTRs" },
        { key: "underloadedDTRs", label: "Underloaded DTRs" },
        { key: "ltSideFuseBlown", label: "LT Side Fuse Blown" },
        { key: "unbalancedDTRs", label: "Unbalanced DTRs" },
        { key: "powerFailureFeeders", label: "Power Failure Feeders" },
        { key: "htSideFuseBlown", label: "HT Side Fuse Blown" },
        { key: "communicating", label: "Comm." },
        { key: "notCommunicating", label: "Non-Comm." },
        { key: "commPercentage", label: "Comm. %" },
    ];

    return (
        <div className="overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <Page
                sections={[
                    // Error Section - Above PageHeader
                    ...(failedApis.length > 0
                        ? [
                              {
                                  layout: {
                                      type: "column" as const,
                                      gap: "gap-4",
                                      rows: [
                                          {
                                              layout: "column" as const,
                                              columns: [
                                                  {
                                                      name: "Error",
                                                      props: {
                                                          visibleErrors:
                                                              failedApis.map(
                                                                  (api) =>
                                                                      api.errorMessage,
                                                              ),
                                                          showRetry: true,
                                                          maxVisibleErrors: 3,
                                                          failedApis:
                                                              failedApis,
                                                          onRetrySpecific:
                                                              retrySpecificAPI,
                                                      },
                                                  },
                                              ],
                                          },
                                      ],
                                  },
                              },
                          ]
                        : []),

                    // Header section
                    {
                        layout: {
                            type: "grid" as const,
                            columns: 1,
                            className: "",
                        },
                        components: [
                            {
                                name: "PageHeader",
                                props: {
                                    title: "DTR Dashboard",
                                    // onBackClick: () => window.history.back(),
                                    // buttonsLabel: "Export",
                                    // variant: "primary",
                                    backButtonText: "",
                                    // onClick: () => handleExportData(),
                                    showMenu: false,
                                    showDropdown: true,
                                    menuItems: [
                                        { id: "all", label: "Alerts" },
                                        { id: "export", label: "Export" },
                                    ],
                                    onMenuItemClick: (_itemId: string) => {},
                                },
                            },
                        ],
                    },
                    // Filter Section
                    {
                        layout: {
                            type: "flex" as const,
                            direction: "row" as const,
                            gap: "gap-4",
                            className:
                                "flex items-center justify-center w-full border gap-5 border-primary-border dark:border-dark-border rounded-3xl p-4 bg-background-secondary dark:bg-primary-dark-light",
                        },
                        components: [
                            {
                                name: "Dropdown",
                                props: {
                                    options: [...filterOptions.discoms],
                                    value: filterValues.discom,

                                    onChange: (value: string) =>
                                        handleFilterChange("discom", value),
                                    placeholder: "Select DISCOM",
                                    loading: isFiltersLoading,
                                    searchable: false,
                                },
                            },
                            {
                                name: "Dropdown",
                                props: {
                                    options: [...filterOptions.circles],
                                    value: filterValues.circle,
                                    onChange: (value: string) =>
                                        handleFilterChange("circle", value),
                                    placeholder: "Select Circle",
                                    loading: isFiltersLoading,
                                    searchable: false,
                                },
                            },
                            {
                                name: "Dropdown",
                                props: {
                                    options: [...filterOptions.divisions],
                                    value: filterValues.division,
                                    onChange: (value: string) =>
                                        handleFilterChange("division", value),
                                    placeholder: "Select Division",
                                    loading: isFiltersLoading,
                                    searchable: false,
                                },
                            },
                            {
                                name: "Dropdown",
                                props: {
                                    options: [...filterOptions.subDivisions],
                                    value: filterValues.subDivision,
                                    onChange: (value: string) =>
                                        handleFilterChange(
                                            "subDivision",
                                            value,
                                        ),
                                    placeholder: "Select Sub-Division",
                                    loading: isFiltersLoading,
                                    searchable: false,
                                },
                            },
                            {
                                name: "Dropdown",
                                props: {
                                    options: [...filterOptions.sections],
                                    value: filterValues.section,
                                    onChange: (value: string) =>
                                        handleFilterChange("section", value),
                                    placeholder: "Select Section",
                                    loading: isFiltersLoading,
                                    searchable: false,
                                },
                            },
                            {
                                name: "Dropdown",
                                props: {
                                    options: [...filterOptions.substations],
                                    value: filterValues.substation,
                                    onChange: (value: string) =>
                                        handleFilterChange(
                                            "substation",
                                            value
                                        ),
                                    placeholder: "Select Substation",
                                    loading: isFiltersLoading,
                                    searchable: false,
                                },
                            },
                            {
                                name: "Button",
                                props: {
                                    variant: "primary",
                                    onClick: handleGetData,
                                    children: "Get Data",
                                    className: "self-end h-100%",
                                    searchable: false,
                                },
                                align: "center",
                            },
                            {
                                name: "Button",
                                props: {
                                    variant: "secondary",
                                    onClick: handleResetFilters,
                                    children: "Reset",
                                    className: "self-end h-100%",
                                    searchable: false,
                                },
                                align: "center",
                            },
                        ],
                    },

                    // DTR Statistics Cards
                    {
                        layout: {
                            type: "grid",
                            columns: 5,
                            gap: "gap-4",
                            rows: [
                                {
                                    layout: "grid",
                                    gap: "gap-4",
                                    gridColumns: 3,
                                    span: { col: 3, row: 1 },
                                    className:
                                        "border border-primary-border dark:border-dark-border rounded-3xl p-4 bg-background-secondary dark:bg-primary-dark-light",
                                    columns: [
                                        {
                                            name: "SectionHeader",
                                            props: {
                                                title: "Distribution Transformer (DTR) Statistics",
                                                titleLevel: 2,
                                                titleSize: "md",
                                                titleVariant: "",
                                                titleWeight: "medium",
                                                titleAlign: "left",
                                                rightComponent: {
                                                    name: "Button",
                                                    props: {
                                                        variant: "secondary",
                                                        onClick: () =>
                                                            navigate(
                                                                buildDtrTableUrl(
                                                                    "total-dtrs",
                                                                    "Total DTRs",
                                                                ),
                                                            ),
                                                        children: "View All",
                                                        className:
                                                            "px-4 py-2 text-sm",
                                                    },
                                                },
                                                layout: "horizontal",
                                                gap: "gap-4",
                                            },
                                            span: { col: 3, row: 1 },
                                        },
                                        ...dtrStatsCards.map((stat) => ({
                                            name: "Card",
                                            props: {
                                                title: stat.title,
                                                value: stat.value,
                                                icon: stat.icon,
                                                subtitle1: stat.subtitle1,
                                                onValueClick: stat.onValueClick,
                                                bg:
                                                    stat.bg ||
                                                    "bg-stat-icon-gradient",
                                                loading: stat.loading,
                                            },
                                            span: {
                                                col: 1 as const,
                                                row: 1 as const,
                                            },
                                        })),
                                    ],
                                },
                                {
                                    layout: "grid",
                                    gap: "gap-4",
                                    gridColumns: 2,
                                    span: { col: 2, row: 1 },
                                    className:
                                        "border border-primary-border dark:border-dark-border rounded-3xl p-4 bg-background-secondary dark:bg-primary-dark-light",
                                    columns: [
                                        {
                                            name: "SectionHeader",
                                            props: {
                                                title: "Consumption & Energies",
                                                titleLevel: 2,
                                                titleSize: "md",
                                                titleVariant: "",
                                                titleWeight: "medium",
                                                titleAlign: "left",
                                                rightComponent: {
                                                    name: "TimeRangeSelector",
                                                    props: {
                                                        availableTimeRanges: [
                                                            "Daily",
                                                            "Monthly",
                                                        ],
                                                        selectedTimeRange:
                                                            selectedTimeRange,
                                                        handleTimeRangeChange:
                                                            handleTimeRangeChange,
                                                        timeRangeLabels: {},
                                                    },
                                                },
                                                layout: "horizontal",
                                                gap: "gap-4",
                                            },
                                            span: { col: 2, row: 1 },
                                        },
                                        ...getCurrentConsumptionCards().map(
                                            (card) => ({
                                                name: "Card",
                                                props: {
                                                    title: card.title,
                                                    value: card.value,
                                                    icon: card.icon,
                                                    subtitle1: card.subtitle1,
                                                    ...(card.iconStyle && {
                                                        iconStyle:
                                                            card.iconStyle,
                                                    }),
                                                    bg:
                                                        card.bg ||
                                                        "bg-stat-icon-gradient",
                                                    loading: card.loading,
                                                },
                                                span: {
                                                    col: 1 as const,
                                                    row: 1 as const,
                                                },
                                            }),
                                        ),
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        layout: {
                            type: "grid" as const,
                            className:
                                "circle-wise-stats-table-host w-full min-w-0 overflow-x-hidden gap-4",
                            columns: 2,
                        },
                        components: [
                            {
                                name: "Table",
                                props: {
                                    data: circleWiseTableData,
                                    columns: circleWiseTableColumns,
                                    showHeader: true,
                                    headerTitle: "Circle-wise DTR Statistics",
                                    searchable: false,
                                    sortable: false,
                                    pagination: false,
                                    showPagination: false,
                                    loading: isCircleWiseTableLoading,
                                    emptyMessage: "No data found",
                                    showActions: false,
                                    availableTimeRanges: [],
                                    enableHorizontalScroll: false,
                                    className: "w-full min-w-0",
                                },
                                span: { col: 2, row: 1 },
                            },
                        ],
                    },
                    // DTRs Table section
                    {
                        layout: {
                            type: "grid",
                            columns: 2,
                            gap: "gap-4",
                            rows: [
                                {
                                    layout: "grid",
                                    gridColumns: 1,
                                    gap: "gap-4",
                                    className:
                                        "border border-primary-border dark:border-dark-border rounded-3xl dark:bg-primary-dark-light",
                                    columns: [
                                        // {
                                        //   name: "Holder",ss
                                        //   props: {
                                        //     title: "Communication  Status",
                                        //     subtitle:
                                        //       "Distribution of communicating and non-communicating meters",
                                        //     className: "border-none rounded-t-3xl ",
                                        //   },
                                        // },
                                        {
                                            name: "PieChart",
                                            props: {
                                                data: meterStatus || [],
                                                height: 330,
                                                showStatsLabels: false,
                                                showLegend: false,
                                                showNoDataMessage: false,
                                                showDownloadButton: true,
                                                onDownload:
                                                    handleMeterStatusDownload,
                                                showStatsSection: true,
                                                valueUnit1: "Communicating", // Unit for first category (e.g., "Meter")
                                                valueUnit2: "Non-Communicating", // Unit for second category (e.g., "Non-Meter")
                                                holderClassName: "",
                                                showHeader: true,
                                                headerTitle:
                                                    "Communication Status",
                                                onClick: (
                                                    segmentName?: string,
                                                ) => {
                                                    if (
                                                        segmentName ===
                                                        "Communicating"
                                                    ) {
                                                        navigate(
                                                            "/dtr-table?type=communicating-meters&title=Communicating%20Meters",
                                                        );
                                                    } else if (
                                                        segmentName ===
                                                        "Non-Communicating"
                                                    ) {
                                                        navigate(
                                                            "/dtr-table?type=non-communicating-meters&title=Non-Communicating%20Meters",
                                                        );
                                                    } else {
                                                        navigate(
                                                            "/dtr-table?type=communicating-meters&title=Communicating%20Meters",
                                                        );
                                                    }
                                                },
                                                isLoading: isMeterStatusLoading,
                                            },
                                        },
                                    ],
                                },
                                {
                                    layout: "grid",
                                    gridColumns: 1,
                                    gap: "gap-4",
                                    columns: [
                                        {
                                            name: "Table",
                                            props: {
                                                data: alertsData,
                                                columns: alertsTableColumns,
                                                showHeader: true,
                                                headerTitle: "Latest Alerts",
                                                headerClickable: true,
                                                onHeaderClick:
                                                    handleViewAllAlerts,
                                                showActions: true,
                                                searchable: true,
                                                pagination: true,
                                                // selectable: true,
                                                onView: handleViewFeeder,
                                                availableTimeRanges: [],
                                                initialRowsPerPage: 3,
                                                emptyMessage: "No alerts found",
                                                loading: isAlertsLoading,
                                                onRowClick: (row: TableData) =>
                                                    handleViewFeeder(row),
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        layout: {
                            type: "grid" as const,
                            className: "",
                            columns: 2,
                        },
                        components: [
                            {
                                name: "Table",
                                props: {
                                    data: dtrTableData,
                                    columns: dtrTableColumns,
                                    showHeader: true,
                                    headerTitle: "Distribution Transformers",
                                    headerClassName: "h-18",
                                    searchable: false,
                                    sortable: true,
                                    initialRowsPerPage: 10,
                                    // selectable: true,
                                    showActions: true,
                                    text: "DTR Management Table",
                                    onRowClick: (row: TableData) => {
                                        const dtrRouteId =
                                            resolveDtrDetailRouteParam(
                                                row as Record<string, unknown>,
                                            );
                                        if (!dtrRouteId) return;
                                        navigate(`/dtr-detail/${dtrRouteId}`);
                                    },
                                    onView: handleViewDTR,
                                    availableTimeRanges: [],
                                    onPageChange: handlePageChange,
                                    onRowsPerPageChange:
                                        handleRowsPerPageChange,
                                    onSearch: handleSearch,
                                    pagination: true,
                                    showPagination: true,
                                    serverPagination: serverPagination,
                                    totalCount: serverPagination.totalCount,
                                    currentPage: serverPagination.currentPage,
                                    totalPages: serverPagination.totalPages,
                                    pageSize: serverPagination.limit,
                                    itemsPerPage: serverPagination.limit,
                                    rowsPerPageOptions: [10, 25, 50, 100],
                                    loading: isTableLoading,
                                },
                                span: { col: 2, row: 1 },
                            },
                        ],
                    },
                    {
                        layout: {
                            type: "column" as const,
                            className: "w-full",
                        },
                        components: [
                            {
                                name: "StackedBarChart",
                                props: {
                                    xAxisData: chartMonths,
                                    seriesData: chartSeries,
                                    seriesColors: alertColors,
                                    height: 300,
                                    showHeader: true,
                                    headerTitle: "DTR Alert Statistics",
                                    availableTimeRanges: [
                                        "Daily",
                                        "Weekly",
                                        "Monthly",
                                    ],
                                    initialTimeRange: selectedChartTimeRange,
                                    onTimeRangeChange:
                                        handleChartTimeRangeChange,
                                    showDownloadButton: true,
                                    onDownload: () => handleChartDownload(),
                                    isLoading: isChartLoading,
                                    showLegendInteractions: true,
                                },
                                span: { col: 1, row: 1 },
                            },
                        ],
                    },
                    {
                        layout: {
                            type: "grid" as const,
                            columns: 1,
                            className: "",
                        },
                        components: [
                            {
                                name: "GoogleMap",
                                props: {
                                    title: "DTR Locations",
                                    hasDownload: true,
                                    apiKey: "AIzaSyCzGAzUjgicpxShXVusiguSnosdmsdQ7WI",
                                    center: mapCenter,
                                    zoom: mapZoom,
                                    showStatsSection: true,
                                    libraries: ["places"],
                                    markers: dtrMapMarkers,
                                    alertMarkerColor: "#dc272c", // Red color for alerts
                                    normalMarkerColor: "#163b7c", // Blue color for normal DTRs
                                    mapOptions: {
                                        disableDefaultUI: false,
                                        zoomControl: true,
                                        mapTypeControl: true,
                                        scaleControl: true,
                                        streetViewControl: true,
                                        rotateControl: true,
                                        fullscreenControl: true,
                                    },
                                    onMarkerIdClick: (dtrId: string) => {
                                        navigate(`/dtr-detail/${dtrId}`);
                                    },
                                    onReady: (_map: any, _google: any) => {},
                                    onClick: (e: any) => {
                                        const clickedCoords =
                                            e.latLng?.toJSON();
                                        if (clickedCoords) {
                                            // You could add a temporary marker here or show coordinates in a tooltip
                                        }
                                    },
                                    onIdle: () => {},
                                },
                                span: { col: 1, row: 1 },
                            },
                        ],
                    },
                ]}
            />
        </div>
    );
};

export default DTRDashboard;
