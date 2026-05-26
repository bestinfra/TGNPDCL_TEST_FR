import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { lazy } from "react";
import { useNavigate } from "react-router-dom";
import BACKEND_URL from "../config";
import {
    fetchAssetBulkUploadTemplateMeta,
    postAssetsBulkUpload,
} from "../api/apiUtils";
import { downloadConsumerBulkUploadTemplateXlsx } from "../utils/excelExport";
import { fetchAllPaginatedRows } from "../utils/exportPagedData";
import { createLocationHierarchyFilterSection } from "../components/locationHierarchyFilterSection";
import { COMMUNICATION_STATUS_FILTER_OPTIONS } from "../constants/locationHierarchy";
import { useLocationHierarchyFilterBar } from "../hooks/useLocationHierarchyFilterBar";

const METER_FILTER_OPTIONS = [
    { value: "all", label: "All Meters" },
    { value: "mapped", label: "Mapped" },
    { value: "unmapped", label: "Unmapped" },
] as const;

const Page = lazy(() => import("SuperAdmin/Page"));

interface HierarchyNode {
    hierarchy_id: string | number;
    hierarchy_name: string;
    hierarchy_type_title: string;
    children?: HierarchyNode[];
}

// interface DiscomOption {
//     id: string | number;
//     name: string;
//     code: string;
//     region: string;
// }

// interface CircleOption {
//     id: string | number;
//     name: string;
//     code: string;
//     discom_id: string | number;
// }

// interface DivisionOption {
//     id: string | number;
//     name: string;
//     code: string;
//     circle_id: string | number;
// }

// interface SubDivisionOption {
//     id: string | number;
//     name: string;
//     code: string;
//     division_id: string | number;
// }

// interface SectionOption {
//     id: string | number;
//     name: string;
//     code: string;
//     sub_division_id: string | number;
// }

// interface MeterLocationOption {
//     id: string | number;
//     name: string;
//     code: string;
//     description: string;
// }

// interface DropdownData {
//     discoms: DiscomOption[];
//     circles: CircleOption[];
//     divisions: DivisionOption[];
//     subDivisions: SubDivisionOption[];
//     sections: SectionOption[];
//     meterLocations: MeterLocationOption[];
// }

const PlusIcon = () => (
    <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
        />
    </svg>
);

const ListIcon = () => (
    <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
        />
    </svg>
);

const DownloadIcon = () => (
    <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
    </svg>
);

export default function Meters() {
    const navigate = useNavigate();
    const [bulkFlowLoading, setBulkFlowLoading] = useState(false);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [bulkUploadErrors, setBulkUploadErrors] = useState<string[]>([]);
    const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [hierarchicalData, setHierarchicalData] = useState<HierarchyNode[]>(
        [],
    );
    // State for tracking failed APIs
    const [failedApis, setFailedApis] = useState<
        Array<{
            id: string;
            name: string;
            retryFunction: (lastSelectedId?: string) => Promise<void>;
            errorMessage: string;
        }>
    >([]);
    const [viewMode, setViewMode] = useState<"hierarchy" | "table">("table");
    const [meterTableData, setMeterTableData] = useState<any[]>([]);
    const [isLoadingMeterData, setIsLoadingMeterData] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    /** Page size for /dtrs/all-meters; Table footer uses serverPagination from API. */
    const [meterTableLimit, setMeterTableLimit] = useState(20);
    const [serverPagination, setServerPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 20,
        hasNextPage: false,
        hasPrevPage: false,
    });
    const [isExporting, setIsExporting] = useState(false);
    const [communicationStatus, setCommunicationStatus] = useState("all");
    const [meterFilter, setMeterFilter] = useState("all");
    const meterFilterRef = useRef("all");
    const [isSubNodeChecked, setIsSubNodeChecked] = useState(false);

    const {
        filterOptions,
        isFiltersLoading,
        isFiltersReady,
        filterValues,
        lastSelectedId,
        handleFilterChange: handleHierarchyFilterChange,
        applyCurrentFilters,
        resetLocationFilters,
    } = useLocationHierarchyFilterBar({
        autoSelectDefaultDiscom: true,
        reportFilterError: (retry) => {
            setFailedApis((prev) => {
                if (prev.find((api) => api.id === "filterOptions")) return prev;
                return [
                    ...prev,
                    {
                        id: "filterOptions",
                        name: "Filter Options",
                        retryFunction: retry,
                        errorMessage:
                            "Failed to load Filter Options. Please try again.",
                    },
                ];
            });
        },
        clearFilterError: () =>
            setFailedApis((prev) =>
                prev.filter((api) => api.id !== "filterOptions"),
            ),
    });

    // Asset management menu items
    const assetManagementActions = [
        { id: "view", label: "View", icon: "icons/eye.svg" },
    ];

    // Handle view feeder action
    const handleViewFeeder = (row: any) => {
        const meterNumber = row.meterNo || row.meterNumber;
        const dtrId = row.dtrId;
        const validDtrId =
            dtrId && dtrId !== "N/A" && String(dtrId).trim() !== ""
                ? String(dtrId)
                : null;

        if (meterNumber && meterNumber !== "N/A") {
            // Prefer DTR route when available; always pass feederId in state for feeder-specific APIs.
            navigate(`/feeder/${validDtrId || meterNumber}`, {
                state: {
                    feederData: {
                        feederName: meterNumber,
                        dtrNumber: validDtrId || "N/A",
                    },
                    dtrId: validDtrId || undefined,
                    feederId: meterNumber,
                },
            });
        }
    };

    // Handle asset actions
    const handleAssetAction = (actionId: string, row: any) => {
        switch (actionId) {
            case "view":
                handleViewFeeder(row);
                break;
            default:
        }
    };

    // Handle menu item click for view mode toggle
    const handleMenuClick = (menuId: string) => {
        switch (menuId) {
            case "Table View":
                setViewMode("table");
                break;
            case "HierarchyView":
                setViewMode("hierarchy");
                break;
            default:
        }
    };

    // Retry function for assets API
    const retryAssetsAPI = async (lastSelectedId?: string) => {
        try {
            let url = `${BACKEND_URL}/assets`;

            // Add hierarchy filter if available
            if (lastSelectedId) {
                url += `?hierarchyId=${lastSelectedId}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setHierarchicalData(data.data || []);
                setFailedApis((prev) =>
                    prev.filter((api) => api.id !== "assets"),
                );
            } else {
                throw new Error(data.message || "Failed to fetch assets");
            }
        } catch (error) {
            console.error("Error in Assets API:", error);
            setFailedApis((prev) => {
                if (!prev.find((api) => api.id === "assets")) {
                    return [
                        ...prev,
                        {
                            id: "assets",
                            name: "Assets",
                            retryFunction: retryAssetsAPI,
                            errorMessage:
                                "Failed to load Assets. Please try again.",
                        },
                    ];
                }
                return prev;
            });
        }
    };

    // Fetch hierarchical assets from API
    const fetchAssets = async (lastSelectedId?: string | null) => {
        try {
            let url = `${BACKEND_URL}/assets`;

            // Add hierarchy filter if available
            if (lastSelectedId) {
                url += `?hierarchyId=${lastSelectedId}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                setHierarchicalData(data.data || []);
                setFailedApis((prev) =>
                    prev.filter((api) => api.id !== "assets"),
                );
            } else {
                throw new Error(data.message || "Failed to fetch assets");
            }
        } catch (error) {
            console.error("Error fetching assets:", error);
            setFailedApis((prev) => {
                if (!prev.find((api) => api.id === "assets")) {
                    return [
                        ...prev,
                        {
                            id: "assets",
                            name: "Assets",
                            retryFunction: retryAssetsAPI,
                            errorMessage:
                                "Failed to load Assets. Please try again.",
                        },
                    ];
                }
                return prev;
            });
        }
    };

    useEffect(() => {
        setTimeout(() => {
            fetchAssets();
        }, 1000);
    }, []);

    const applyMeterPaginationFromResponse = (
        pagination: any,
        pageRequested: number,
        limitRequested: number,
    ) => {
        const lim = pagination?.limit ?? limitRequested;
        setMeterTableLimit(lim);
        setServerPagination({
            currentPage: pagination?.currentPage ?? pageRequested,
            totalPages: pagination?.totalPages ?? 1,
            totalCount: pagination?.totalCount ?? 0,
            limit: lim,
            hasNextPage: pagination?.hasNextPage ?? false,
            hasPrevPage: pagination?.hasPrevPage ?? false,
        });
        setCurrentPage(pagination?.currentPage ?? pageRequested);
    };

    const handleMeterTablePageChange = (page: number, limit?: number) => {
        const lim =
            typeof limit === "number" && limit > 0 ? limit : meterTableLimit;
        setCurrentPage(page);
        if (lim !== meterTableLimit) {
            setMeterTableLimit(lim);
        }
        fetchMeterData(page, lim, "", lastSelectedId, meterFilterRef.current);
    };

    const handleMeterTableRowsPerPageChange = (limit: number) => {
        setMeterTableLimit(limit);
        setCurrentPage(1);
        fetchMeterData(1, limit, "", lastSelectedId, meterFilterRef.current);
    };

    // Retry function for meter data API
    const retryMeterDataAPI = async (lastSelectedId?: string) => {
        setIsLoadingMeterData(true);
        try {
            const queryParams = new URLSearchParams({
                page: currentPage.toString(),
                pageSize: String(meterTableLimit),
            });

            // Add lastSelectedId if available
            if (lastSelectedId) {
                queryParams.append("hierarchyId", lastSelectedId);
            }
            if (communicationStatus && communicationStatus !== "all") {
                queryParams.append("communicationStatus", communicationStatus);
            }
            queryParams.append(
                "mappingStatus",
                meterFilterRef.current === "all"
                    ? "all"
                    : meterFilterRef.current,
            );

            const response = await fetch(
                `${BACKEND_URL}/dtrs/all-meters?${queryParams}`,
                {
                    method: "GET",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );

            const data = await response.json();

            if (data.success) {
                setMeterTableData(data.data || []);
                applyMeterPaginationFromResponse(
                    data.pagination,
                    currentPage,
                    meterTableLimit,
                );
                setFailedApis((prev) =>
                    prev.filter((api) => api.id !== "meterData"),
                );
            } else {
                throw new Error(data.message || "Failed to fetch meter data");
            }
        } catch (error) {
            console.error("Error in Meter Data API:", error);
            setFailedApis((prev) => {
                if (!prev.find((api) => api.id === "meterData")) {
                    return [
                        ...prev,
                        {
                            id: "meterData",
                            name: "Meter Data",
                            retryFunction: retryMeterDataAPI,
                            errorMessage:
                                "Failed to load Meter Data. Please try again.",
                        },
                    ];
                }
                return prev;
            });
        } finally {
            setIsLoadingMeterData(false);
        }
    };

    // Fetch meter data from new API endpoint
    const fetchMeterData = async (
        page = 1,
        pageSize = 20,
        search = "",
        lastSelectedId?: string | null,
        mappingStatusParam?: string,
    ) => {
        const effectiveMappingStatus = mappingStatusParam ?? meterFilter;
        setIsLoadingMeterData(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                ...(search && { search }),
            });

            // Add lastSelectedId if available
            if (lastSelectedId) {
                queryParams.append("hierarchyId", lastSelectedId);
            }
            if (communicationStatus && communicationStatus !== "all") {
                queryParams.append("communicationStatus", communicationStatus);
            }
            queryParams.append(
                "mappingStatus",
                effectiveMappingStatus === "all"
                    ? "all"
                    : effectiveMappingStatus,
            );

            const response = await fetch(
                `${BACKEND_URL}/dtrs/all-meters?${queryParams}`,
                {
                    method: "GET",
                    credentials: "include", // Include cookies for authentication
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );

            const data = await response.json();

            if (data.success) {
                setMeterTableData(data.data || []);
                applyMeterPaginationFromResponse(
                    data.pagination,
                    page,
                    pageSize,
                );
                setFailedApis((prev) =>
                    prev.filter((api) => api.id !== "meterData"),
                );
            } else {
                throw new Error(data.message || "Failed to fetch meter data");
            }
        } catch (error) {
            console.error("Error fetching meter data:", error);
            setFailedApis((prev) => {
                if (!prev.find((api) => api.id === "meterData")) {
                    return [
                        ...prev,
                        {
                            id: "meterData",
                            name: "Meter Data",
                            retryFunction: retryMeterDataAPI,
                            errorMessage:
                                "Failed to load Meter Data. Please try again.",
                        },
                    ];
                }
                return prev;
            });
        } finally {
            setIsLoadingMeterData(false);
        }
    };

    // Load table data after hierarchy filters init (TGNPDCL default — no Get Data click)
    useEffect(() => {
        if (!isFiltersReady || viewMode !== "table") return;
        fetchMeterData(currentPage, meterTableLimit, "", lastSelectedId, meterFilter);
        // Pagination changes call fetchMeterData directly; refetch when scope/filters change.
    }, [
        isFiltersReady,
        viewMode,
        lastSelectedId,
        communicationStatus,
        meterFilter,
    ]);

    const handleTabChange = (newTabIndex: number) => {
        setActiveTab(newTabIndex);
        setIsSubNodeChecked(false); // Reset checkbox state when switching tabs
    };

    const handleCheckboxChange = (checked: boolean) => {
        setIsSubNodeChecked(checked);
    };

    const handleMeterFilterChange = useCallback((value: any) => {
        const actualValue =
            typeof value === "string" ? value : value?.target?.value || value;
        meterFilterRef.current = actualValue;
        setMeterFilter(actualValue);
    }, []);

    // Retry specific API
    const retrySpecificAPI = (apiId: string) => {
        const api = failedApis.find((a) => a.id === apiId);
        if (api) {
            api.retryFunction(lastSelectedId || undefined);
        }
    };

    const handleGetData = async () => {
        const lastId = applyCurrentFilters();
        try {
            if (viewMode === "table") {
                setCurrentPage(1);
                fetchMeterData(
                    1,
                    meterTableLimit,
                    "",
                    lastId,
                    meterFilterRef.current,
                );
            } else if (viewMode === "hierarchy") {
                fetchAssets(lastId);
                setCurrentPage(1);
                fetchMeterData(
                    1,
                    meterTableLimit,
                    "",
                    lastId,
                    meterFilterRef.current,
                );
            }
        } catch (error) {
            console.error("Error applying filters:", error);
        }
    };

    const handleResetFilters = async () => {
        setCommunicationStatus("all");
        setMeterFilter("all");
        meterFilterRef.current = "all";
        await resetLocationFilters();
        if (viewMode === "table") {
            setMeterTableLimit(20);
            fetchMeterData(1, 20, "", null, "all");
        } else if (viewMode === "hierarchy") {
            fetchAssets(null);
            fetchMeterData(1, meterTableLimit, "", null, "all");
        }
    };

    const handleExportData = async () => {
        if (isExporting) return;

        const expectedTotal = serverPagination.totalCount;
        if (expectedTotal <= 0 && meterTableData.length === 0) {
            alert(
                "No data available to export. Apply filters and click Get Data first.",
            );
            return;
        }

        setIsExporting(true);

        try {
            const XLSX = await import("xlsx");
            const rows = await fetchAllPaginatedRows<Record<string, unknown>>(
                (page, pageSize) => {
                    const queryParams = new URLSearchParams({
                        page: String(page),
                        pageSize: String(pageSize),
                    });
                    if (lastSelectedId) {
                        queryParams.append("hierarchyId", lastSelectedId);
                    }
                    if (communicationStatus && communicationStatus !== "all") {
                        queryParams.append(
                            "communicationStatus",
                            communicationStatus,
                        );
                    }
                    queryParams.append(
                        "mappingStatus",
                        meterFilterRef.current === "all"
                            ? "all"
                            : meterFilterRef.current,
                    );
                    return `${BACKEND_URL}/dtrs/all-meters?${queryParams.toString()}`;
                },
                { expectedTotalCount: expectedTotal > 0 ? expectedTotal : undefined },
            );

            if (!rows.length) {
                alert(
                    "No data available to export. Apply filters and click Get Data first.",
                );
                return;
            }

            if (expectedTotal > 0 && rows.length < expectedTotal) {
                console.warn(
                    `[Export] Expected ${expectedTotal} rows, exported ${rows.length}`,
                );
            }

            const metersExportData = rows.map((row, index) => ({
                "S.No": row.slNo ?? index + 1,
                "DTR ID": row.dtrId ?? "-",
                "Meter No": row.meterNo ?? row.meterNumber ?? "-",
                "DTR Name": row.dtrName ?? "-",
                Location: row.location ?? "-",
                "Communication Status": row.communicationStatus ?? "-",
                "Last Communication Date": row.lastCommunicationDate ?? "-",
                "Feeders Count":
                    row.feedersCount ??
                    row.feeders_count ??
                    row.feederCount ??
                    "-",
            }));

            const sheet = XLSX.utils.json_to_sheet(metersExportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, sheet, "Meters Data");

            const currentDate = new Date().toISOString().split("T")[0];
            const excelBuffer = XLSX.write(workbook, {
                bookType: "xlsx",
                type: "array",
            });
            const blob = new Blob([excelBuffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `meters-data-${currentDate}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting data:", error);
            alert("Failed to export data. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const tabs = [
        {
            label: "Add Asset Name",
            content: null,
            icon: <PlusIcon />,
        },
        {
            label: "Upload List",
            content: null,
            icon: <ListIcon />,
        },
        {
            label: "Template",
            content: null,
            icon: <DownloadIcon />,
        },
    ];

    // --- Generate form fields for each tab ---
    const generateFormFieldsForTab = (tabIndex: number) => {
        switch (tabIndex) {
            case 0: // Add Asset Name - Search and Input fields
                const baseFields = [
                    {
                        name: "assetTitle",
                        type: "text",
                        label: "Asset Title",
                        placeholder: "Asset Title (Ex. Locations)",
                        required: true,
                        validation: {
                            required: "Asset title is required",
                        },
                        rightIcon: "icons/search.svg",
                    },
                    {
                        name: "assetName",
                        type: "text",
                        label: "Asset Name",
                        placeholder: "Search and select asset name",
                        required: true,
                        validation: {
                            required: "Asset name is required",
                        },
                    },
                    {
                        name: "isSubNode",
                        type: "checkbox",
                        label: "Choose an asset below to assign this as a Sub Node.",
                        labelClassName:
                            "text-sm text-TextSecondary dark:text-gray-400",
                        checkboxLabelClassName:
                            "text-TextSecondary font-normal",
                        onChange: handleCheckboxChange,
                        value: isSubNodeChecked,
                    },
                ];

                // Add conditional field when checkbox is checked
                if (isSubNodeChecked) {
                    baseFields.push({
                        name: "parentAssetSearch",
                        type: "text",
                        label: "",
                        placeholder: "Search for parent Node",
                        required: true,
                        validation: {
                            required:
                                "Parent asset is required when creating a sub node",
                        },
                        rightIcon: "icons/search.svg",
                    });
                }

                return baseFields;

            case 1: // Upload List - Drag and Drop
                return [
                    {
                        name: "uploadFile",
                        type: "chosenfile",
                        label: "Upload File",
                        rightIcon: "icons/search.svg",
                        placeholder:
                            "Drag and drop files here or click to browse",
                        required: true,
                        validation: {
                            required: "File is required",
                        },
                        accept: ".csv,.xlsx,.xls",
                        multiple: true,
                        dragAndDrop: true,
                    },
                ];

            case 2: // Template - Search only
                return [
                    {
                        name: "templateSearch",
                        type: "text",
                        label: "Search Templates",
                        placeholder: "Asset Title (Ex. Locations)",
                        required: false,
                        rightIcon: "icons/search.svg",
                    },
                ];

            default:
                return [];
        }
    };

    // --- Get current form fields based on active tab ---
    const currentFormFields = generateFormFieldsForTab(activeTab);

    // --- Get current save button label ---
    const getSaveButtonLabel = () => {
        switch (activeTab) {
            case 0:
                return "Create Asset";
            case 1:
                return "Create List";
            case 2:
                return "Download";
            default:
                return "Save";
        }
    };

    // Recursive function to map all hierarchy levels
    const mapHierarchyRecursively = (nodes: HierarchyNode[]): any[] => {
        if (!nodes || nodes.length === 0) {
            return [
                {
                    id: "no-data",
                    name: "-",
                    hierarchy_type_title: "No Assets Available",
                    children: [],
                },
            ];
        }
        return nodes.map((node) => ({
            id: node.hierarchy_id,
            name: node.hierarchy_name,
            hierarchy_type_title: node.hierarchy_type_title,
            children: node.children
                ? mapHierarchyRecursively(node.children)
                : [],
        }));
    };

    // Recursive function to map hierarchy for NodeChart
    const mapHierarchyForNodeChart = (nodes: any[]): any[] => {
        if (!nodes || nodes.length === 0) {
            return [
                {
                    name: "-",
                    backgroundColor: "#f5f5f5",
                    borderColor: "",
                    textColor: "#999999",
                    Areas: [],
                },
            ];
        }
        return nodes.map((node) => ({
            name: node.name || node.hierarchy_name,
            backgroundColor: "#e3f2fd",
            borderColor: "",
            textColor: "#424242",
            Areas: node.children ? mapHierarchyForNodeChart(node.children) : [],
        }));
    };

    // Get the data to display - uses real API data when available
    const getDisplayData = () => {
        return mapHierarchyRecursively(hierarchicalData);
    };

    // Flatten hierarchical data for table view
    const getFlattenedTableData = () => {
        const flattened: any[] = [];

        const flattenNode = (
            node: any,
            level: number = 0,
            parentPath: string = "",
        ) => {
            const currentPath = parentPath
                ? `${parentPath} > ${node.name}`
                : node.name;

            flattened.push({
                id: node.id || node.hierarchy_id,
                name: node.name || node.hierarchy_name,
                type: node.hierarchy_type_title,
                level: level,
                path: currentPath,
                count: node.count || 0,
                parent: parentPath || "Root",
            });

            if (node.children && node.children.length > 0) {
                node.children.forEach((child: any) =>
                    flattenNode(child, level + 1, currentPath),
                );
            }
        };

        const displayData = getDisplayData();
        displayData.forEach((node) => flattenNode(node));

        return flattened;
    };

    const clearBulkUploadErrors = useCallback(() => {
        setBulkUploadErrors([]);
    }, []);

    const removeBulkUploadError = useCallback((indexToRemove: number) => {
        setBulkUploadErrors((prev) =>
            prev.filter((_, index) => index !== indexToRemove),
        );
    }, []);

    const handleCloseBulkUploadModal = useCallback(() => {
        setIsBulkUploadModalOpen(false);
    }, []);

    const handleDownloadBulkTemplate = useCallback(async () => {
        try {
            setBulkFlowLoading(true);
            const meta = await fetchAssetBulkUploadTemplateMeta();
            downloadConsumerBulkUploadTemplateXlsx(
                meta,
                "meter_bulk_upload_template.xlsx",
            );
        } catch (error) {
            console.error("Error downloading bulk upload template:", error);
            setBulkUploadErrors((prev) => {
                if (!prev.includes("Failed to export template")) {
                    return [...prev, "Failed to export template"];
                }
                return prev;
            });
        } finally {
            setBulkFlowLoading(false);
        }
    }, []);

    const handleBulkUploadSubmit = useCallback(
        async (formData: Record<string, unknown>) => {
            let uploadFile = formData?.uploadFile as File | FileList | undefined;
            if (uploadFile instanceof FileList && uploadFile.length > 0) {
                uploadFile = uploadFile[0];
            }

            if (!uploadFile || !(uploadFile instanceof File)) {
                setBulkUploadErrors((prev) => [...prev, "Please upload a file"]);
                return;
            }

            const allowedTypes = [".xlsx", ".xls", ".csv"];
            const fileExtension =
                "." + uploadFile.name.split(".").pop()?.toLowerCase();

            if (!allowedTypes.includes(fileExtension)) {
                setBulkUploadErrors((prev) => [
                    ...prev,
                    "Please upload Excel (.xlsx, .xls) or CSV (.csv) files only",
                ]);
                return;
            }

            try {
                setBulkFlowLoading(true);
                console.log("Upload Request:", formData);

                const { parsed, raw } = await postAssetsBulkUpload(uploadFile);
                const response =
                    raw && typeof raw === "object"
                        ? (raw as Record<string, unknown>)
                        : {};
                console.log("UPLOAD RESPONSE:", response);
                console.log("UPLOAD RESPONSE DATA:", response.data);
                console.log("[BulkUpload] Parsed summary:", {
                    ok: parsed.ok,
                    created: parsed.created,
                    failed: parsed.failed,
                });

                const hasAnyOutcome =
                    parsed.created > 0 ||
                    parsed.failed > 0 ||
                    parsed.failedRows.length > 0;

                /** HTTP layer already OK; backend may use success:false for partial failures. */
                const showSuccessUi =
                    parsed.ok || hasAnyOutcome;

                if (showSuccessUi) {
                    const partialNote =
                        !parsed.ok && hasAnyOutcome
                            ? "Note: response indicated incomplete success.\n\n"
                            : "";
                    const failedCount = Math.max(
                        parsed.failed,
                        parsed.failedRows.length,
                    );
                    const firstErr = parsed.failedRows[0]?.error ?? "";
                    const isDuplicateMeterMsg =
                        /meter\s+already\s+exist/i.test(firstErr);
                    const duplicateMessage =
                        failedCount > 1
                            ? "Meters already exist"
                            : "Meter already exists";
                    const failureDetailText =
                        parsed.failed > 0 && parsed.failedRows.length
                            ? isDuplicateMeterMsg
                                ? duplicateMessage
                                : firstErr
                            : "";
                    const summary =
                        partialNote +
                        `${parsed.message}\nCreated: ${parsed.created}\nFailed: ${parsed.failed}` +
                        (failureDetailText ? `\n\n${failureDetailText}` : "");
                    window.alert(summary);
                    setIsBulkUploadModalOpen(false);
                    await fetchMeterData(
                        currentPage,
                        meterTableLimit,
                        "",
                        lastSelectedId,
                        meterFilterRef.current,
                    );
                    await fetchAssets(lastSelectedId ?? undefined);
                } else {
                    throw new Error(parsed.message || "Upload failed");
                }
            } catch (error) {
                console.error("Bulk upload error:", error);
                setBulkUploadErrors((prev) => [
                    ...prev,
                    error instanceof Error
                        ? error.message
                        : "Bulk upload failed",
                ]);
            } finally {
                setBulkFlowLoading(false);
            }
        },
        [
            currentPage,
            meterTableLimit,
            lastSelectedId,
            fetchMeterData,
            fetchAssets,
        ],
    );

    const bulkUploadErrorSections = useMemo(() => {
        if (bulkUploadErrors.length === 0) return [];
        return [
            {
                layout: {
                    type: "column" as const,
                    gap: "gap-4",
                },
                rows: [
                    {
                        layout: "column" as const,
                        gap: "gap-4",
                        columns: [
                            {
                                name: "Error",
                                props: {
                                    visibleErrors: bulkUploadErrors,
                                    onRetry: clearBulkUploadErrors,
                                    onClose: () => removeBulkUploadError(0),
                                    showRetry: true,
                                    maxVisibleErrors: 3,
                                },
                            },
                        ],
                    },
                ],
            },
        ];
    }, [bulkUploadErrors, clearBulkUploadErrors, removeBulkUploadError]);

    const bulkUploadModalSection = useMemo(
        () => ({
            layout: {
                type: "column" as const,
                gap: "gap-0",
                className: "w-full",
            },
            components: [
                {
                    name: "Modal",
                    props: {
                        isOpen: isBulkUploadModalOpen,
                        onClose: handleCloseBulkUploadModal,
                        title: "Bulk Upload",
                        size: "sm",
                        showCloseIcon: true,
                        backdropClosable: true,
                        centered: true,
                        showForm: true,
                        formFields: [
                            {
                                type: "chosenfile" as const,
                                name: "uploadFile",
                                required: true,
                                accept: ".xlsx,.xls,.csv",
                                placeholder:
                                    "Drag & drop here, or click to browse",
                                dragAndDrop: true,
                                onChange: () => {},
                                downloadLink: {
                                    text: "Download Template",
                                    icon: "download",
                                    onClick: handleDownloadBulkTemplate,
                                },
                            },
                        ],
                        onSave: handleBulkUploadSubmit,
                        saveButtonLabel: "Submit",
                        cancelButtonLabel: "Cancel",
                        gridLayout: {
                            gridRows: 2,
                            gridColumns: 1,
                            gap: "gap-4",
                        },
                    },
                },
            ],
        }),
        [
            isBulkUploadModalOpen,
            handleCloseBulkUploadModal,
            handleDownloadBulkTemplate,
            handleBulkUploadSubmit,
        ],
    );

    const locationHierarchyFilterSection = useMemo(
        () =>
            createLocationHierarchyFilterSection({
                filterOptions,
                filterValues,
                isFiltersLoading,
                onFilterChange: handleHierarchyFilterChange,
                onGetData: handleGetData,
                onReset: handleResetFilters,
                extraComponents: [
                    {
                        name: "Dropdown",
                        props: {
                            options: [...COMMUNICATION_STATUS_FILTER_OPTIONS],
                            value: communicationStatus,
                            onChange: (value: any) => {
                                const actualValue =
                                    typeof value === "string"
                                        ? value
                                        : value?.target?.value || value;
                                setCommunicationStatus(actualValue);
                            },
                            placeholder: "Communication status",
                            loading: false,
                            searchable: false,
                        },
                    },
                ],
            }),
        [
            filterOptions,
            filterValues,
            isFiltersLoading,
            communicationStatus,
            handleHierarchyFilterChange,
            handleGetData,
            handleResetFilters,
        ],
    );

    const bulkUploadButton = useMemo(
        () => ({
            label: "Bulk Upload",
            variant: "secondary" as const,
            onClick: () => setIsBulkUploadModalOpen(true),
        }),
        [],
    );

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Page
                sections={[
                    // Error Section (show when there are failed APIs)
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
                    ...bulkUploadErrorSections,

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
                                    title: "Meter Management",
                                    onBackClick: () =>
                                        window.history.back(),
                                    backButtonText:
                                        "Back to Dashboard",
                                    showMenu: true,
                                    menuItems: [
                                        {
                                            id: "Table View",
                                            label: "Table View",
                                        },
                                        {
                                            id: "HierarchyView",
                                            label: "Hierarchy View",
                                        },
                                    ],
                                    onMenuItemClick:
                                        handleMenuClick,

                                    showRightDropdowns: true,
                                    rightDropdownsClassName: "w-max-lg",
                                    rightDropdowns: [
                                        {
                                            type: "dropdown",
                                            options: [...METER_FILTER_OPTIONS],
                                            value: meterFilter,
                                            onChange: handleMeterFilterChange,
                                            placeholder: "Meter",
                                            searchable: false,
                                            className: "w-max-xl",
                                        },
                                    ],

                                    buttons: [
                                        bulkUploadButton,
                                        {
                                            label: isExporting
                                                ? "Exporting..."
                                                : "Export",
                                            variant: "primary",
                                            onClick:
                                                handleExportData,
                                            disabled: isExporting,
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                    bulkUploadModalSection,
                    locationHierarchyFilterSection,
                    ...(viewMode === "hierarchy"
                        ? [
                              {
                                  layout: {
                                      type: "grid",
                                      columns: 4,
                                      className: "h-full",
                                      rows: [
                                          {
                                              layout: "row",
                                              className:
                                                  "border border-primary-border dark:border-dark-border rounded-3xl overflow-hidden",
                                              columns: [
                                                  {
                                                      name: "TopLevelHierarchy",
                                                      props: {
                                                          nodes: getDisplayData(),
                                                          title: "Asset Hierarchy",
                                                          actions:
                                                              assetManagementActions,
                                                          onActionClick:
                                                              handleAssetAction,
                                                          showActions: true,
                                                      },
                                                  },
                                              ],
                                          },

                                          {
                                              layout: "row",
                                              span: { col: 3, row: 1 },
                                              className:
                                                  "h-full border border-primary-border dark:border-dark-border rounded-3xl overflow-hidden",
                                              columns: [
                                                  {
                                                      name: "NodeChart",
                                                      props: {
                                                          data: {
                                                              Location:
                                                                  mapHierarchyForNodeChart(
                                                                      getDisplayData(),
                                                                  ),
                                                          },
                                                          width: "100%",
                                                          height: "100%",
                                                          type: "hierarchy",
                                                          enableZoom: true,
                                                          minZoom: 0.3,
                                                          maxZoom: 2,
                                                          initialZoom: 0.8,
                                                          layout: "horizontal",
                                                          EdgeStyleLayout:
                                                              "polyline",
                                                      },
                                                  },
                                              ],
                                          },
                                      ],
                                  },
                              },
                          ]
                        : [
                              // TABLE VIEW - Full-width table layout
                              {
                                  layout: {
                                      type: "flex" as const,
                                      direction: "row" as const,
                                      gap: "gap-4",
                                      columns: 1,
                                      className: "w-full flex  flex-col gap-4",
                                      rows: [
                                          {
                                              layout: "grid",
                                              gridColumns: 1,
                                              gap: "gap-4",
                                              className: "pb-4",
                                              columns: [
                                                  {
                                                      name: "Table",
                                                      props: {
                                                          data:
                                                              viewMode ===
                                                              "table"
                                                                  ? meterTableData
                                                                  : getFlattenedTableData(),
                                                          headerTitle:
                                                              viewMode ===
                                                              "table"
                                                                  ? "Meters"
                                                                  : "Meters",
                                                          showHeader: true,
                                                          availableTimeRanges:
                                                              [],
                                                          columns:
                                                              viewMode ===
                                                              "table"
                                                                  ? [
                                                                        {
                                                                            key: "slNo",
                                                                            label: "Sl.No",
                                                                            sortable: true,
                                                                        },
                                                                        {
                                                                            key: "dtrId",
                                                                            label: "DTR ID",
                                                                            sortable: true,
                                                                            searchable: true,
                                                                        },
                                                                        {
                                                                            key: "meterNo",
                                                                            label: "Meter No",
                                                                            sortable: true,
                                                                            searchable: true,
                                                                        },
                                                                        {
                                                                            key: "dtrName",
                                                                            label: "DTR Name",
                                                                            sortable: true,
                                                                            searchable: true,
                                                                        },
                                                                        {
                                                                            key: "location",
                                                                            label: "Location",
                                                                            sortable: true,
                                                                            searchable: true,
                                                                        },
                                                                        {
                                                                            key: "communicationStatus",
                                                                            label: "Communication Status",
                                                                            statusIndicator:
                                                                                {},
                                                                            isActive:
                                                                                (
                                                                                    value:
                                                                                        | string
                                                                                        | number
                                                                                        | boolean
                                                                                        | null
                                                                                        | undefined,
                                                                                ) =>
                                                                                    String(
                                                                                        value,
                                                                                    ).toLowerCase() ===
                                                                                    "active",
                                                                        },
                                                                        {
                                                                            key: "lastCommunicationDate",
                                                                            label: "Last Communication Date",
                                                                            sortable: true,
                                                                        },
                                                                    ]
                                                                  : [
                                                                        // {
                                                                        //   key: "name",
                                                                        //   label: "Asset Name",
                                                                        //   sortable: true,
                                                                        //   searchable: true,
                                                                        // },
                                                                        // {
                                                                        //   key: "type",
                                                                        //   label: "Asset Type",
                                                                        //   sortable: true,
                                                                        //   searchable: true,
                                                                        // },
                                                                        // {
                                                                        //   key: "level",
                                                                        //   label: "Hierarchy Level",
                                                                        //   sortable: true,
                                                                        // },
                                                                        // {
                                                                        //   key: "path",
                                                                        //   label: "Full Path",
                                                                        //   sortable: true,
                                                                        //   searchable: true,
                                                                        // },
                                                                        // {
                                                                        //   key: "count",
                                                                        //   label: "Count",
                                                                        //   sortable: true,
                                                                        // },
                                                                        // {
                                                                        //   key: "parent",
                                                                        //   label: "Parent",
                                                                        //   sortable: true,
                                                                        //   searchable: true,
                                                                        // },
                                                                        {
                                                                            key: "dtrId",
                                                                            label: "DTR ID",
                                                                            sortable: true,
                                                                            searchable: true,
                                                                        },
                                                                        {
                                                                            key: "dtrName",
                                                                            label: "DTR Name",
                                                                            sortable: true,
                                                                            searchable: true,
                                                                        },
                                                                        {
                                                                            key: "feedersCount",
                                                                            label: "Feeders Count",
                                                                            sortable: true,
                                                                        },
                                                                        {
                                                                            key: "commStatus",
                                                                            label: "Communication-Status",
                                                                            statusIndicator:
                                                                                {},
                                                                            isActive:
                                                                                (
                                                                                    value:
                                                                                        | string
                                                                                        | number
                                                                                        | boolean
                                                                                        | null
                                                                                        | undefined,
                                                                                ) =>
                                                                                    String(
                                                                                        value,
                                                                                    ).toLowerCase() ===
                                                                                    "active",
                                                                        },
                                                                        {
                                                                            key: "lastCommunication",
                                                                            label: "Last Communication",
                                                                            sortable: true,
                                                                        },
                                                                    ],
                                                          loading:
                                                              viewMode ===
                                                              "table"
                                                                  ? isLoadingMeterData ||
                                                                    bulkFlowLoading
                                                                  : bulkFlowLoading,
                                                          emptyMessage:
                                                              viewMode ===
                                                              "table"
                                                                  ? "No meters found"
                                                                  : "No assets found",
                                                          showSearch: true,
                                                          showPagination: true,
                                                          pagination: true,
                                                          serverPagination:
                                                              viewMode ===
                                                              "table"
                                                                  ? serverPagination
                                                                  : undefined,
                                                          pageSize:
                                                              viewMode ===
                                                              "table"
                                                                  ? serverPagination.limit
                                                                  : 10,
                                                          itemsPerPage:
                                                              viewMode ===
                                                              "table"
                                                                  ? serverPagination.limit
                                                                  : undefined,
                                                          totalCount:
                                                              viewMode ===
                                                              "table"
                                                                  ? serverPagination.totalCount
                                                                  : undefined,
                                                          currentPage:
                                                              viewMode ===
                                                              "table"
                                                                  ? serverPagination.currentPage
                                                                  : undefined,
                                                          totalPages:
                                                              viewMode ===
                                                              "table"
                                                                  ? serverPagination.totalPages
                                                                  : undefined,
                                                          rowsPerPageOptions:
                                                              viewMode ===
                                                              "table"
                                                                  ? [
                                                                        10,
                                                                        20,
                                                                        50,
                                                                        100,
                                                                    ]
                                                                  : undefined,
                                                          initialRowsPerPage:
                                                              viewMode ===
                                                              "table"
                                                                  ? 20
                                                                  : undefined,
                                                          onPageChange:
                                                              viewMode ===
                                                              "table"
                                                                  ? handleMeterTablePageChange
                                                                  : undefined,
                                                          onRowsPerPageChange:
                                                              viewMode ===
                                                              "table"
                                                                  ? handleMeterTableRowsPerPageChange
                                                                  : undefined,
                                                          onSearch:
                                                              viewMode ===
                                                              "table"
                                                                  ? (
                                                                        searchTerm: string,
                                                                    ) => {
                                                                        setCurrentPage(
                                                                            1,
                                                                        );
                                                                        fetchMeterData(
                                                                            1,
                                                                            meterTableLimit,
                                                                            searchTerm,
                                                                            lastSelectedId,
                                                                            meterFilterRef.current,
                                                                        );
                                                                    }
                                                                  : undefined,
                                                          showActions: true,
                                                          actions:
                                                              assetManagementActions,
                                                          onRowClick: (
                                                              row: any,
                                                          ) =>
                                                              handleViewFeeder(
                                                                  row,
                                                              ),
                                                          onActionClick: (
                                                              actionId: string,
                                                              row: any,
                                                          ) => {
                                                              if (
                                                                  actionId ===
                                                                  "view"
                                                              ) {
                                                                  handleViewFeeder(
                                                                      row,
                                                                  );
                                                              } else {
                                                                  handleAssetAction(
                                                                      actionId,
                                                                      row,
                                                                  );
                                                              }
                                                          },
                                                      },
                                                  },
                                              ],
                                          },
                                      ],
                                  },
                              },
                          ]),
                    {
                        layout: {
                            type: "column",
                            gap: "gap-0",
                            rows: [
                                {
                                    layout: "row",
                                    columns: [
                                        {
                                            name: "Modal",
                                            props: {
                                                isOpen: isAddAssetModalOpen,
                                                onClose: () => {
                                                    setIsAddAssetModalOpen(
                                                        false,
                                                    );
                                                    setActiveTab(0);
                                                    setIsSubNodeChecked(false);
                                                },
                                                title: "Add New Asset",
                                                size: "xl",
                                                showCloseIcon: true,
                                                showTabs: true,
                                                tabs: tabs,
                                                activeTabIndex: activeTab,
                                                onTabChange: handleTabChange,
                                                showForm: true,
                                                formFields: currentFormFields,
                                                onSave: async (
                                                    formData: Record<
                                                        string,
                                                        any
                                                    >,
                                                ) => {
                                                    try {
                                                        let apiData;

                                                        switch (activeTab) {
                                                            case 0: // Add Asset Name
                                                                apiData = {
                                                                    location_type_name:
                                                                        formData.assetTitle,
                                                                    location_names:
                                                                        formData.assetName
                                                                            ? [
                                                                                  formData.assetName,
                                                                              ]
                                                                            : [],
                                                                    parent_location:
                                                                        formData.isSubNode &&
                                                                        formData.parentAssetSearch
                                                                            ? formData.parentAssetSearch
                                                                            : null,
                                                                };
                                                                break;

                                                            case 1: // Upload List
                                                                setIsAddAssetModalOpen(
                                                                    false,
                                                                );
                                                                return;

                                                            case 2: // Template
                                                                setIsAddAssetModalOpen(
                                                                    false,
                                                                );
                                                                return;

                                                            default:
                                                                apiData =
                                                                    formData;
                                                        }

                                                        const response =
                                                            await fetch(
                                                                `${BACKEND_URL}/assets`,
                                                                {
                                                                    method: "POST",
                                                                    headers: {
                                                                        "Content-Type":
                                                                            "application/json",
                                                                    },
                                                                    body: JSON.stringify(
                                                                        apiData,
                                                                    ),
                                                                },
                                                            );

                                                        const result =
                                                            await response.json();

                                                        if (result.success) {
                                                            window.location.reload();
                                                        } else {
                                                            console.error(
                                                                "Failed to add asset:",
                                                                result.message,
                                                            );
                                                            alert(
                                                                `Failed to add asset: ${result.message}`,
                                                            );
                                                        }
                                                    } catch (error) {
                                                        console.error(
                                                            "Error adding asset:",
                                                            error,
                                                        );
                                                        alert(
                                                            "Error adding asset. Please try again.",
                                                        );
                                                    }

                                                    setIsAddAssetModalOpen(
                                                        false,
                                                    );
                                                },
                                                saveButtonLabel:
                                                    getSaveButtonLabel(),
                                                cancelButtonLabel: "Cancel",
                                                cancelButtonVariant:
                                                    "secondary",
                                                confirmButtonVariant: "primary",
                                                formId: "add-asset-form",
                                                gridLayout: {
                                                    gridRows:
                                                        currentFormFields.length,
                                                    gridColumns: 1,
                                                    gap: "gap-4",
                                                },
                                                tabsSize: "md",
                                                tabsShowTabIcons: true,
                                                tabsShowTabLabels: true,
                                                tabsTabListClassName:
                                                    "bg-primary-lightest border-primary-border",
                                                tabsActiveTabButtonClassName:
                                                    "bg-primary text-white",
                                                tabsInactiveTabButtonClassName:
                                                    "text-neutral hover:bg-primary-lightest",
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
}
