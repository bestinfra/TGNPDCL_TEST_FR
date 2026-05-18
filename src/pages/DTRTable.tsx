import { lazy } from "react";
import React, {
    useState,
    useEffect,
    Suspense,
    useCallback,
    useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import BACKEND_URL from "../config";
import { exportToExcel } from "../utils/excelExport";
import {
    hierarchyDetailTableColumns,
    mapRowToHierarchyDetailTableRow,
} from "../utils/circleWiseExport";

const Page = lazy(() => import("SuperAdmin/Page"));

// Define TableData type locally since we're using federated components
interface TableData {
    [key: string]: string | number | boolean | null | undefined;
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

/** Max rows per export API request (matches circle-wise export pattern). */
const EXPORT_FETCH_PAGE_SIZE = 50_000;

const DTRTable: React.FC = () => {
  const navigate = useNavigate();
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardType, setCardType] = useState<string | null>(null);
  const [cardTitle, setCardTitle] = useState<string>('DTR Management');
  const [searchTerm, setSearchTerm] = useState('');
  const [hierarchyId, setHierarchyId] = useState<string | null>(null);
  const [hierarchyDetailView, setHierarchyDetailView] = useState(false);
    const normalizedCardType = useMemo(
        () => cardType?.toLowerCase() || "",
        [cardType],
    );
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
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const title = urlParams.get('title');
    const selectedHierarchyId = urlParams.get('hierarchyId') || urlParams.get('lastSelectedId');

    if (type) setCardType(type);
    if (title) setCardTitle(decodeURIComponent(title));
    if (selectedHierarchyId) setHierarchyId(selectedHierarchyId);
    setHierarchyDetailView(urlParams.get("view") === "hierarchy");
  }, []);

    const getTableColumns = () => {
        if (hierarchyDetailView) {
            return [...hierarchyDetailTableColumns];
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
            case "total-dtrs":
                return [
                    { key: "sNo", label: "S.No" },
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
            case "total-lt-feeders":
                return [
                    { key: "sNo", label: "S.No" },
                    { key: "dtrId", label: "DTR ID" },
                    { key: "dtrName", label: "DTR Name" },
                    { key: "meterNo", label: "Meter Number" },
                    {
                        key: "communicationStatus",
                        label: "Communication Status",
                    },
                    { key: "location", label: "Location" },
                    {
                        key: "lastCommunicationDate",
                        label: "Last Communication Date",
                    },

                    //{ key: 'installationDate', label: 'Installation Date' },
                ];
            case "fuse-blown":
            case "lt-fuse-blown":
            case "ht-fuse-blown":
                return [
                    { key: "slNo", label: "S.No" },
                    { key: "dtrId", label: "DTR ID" },
                    { key: "dtrName", label: "DTR Name" },
                    { key: "meterNo", label: "Meter Number" },
                    { key: "location", label: "Location" },
                    { key: "fuseType", label: "Fuse Type" },
                    {
                        key: "lastReadingDate",
                        label: "Last Communication Date",
                    },
                ];
            case "overloaded-feeders":
            case "underloaded-feeders":
                return [
                    { key: "slNo", label: "S.No" },
                    { key: "dtrId", label: "DTR ID" },
                    { key: "dtrName", label: "DTR Name" },
                    { key: "manufacturer", label: "Manufacturer" },
                    {
                        key: "communicationStatus",
                        label: "Communication Status",
                    },
                    { key: "feedersCount", label: "Feeders Count" },
                    { key: "capacity", label: "Capacity" },
                    { key: "loadPercentage", label: "Load %" },
                    { key: "location", label: "Location" },
                    { key: "lastCommunication", label: "Last Communication" },
                ];
            case "unbalanced-dtrs":
                return [
                    { key: "slNo", label: "S.No" },
                    { key: "dtrId", label: "DTR ID" },
                    { key: "dtrName", label: "DTR Name" },
                    { key: "location", label: "Location" },
                    {
                        key: "communicationStatus",
                        label: "Communication Status",
                    },
                    { key: "neutralCurrent", label: "Neutral Current" },
                    { key: "lastCommunication", label: "Last Communication" },
                ];
            case "power-failure-feeders":
                return [
                    { key: "slNo", label: "S.No" },
                    { key: "feederId", label: "DTR ID" },
                    { key: "feederName", label: "DTR Name" },
                    { key: "meterNo", label: "Meter Number" },
                    {
                        key: "communicationStatus",
                        label: "Communication Status",
                    },
                    { key: "location", label: "Location" },
                    { key: "failureTime", label: "Failure Time" },
                    { key: "lastCommunication", label: "Last Communication" },
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

            const params = new URLSearchParams();
            params.append("page", page.toString());
            params.append("pageSize", pageSize.toString());
            if (search) params.append("search", search);
            if (hierarchyId) params.append("hierarchyId", hierarchyId);

            switch (cardType) {
                case "total-dtrs":
                    return `${BACKEND_URL}/dtrs?${params.toString()}`;
                case "communicating-meters":
                    return `${BACKEND_URL}/dtrs/communicating-meters?${params.toString()}`;
                case "non-communicating-meters":
                    return `${BACKEND_URL}/dtrs/non-communicating-meters?${params.toString()}`;
                case "total-lt-feeders":
                    return `${BACKEND_URL}/dtrs/all-meters?${params.toString()}`;
                case "fuse-blown":
                    return `${BACKEND_URL}/dtrs/fuse-blown-meters?${params.toString()}`;
                case "overloaded-feeders":
                    return `${BACKEND_URL}/dtrs/overloaded-dtrs?${params.toString()}`;
                case "underloaded-feeders":
                    return `${BACKEND_URL}/dtrs/underloaded-dtrs?${params.toString()}`;
                case "ht-fuse-blown":
                    return `${BACKEND_URL}/dtrs/ht-fuse-blown?${params.toString()}`;
                case "lt-fuse-blown":
                    return `${BACKEND_URL}/dtrs/lt-fuse-blown?${params.toString()}`;
                case "unbalanced-dtrs":
                    return `${BACKEND_URL}/dtrs/unbalanced-dtrs?${params.toString()}`;
                case "power-failure-feeders":
                    return `${BACKEND_URL}/dtrs/power-failure-feeders?${params.toString()}`;
                default:
                    if (nonActionableCardTypes.includes(normalizedCardType)) {
                        return null;
                    }
                    throw new Error(`Unsupported card type: ${cardType}`);
            }
        },
        [cardType, hierarchyId, normalizedCardType],
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

            const rows: TableData[] = Array.isArray(data.data)
                ? data.data
                : [];
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

                console.log(
                    `[DTRTable] Fetching data for ${normalizedCardType} from: ${url}`,
                );
                console.log(`[DTRTable] Request params:`, {
                    page,
                    pageSize,
                    search,
                });

                const response = await fetch(url, { credentials: "include" });
                if (!response.ok)
                    throw new Error(
                        `Failed to fetch data for ${normalizedCardType}`,
                    );

                const contentType = response.headers.get("content-type");
                if (!contentType?.includes("application/json"))
                    throw new Error("Invalid response format");

                const data = await response.json();
                console.log(
                    `[DTRTable] Full API response for ${normalizedCardType}:`,
                    data,
                );

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

                    console.log(
                        `[DTRTable] Raw data for ${normalizedCardType}:`,
                        rows.length,
                        "rows",
                    );
                    console.log(`[DTRTable] Sample row:`, rows[0]);

                    // No client-side filter needed; backend returns filtered rows

                    const pagination = data.pagination;
                    const resolvedPage = pagination?.currentPage ?? page;
                    const resolvedLimit = pagination?.limit ?? pageSize;

                    const tableRows = hierarchyDetailView
                        ? rows.map((raw: TableData, idx: number) =>
                              mapRowToHierarchyDetailTableRow(
                                  raw as Record<string, unknown>,
                                  (resolvedPage - 1) * resolvedLimit + idx + 1,
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

        if (normalizedCardType === "total-lt-feeders") {
            const dtrId = row.dtrId;
            if (dtrId != null) {
                navigate(`/feeder/${dtrId}`, {
                    state: {
                        feederData: {
                            meterNumber: row.meterNo,
                            dtrId: dtrId,
                            dtrName: row.dtrName,
                            location: row.location,
                            communicationStatus: row.communicationStatus,
                            lastCommunicationDate: row.lastCommunicationDate,
                        },
                        dtrId: dtrId,
                        dtrName: row.dtrName,
                    },
                });
                return;
            }
        }

        // For DTR-related tables, navigate to DTR detail page
        if (
            [
                "total-dtrs",
                "fuse-blown",
                "ht-fuse-blown",
                "lt-fuse-blown",
                "overloaded-feeders",
                "underloaded-feeders",
                "unbalanced-dtrs",
                "power-failure-feeders",
            ].includes(normalizedCardType || "")
        ) {
            const dtrId = row.dtrId || row.feederId; // feederId is used for power-failure-feeders
            if (dtrId != null) {
                navigate(`/dtr-detail/${dtrId}`);
                return;
            }
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

        if (normalizedCardType === "fuse-blown" && row.meterNo != null) {
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
            if (row.dtrId != null) {
                navigate(`/dtr-detail/${row.dtrId}`);
                return;
            }
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
                        onBackClick: () => navigate('/dtr-dashboard'),
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
                        className: 'w-full',
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
