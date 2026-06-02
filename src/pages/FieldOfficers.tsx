import {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import "./FieldOfficers.modal.css";
import { useNavigate } from "react-router-dom";
import {
    createFieldOfficer,
    fetchDtrNamesList,
    fetchFieldOfficersPage,
    type FieldOfficerApiRecord,
} from "../api/apiUtils";

const Page = lazy(() => import("SuperAdmin/Page"));

const DEFAULT_PAGE_SIZE = 10;

type TableRow = {
    id: number;
    slNo: number;
    officerName: string;
    phone: string;
    employeeCode: string;
    designation: string;
    dtrNumber: string;
    status: string;
};

type ServerPaginationState = {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
};

const tableColumns = [
    { key: "slNo", label: "S.No" },
    { key: "officerName", label: "Officer Name" },
    { key: "phone", label: "Phone" },
    { key: "designation", label: "Section" },
    { key: "dtrNumber", label: "DTR Number" },
    { key: "status", label: "Status" },
];

function mapOfficersToTable(
    officers: FieldOfficerApiRecord[],
    page: number,
    pageSize: number,
): TableRow[] {
    const base = (page - 1) * pageSize;
    return officers.map((row, index) => ({
        id: row.id,
        slNo: base + index + 1,
        officerName: row.officer_name,
        phone: row.phone,
        employeeCode: row.employee_code?.trim() || "—",
        designation: row.designation?.trim() || "—",
        dtrNumber:
            row.dtrs?.dtrNumber?.trim() ||
            (row.dtr_id ? String(row.dtr_id) : "—"),
        status: row.is_active ? "Active" : "Inactive",
    }));
}

type DtrDropdownOption = { value: string; label: string };

function mapDtrNamesToDropdownOptions(
    rows: { id: number; dtrName: string }[],
): DtrDropdownOption[] {
    return rows.map((row) => ({
        value: String(row.id),
        label: row.dtrName,
    }));
}

const emptyPagination = (limit = DEFAULT_PAGE_SIZE): ServerPaginationState => ({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit,
    hasNextPage: false,
    hasPrevPage: false,
});

export default function FieldOfficers() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<TableRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [tableLimit, setTableLimit] = useState(DEFAULT_PAGE_SIZE);
    const [currentPage, setCurrentPage] = useState(1);
    const [serverPagination, setServerPagination] =
        useState<ServerPaginationState>(emptyPagination());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [dtrOptions, setDtrOptions] = useState<DtrDropdownOption[]>([]);
    const [allDtrOptions, setAllDtrOptions] = useState<DtrDropdownOption[]>([]);
    const [dtrOptionsLoaded, setDtrOptionsLoaded] = useState(false);
    const [dtrOptionsLoading, setDtrOptionsLoading] = useState(false);
    const [dtrOptionsError, setDtrOptionsError] = useState<string | null>(null);
    const dtrSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );
    const [failedApis, setFailedApis] = useState<
        Array<{
            id: string;
            name: string;
            retryFunction: () => Promise<void>;
            errorMessage: string;
        }>
    >([]);

    const fetchFieldOfficers = useCallback(
        async (
            page = 1,
            limit = tableLimit,
            search = searchTerm,
        ) => {
            setLoading(true);
            setFailedApis((prev) =>
                prev.filter((api) => api.id !== "fieldOfficers"),
            );

            try {
                const { officers, pagination } = await fetchFieldOfficersPage(
                    page,
                    limit,
                    search,
                );
                const lim = pagination.pageSize ?? limit;
                setRows(mapOfficersToTable(officers, page, lim));
                setTableLimit(lim);
                setCurrentPage(pagination.currentPage ?? page);
                setServerPagination({
                    currentPage: pagination.currentPage ?? page,
                    totalPages: pagination.totalPages ?? 1,
                    totalCount: pagination.totalCount ?? 0,
                    limit: lim,
                    hasNextPage: pagination.hasNextPage ?? false,
                    hasPrevPage: pagination.hasPrevPage ?? false,
                });
            } catch (error) {
                const errMsg =
                    error instanceof Error
                        ? error.message
                        : "Failed to load field officers";
                setRows([]);
                setServerPagination(emptyPagination(limit));
                setFailedApis((prev) => [
                    ...prev,
                    {
                        id: "fieldOfficers",
                        name: "All Field Officers",
                        retryFunction: () =>
                            fetchFieldOfficers(page, limit, search),
                        errorMessage: errMsg,
                    },
                ]);
            } finally {
                setLoading(false);
            }
        },
        [searchTerm, tableLimit],
    );

    useEffect(() => {
        fetchFieldOfficers(1, DEFAULT_PAGE_SIZE, "");
    }, []);

    useEffect(() => {
        if (!isAddModalOpen || dtrOptionsLoaded) return;

        let cancelled = false;

        const loadDtrOptions = async () => {
            setDtrOptionsLoading(true);
            setDtrOptionsError(null);
            try {
                const rows = await fetchDtrNamesList();
                if (!cancelled) {
                    const options = mapDtrNamesToDropdownOptions(rows);
                    setAllDtrOptions(options);
                    setDtrOptions(options);
                    setDtrOptionsLoaded(true);
                }
            } catch (error) {
                if (!cancelled) {
                    setDtrOptions([]);
                    setDtrOptionsError(
                        error instanceof Error
                            ? error.message
                            : "Failed to load DTR names",
                    );
                }
            } finally {
                if (!cancelled) {
                    setDtrOptionsLoading(false);
                }
            }
        };

        void loadDtrOptions();
        return () => {
            cancelled = true;
        };
    }, [isAddModalOpen, dtrOptionsLoaded]);

    const handleDtrNameSearch = useCallback(
        (searchText: string) => {
            const term = searchText.trim();
            if (!term) {
                setDtrOptions(allDtrOptions);
                setDtrOptionsError(null);
                return;
            }

            const lower = term.toLowerCase();
            setDtrOptions(
                allDtrOptions.filter((opt) =>
                    opt.label.toLowerCase().includes(lower),
                ),
            );

            if (dtrSearchDebounceRef.current) {
                clearTimeout(dtrSearchDebounceRef.current);
            }
            dtrSearchDebounceRef.current = setTimeout(() => {
                void (async () => {
                    setDtrOptionsLoading(true);
                    setDtrOptionsError(null);
                    try {
                        const rows = await fetchDtrNamesList(term);
                        setDtrOptions(mapDtrNamesToDropdownOptions(rows));
                    } catch (error) {
                        setDtrOptionsError(
                            error instanceof Error
                                ? error.message
                                : "Failed to search DTR names",
                        );
                    } finally {
                        setDtrOptionsLoading(false);
                    }
                })();
            }, 300);
        },
        [allDtrOptions],
    );

    useEffect(() => {
        return () => {
            if (dtrSearchDebounceRef.current) {
                clearTimeout(dtrSearchDebounceRef.current);
            }
        };
    }, []);

    const handlePageChange = (page: number, limit?: number) => {
        const lim =
            typeof limit === "number" && limit > 0 ? limit : tableLimit;
        setCurrentPage(page);
        if (lim !== tableLimit) {
            setTableLimit(lim);
        }
        fetchFieldOfficers(page, lim, searchTerm);
    };

    const handleRowsPerPageChange = (limit: number) => {
        setTableLimit(limit);
        setCurrentPage(1);
        fetchFieldOfficers(1, limit, searchTerm);
    };

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        setCurrentPage(1);
        fetchFieldOfficers(1, tableLimit, term);
    };

    const handleAddFieldOfficer = async (formData: Record<string, unknown>) => {
        const dtrId = Number(formData.dtrName);
        const officerName = String(formData.officerName ?? "").trim();
        const phone = String(formData.phone ?? "").trim();
        const employeeCode = String(formData.employeeCode ?? "").trim();
        const designation = String(formData.designation ?? "").trim();

        if (!Number.isFinite(dtrId) || dtrId <= 0) {
            throw new Error("DTR name is required");
        }
        if (!officerName) {
            throw new Error("Officer name is required");
        }
        if (!phone) {
            throw new Error("Phone number is required");
        }

        setIsSaving(true);
        try {
            await createFieldOfficer({
                dtr_id: dtrId,
                officer_name: officerName,
                phone,
                employee_code: employeeCode || undefined,
                designation: designation || undefined,
            });
            setIsAddModalOpen(false);
            await fetchFieldOfficers(currentPage, tableLimit, searchTerm);
        } finally {
            setIsSaving(false);
        }
    };

    const retrySpecificAPI = (apiId: string) => {
        const api = failedApis.find((a) => a.id === apiId);
        if (api) api.retryFunction();
    };

    const addFieldOfficerFormFields = useMemo(
        () => [
            {
                type: "text" as const,
                name: "officerName",
                label: "Officer Name",
                placeholder: "Enter officer name",
                required: true,
            },
            {
                type: "text" as const,
                name: "phone",
                label: "Phone",
                placeholder: "Enter phone number",
                required: true,
            },
            {
                type: "dropdown" as const,
                name: "dtrName",
                label: "DTR Name",
                placeholder: dtrOptionsError
                    ? dtrOptionsError
                    : dtrOptionsLoading
                      ? "Loading DTR names..."
                      : dtrOptions.length === 0
                        ? "No DTR names found"
                        : "Select DTR name",
                searchPlaceholder: "Search DTR name",
                required: true,
                searchable: true,
                disabled: dtrOptionsLoading && dtrOptions.length === 0,
                options: dtrOptions,
                onSearch: handleDtrNameSearch,
                onInputChange: handleDtrNameSearch,
            },
            {
                type: "text" as const,
                name: "employeeCode",
                label: "Employee Code",
                required: false,
            },
            {
                type: "text" as const,
                name: "designation",
                label: "Designation",
                required: false,
                span: { col: 2, row: 1 },
            },
        ],
        [
            dtrOptions,
            dtrOptionsLoading,
            dtrOptionsError,
            handleDtrNameSearch,
        ],
    );

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
                                  },
                                  components: [
                                      {
                                          name: "Error",
                                          props: {
                                              visibleErrors: failedApis.map(
                                                  (api) => api.errorMessage,
                                              ),
                                              showRetry: true,
                                              maxVisibleErrors: 3,
                                              failedApis,
                                              onRetrySpecific: retrySpecificAPI,
                                          },
                                      },
                                  ],
                              },
                          ]
                        : []),
                    {
                        layout: {
                            type: "row",
                            className: "",
                        },
                        components: [
                            {
                                name: "PageHeader",
                                props: {
                                    title: "Field Officer",
                                    onBackClick: () =>
                                        navigate("/dtr-dashboard"),
                                    backButtonText: "Back to Dashboard",
                                    showMenu: false,
                                    buttonsLabel: "Add Field Officer",
                                    variant: "primary",
                                    onClick: () => setIsAddModalOpen(true),
                                },
                            },
                        ],
                    },
                    {
                        layout: {
                            type: "column" as const,
                            gap: "gap-0",
                        },
                        components: [
                            {
                                name: "Modal",
                                props: {
                                    isOpen: isAddModalOpen,
                                    onClose: () =>
                                        !isSaving && setIsAddModalOpen(false),
                                    title: "Add Field Officer",
                                    size: "3xl",
                                    className: "field-officer-add-modal-panel",
                                    showCloseIcon: true,
                                    backdropClosable: !isSaving,
                                    centered: true,
                                    showForm: true,
                                    formFields: addFieldOfficerFormFields,
                                    onSave: handleAddFieldOfficer,
                                    saveButtonLabel: isSaving
                                        ? "Saving..."
                                        : "Save",
                                    cancelButtonLabel: "Cancel",
                                    gridLayout: {
                                        gridRows: 2,
                                        gridColumns: 3,
                                        gap: "gap-8",
                                        className: "w-full min-h-[16rem]",
                                    },
                                },
                            },
                        ],
                    },
                    {
                        layout: {
                            type: "grid",
                            columns: 1,
                            gap: "gap-4",
                            rows: [
                                {
                                    layout: "grid",
                                    gridColumns: 1,
                                    gap: "gap-4",
                                    columns: [
                                        {
                                            name: "Table",
                                            props: {
                                                data: rows,
                                                columns: tableColumns,
                                                loading,
                                                showHeader: true,
                                                headerTitle: "Field Officers",
                                                searchable: true,
                                                sortable: true,
                                                pagination: true,
                                                showPagination: true,
                                                selectable: false,
                                                showActions: false,
                                                availableTimeRanges: [],
                                                serverPagination,
                                                pageSize: serverPagination.limit,
                                                itemsPerPage:
                                                    serverPagination.limit,
                                                totalCount:
                                                    serverPagination.totalCount,
                                                currentPage:
                                                    serverPagination.currentPage,
                                                totalPages:
                                                    serverPagination.totalPages,
                                                rowsPerPageOptions: [
                                                    10, 20, 50, 100,
                                                ],
                                                initialRowsPerPage: 10,
                                                onPageChange: handlePageChange,
                                                onRowsPerPageChange:
                                                    handleRowsPerPageChange,
                                                onSearch: handleSearch,
                                                emptyMessage: loading
                                                    ? "Loading field officers..."
                                                    : "No field officers found",
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
