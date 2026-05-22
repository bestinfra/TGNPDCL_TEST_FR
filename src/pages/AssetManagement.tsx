import {
    Suspense,
    useState,
    useEffect,
    useCallback,
    useMemo,
    type FormEvent,
} from "react";
import { lazy } from "react";
import { useNavigate } from "react-router-dom";
import BACKEND_URL from "../config";
import {
    fetchAssetBulkUploadTemplateMeta,
    postAssetsBulkUpload,
} from "../api/apiUtils";
import { downloadConsumerBulkUploadTemplateXlsx } from "../utils/excelExport";
const Page = lazy(() => import("SuperAdmin/Page"));

interface HierarchyNode {
    hierarchy_id: string | number;
    hierarchy_name: string;
    hierarchy_type_title: string;
    children?: HierarchyNode[];
}

/** Row shape from GET /assets (Get All Assets) for table view */
interface AssetTableRow {
    slNo: number | string;
    discom: string;
    circle: string;
    division: string;
    subDivision: string;
    section: string;
    substation: string;
    feeder: string;
    dtrNumber: string;
    meterNumber: string;
    /** Unique row id from GET /assets (meter PK) — required for PATCH /assets/location?id= */
    id: number | "";
}

const mapAssetApiRowToTableRow = (
    row: Record<string, unknown>,
): AssetTableRow => ({
    slNo:
        row.slNo == null || row.slNo === ""
            ? "-"
            : typeof row.slNo === "number" || typeof row.slNo === "string"
              ? row.slNo
              : String(row.slNo),
    discom: String(row.discom ?? "-"),
    circle: String(row.circle ?? "-"),
    division: String(row.division ?? "-"),
    subDivision: String(row.subDivision ?? "-"),
    section: String(row.section ?? "-"),
    substation: String(row.substation ?? "-"),
    feeder: String(row.feeder ?? "-"),
    dtrNumber: String(row.dtrNumber ?? "-"),
    meterNumber: String(row.meterNumber ?? "-"),
    id: (() => {
        const raw = row.id;
        if (raw == null || raw === "") return "";
        if (typeof raw === "number" && Number.isFinite(raw)) return raw;
        const n = Number(String(raw).trim());
        return Number.isFinite(n) && n > 0 ? n : "";
    })(),
});

/** PATCH body keys for asset table row edit (only hierarchy display fields) */
const ASSET_EDIT_PATCH_KEYS = [
    "discom",
    "circle",
    "division",
    "subDivision",
    "section",
    "substation",
    "feeder",
    "dtrNumber",
    "meterNumber",
] as const;

type AssetEditPatchKey = (typeof ASSET_EDIT_PATCH_KEYS)[number];

/** Shown in modal but not editable and never sent in PATCH body */
const ASSET_EDIT_READONLY_FIELDS = new Set<AssetEditPatchKey>(["meterNumber"]);

const ASSET_EDIT_PATCHABLE_KEYS = ASSET_EDIT_PATCH_KEYS.filter(
    (key) => !ASSET_EDIT_READONLY_FIELDS.has(key),
);

const ASSET_EDIT_FIELD_LABELS: Record<AssetEditPatchKey, string> = {
    discom: "DISCOM",
    circle: "Circle",
    division: "Division",
    subDivision: "Sub-Division",
    section: "Section",
    substation: "Substation",
    feeder: "Feeder",
    dtrNumber: "DTR Number",
    meterNumber: "Meter Number",
};

const displayAssetEditFieldValue = (value: string) =>
    value === "-" ? "" : value;

const getAssetEditFormInitialData = (
    row: AssetTableRow,
): Record<string, string> => {
    const initial: Record<string, string> = {};
    ASSET_EDIT_PATCH_KEYS.forEach((key) => {
        initial[key] = displayAssetEditFieldValue(String(row[key] ?? ""));
    });
    return initial;
};

/** PATCH body: only keys whose edited value differs from the modal open snapshot. */
const buildAssetEditFieldChanges = (
    formData: Record<string, unknown>,
    originalData: Record<string, string>,
): Record<string, string> => {
    const changes: Record<string, string> = {};
    ASSET_EDIT_PATCHABLE_KEYS.forEach((key) => {
        const newVal =
            typeof formData[key] === "string" ? formData[key].trim() : "";
        const oldVal = (originalData[key] ?? "").trim();
        if (newVal !== oldVal) {
            changes[key] = newVal;
        }
    });
    return changes;
};

/** Local edit modal — same approach as DTRDetailPage CapacityUpdateModal (noValidate, no federated form validation) */
type EditLocationModalProps = {
    isOpen: boolean;
    initialValues: Record<string, string>;
    resetKey: string | number;
    isSaving: boolean;
    onClose: () => void;
    onSave: (formData: Record<string, unknown>) => void;
};

function EditLocationModal({
    isOpen,
    initialValues,
    resetKey,
    isSaving,
    onClose,
    onSave,
}: EditLocationModalProps) {
    const [draft, setDraft] = useState<Record<string, string>>(initialValues);

    // Reset draft only when modal opens or row changes — not every parent re-render
    useEffect(() => {
        if (isOpen) {
            setDraft(initialValues);
        }
    }, [isOpen, resetKey]);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSave(draft);
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={isSaving ? undefined : onClose}
            role="presentation"
        >
            <div
                className="w-full max-w-2xl rounded-3xl border border-primary-border bg-white p-6 shadow-lg dark:border-dark-border dark:bg-primary-dark-light"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-location-title"
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2
                        id="edit-location-title"
                        className="text-lg font-bold text-primary dark:text-white"
                    >
                        Edit Location
                    </h2>
                    <button
                        type="button"
                        className="text-secondary hover:text-primary dark:text-subinfo"
                        onClick={onClose}
                        disabled={isSaving}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {ASSET_EDIT_PATCH_KEYS.map((fieldName) => (
                            <div key={fieldName} className="flex flex-col gap-2">
                                <label
                                    htmlFor={`edit-location-${fieldName}`}
                                    className="text-sm font-medium text-primary dark:text-white"
                                >
                                    {ASSET_EDIT_FIELD_LABELS[fieldName]}
                                </label>
                                <input
                                    id={`edit-location-${fieldName}`}
                                    name={fieldName}
                                    type="text"
                                    readOnly={ASSET_EDIT_READONLY_FIELDS.has(
                                        fieldName,
                                    )}
                                    className={`w-full rounded-2xl border border-primary-border px-4 py-3 text-sm font-medium text-primary outline-none dark:border-dark-border dark:text-white ${
                                        ASSET_EDIT_READONLY_FIELDS.has(
                                            fieldName,
                                        )
                                            ? "cursor-default bg-background-secondary/80 dark:bg-white/10"
                                            : "bg-background-secondary focus:border-primary dark:bg-white/5"
                                    }`}
                                    placeholder={
                                        ASSET_EDIT_READONLY_FIELDS.has(
                                            fieldName,
                                        )
                                            ? undefined
                                            : `Enter ${ASSET_EDIT_FIELD_LABELS[fieldName]}`
                                    }
                                    value={draft[fieldName] ?? ""}
                                    onChange={(e) => {
                                        if (
                                            ASSET_EDIT_READONLY_FIELDS.has(
                                                fieldName,
                                            )
                                        ) {
                                            return;
                                        }
                                        setDraft((prev) => ({
                                            ...prev,
                                            [fieldName]: e.target.value,
                                        }));
                                    }}
                                    disabled={isSaving}
                                    aria-readonly={ASSET_EDIT_READONLY_FIELDS.has(
                                        fieldName,
                                    )}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            className="rounded-full border border-primary-border px-5 py-2.5 text-sm font-medium text-primary dark:border-dark-border dark:text-white"
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded-full bg-secondary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const ASSET_TABLE_COLUMNS = [
    { key: "slNo", label: "S.No", sortable: true },
    { key: "discom", label: "DISCOM", sortable: true, searchable: true },
    { key: "circle", label: "Circle", sortable: true, searchable: true },
    { key: "division", label: "Division", sortable: true, searchable: true },
    {
        key: "subDivision",
        label: "Sub-Division",
        sortable: true,
        searchable: true,
    },
    { key: "section", label: "Section", sortable: true, searchable: true },
    {
        key: "substation",
        label: "Substation",
        sortable: true,
        searchable: true,
    },
    { key: "feeder", label: "Feeder", sortable: true, searchable: true },
    {
        key: "dtrNumber",
        label: "DTR Number",
        sortable: true,
        searchable: true,
    },
    {
        key: "meterNumber",
        label: "Meter Number",
        sortable: true,
        searchable: true,
    },
];

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

const emptyFilterOptions = {
    discoms: [{ value: "all", label: "All DISCOMs" }],
    circles: [{ value: "all", label: "All Circles" }],
    divisions: [{ value: "all", label: "All Divisions" }],
    subDivisions: [{ value: "all", label: "All Sub-Divisions" }],
    sections: [{ value: "all", label: "All Sections" }],
    meterLocations: [{ value: "all", label: "All Meter Locations" }],
    communicationStatuses: [
        { value: "all", label: "All communication statuses" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
    ],
};

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

export default function AssetManagment() {
    const navigate = useNavigate();
    const [bulkFlowLoading, setBulkFlowLoading] = useState(false);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [bulkUploadErrors, setBulkUploadErrors] = useState<string[]>([]);
    const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
    const [isEditLocationModalOpen, setIsEditLocationModalOpen] =
        useState(false);
    const [assetToEdit, setAssetToEdit] = useState<AssetTableRow | null>(null);
    /** Snapshot when Edit Location opens — used for diff-only PATCH payload */
    const [editLocationOriginalData, setEditLocationOriginalData] = useState<
        Record<string, string> | null
    >(null);
    const [savingLocationEdit, setSavingLocationEdit] = useState(false);
    const assetEditInitialValues = useMemo(
        () =>
            assetToEdit ? getAssetEditFormInitialData(assetToEdit) : {},
        [assetToEdit],
    );
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
    const [assetTableData, setAssetTableData] = useState<any[]>([]);
    const [isLoadingAssetTableData, setIsLoadingAssetTableData] =
        useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    /** Page size for GET /assets table; uses server pagination from API. */
    const [assetTableLimit, setAssetTableLimit] = useState(20);
    const [serverPagination, setServerPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 20,
        hasNextPage: false,
        hasPrevPage: false,
    });
    const [isExporting, setIsExporting] = useState(false);

    // State for filter values
    const [filterValues, setFilterValues] = useState({
        discom: "1",
        circle: "all",
        division: "all",
        subDivision: "all",
        section: "all",
        meterLocation: "all",
        communicationStatus: "all",
    });

    // State for tracking the last selected ID from hierarchy dropdowns
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    // Asset management menu items (hierarchy view)
    const assetManagementActions = [
        { id: "view", label: "View", icon: "icons/eye.svg" },
    ];

    // Handle asset hierarchy view action
    const handleViewFeeder = (row: any) => {
        const meterNumber = row.meterNumber;
        const dtrNumber = row.dtrNumber;
        const validDtrId =
            dtrNumber &&
            dtrNumber !== "N/A" &&
            String(dtrNumber).trim() !== ""
                ? String(dtrNumber)
                : null;

        if (meterNumber && meterNumber !== "N/A") {
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

    const handleAssetAction = (actionId: string, row: any) => {
        switch (actionId) {
            case "view":
                handleViewFeeder(row);
                break;
            default:
        }
    };

    /** Table may pass a column subset — resolve full row from table state (includes id). */
    const resolveAssetEditRow = (
        row: AssetTableRow | Record<string, unknown>,
    ): AssetTableRow | null => {
        const candidate = row as AssetTableRow;
        if (candidate.id !== "" && candidate.id != null) {
            return candidate;
        }
        const dtr = String(row.dtrNumber ?? "");
        const meter = String(row.meterNumber ?? "");
        if (!dtr || !meter) return null;
        const match = assetTableData.find(
            (r: AssetTableRow) =>
                r.dtrNumber === dtr &&
                r.meterNumber === meter &&
                r.id !== "" &&
                r.id != null,
        );
        return match ?? null;
    };

    const handleEditAssetLocation = (
        row: AssetTableRow | Record<string, unknown>,
    ) => {
        const selectedRow = resolveAssetEditRow(row);
        if (!selectedRow?.id) {
            alert(
                "This row cannot be edited because it has no asset ID.",
            );
            return;
        }
        setAssetToEdit(selectedRow);
        setEditLocationOriginalData(getAssetEditFormInitialData(selectedRow));
        setIsEditLocationModalOpen(true);
    };

    /** Table edit action — same pattern as RoleManagement `tableActions` Edit entry */
    const assetTableEditActions = [
        {
            id: "edit",
            label: "Edit",
            icon: "icons/user-pen.svg",
            onClick: handleEditAssetLocation,
        },
    ];

    const handleCloseEditLocationModal = () => {
        setIsEditLocationModalOpen(false);
        setAssetToEdit(null);
        setEditLocationOriginalData(null);
    };

    const handleSaveAssetLocationEdit = async (
        formData: Record<string, unknown>,
    ) => {
        if (!assetToEdit?.id || !editLocationOriginalData) {
            return;
        }

        const fieldChanges = buildAssetEditFieldChanges(
            formData,
            editLocationOriginalData,
        );
        const assetId = assetToEdit.id;
        const patchUrl = `${BACKEND_URL}/assets/location?id=${encodeURIComponent(String(assetId))}`;

        if (Object.keys(fieldChanges).length === 0) {
            alert("No changes detected");
            return;
        }

        // Row id is in query (?id=); body = changed fields only
        const patchBody: Record<string, string> = fieldChanges;

        setSavingLocationEdit(true);
        try {
            const response = await fetch(
                patchUrl,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(patchBody),
                },
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to update location",
                );
            }

            handleCloseEditLocationModal();
            await fetchAssetTableData(
                currentPage,
                assetTableLimit,
                "",
                lastSelectedId,
            );
        } catch (error) {
            console.error("Error updating asset location:", error);
            alert(
                error instanceof Error
                    ? error.message
                    : "Failed to update location. Please try again.",
            );
        } finally {
            setSavingLocationEdit(false);
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

            console.log("[AssetManagement DEBUG] API Params", {
                endpoint: url,
                hierarchyId: lastSelectedId ?? null,
                mode: "hierarchy",
            });

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                const tree = data.data || [];
                console.log("[AssetManagement DEBUG] API Response Count", {
                    topLevelNodes: Array.isArray(tree) ? tree.length : 0,
                    mode: "hierarchy",
                });
                console.log(
                    "[AssetManagement DEBUG] Filtered Table Rows (hierarchy tree root names)",
                    Array.isArray(tree)
                        ? tree.map(
                              (n: { hierarchy_name?: string; name?: string }) =>
                                  n.hierarchy_name ?? n.name,
                          )
                        : [],
                );
                setHierarchicalData(tree);
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

    const applyAssetTablePaginationFromResponse = (
        pagination: {
            currentPage?: number;
            totalPages?: number;
            totalCount?: number;
            limit?: number;
            hasNextPage?: boolean;
            hasPrevPage?: boolean;
        } | null | undefined,
        pageRequested: number,
        limitRequested: number,
    ) => {
        const lim = pagination?.limit ?? limitRequested;
        setAssetTableLimit(lim);
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

    const handleAssetTablePageChange = (page: number, limit?: number) => {
        const lim =
            typeof limit === "number" && limit > 0 ? limit : assetTableLimit;
        setCurrentPage(page);
        if (lim !== assetTableLimit) {
            setAssetTableLimit(lim);
        }
        fetchAssetTableData(page, lim, "", lastSelectedId);
    };

    const handleAssetTableRowsPerPageChange = (limit: number) => {
        setAssetTableLimit(limit);
        setCurrentPage(1);
        fetchAssetTableData(1, limit, "", lastSelectedId);
    };

    // Retry function for asset table API
    const retryAssetTableAPI = async (hierarchyId?: string) => {
        await fetchAssetTableData(
            currentPage,
            assetTableLimit,
            "",
            hierarchyId ?? lastSelectedId,
        );
    };

    const debugFilterLabel = (
        options: { value: string; label: string }[],
        value: string,
    ) => {
        if (value === "all") return "all";
        return options.find((o) => o.value.toString() === value.toString())
            ?.label;
    };

    // Fetch asset table rows from GET /assets (Get All Assets)
    const fetchAssetTableData = async (
        page = 1,
        pageSize = 20,
        search = "",
        hierarchyId?: string | null,
    ) => {
        setIsLoadingAssetTableData(true);
        try {
            const queryParams = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
            });
            if (hierarchyId) {
                queryParams.append("hierarchyId", hierarchyId);
            }
            if (search.trim()) {
                queryParams.append("search", search.trim());
            }

            console.log("[AssetManagement DEBUG] API Params", {
                endpoint: `${BACKEND_URL}/assets`,
                queryString: queryParams.toString(),
                hierarchyId: hierarchyId ?? null,
                page,
                pageSize,
                search: search.trim() || null,
            });

            const response = await fetch(
                `${BACKEND_URL}/assets?${queryParams.toString()}`,
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
                const rows = (data.data || []).map((row: Record<string, unknown>) =>
                    mapAssetApiRowToTableRow(row),
                );
                const uniqueCircles = [
                    ...new Set(
                        rows.map((r: AssetTableRow) => r.circle).filter(Boolean),
                    ),
                ];
                const uniqueDivisions = [
                    ...new Set(
                        rows
                            .map((r: AssetTableRow) => r.division)
                            .filter(Boolean),
                    ),
                ];
                console.log("[AssetManagement DEBUG] API Response Count", {
                    rowCount: rows.length,
                    pagination: data.pagination ?? null,
                });
                console.log(
                    "[AssetManagement DEBUG] Filtered Table Rows (table view)",
                    {
                        uniqueCircles,
                        uniqueDivisions,
                        sampleFirstRow: rows[0] ?? null,
                    },
                );
                setAssetTableData(rows);
                applyAssetTablePaginationFromResponse(
                    data.pagination,
                    page,
                    pageSize,
                );
                setFailedApis((prev) =>
                    prev.filter((api) => api.id !== "assetTable"),
                );
            } else {
                throw new Error(data.message || "Failed to fetch assets");
            }
        } catch (error) {
            console.error("Error fetching asset table data:", error);
            setFailedApis((prev) => {
                if (!prev.find((api) => api.id === "assetTable")) {
                    return [
                        ...prev,
                        {
                            id: "assetTable",
                            name: "Asset Table",
                            retryFunction: retryAssetTableAPI,
                            errorMessage:
                                "Failed to load Asset Table. Please try again.",
                        },
                    ];
                }
                return prev;
            });
        } finally {
            setIsLoadingAssetTableData(false);
        }
    };

    // Fetch asset table when view mode is table or hierarchy scope changes
    useEffect(() => {
        if (viewMode === "table") {
            console.log(
                "[AssetManagement DEBUG] useEffect → fetchAssetTableData",
                { viewMode, lastSelectedId, currentPage, assetTableLimit },
            );
            fetchAssetTableData(currentPage, assetTableLimit, "", lastSelectedId);
        }
    }, [viewMode, lastSelectedId]);

    // Retry function for filter options API
    const retryFilterOptionsAPI = async () => {
        setDropdownLoading(true);
        try {
            const response = await fetch(
                `${BACKEND_URL}/dtrs/filter/filter-options`,
            );

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Invalid response format");
            }

            const data = await response.json();

            if (data.success) {
                setOriginalApiData(data.data);

                const transformedData = {
                    discoms: data.data
                        .filter((item: any) => item.levelName === "DISCOM")
                        .map((item: any) => ({
                            id: item.id,
                            name: item.name,
                            code: item.code || item.name,
                            region: item.region || item.name,
                        })),
                    circles: data.data
                        .filter((item: any) => item.levelName === "Circle")
                        .map((item: any) => ({
                            id: item.id,
                            name: item.name,
                            code: item.code || item.name,
                            discom_id: item.parentId || 1,
                        })),
                    divisions: data.data
                        .filter((item: any) => item.levelName === "Division")
                        .map((item: any) => ({
                            id: item.id,
                            name: item.name,
                            code: item.code || item.name,
                            circle_id: item.parentId || 1,
                        })),
                    subDivisions: data.data
                        .filter(
                            (item: any) => item.levelName === "Sub division",
                        )
                        .map((item: any) => ({
                            id: item.id,
                            name: item.name,
                            code: item.code || item.name,
                            division_id: item.parentId || 1,
                        })),
                    sections: data.data
                        .filter((item: any) => item.levelName === "Section")
                        .map((item: any) => ({
                            id: item.id,
                            name: item.name,
                            code: item.code || item.name,
                            sub_division_id: item.parentId || 1,
                        })),
                    meterLocations: data.data
                        .filter(
                            (item: any) => item.levelName === "DTR Location",
                        )
                        .map((item: any) => ({
                            id: item.id,
                            name: item.name,
                            code: item.code || item.name,
                            description: item.description || item.name,
                        })),
                };

                setFilterOptions({
                    discoms: [
                        { value: "all", label: "All DISCOMs" },
                        ...transformedData.discoms.map((item: any) => ({
                            value: item.id.toString(),
                            label: item.name,
                        })),
                    ],
                    circles: [
                        { value: "all", label: "All Circles" },
                        ...transformedData.circles.map((item: any) => ({
                            value: item.id.toString(),
                            label: item.name,
                        })),
                    ],
                    divisions: [
                        { value: "all", label: "All Divisions" },
                        ...transformedData.divisions.map((item: any) => ({
                            value: item.id.toString(),
                            label: item.name,
                        })),
                    ],
                    subDivisions: [
                        { value: "all", label: "All Sub-Divisions" },
                        ...transformedData.subDivisions.map((item: any) => ({
                            value: item.id.toString(),
                            label: item.name,
                        })),
                    ],
                    sections: [
                        { value: "all", label: "All Sections" },
                        ...transformedData.sections.map((item: any) => ({
                            value: item.id.toString(),
                            label: item.name,
                        })),
                    ],
                    meterLocations: [
                        { value: "all", label: "All Meter Locations" },
                        ...transformedData.meterLocations.map((item: any) => ({
                            value: item.id.toString(),
                            label: item.name,
                        })),
                    ],
                    communicationStatuses:
                        emptyFilterOptions.communicationStatuses,
                });
                setFailedApis((prev) =>
                    prev.filter((api) => api.id !== "filterOptions"),
                );
            } else {
                throw new Error(
                    data.message || "Failed to fetch filter options",
                );
            }
        } catch (error) {
            console.error("Error in Filter Options API:", error);
            setFailedApis((prev) => {
                if (!prev.find((api) => api.id === "filterOptions")) {
                    return [
                        ...prev,
                        {
                            id: "filterOptions",
                            name: "Filter Options",
                            retryFunction: retryFilterOptionsAPI,
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
    };

    // Fetch dropdown data from API
    useEffect(() => {
        const fetchDropdownData = async () => {
            setDropdownLoading(true);
            try {
                const response = await fetch(
                    `${BACKEND_URL}/dtrs/filter/filter-options`,
                );

                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("Invalid response format");
                }

                const data = await response.json();

                if (data.success) {
                    // Store original API data for parent-child relationships
                    setOriginalApiData(data.data);

                    // Transform the API data to match dropdown component format
                    const transformedData = {
                        discoms: data.data
                            .filter((item: any) => item.levelName === "DISCOM")
                            .map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                code: item.code || item.name,
                                region: item.region || item.name,
                            })),
                        circles: data.data
                            .filter((item: any) => item.levelName === "Circle")
                            .map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                code: item.code || item.name,
                                discom_id: item.parentId || 1,
                            })),
                        divisions: data.data
                            .filter(
                                (item: any) => item.levelName === "Division",
                            )
                            .map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                code: item.code || item.name,
                                circle_id: item.parentId || 1,
                            })),
                        subDivisions: data.data
                            .filter(
                                (item: any) =>
                                    item.levelName === "Sub division",
                            )
                            .map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                code: item.code || item.name,
                                division_id: item.parentId || 1,
                            })),
                        sections: data.data
                            .filter((item: any) => item.levelName === "Section")
                            .map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                code: item.code || item.name,
                                sub_division_id: item.parentId || 1,
                            })),
                        meterLocations: data.data
                            .filter(
                                (item: any) =>
                                    item.levelName === "DTR Location",
                            )
                            .map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                code: item.code || item.name,
                                description: item.description || item.name,
                            })),
                    };

                    // setDropdownData(transformedData);

                    // Also update filter options for the new dropdown structure
                    setFilterOptions({
                        discoms: [
                            { value: "all", label: "All DISCOMs" },
                            ...transformedData.discoms.map((item: any) => ({
                                value: item.id.toString(),
                                label: item.name,
                            })),
                        ],
                        circles: [
                            { value: "all", label: "All Circles" },
                            ...transformedData.circles.map((item: any) => ({
                                value: item.id.toString(),
                                label: item.name,
                            })),
                        ],
                        divisions: [
                            { value: "all", label: "All Divisions" },
                            ...transformedData.divisions.map((item: any) => ({
                                value: item.id.toString(),
                                label: item.name,
                            })),
                        ],
                        subDivisions: [
                            { value: "all", label: "All Sub-Divisions" },
                            ...transformedData.subDivisions.map(
                                (item: any) => ({
                                    value: item.id.toString(),
                                    label: item.name,
                                }),
                            ),
                        ],
                        sections: [
                            { value: "all", label: "All Sections" },
                            ...transformedData.sections.map((item: any) => ({
                                value: item.id.toString(),
                                label: item.name,
                            })),
                        ],
                        meterLocations: [
                            { value: "all", label: "All Meter Locations" },
                            ...transformedData.meterLocations.map(
                                (item: any) => ({
                                    value: item.id.toString(),
                                    label: item.name,
                                }),
                            ),
                        ],
                        communicationStatuses:
                            emptyFilterOptions.communicationStatuses,
                    });
                    setFailedApis((prev) =>
                        prev.filter((api) => api.id !== "filterOptions"),
                    );
                } else {
                    throw new Error(
                        data.message || "Failed to fetch filter options",
                    );
                }
            } catch (error) {
                console.error("Error fetching filter options:", error);
                setFailedApis((prev) => {
                    if (!prev.find((api) => api.id === "filterOptions")) {
                        return [
                            ...prev,
                            {
                                id: "filterOptions",
                                name: "Filter Options",
                                retryFunction: retryFilterOptionsAPI,
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
        };

        fetchDropdownData();
    }, []);

    const [isSubNodeChecked, setIsSubNodeChecked] = useState(false);

    // Dropdown data state - Commented out as not currently used
    // const [dropdownData, setDropdownData] = useState<DropdownData>({
    //   discoms: [],
    //   circles: [],
    //   divisions: [],
    //   subDivisions: [],
    //   sections: [],
    //   meterLocations: []
    // });
    const [dropdownLoading, setDropdownLoading] = useState(false);

    // State for filter options from backend
    const [filterOptions, setFilterOptions] = useState(emptyFilterOptions);

    // Store original API data with parent relationships
    const [originalApiData, setOriginalApiData] = useState<any[]>([]);

    const handleTabChange = (newTabIndex: number) => {
        setActiveTab(newTabIndex);
        setIsSubNodeChecked(false); // Reset checkbox state when switching tabs
    };

    const handleCheckboxChange = (checked: boolean) => {
        setIsSubNodeChecked(checked);
    };

    // Retry specific API
    const retrySpecificAPI = (apiId: string) => {
        const api = failedApis.find((a) => a.id === apiId);
        if (api) {
            api.retryFunction(lastSelectedId || undefined);
        }
    };

    // Function to update filter options based on selection
    const updateFilterOptions = async (
        filterName: string,
        selectedValue: any,
    ) => {
        const name = selectedValue.target.value;
        const value = selectedValue.target.value;
        if (name === "all") return;

        try {
            const params = new URLSearchParams();
            params.append("parentId", value);
            const apiUrl = `${BACKEND_URL}/dtrs/filter/filter-options?${params.toString()}`;

            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error("Failed to fetch filter options");

            const data = await response.json();

            if (data.success) {
                const newOptions = data.data || [];

                // Update the appropriate filter options based on filterName
                // and reset dependent filters
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
                            meterLocation: "all",
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
                            meterLocations: [
                                { value: "all", label: "All Meter Locations" },
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
                            meterLocation: "all",
                        }));
                        // Clear dependent dropdowns
                        setFilterOptions((prev) => ({
                            ...prev,
                            subDivisions: [
                                { value: "all", label: "All Sub-Divisions" },
                            ],
                            sections: [{ value: "all", label: "All Sections" }],
                            meterLocations: [
                                { value: "all", label: "All Meter Locations" },
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
                            meterLocation: "all",
                        }));
                        // Clear dependent dropdowns
                        setFilterOptions((prev) => ({
                            ...prev,
                            sections: [{ value: "all", label: "All Sections" }],
                            meterLocations: [
                                { value: "all", label: "All Meter Locations" },
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
                            meterLocation: "all",
                        }));
                        // Clear dependent dropdowns
                        setFilterOptions((prev) => ({
                            ...prev,
                            meterLocations: [
                                { value: "all", label: "All Meter Locations" },
                            ],
                        }));
                        break;

                    case "section":
                        setFilterOptions((prev) => ({
                            ...prev,
                            meterLocations: [
                                { value: "all", label: "All Meter Locations" },
                                ...newOptions.map((item: any) => ({
                                    value: item.id.toString(),
                                    label: item.name,
                                })),
                            ],
                        }));
                        // Reset dependent filters
                        setFilterValues((prev) => ({
                            ...prev,
                            meterLocation: "all",
                        }));
                        break;
                }
            }
        } catch (error) {
            console.error(
                `❌ Error updating filter options for ${filterName}:`,
                error,
            );
        }
    };

    // Helper function to find all parent values when child is selected
    const findAllParentValues = (
        childFilterName: string,
        childValue: string,
    ) => {
        if (childValue === "all" || !originalApiData.length) return {};

        // Define the complete hierarchy mapping
        const hierarchyLevels = [
            { filterName: "discom", levelName: "DISCOM" },
            { filterName: "circle", levelName: "Circle" },
            { filterName: "division", levelName: "Division" },
            { filterName: "subDivision", levelName: "Sub division" },
            { filterName: "section", levelName: "Section" },
            { filterName: "meterLocation", levelName: "DTR Location" },
        ];

        // Find the selected child item
        const childLevel = hierarchyLevels.find(
            (level) => level.filterName === childFilterName,
        );
        if (!childLevel) return {};

        const childItem = originalApiData.find(
            (item: any) =>
                item.levelName === childLevel.levelName &&
                item.id.toString() === childValue,
        );

        if (!childItem) return {};

        // Build the complete hierarchy path
        const parentValues: { [key: string]: string } = {};
        let currentItem = childItem;
        let currentLevelIndex = hierarchyLevels.findIndex(
            (level) => level.filterName === childFilterName,
        );

        // Walk up the hierarchy to find all parents
        while (currentItem && currentItem.parentId && currentLevelIndex > 0) {
            const parentLevel = hierarchyLevels[currentLevelIndex - 1];
            const parentItem = originalApiData.find(
                (item: any) =>
                    item.levelName === parentLevel.levelName &&
                    item.id === currentItem.parentId,
            );

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
        // Handle both string and event object cases
        const selectedValue =
            typeof value === "string" ? value : value.target.value;

        if (filterName === "communicationStatus") {
            setFilterValues((prev) => ({
                ...prev,
                communicationStatus: selectedValue,
            }));
            return;
        }

        // Find all parent values if a child is selected
        const parentValues = findAllParentValues(filterName, selectedValue);

        // Update filter values with the selected value and all its parents
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
        let lastId: string | null = null;

        if (filterValues.meterLocation !== "all") {
            lastId = filterValues.meterLocation;
        } else if (filterValues.section !== "all") {
            lastId = filterValues.section;
        } else if (filterValues.subDivision !== "all") {
            lastId = filterValues.subDivision;
        } else if (filterValues.division !== "all") {
            lastId = filterValues.division;
        } else if (filterValues.circle !== "all") {
            lastId = filterValues.circle;
        } else if (filterValues.discom !== "all") {
            lastId = filterValues.discom;
        }

        const params = new URLSearchParams();
        Object.entries(filterValues).forEach(([key, value]) => {
            if (value !== "all") {
                params.append(key, value);
            }
        });

        console.log("[AssetManagement DEBUG] Selected Filters", {
            filterValues,
            displayLabels: {
                discom: debugFilterLabel(filterOptions.discoms, filterValues.discom),
                circle: debugFilterLabel(
                    filterOptions.circles,
                    filterValues.circle,
                ),
                division: debugFilterLabel(
                    filterOptions.divisions,
                    filterValues.division,
                ),
                subDivision: debugFilterLabel(
                    filterOptions.subDivisions,
                    filterValues.subDivision,
                ),
                section: debugFilterLabel(
                    filterOptions.sections,
                    filterValues.section,
                ),
                meterLocation: debugFilterLabel(
                    filterOptions.meterLocations,
                    filterValues.meterLocation,
                ),
                communicationStatus: filterValues.communicationStatus,
            },
            computedHierarchyId: lastId,
            viewMode,
        });
        console.log(
            "[AssetManagement DEBUG] API Params (built in handleGetData, note which are actually sent)",
            {
                unusedNamedFilterQuery: params.toString(),
                actuallySentToFetch: lastId
                    ? `hierarchyId=${lastId}`
                    : "(no hierarchyId — full dataset)",
                notSent: [
                    "circle/division/discom names (IDs only in unusedNamedFilterQuery)",
                    "communicationStatus (never appended to GET /assets)",
                ],
            },
        );

        setLastSelectedId(lastId);

        try {
            // Refresh data with new filters
            if (viewMode === "table") {
                fetchAssetTableData(currentPage, assetTableLimit, "", lastId);
            } else if (viewMode === "hierarchy") {
                fetchAssets(lastId);
            }
        } catch (error) {
            console.error("Error applying filters:", error);
        }
    };

    // Handle Export button click
    const handleExportData = async () => {
        if (isExporting) return; // Prevent multiple exports

        setIsExporting(true);

        try {
            const XLSX = await import("xlsx");
            const workbook = XLSX.utils.book_new();

            if (viewMode === "table") {
                // Check if there's data to export
                if (!assetTableData || assetTableData.length === 0) {
                    alert(
                        "No data available to export. Please load data first.",
                    );
                    return;
                }

                const assetsExportData = assetTableData.map((asset, index) => ({
                    "S.No": asset.slNo ?? index + 1,
                    DISCOM: asset.discom ?? "-",
                    Circle: asset.circle ?? "-",
                    Division: asset.division ?? "-",
                    "Sub-Division": asset.subDivision ?? "-",
                    Section: asset.section ?? "-",
                    Substation: asset.substation ?? "-",
                    Feeder: asset.feeder ?? "-",
                    "DTR Number": asset.dtrNumber ?? "-",
                    "Meter Number": asset.meterNumber ?? "-",
                }));

                const metersSheet = XLSX.utils.json_to_sheet(assetsExportData);

                // Auto-size columns for better readability
                const setAutoWidth = (worksheet: any) => {
                    const range = XLSX.utils.decode_range(
                        worksheet["!ref"] || "A1:A1",
                    );
                    const colWidths: any[] = [];

                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        let maxWidth = 10;
                        for (let R = range.s.r; R <= range.e.r; ++R) {
                            const cellAddress = XLSX.utils.encode_cell({
                                r: R,
                                c: C,
                            });
                            const cell = worksheet[cellAddress];
                            if (cell && cell.v) {
                                const cellLength = cell.v.toString().length;
                                maxWidth = Math.max(maxWidth, cellLength);
                            }
                        }
                        colWidths[C] = { wch: Math.min(maxWidth + 2, 50) }; // Max width 50
                    }
                    worksheet["!cols"] = colWidths;
                };

                setAutoWidth(metersSheet);
                XLSX.utils.book_append_sheet(
                    workbook,
                    metersSheet,
                    "Assets Data",
                );

                // Generate filename with current date
                const currentDate = new Date().toISOString().split("T")[0];
                const fileName = `assets-data-${currentDate}.xlsx`;

                // Create and download the file
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
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } else if (viewMode === "hierarchy") {
                // Check if there's data to export
                const flattenedData = getFlattenedTableData();
                if (!flattenedData || flattenedData.length === 0) {
                    alert(
                        "No hierarchy data available to export. Please load data first.",
                    );
                    return;
                }

                // Export hierarchy data
                const hierarchyExportData = flattenedData.map(
                    (asset, index) => ({
                        "S.No": index + 1,
                        "Asset Name": asset.name || "-",
                        "Asset Type": asset.type || "-",
                        "Hierarchy Level": asset.level || 0,
                        "Full Path": asset.path || "-",
                        Count: asset.count || 0,
                        Parent: asset.parent || "Root",
                    }),
                );

                const hierarchySheet =
                    XLSX.utils.json_to_sheet(hierarchyExportData);

                // Auto-size columns for better readability
                const setAutoWidth = (worksheet: any) => {
                    const range = XLSX.utils.decode_range(
                        worksheet["!ref"] || "A1:A1",
                    );
                    const colWidths: any[] = [];

                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        let maxWidth = 10;
                        for (let R = range.s.r; R <= range.e.r; ++R) {
                            const cellAddress = XLSX.utils.encode_cell({
                                r: R,
                                c: C,
                            });
                            const cell = worksheet[cellAddress];
                            if (cell && cell.v) {
                                const cellLength = cell.v.toString().length;
                                maxWidth = Math.max(maxWidth, cellLength);
                            }
                        }
                        colWidths[C] = { wch: Math.min(maxWidth + 2, 50) }; // Max width 50
                    }
                    worksheet["!cols"] = colWidths;
                };

                setAutoWidth(hierarchySheet);
                XLSX.utils.book_append_sheet(
                    workbook,
                    hierarchySheet,
                    "Asset Hierarchy",
                );

                // Generate filename with current date
                const currentDate = new Date().toISOString().split("T")[0];
                const fileName = `asset-hierarchy-${currentDate}.xlsx`;

                // Create and download the file
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
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error("Error exporting data:", error);
            alert("Failed to export data. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    // Handle Reset button click
    const handleResetFilters = async () => {
        setFilterValues({
            discom: "all",
            circle: "all",
            division: "all",
            subDivision: "all",
            section: "all",
            meterLocation: "all",
            communicationStatus: "all",
        });
        setLastSelectedId(null);

        // Reset filter options to initial state
        const fetchFilterOptions = async () => {
            setDropdownLoading(true);
            try {
                const response = await fetch(
                    `${BACKEND_URL}/dtrs/filter/filter-options`,
                );

                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("Invalid response format");
                }

                const data = await response.json();

                if (data.success) {
                    setOriginalApiData(data.data);

                    const transformedData = {
                        discoms: data.data
                            .filter((item: any) => item.levelName === "DISCOM")
                            .map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                code: item.code || item.name,
                                region: item.region || item.name,
                            })),
                        circles: data.data
                            .filter((item: any) => item.levelName === "Circle")
                            .map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                code: item.code || item.name,
                                discom_id: item.parentId || 1,
                            })),
                        divisions: data.data
                            .filter(
                                (item: any) => item.levelName === "Division",
                            )
                            .map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                code: item.code || item.name,
                                circle_id: item.parentId || 1,
                            })),
                        subDivisions: data.data
                            .filter(
                                (item: any) =>
                                    item.levelName === "Sub division",
                            )
                            .map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                code: item.code || item.name,
                                division_id: item.parentId || 1,
                            })),
                        sections: data.data
                            .filter((item: any) => item.levelName === "Section")
                            .map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                code: item.code || item.name,
                                sub_division_id: item.parentId || 1,
                            })),
                        meterLocations: data.data
                            .filter(
                                (item: any) =>
                                    item.levelName === "DTR Location",
                            )
                            .map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                code: item.code || item.name,
                                description: item.description || item.name,
                            })),
                    };

                    setFilterOptions({
                        discoms: [
                            { value: "all", label: "All DISCOMs" },
                            ...transformedData.discoms.map((item: any) => ({
                                value: item.id.toString(),
                                label: item.name,
                            })),
                        ],
                        circles: [
                            { value: "all", label: "All Circles" },
                            ...transformedData.circles.map((item: any) => ({
                                value: item.id.toString(),
                                label: item.name,
                            })),
                        ],
                        divisions: [
                            { value: "all", label: "All Divisions" },
                            ...transformedData.divisions.map((item: any) => ({
                                value: item.id.toString(),
                                label: item.name,
                            })),
                        ],
                        subDivisions: [
                            { value: "all", label: "All Sub-Divisions" },
                            ...transformedData.subDivisions.map(
                                (item: any) => ({
                                    value: item.id.toString(),
                                    label: item.name,
                                }),
                            ),
                        ],
                        sections: [
                            { value: "all", label: "All Sections" },
                            ...transformedData.sections.map((item: any) => ({
                                value: item.id.toString(),
                                label: item.name,
                            })),
                        ],
                        meterLocations: [
                            { value: "all", label: "All Meter Locations" },
                            ...transformedData.meterLocations.map(
                                (item: any) => ({
                                    value: item.id.toString(),
                                    label: item.name,
                                }),
                            ),
                        ],
                        communicationStatuses:
                            emptyFilterOptions.communicationStatuses,
                    });
                }
            } catch (error) {
                console.error("Error resetting filter options:", error);
            } finally {
                setDropdownLoading(false);
            }
        };

        await fetchFilterOptions();

        // Refresh data with reset filters
        if (viewMode === "table") {
            setAssetTableLimit(20);
            fetchAssetTableData(1, 20, "", null);
        } else if (viewMode === "hierarchy") {
            fetchAssets(null);
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
                    await fetchAssetTableData(
                        currentPage,
                        assetTableLimit,
                        "",
                        lastSelectedId,
                    );
                    if (viewMode === "hierarchy") {
                        await fetchAssets(lastSelectedId ?? undefined);
                    }
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
            assetTableLimit,
            lastSelectedId,
            viewMode,
            fetchAssetTableData,
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

    const bulkUploadButton = useMemo(
        () => ({
            label: "Bulk Upload",
            variant: "secondary" as const,
            onClick: () => setIsBulkUploadModalOpen(true),
        }),
        [],
    );

    return (
        <>
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
                                    title: "Asset Management",
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
                    ...(viewMode === "hierarchy"
                        ? [
                              // Filter Section for Hierarchy View
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
                                              options: filterOptions.discoms,
                                              value: filterValues.discom,
                                              onChange: (value: string) =>
                                                  handleFilterChange(
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
                                                  handleFilterChange(
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
                                              options: filterOptions.divisions,
                                              value: filterValues.division,
                                              onChange: (value: string) =>
                                                  handleFilterChange(
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
                                                  handleFilterChange(
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
                                                  handleFilterChange(
                                                      "section",
                                                      value,
                                                  ),
                                              placeholder: "Select Section",
                                              loading: dropdownLoading,
                                              searchable: false,
                                          },
                                      },
                                      {
                                          name: "Dropdown",
                                          props: {
                                              options:
                                                  filterOptions.meterLocations,
                                              value: filterValues.meterLocation,
                                              onChange: (value: string) =>
                                                  handleFilterChange(
                                                      "meterLocation",
                                                      value,
                                                  ),
                                              placeholder:
                                                  "Select Meter Location",
                                              loading: dropdownLoading,
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
                                              layout: "flex" as const,
                                              direction: "row" as const,
                                              gap: "gap-4",
                                              className:
                                                  "flex items-center gap-5 justify-center w-full border gap-5 border-primary-border dark:border-dark-border rounded-3xl p-4 bg-background-secondary dark:bg-primary-dark-light",
                                              columns: [
                                                  {
                                                      name: "Dropdown",
                                                      props: {
                                                          options:
                                                              filterOptions.discoms,
                                                          value: filterValues.discom,
                                                          onChange: (
                                                              value: string,
                                                          ) =>
                                                              handleFilterChange(
                                                                  "discom",
                                                                  value,
                                                              ),
                                                          placeholder:
                                                              "Select DISCOM",
                                                          loading:
                                                              dropdownLoading,
                                                          searchable: false,
                                                      },
                                                  },
                                                  {
                                                      name: "Dropdown",
                                                      props: {
                                                          options:
                                                              filterOptions.circles,
                                                          value: filterValues.circle,
                                                          onChange: (
                                                              value: string,
                                                          ) =>
                                                              handleFilterChange(
                                                                  "circle",
                                                                  value,
                                                              ),
                                                          placeholder:
                                                              "Select Circle",
                                                          loading:
                                                              dropdownLoading,
                                                          searchable: false,
                                                      },
                                                  },
                                                  {
                                                      name: "Dropdown",
                                                      props: {
                                                          options:
                                                              filterOptions.divisions,
                                                          value: filterValues.division,
                                                          onChange: (
                                                              value: string,
                                                          ) =>
                                                              handleFilterChange(
                                                                  "division",
                                                                  value,
                                                              ),
                                                          placeholder:
                                                              "Select Division",
                                                          loading:
                                                              dropdownLoading,
                                                          searchable: false,
                                                      },
                                                  },
                                                  {
                                                      name: "Dropdown",
                                                      props: {
                                                          options:
                                                              filterOptions.subDivisions,
                                                          value: filterValues.subDivision,
                                                          onChange: (
                                                              value: string,
                                                          ) =>
                                                              handleFilterChange(
                                                                  "subDivision",
                                                                  value,
                                                              ),
                                                          placeholder:
                                                              "Select Sub-Division",
                                                          loading:
                                                              dropdownLoading,
                                                          searchable: false,
                                                      },
                                                  },
                                                  {
                                                      name: "Dropdown",
                                                      props: {
                                                          options:
                                                              filterOptions.sections,
                                                          value: filterValues.section,
                                                          onChange: (
                                                              value: string,
                                                          ) =>
                                                              handleFilterChange(
                                                                  "section",
                                                                  value,
                                                              ),
                                                          placeholder:
                                                              "Select Section",
                                                          loading:
                                                              dropdownLoading,
                                                          searchable: false,
                                                      },
                                                  },
                                                  {
                                                      name: "Dropdown",
                                                      props: {
                                                          options:
                                                              filterOptions.meterLocations,
                                                          value: filterValues.meterLocation,
                                                          onChange: (
                                                              value: string,
                                                          ) =>
                                                              handleFilterChange(
                                                                  "meterLocation",
                                                                  value,
                                                              ),
                                                          placeholder:
                                                              "Select Meter Location",
                                                          loading:
                                                              dropdownLoading,
                                                          searchable: false,
                                                      },
                                                  },
                                                  {
                                                      name: "Dropdown",
                                                      props: {
                                                          options:
                                                              filterOptions.communicationStatuses,
                                                          value: filterValues.communicationStatus,
                                                          onChange: (
                                                              value: string,
                                                          ) =>
                                                              handleFilterChange(
                                                                  "communicationStatus",
                                                                  value,
                                                              ),
                                                          placeholder:
                                                              "Communication status",
                                                          loading: false,
                                                          searchable: false,
                                                      },
                                                  },
                                                  {
                                                      name: "Button",
                                                      props: {
                                                          onClick:
                                                              handleGetData,
                                                          variant: "primary",
                                                          children: "Get Data",
                                                          className:
                                                              "h-10 self-end",
                                                          searchable: false,
                                                      },
                                                      align: "center",
                                                  },
                                                  {
                                                      name: "Button",
                                                      props: {
                                                          onClick:
                                                              handleResetFilters,
                                                          variant: "secondary",
                                                          children: "Reset",
                                                          className:
                                                              "h-10 self-end",
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
                                                          data:
                                                              viewMode ===
                                                              "table"
                                                                  ? assetTableData
                                                                  : getFlattenedTableData(),
                                                          headerTitle:
                                                              viewMode ===
                                                              "table"
                                                                  ? "Assets"
                                                                  : "Assets",
                                                          showHeader: true,
                                                          availableTimeRanges:
                                                              [],
                                                          columns:
                                                              viewMode ===
                                                              "table"
                                                                  ? ASSET_TABLE_COLUMNS
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
                                                                  ? isLoadingAssetTableData ||
                                                                    bulkFlowLoading
                                                                  : bulkFlowLoading,
                                                          emptyMessage:
                                                              "No assets found",
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
                                                                  ? handleAssetTablePageChange
                                                                  : undefined,
                                                          onRowsPerPageChange:
                                                              viewMode ===
                                                              "table"
                                                                  ? handleAssetTableRowsPerPageChange
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
                                                                        fetchAssetTableData(
                                                                            1,
                                                                            assetTableLimit,
                                                                            searchTerm,
                                                                            lastSelectedId,
                                                                        );
                                                                    }
                                                                  : undefined,
                                                          showActions: true,
                                                          actions:
                                                              assetTableEditActions,
                                                          actionsColumnLabel:
                                                              "Edit",
                                                          onEdit: (
                                                              row: AssetTableRow,
                                                          ) =>
                                                              handleEditAssetLocation(
                                                                  row,
                                                              ),
                                                          onActionClick: (
                                                              actionId: string,
                                                              row: AssetTableRow,
                                                          ) => {
                                                              if (
                                                                  actionId ===
                                                                  "edit"
                                                              ) {
                                                                  handleEditAssetLocation(
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
            <EditLocationModal
                isOpen={isEditLocationModalOpen}
                initialValues={assetEditInitialValues}
                resetKey={assetToEdit?.id ?? "closed"}
                isSaving={savingLocationEdit}
                onClose={handleCloseEditLocationModal}
                onSave={handleSaveAssetLocationEdit}
            />
        </>
    );
}
