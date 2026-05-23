import { lazy } from "react";
import React, {
    useState,
    useEffect,
    Suspense,
    useCallback,
    useMemo,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useHierarchyFilters } from "../context/HierarchyFilterContext";
import {
    hasActiveHierarchyFilters,
    parseHierarchyFiltersFromSearchParams,
} from "../utils/hierarchyFilters";
import BACKEND_URL from "../config";
import { exportToExcel } from "../utils/excelExport";
import {
    hierarchyDetailTableColumns,
    mapRowToHierarchyDetailTableRow,
} from "../utils/circleWiseExport";
import {
    buildDtrStatsListApiUrl,
    DTR_STATS_DRILL_TABLE_COLUMNS,
    isDtrStatsDrillType,
    mapApiRowToDtrStatsTableRow,
    mapDtrStatsTableRows,
    normalizeDtrStatsCardType,
    resolveDtrDetailRouteParam,
} from "../utils/dtrStatsTable";

const Page = lazy(() => import("SuperAdmin/Page"));

// Define TableData type locally since we're using federated components
interface TableData {
    [key: string]: string | number | boolean | null | undefined;
}

/** Debug only — DTR Detail feeder mapping investigation (no logic change). */
function logDtrDetailRowClickDebug(row: TableData) {
    console.log("Clicked Row Data:", row);
    console.log("Clicked Meter Number:", row.meterNumber);
    console.log("Clicked DTR ID:", row.dtrId);
    console.log("Navigate To:", `/dtr-detail/${row.id}`);
}

interface Pagination {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

const nonActionableCardTypes: string[] = [
    // Consumption-related tables are now actionable (can navigate to DTR detail)
    // 'daily-kwh','monthly-kwh',
    // 'daily-kvah','monthly-kvah',
    // 'daily-kw','monthly-kw',
    // 'daily-kva','monthly-kva'
];

/** Max rows per export API request (keeps drill-down APIs responsive). */
const EXPORT_FETCH_PAGE_SIZE = 100;

const DTRTable: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { syncFiltersFromUrl, lastSelectedId: contextHierarchyId } =
      useHierarchyFilters();
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardType, setCardType] = useState<string | null>(null);
  const [cardTitle, setCardTitle] = useState<string>('DTR Management');
  const [searchTerm, setSearchTerm] = useState('');
  const [hierarchyId, setHierarchyId] = useState<string | null>(null);
  const [circleFilter, setCircleFilter] = useState<string | null>(null);
  const [hierarchyDetailView, setHierarchyDetailView] = useState(false);
    const normalizedCardType = useMemo(() => {
        const raw = cardType?.toLowerCase().trim() || "";
        return normalizeDtrStatsCardType(raw) || raw;
    }, [cardType]);
  const [serverPagination, setServerPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

    const safeSetTableData = (data: TableData[]) => {
        if (data && data.length > 0) {
            console.log(
                `[DTRTable] Setting table data with ${data.length} items`,
            );
            setTableData(data);
        } else {
            console.log(
                `[DTRTable] Setting empty table data - API returned no data`,
            );
            setTableData([]);
        }
    };

  // Apply URL params only once
  useEffect(() => {
    const urlParams = new URLSearchParams(searchParams.toString());
    const type = urlParams.get('type');
    const title = urlParams.get('title');
    const { filterValues: urlFilters, lastSelectedId: urlHierarchyId } =
        parseHierarchyFiltersFromSearchParams(urlParams);
    const circleParam = urlParams.get('circle');

    if (type) setCardType(normalizeDtrStatsCardType(type) || type);
    if (title) setCardTitle(decodeURIComponent(title));
    const effectiveHierarchyId =
        urlHierarchyId || contextHierarchyId || null;
    if (effectiveHierarchyId) setHierarchyId(effectiveHierarchyId);
    if (circleParam) setCircleFilter(decodeURIComponent(circleParam));
    setHierarchyDetailView(urlParams.get("view") === "hierarchy");
    if (
        hasActiveHierarchyFilters(urlFilters) ||
        urlParams.has("hierarchyId") ||
        urlParams.has("lastSelectedId")
    ) {
        syncFiltersFromUrl(urlFilters, effectiveHierarchyId);
    }
  }, [searchParams, syncFiltersFromUrl, contextHierarchyId]);

    const getTableColumns = () => {
        if (hierarchyDetailView) {
            return [...hierarchyDetailTableColumns];
        }
        if (isDtrStatsDrillType(normalizedCardType)) {
            return [...DTR_STATS_DRILL_TABLE_COLUMNS];
        }
        switch (normalizedCardType) {
            case "communicating-meters":
            case "non-communicating-meters":
                return [
                    { key: "slNo", label: "S.No" },
                    { key: "meterNo", label: "Meter Number" },
                    { key: "dtrId", label: "DTR ID" },
                    { key: "dtrName", label: "DTR Name" },
                    { key: "location", label: "Location" },
                    {
                        key: "communicationStatus",
                        label: "Communication Status",
                    },
                    {
                        key: "lastCommunicationDate",
                        label: "Last Communication",
                    },
                ];
            case "daily-kwh":
            case "monthly-kwh":
                return [
                    { key: "dtrId", label: "DTR ID" },
                    { key: "dtrName", label: "DTR Name" },
                    { key: "kwh", label: "kWh Reading" },
                    { key: "previousReading", label: "Previous Reading" },
                    { key: "consumption", label: "Consumption" },
                    { key: "location", label: "Location" },
                    { key: "timestamp", label: "Timestamp" },
                ];
            case "daily-kvah":
            case "monthly-kvah":
                return [
                    { key: "dtrId", label: "DTR ID" },
                    { key: "dtrName", label: "DTR Name" },
                    { key: "kvah", label: "kVAh Reading" },
                    { key: "previousReading", label: "Previous Reading" },
                    { key: "consumption", label: "Consumption" },
                    { key: "location", label: "Location" },
                    { key: "timestamp", label: "Timestamp" },
                ];
            case "daily-kw":
            case "monthly-kw":
                return [
                    { key: "dtrId", label: "DTR ID" },
                    { key: "dtrName", label: "DTR Name" },
                    { key: "kw", label: "kW Reading" },
                    { key: "powerFactor", label: "Power Factor" },
                    { key: "location", label: "Location" },
                    { key: "timestamp", label: "Timestamp" },
                ];
            case "daily-kva":
            case "monthly-kva":
                return [
                    { key: "dtrId", label: "DTR ID" },
                    { key: "dtrName", label: "DTR Name" },
                    { key: "kva", label: "kVA Reading" },
                    { key: "powerFactor", label: "Power Factor" },
                    { key: "location", label: "Location" },
                    { key: "timestamp", label: "Timestamp" },
                ];
            case "daily-kvar":
            case "monthly-kvar":
                return [
                    { key: "dtrId", label: "DTR ID" },
                    { key: "dtrName", label: "DTR Name" },
                    { key: "kvar", label: "kVAR Reading" },
                    { key: "powerFactor", label: "Power Factor" },
                    { key: "location", label: "Location" },
                    { key: "timestamp", label: "Timestamp" },
                ];
            case "daily-kvarh":
            case "monthly-kvarh":
                return [
                    { key: "dtrId", label: "DTR ID" },
                    { key: "dtrName", label: "DTR Name" },
                    { key: "kvarh", label: "kVARh Reading" },
                    { key: "previousReading", label: "Previous Reading" },
                    { key: "consumption", label: "Consumption" },
                    { key: "location", label: "Location" },
                    { key: "timestamp", label: "Timestamp" },
                ];
            default:
                return [
                    { key: "dtrId", label: "DTR ID" },
                    { key: "dtrName", label: "DTR Name" },
                    { key: "feedersCount", label: "Feeders Count" },
                    {
                        key: "commStatus",
                        label: "Communication-Status",
                        statusIndicator: {},
                        isActive: (
                            value: string | number | boolean | null | undefined,
                        ) => String(value).toLowerCase() === "active",
                    },
                    { key: "lastCommunication", label: "Last Communication" },
                ];
        }
    };

    const buildListApiUrl = useCallback(
        (page: number, pageSize: number, search?: string): string | null => {
            if (!cardType) return null;

            const scopedSearch =
                search?.trim() ||
                (!hierarchyId && circleFilter?.trim()
                    ? circleFilter.trim()
                    : undefined);

            const params = new URLSearchParams();
            params.append("page", page.toString());
            params.append("pageSize", pageSize.toString());
            if (scopedSearch) params.append("search", scopedSearch);
            if (hierarchyId) params.append("hierarchyId", hierarchyId);
            if (circleFilter?.trim()) {
                params.append("circle", circleFilter.trim());
            }

            const statsUrl = buildDtrStatsListApiUrl(
                BACKEND_URL,
                cardType,
                page,
                pageSize,
                scopedSearch,
                hierarchyId,
            );
            if (statsUrl) {
                if (circleFilter?.trim() && !statsUrl.includes("circle=")) {
                    const sep = statsUrl.includes("?") ? "&" : "?";
                    return `${statsUrl}${sep}circle=${encodeURIComponent(circleFilter.trim())}`;
                }
                return statsUrl;
            }

            switch (cardType) {
                case "communicating-meters":
                    return `${BACKEND_URL}/dtrs/communicating-meters?${params.toString()}`;
                case "non-communicating-meters":
                    return `${BACKEND_URL}/dtrs/non-communicating-meters?${params.toString()}`;
                default:
                    if (nonActionableCardTypes.includes(normalizedCardType)) {
                        return null;
                    }
                    throw new Error(`Unsupported card type: ${cardType}`);
            }
        },
        [cardType, hierarchyId, circleFilter, normalizedCardType],
    );

    const fetchAllRowsForExport = useCallback(async (): Promise<TableData[]> => {
        const search = searchTerm.trim() || undefined;
        const allRows: TableData[] = [];
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            const url = buildListApiUrl(page, EXPORT_FETCH_PAGE_SIZE, search);
            if (!url) break;

            const response = await fetch(url, { credentials: "include" });
            if (!response.ok) {
                throw new Error(
                    `Failed to fetch export data for ${normalizedCardType}`,
                );
            }

            const contentType = response.headers.get("content-type");
            if (!contentType?.includes("application/json")) {
                throw new Error("Invalid response format");
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(
                    data.message ||
                        `Failed to fetch export data for ${cardType}`,
                );
            }

            let rows: TableData[] = Array.isArray(data.data) ? data.data : [];
            if (isDtrStatsDrillType(normalizedCardType)) {
                rows = mapDtrStatsTableRows(
                    rows as Record<string, unknown>[],
                    page,
                    EXPORT_FETCH_PAGE_SIZE,
                ) as TableData[];
            }
            allRows.push(...rows);

            const pg = data.pagination;
            if (pg && typeof pg === "object") {
                hasNextPage = Boolean(pg.hasNextPage) && rows.length > 0;
                page = (pg.currentPage ?? page) + 1;
            } else {
                hasNextPage = false;
            }
        }

        return allRows;
    }, [
        buildListApiUrl,
        cardType,
        normalizedCardType,
        searchTerm,
    ]);

    const fetchData = useCallback(
        async (page: number = 1, pageSize: number = 10, search?: string) => {
            setLoading(true);
            try {
                if (!normalizedCardType) return;

                const url = buildListApiUrl(page, pageSize, search);
                if (!url) {
                    if (nonActionableCardTypes.includes(normalizedCardType)) {
                        safeSetTableData([]);
                        setServerPagination({
                            currentPage: 1,
                            totalPages: 1,
                            totalCount: 0,
                            limit: pageSize,
                            hasNextPage: false,
                            hasPrevPage: false,
                        });
                        setError(null);
                        setLoading(false);
                    }
                    return;
                }

                const response = await fetch(url, { credentials: "include" });
                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch data for ${normalizedCardType} (${response.status} ${response.statusText}) — ${url}`,
                    );
                }

                const contentType = response.headers.get("content-type");
                if (!contentType?.includes("application/json"))
                    throw new Error("Invalid response format");

                const data = await response.json();

                if (data.success) {
                    let rows = data.data || [];
                    const consumptionMetricCardTypes = new Set([
                        "daily-kw",
                        "daily-kwh",
                        "daily-kva",
                        "daily-kvah",
                        "daily-kvar",
                        "daily-kvarh",
                        "monthly-kw",
                        "monthly-kwh",
                        "monthly-kva",
                        "monthly-kvah",
                        "monthly-kvar",
                        "monthly-kvarh",
                    ]);

                    if (consumptionMetricCardTypes.has(normalizedCardType)) {
                        const isDaily = normalizedCardType.startsWith("daily-");
                        const metric = normalizedCardType.replace(
                            /^(daily|monthly)-/,
                            "",
                        );
                        const statsSource = isDaily
                            ? data.data?.row2?.currentDay
                            : data.data?.row2?.monthly;
                        const metricValues: Record<string, string | number> = {
                            kw: statsSource?.totalKw ?? 0,
                            kwh: statsSource?.totalKwh ?? 0,
                            kva: statsSource?.totalKva ?? 0,
                            kvah: statsSource?.totalKvah ?? 0,
                            kvar: statsSource?.totalKvar ?? 0,
                            kvarh: statsSource?.totalKvarh ?? 0,
                        };

                        rows = [
                            {
                                dtrId: "ALL",
                                dtrName: isDaily
                                    ? "Today Aggregated"
                                    : "Monthly Aggregated",
                                kw: metric === "kw" ? metricValues.kw : "-",
                                kwh: metric === "kwh" ? metricValues.kwh : "-",
                                kva: metric === "kva" ? metricValues.kva : "-",
                                kvah:
                                    metric === "kvah" ? metricValues.kvah : "-",
                                kvar:
                                    metric === "kvar" ? metricValues.kvar : "-",
                                kvarh:
                                    metric === "kvarh"
                                        ? metricValues.kvarh
                                        : "-",
                                previousReading: "-",
                                consumption: "-",
                                powerFactor: "-",
                                location: "All Locations",
                                timestamp:
                                    (isDaily
                                        ? data.data?.row2?.currentDay
                                              ?.latestKwTimestamp ||
                                          data.data?.row2?.currentDay
                                              ?.latestKvaTimestamp
                                        : null) || "-",
                            },
                        ];
                    }

                    // No client-side filter needed; backend returns filtered rows

                    const pagination = data.pagination;
                    const resolvedPage = pagination?.currentPage ?? page;
                    const resolvedLimit = pagination?.limit ?? pageSize;

                    const statsDrill = isDtrStatsDrillType(normalizedCardType);
                    const tableRows = hierarchyDetailView
                        ? rows.map((raw: TableData, idx: number) =>
                              mapRowToHierarchyDetailTableRow(
                                  raw as Record<string, unknown>,
                                  (resolvedPage - 1) * resolvedLimit + idx + 1,
                              ),
                          )
                        : statsDrill
                          ? rows.map((raw: TableData, idx: number) =>
                                mapApiRowToDtrStatsTableRow(
                                    raw as Record<string, unknown>,
                                    (resolvedPage - 1) * resolvedLimit +
                                        idx +
                                        1,
                                ),
                            )
                          : rows;

                    safeSetTableData(tableRows as TableData[]);

          // Derive pagination after filter
          if (pagination) {
            setServerPagination({
              currentPage: pagination.currentPage,
              totalPages: pagination.totalPages,
              totalCount: pagination.totalCount,
              limit: pagination.limit,
              hasNextPage: pagination.hasNextPage,
              hasPrevPage: pagination.hasPrevPage,
            });
          } else {
            // Fallback for endpoints without pagination object
            const totalFiltered = rows.length;
            setServerPagination({
              currentPage: 1,
              totalPages: 1,
              totalCount: totalFiltered,
              limit: totalFiltered,
              hasNextPage: false,
              hasPrevPage: false,
            });
          }
          setError(null);
        } else {
          throw new Error(data.message || `Failed to fetch data for ${cardType}`);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data. Please try again.');
        console.error(`❌ Error fetching ${cardType}:`, err);
      } finally {
        setLoading(false);
      }
    },
    [cardType, hierarchyId, buildListApiUrl, normalizedCardType, hierarchyDetailView]
  );

    useEffect(() => {
        if (!normalizedCardType) return;
        setTableData([]);
        setLoading(true);
        setError(null);
        setServerPagination({
            currentPage: 1,
            totalPages: 1,
            totalCount: 0,
            limit: 10,
            hasNextPage: false,
            hasPrevPage: false,
        });
        fetchData(1, 10);
    }, [normalizedCardType, fetchData]);

    const handleView = (row: TableData) => {
        if (!row) return;

        const statsType = normalizeDtrStatsCardType(normalizedCardType);

        if (statsType === "total-lt-feeders") {
            if (!row?.dtrNumber) return;
            const feederDtrId = String(row.dtrNumber).trim();
            if (!feederDtrId) return;
            navigate(`/feeder/${feederDtrId}`, {
                state: {
                    feederData: {
                        meterNumber: row.meterNumber ?? row.meterNo,
                        dtrId: feederDtrId,
                        dtrName: row.dtrNumber ?? row.dtrName,
                        location: row.dtrLocation ?? row.location,
                        communicationStatus: row.communicationStatus,
                        lastCommunicationDate: row.lastCommunicationDate,
                    },
                    dtrId: feederDtrId,
                    dtrName: row.dtrNumber ?? row.dtrName,
                },
            });
            return;
        }

        if (
            isDtrStatsDrillType(statsType) &&
            statsType !== "total-lt-feeders"
        ) {
            const dtrRouteId = resolveDtrDetailRouteParam(
                row as Record<string, unknown>,
            );
            if (!dtrRouteId) return;
            logDtrDetailRowClickDebug(row);
            navigate(`/dtr-detail/${dtrRouteId}`, {
                state: {
                    division: row.division,
                    subDivision: row.subDivision,
                    meterNo: row.meterNo,
                    meterNumber: row.meterNumber,
                },
            });
            return;
        }

        // For meter-related tables, navigate to meter search
        if (
            (normalizedCardType === "communicating-meters" ||
                normalizedCardType === "non-communicating-meters") &&
            row.meterNo != null
        ) {
            navigate(`/meters?search=${row.meterNo}`);
            return;
        }

        // For consumption-related tables, navigate to DTR detail if dtrId is available
        if (
            [
                "daily-kwh",
                "monthly-kwh",
                "daily-kvah",
                "monthly-kvah",
                "daily-kw",
                "monthly-kw",
                "daily-kva",
                "monthly-kva",
                "daily-kvar",
                "monthly-kvar",
                "daily-kvarh",
                "monthly-kvarh",
            ].includes(normalizedCardType || "")
        ) {
            const dtrRouteId = resolveDtrDetailRouteParam(
                row as Record<string, unknown>,
            );
            if (!dtrRouteId) return;
            logDtrDetailRowClickDebug(row);
            navigate(`/dtr-detail/${dtrRouteId}`, {
                state: {
                    division: row.division,
                    subDivision: row.subDivision,
                    meterNo: row.meterNo,
                    meterNumber: row.meterNumber,
                },
            });
            return;
        }
    };

  const handlePageChange = (page: number, limit?: number) => {
    const pageSize = limit ?? serverPagination.limit;
    setServerPagination((prev) => ({ ...prev, currentPage: page, limit: pageSize }));
    fetchData(page, pageSize, searchTerm.trim() || undefined);
  };

  const handleRowsPerPageChange = (limit: number) => {
    setServerPagination((prev) => ({ ...prev, currentPage: 1, limit }));
    fetchData(1, limit, searchTerm.trim() || undefined);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    fetchData(1, serverPagination.limit, value.trim() || undefined);
  };

  const handleExport = async () => {
    if (!normalizedCardType) return;
    setExportLoading(true);
    const fileBase =
      (cardTitle || normalizedCardType || "dtr-export")
        .replace(/[^\w\s-]+/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 80) || normalizedCardType;

    const runClientExport = (rows: TableData[]) => {
      const tableCols = getTableColumns();
      const sNoCol = tableCols.find((c) => c.label === "S.No");
      const otherCols = tableCols.filter((c) => c.label !== "S.No");

      const formatted = rows.map((row, index) => {
        // Ensure S.No is always present and always the first Excel column.
        const excelRow: Record<string, unknown> = {
          [sNoCol?.label || "S.No"]: index + 1,
        };

        otherCols.forEach((c) => {
          const key = (c as { key: string }).key;
          const label = String((c as { label: string }).label);
          excelRow[label] = (row as Record<string, unknown>)[key];
        });
        return excelRow;
      });

      exportToExcel(formatted, {
        fileName: fileBase,
        sheetName: (cardTitle || "Data").slice(0, 31),
      });
    };

    try {
      const allRows = await fetchAllRowsForExport();
      if (allRows.length === 0) {
        window.alert("No data available to export.");
        return;
      }
      runClientExport(allRows);
    } catch (err) {
      console.error("[DTRTable] Export", err);
      window.alert(
        err instanceof Error ? err.message : "Export failed. Please try again.",
      );
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Page
        sections={[
          ...(error
            ? [
                {
                  layout: {
                    type: 'column',
                    gap: 'gap-4',
                    rows: [
                      {
                        layout: 'column',
                        columns: [
                          {
                            name: 'Error',
                            props: {
                              visibleErrors: [error],
                              showRetry: true,
                              onRetry: () => fetchData(),
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              ]
            : []),
          {
            layout: {
              type: 'column',
              gap: 'gap-4',
              rows: [
                {
                  layout: 'row',
                  columns: [
                    {
                      name: 'PageHeader',
                      props: {
                        title: cardTitle,
                        onBackClick: () => navigate('/'),
                        backButtonText: 'Back to Dashboard',
                        buttonsLabel: 'Export',
                        variant: 'primary',
                        onClick: handleExport,
                        disabled: exportLoading,
                      },
                    },
                  ],
                },
              ],
            },
          },
          {
            layout: {
              type: 'column',
              gap: 'gap-4',
              rows: [
                {
                  layout: 'column',
                  columns: [
                    {
                      name: 'Table',
                      key: cardType || 'default',
                      props: {
                        data: tableData,
                        columns: getTableColumns(),
                        loading: loading || exportLoading,
                        searchable: true,
                        sortable: true,
                        pagination: true,
                        showHeader: true,
                        showActions: !nonActionableCardTypes.includes(cardType || ''),
                        onView: !nonActionableCardTypes.includes(cardType || '')
                          ? handleView
                          : undefined,
                        // onEdit: !nonActionableCardTypes.includes(cardType || '') ? handleEdit : undefined,
                        onRowClick: !nonActionableCardTypes.includes(cardType || '')
                          ? handleView
                          : undefined,
                        text: cardTitle,
                        className: 'w-full min-w-0 overflow-x-auto',
                        emptyMessage: `No ${cardTitle.toLowerCase()} data found`,
                        rowsPerPageOptions: [10, 20, 25, 50],
                        initialRowsPerPage: serverPagination.limit,
                        itemsPerPage: serverPagination.limit,
                        pageSize: serverPagination.limit,
                        currentPage: serverPagination.currentPage,
                        totalPages: serverPagination.totalPages,
                        totalCount: serverPagination.totalCount,
                        showSkeletonActionButtons: true,
                        onPageChange: handlePageChange,
                        onPageSizeChange: handleRowsPerPageChange,
                        onRowsPerPageChange: handleRowsPerPageChange,
                        onSearch: handleSearch,
                        serverPagination,
                      },
                    },
                  ],
                },
              ],
            },
          },
        ]}
      />
    </Suspense>
  );
};

export default DTRTable;
