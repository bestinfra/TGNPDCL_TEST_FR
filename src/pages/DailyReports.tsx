import {
    lazy,
    Suspense,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/apiUtils";
import {
    DEFAULT_HIERARCHY_FILTER_VALUES,
    rebuildCascadeFilterOptions,
    type HierarchyFilterValues,
    type HierarchyLevelConfig,
} from "../utils/hierarchyFilters";

const Page = lazy(() => import("SuperAdmin/Page"));

type TableRow = Record<string, string | number | boolean | null | undefined>;

type FilterOption = { value: string; label: string };

type FilterOptionsState = {
    discoms: FilterOption[];
    circles: FilterOption[];
    divisions: FilterOption[];
    subDivisions: FilterOption[];
    sections: FilterOption[];
};

const INITIAL_FILTER_OPTIONS: FilterOptionsState = {
    discoms: [{ value: "all", label: "All DISCOMs" }],
    circles: [{ value: "all", label: "All Circles" }],
    divisions: [{ value: "all", label: "All Divisions" }],
    subDivisions: [{ value: "all", label: "All Sub-Divisions" }],
    sections: [{ value: "all", label: "All Sections" }],
};

const DEFAULT_FILTER_VALUES = {
    discom: "all",
    circle: "all",
    division: "all",
    subDivision: "all",
    section: "all",
};

type FilterValues = typeof DEFAULT_FILTER_VALUES;

const toHierarchyFilterValues = (
    values: FilterValues,
): HierarchyFilterValues => ({
    ...DEFAULT_HIERARCHY_FILTER_VALUES,
    ...values,
});

const HIERARCHY_LEVELS: readonly HierarchyLevelConfig[] = [
    {
        filterName: "discom",
        levelName: "DISCOM",
        optionKey: "discoms",
        allLabel: "All DISCOMs",
    },
    {
        filterName: "circle",
        levelName: "Circle",
        optionKey: "circles",
        allLabel: "All Circles",
    },
    {
        filterName: "division",
        levelName: "Division",
        optionKey: "divisions",
        allLabel: "All Divisions",
    },
    {
        filterName: "subDivision",
        levelName: "Sub division",
        optionKey: "subDivisions",
        allLabel: "All Sub-Divisions",
    },
    {
        filterName: "section",
        levelName: "Section",
        optionKey: "sections",
        allLabel: "All Sections",
    },
];

type HierarchyApiItem = {
    id: number;
    name: string;
    levelName?: string;
    parentId?: number | null;
};

const normalizeLevelName = (levelName: string): string =>
    levelName.toLowerCase().replace(/[\s-]/g, "");

const FILTER_ROW_CLASS =
    "flex items-center gap-5 justify-center w-full border gap-5 border-primary-border dark:border-dark-border rounded-3xl p-4 bg-background-secondary dark:bg-primary-dark-light";

const disableDate = (current: { valueOf: () => number }) => {
    if (!current) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDate = new Date(current.valueOf());
    currentDate.setHours(0, 0, 0, 0);
    return currentDate > today;
};

const getTodayStr = () => {
    const t = new Date();
    const year = t.getFullYear();
    const month = String(t.getMonth() + 1).padStart(2, "0");
    const day = String(t.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatDateForAPI = (dateValue: unknown): string => {
    if (!dateValue) return "";

    if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
    }

    if (
        dateValue &&
        typeof dateValue === "object" &&
        "format" in dateValue &&
        typeof (dateValue as { format: (f: string) => string }).format ===
            "function"
    ) {
        return (dateValue as { format: (f: string) => string }).format(
            "YYYY-MM-DD",
        );
    }

    if (dateValue instanceof Date) {
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, "0");
        const day = String(dateValue.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    if (typeof dateValue === "string") {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        }

        const ddmmyyyyMatch = dateValue.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (ddmmyyyyMatch) {
            const [, day, month, year] = ddmmyyyyMatch;
            return `${year}-${month}-${day}`;
        }
        const yyyymmddMatch = dateValue.match(/(\d{4})\/(\d{2})\/(\d{2})/);
        if (yyyymmddMatch) {
            const [, year, month, day] = yyyymmddMatch;
            return `${year}-${month}-${day}`;
        }
    }

    return "";
};

const TABLE_DATA_KEYS_EXCLUDED = new Set(["id"]);

/** Prefer API field order when present; append any other keys from payload. */
function buildTableColumnsFromRows(
    rows: TableRow[],
): { key: string; label: string; sortable: boolean; searchable: boolean }[] {
    const keys = new Set<string>();
    rows.forEach((row) => {
        Object.keys(row).forEach((key) => {
            if (!TABLE_DATA_KEYS_EXCLUDED.has(key)) {
                keys.add(key);
            }
        });
    });

    const apiOrder = rows[0] ? Object.keys(rows[0]) : [];
    const ordered: string[] = [];
    apiOrder.forEach((key) => {
        if (keys.has(key) && !ordered.includes(key)) {
            ordered.push(key);
        }
    });
    keys.forEach((key) => {
        if (!ordered.includes(key)) {
            ordered.push(key);
        }
    });

    const slNoIndex = ordered.indexOf("slNo");
    if (slNoIndex > 0) {
        ordered.splice(slNoIndex, 1);
        ordered.unshift("slNo");
    }

    return ordered.map((key) => ({
        key,
        label: key,
        sortable: true,
        searchable: true,
    }));
}

function normalizeMatchValue(value: unknown): string {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function getFilterLabel(
    options: FilterOption[],
    value: string,
): string | null {
    if (value === "all") return null;
    const normalized = value.toString();
    const match = options.find((o) => o.value.toString() === normalized);
    return match?.label?.trim() ?? null;
}

function getHierarchyLabel(
    originalApiData: HierarchyApiItem[],
    filterOptions: FilterOptionsState,
    filterName: keyof FilterValues,
    value: string,
): string | null {
    if (value === "all") return null;
    const normalized = value.toString();
    const fromApi = originalApiData.find(
        (item) => item.id.toString() === normalized,
    );
    if (fromApi?.name?.trim()) return fromApi.name.trim();

    const optionKey = HIERARCHY_LEVELS.find(
        (level) => level.filterName === filterName,
    )?.optionKey as keyof FilterOptionsState | undefined;
    if (!optionKey) return null;
    return getFilterLabel(filterOptions[optionKey], normalized);
}

function applyHierarchyFilters(
    rows: TableRow[],
    filterValues: FilterValues,
    filterOptions: FilterOptionsState,
    originalApiData: HierarchyApiItem[],
): TableRow[] {
    const discomLabel = getHierarchyLabel(
        originalApiData,
        filterOptions,
        "discom",
        filterValues.discom,
    );
    const circleLabel = getHierarchyLabel(
        originalApiData,
        filterOptions,
        "circle",
        filterValues.circle,
    );
    const divisionLabel = getHierarchyLabel(
        originalApiData,
        filterOptions,
        "division",
        filterValues.division,
    );
    const subDivisionLabel = getHierarchyLabel(
        originalApiData,
        filterOptions,
        "subDivision",
        filterValues.subDivision,
    );
    const sectionLabel = getHierarchyLabel(
        originalApiData,
        filterOptions,
        "section",
        filterValues.section,
    );

    return rows.filter((row) => {
        if (
            discomLabel &&
            normalizeMatchValue(row.discom) !== normalizeMatchValue(discomLabel)
        ) {
            return false;
        }
        if (
            circleLabel &&
            normalizeMatchValue(row.circle) !== normalizeMatchValue(circleLabel)
        ) {
            return false;
        }
        if (
            divisionLabel &&
            normalizeMatchValue(row.division) !==
                normalizeMatchValue(divisionLabel)
        ) {
            return false;
        }
        if (
            subDivisionLabel &&
            normalizeMatchValue(row.subDivision) !==
                normalizeMatchValue(subDivisionLabel)
        ) {
            return false;
        }
        if (
            sectionLabel &&
            normalizeMatchValue(row.section) !== normalizeMatchValue(sectionLabel)
        ) {
            return false;
        }
        return true;
    });
}

const DailyReports: React.FC = () => {
    const navigate = useNavigate();
    const [filterOptions, setFilterOptions] =
        useState<FilterOptionsState>(INITIAL_FILTER_OPTIONS);
    const [filterValues, setFilterValues] =
        useState<FilterValues>(DEFAULT_FILTER_VALUES);
    const [originalApiData, setOriginalApiData] = useState<HierarchyApiItem[]>(
        [],
    );
    const filterStateRef = useRef({
        filterValues: DEFAULT_FILTER_VALUES,
        filterOptions: INITIAL_FILTER_OPTIONS,
        allReportData: [] as TableRow[],
        originalApiData: [] as HierarchyApiItem[],
    });
    const [dropdownLoading, setDropdownLoading] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: getTodayStr(),
        end: getTodayStr(),
    });
    const [dateToggleSelection, setDateToggleSelection] = useState<
        "today" | "yesterday"
    >("today");
    const [allReportData, setAllReportData] = useState<TableRow[]>([]);
    const [tableData, setTableData] = useState<TableRow[]>([]);
    const [isTableLoading, setIsTableLoading] = useState(true);
    const [failedApis, setFailedApis] = useState<
        Array<{
            id: string;
            name: string;
            retryFunction: () => void | Promise<void>;
            errorMessage: string;
        }>
    >([]);

    const tableColumns = useMemo(
        () => buildTableColumnsFromRows(allReportData),
        [allReportData],
    );

    useEffect(() => {
        filterStateRef.current = {
            filterValues,
            filterOptions,
            allReportData,
            originalApiData,
        };
    }, [filterValues, filterOptions, allReportData, originalApiData]);

    useEffect(() => {
        if (!originalApiData.length) return;
        setFilterOptions((prev) => ({
            ...prev,
            ...rebuildCascadeFilterOptions(
                originalApiData,
                toHierarchyFilterValues(filterValues),
                HIERARCHY_LEVELS,
            ),
        }));
    }, [filterValues, originalApiData]);

    const fetchDailyConsumption = useCallback(
        async (dateOverride?: { start: string; end: string }) => {
        setIsTableLoading(true);
        try {
            const fromDate = formatDateForAPI(
                dateOverride?.start ?? dateRange.start,
            );
            const toDate = formatDateForAPI(dateOverride?.end ?? dateRange.end);
            const params = new URLSearchParams();
            if (fromDate) params.append("fromDate", fromDate);
            if (toDate) params.append("toDate", toDate);
            const query = params.toString();
            const endpoint = query
                ? `/consumption/daily-consumption?${query}`
                : "/consumption/daily-consumption";

            const data = await apiClient.get(endpoint);
            if (data?.success) {
                const rows = (data.data || []) as TableRow[];
                setAllReportData(rows);
                setTableData(rows);
                setFailedApis((prev) =>
                    prev.filter((api) => api.id !== "dailyConsumption"),
                );
            } else {
                throw new Error(
                    data?.message || "Failed to fetch daily consumption reports",
                );
            }
        } catch (error) {
            console.error("Error fetching daily consumption:", error);
            setAllReportData([]);
            setTableData([]);
            setFailedApis((prev) => {
                if (!prev.find((api) => api.id === "dailyConsumption")) {
                    return [
                        ...prev,
                        {
                            id: "dailyConsumption",
                            name: "Daily Reports",
                            retryFunction: fetchDailyConsumption,
                            errorMessage:
                                "Failed to load Daily Reports. Please try again.",
                        },
                    ];
                }
                return prev;
            });
        } finally {
            setIsTableLoading(false);
        }
    },
        [dateRange.start, dateRange.end],
    );

    const fetchFilterOptions = useCallback(async () => {
        setDropdownLoading(true);
        try {
            const data = await apiClient.get("/dtrs/filter/filter-options");
            if (!data?.success) {
                throw new Error(data?.message || "Failed to fetch filter options");
            }

            const apiData = data.data || [];
            setOriginalApiData(apiData);

            const cascaded = rebuildCascadeFilterOptions(
                apiData,
                toHierarchyFilterValues(DEFAULT_FILTER_VALUES),
                HIERARCHY_LEVELS,
            );
            setFilterOptions({
                discoms: cascaded.discoms,
                circles: cascaded.circles,
                divisions: cascaded.divisions,
                subDivisions: cascaded.subDivisions,
                sections: cascaded.sections,
            });
            setFailedApis((prev) =>
                prev.filter((api) => api.id !== "filterOptions"),
            );
        } catch (error) {
            console.error("Error fetching filter options:", error);
            setFailedApis((prev) => {
                if (!prev.find((api) => api.id === "filterOptions")) {
                    return [
                        ...prev,
                        {
                            id: "filterOptions",
                            name: "Filter Options",
                            retryFunction: fetchFilterOptions,
                            errorMessage:
                                "Failed to load Filter Options. Please try again.",
                        },
                    ];
                }
                return prev;
            });
        } finally {
            setDropdownLoading(false);
        }
    }, []);

    const findAllParentValues = (
        childFilterName: keyof FilterValues,
        childValue: string,
    ) => {
        if (childValue === "all" || !originalApiData.length) return {};

        const childLevel = HIERARCHY_LEVELS.find(
            (level) => level.filterName === childFilterName,
        );
        if (!childLevel) return {};

        const normalizedChildLevel = normalizeLevelName(childLevel.levelName);
        const childItem = originalApiData.find(
            (item) =>
                normalizeLevelName(item.levelName ?? "") ===
                    normalizedChildLevel &&
                item.id.toString() === childValue.toString(),
        );
        if (!childItem) return {};

        const parentValues: Partial<Record<keyof FilterValues, string>> = {};
        let currentItem = childItem;
        let currentLevelIndex = HIERARCHY_LEVELS.findIndex(
            (level) => level.filterName === childFilterName,
        );

        while (currentItem?.parentId && currentLevelIndex > 0) {
            const parentLevel = HIERARCHY_LEVELS[currentLevelIndex - 1];
            const normalizedParentLevel = normalizeLevelName(
                parentLevel.levelName,
            );
            const parentItem = originalApiData.find(
                (item) =>
                    normalizeLevelName(item.levelName ?? "") ===
                        normalizedParentLevel &&
                    item.id.toString() ===
                        currentItem.parentId?.toString(),
            );
            if (parentItem) {
                const parentKey = parentLevel.filterName as keyof FilterValues;
                parentValues[parentKey] = parentItem.id.toString();
                currentItem = parentItem;
                currentLevelIndex--;
            } else {
                break;
            }
        }

        return parentValues;
    };

    const resetChildFilterValues = (
        values: FilterValues,
        filterName: keyof FilterValues,
    ): FilterValues => {
        const levelIndex = HIERARCHY_LEVELS.findIndex(
            (level) => level.filterName === filterName,
        );
        if (levelIndex < 0) return values;
        const next = { ...values };
        for (let i = levelIndex + 1; i < HIERARCHY_LEVELS.length; i++) {
            const childKey = HIERARCHY_LEVELS[i]
                .filterName as keyof FilterValues;
            next[childKey] = "all";
        }
        return next;
    };

    const handleFilterChange = (
        filterName: keyof FilterValues,
        value: string | { target: { value: string } },
    ) => {
        const selectedValue =
            typeof value === "string" ? value : value.target.value;

        setFilterValues((prev) => {
            const parentValues = findAllParentValues(filterName, selectedValue);
            return resetChildFilterValues(
                {
                    ...prev,
                    [filterName]: selectedValue,
                    ...parentValues,
                },
                filterName,
            );
        });
    };

    const handleGetData = useCallback(() => {
        const {
            filterValues: currentFilters,
            filterOptions: currentOptions,
            allReportData: currentData,
            originalApiData: hierarchyData,
        } = filterStateRef.current;
        setTableData(
            applyHierarchyFilters(
                currentData,
                currentFilters,
                currentOptions,
                hierarchyData,
            ),
        );
    }, []);

    const handlePageHeaderDateRangeChange = (
        datesOrStart: unknown,
        dateStringsOrEnd?: [string, string] | string | null,
    ) => {
        let startDate = "";
        let endDate = "";

        if (
            dateStringsOrEnd &&
            Array.isArray(dateStringsOrEnd) &&
            dateStringsOrEnd.length === 2 &&
            dateStringsOrEnd[0] &&
            dateStringsOrEnd[1]
        ) {
            startDate = formatDateForAPI(dateStringsOrEnd[0]);
            endDate = formatDateForAPI(dateStringsOrEnd[1]);
        } else if (
            typeof datesOrStart === "string" &&
            typeof dateStringsOrEnd === "string"
        ) {
            startDate = formatDateForAPI(datesOrStart);
            endDate = formatDateForAPI(dateStringsOrEnd);
        } else if (
            datesOrStart &&
            Array.isArray(datesOrStart) &&
            datesOrStart.length === 2 &&
            datesOrStart[0] &&
            datesOrStart[1]
        ) {
            startDate = formatDateForAPI(datesOrStart[0]);
            endDate = formatDateForAPI(datesOrStart[1]);
        } else if (
            datesOrStart &&
            typeof datesOrStart === "object" &&
            "start" in datesOrStart &&
            "end" in datesOrStart
        ) {
            const range = datesOrStart as { start: unknown; end: unknown };
            startDate = formatDateForAPI(range.start);
            endDate = formatDateForAPI(range.end);
        } else if (
            !datesOrStart ||
            (Array.isArray(datesOrStart) && datesOrStart.length === 0)
        ) {
            return;
        }

        if (
            startDate &&
            endDate &&
            /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
            /^\d{4}-\d{2}-\d{2}$/.test(endDate)
        ) {
            setDateRange({ start: startDate, end: endDate });
        }
    };

    const handleResetFilters = useCallback(async () => {
        const today = getTodayStr();
        setDateToggleSelection("today");
        setDateRange({ start: today, end: today });
        setFilterValues(DEFAULT_FILTER_VALUES);
        await fetchFilterOptions();
        await fetchDailyConsumption({ start: today, end: today });
    }, [fetchFilterOptions, fetchDailyConsumption]);

    const retrySpecificAPI = (apiId: string) => {
        const api = failedApis.find((a) => a.id === apiId);
        if (api) {
            void api.retryFunction();
        }
    };

    useEffect(() => {
        void fetchFilterOptions();
    }, [fetchFilterOptions]);

    useEffect(() => {
        if (dateRange.start && dateRange.end) {
            void fetchDailyConsumption();
        }
    }, [fetchDailyConsumption]);

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Page
                sections={[
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
                                    title: "Daily Reports",
                                    onBackClick: () => navigate("/"),
                                    backButtonText: "Back to Dashboard",
                                    showDateToggle: true,
                                    dateToggleProps: {
                                        value: dateToggleSelection,
                                        onChange: (value: "today" | "yesterday") => {
                                            setDateToggleSelection(value);
                                            const t = new Date();
                                            const target = new Date(t);
                                            if (value === "yesterday") {
                                                target.setDate(t.getDate() - 1);
                                            }
                                            const dateStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
                                            setDateRange({
                                                start: dateStr,
                                                end: dateStr,
                                            });
                                        },
                                        options: [
                                            { value: "today", label: "Today" },
                                            {
                                                value: "yesterday",
                                                label: "Yesterday",
                                            },
                                        ],
                                        selectedClassName:
                                            "bg-white dark:bg-primary-dark-light",
                                        className:
                                            "bg-background-secondary dark:bg-primary-dark-light",
                                    },
                                    showRangePicker: true,
                                    rangePicker: {
                                        onChange: handlePageHeaderDateRangeChange,
                                        dateFormat: "YYYY-MM-DD",
                                        picker: "date",
                                        startDate: dateRange.start,
                                        endDate: dateRange.end,
                                        disabledDate: disableDate,
                                        id: {
                                            start: "dailyReportsStartInput",
                                            end: "dailyReportsEndInput",
                                        },
                                    },
                                },
                            },
                        ],
                    },
                    {
                        layout: {
                            type: "flex" as const,
                            direction: "row" as const,
                            gap: "gap-4",
                            columns: 1,
                            className: "w-full flex flex-col gap-4",
                            rows: [
                                {
                                    layout: "flex" as const,
                                    direction: "row" as const,
                                    gap: "gap-4",
                                    className: FILTER_ROW_CLASS,
                                    columns: [
                                        {
                                            name: "Dropdown",
                                            props: {
                                                options: filterOptions.discoms,
                                                value: filterValues.discom,
                                                onChange: (value: string) =>
                                                    void handleFilterChange(
                                                        "discom",
                                                        value,
                                                    ),
                                                placeholder: "Select DISCOM",
                                                loading: dropdownLoading,
                                                searchable: false,
                                            },
                                        },
                                        {
                                            name: "Dropdown",
                                            props: {
                                                options: filterOptions.circles,
                                                value: filterValues.circle,
                                                onChange: (value: string) =>
                                                    void handleFilterChange(
                                                        "circle",
                                                        value,
                                                    ),
                                                placeholder: "Select Circle",
                                                loading: dropdownLoading,
                                                searchable: false,
                                            },
                                        },
                                        {
                                            name: "Dropdown",
                                            props: {
                                                options:
                                                    filterOptions.divisions,
                                                value: filterValues.division,
                                                onChange: (value: string) =>
                                                    void handleFilterChange(
                                                        "division",
                                                        value,
                                                    ),
                                                placeholder: "Select Division",
                                                loading: dropdownLoading,
                                                searchable: false,
                                            },
                                        },
                                        {
                                            name: "Dropdown",
                                            props: {
                                                options:
                                                    filterOptions.subDivisions,
                                                value: filterValues.subDivision,
                                                onChange: (value: string) =>
                                                    void handleFilterChange(
                                                        "subDivision",
                                                        value,
                                                    ),
                                                placeholder:
                                                    "Select Sub-Division",
                                                loading: dropdownLoading,
                                                searchable: false,
                                            },
                                        },
                                        {
                                            name: "Dropdown",
                                            props: {
                                                options: filterOptions.sections,
                                                value: filterValues.section,
                                                onChange: (value: string) =>
                                                    void handleFilterChange(
                                                        "section",
                                                        value,
                                                    ),
                                                placeholder: "Select Section",
                                                loading: dropdownLoading,
                                                searchable: false,
                                            },
                                        },
                                        {
                                            name: "Button",
                                            props: {
                                                onClick: handleGetData,
                                                variant: "primary",
                                                children: "Get Data",
                                                className: "h-10 self-end",
                                                searchable: false,
                                            },
                                            align: "center",
                                        },
                                        {
                                            name: "Button",
                                            props: {
                                                onClick: () =>
                                                    void handleResetFilters(),
                                                variant: "secondary",
                                                children: "Reset",
                                                className: "h-10 self-end",
                                                searchable: false,
                                            },
                                            align: "center",
                                        },
                                    ],
                                },
                                {
                                    layout: "grid",
                                    gridColumns: 1,
                                    gap: "gap-4",
                                    className: "pb-4",
                                    columns: [
                                        {
                                            name: "Table",
                                            props: {
                                                data: tableData,
                                                columns: tableColumns,
                                                headerTitle: "Daily Reports",
                                                showHeader: true,
                                                availableTimeRanges: [],
                                                loading: isTableLoading,
                                                emptyMessage:
                                                    "No Reports Available",
                                                showSearch: true,
                                                sortable: true,
                                                pagination: true,
                                                showPagination: true,
                                                initialRowsPerPage: 20,
                                                rowsPerPageOptions: [
                                                    10, 20, 50, 100,
                                                ],
                                                showActions: true,
                                                actionsColumnLabel: "Actions",
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

export default DailyReports;
