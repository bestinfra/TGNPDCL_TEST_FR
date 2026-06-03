import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { FormInputConfig } from "../components/Form/types";
import { apiClient } from "../api/apiUtils";
import {
    fetchMeterDetailsByNumber,
    updateMeterDetails,
    type MeterDetailsRecord,
} from "../api/meterDetailsApi";

const Page = lazy(() => import("SuperAdmin/Page"));

const METER_HIERARCHY_LEVELS = [
    { key: "circle", levelName: "Circle", label: "Circle" },
    { key: "division", levelName: "Division", label: "Division" },
    {
        key: "subDivision",
        levelName: "Sub division",
        label: "Sub Division",
    },
    { key: "section", levelName: "Section", label: "Section" },
    { key: "substation", levelName: "Substation", label: "Substation" },
] as const;

type HierarchyKey = (typeof METER_HIERARCHY_LEVELS)[number]["key"];

type SelectOption = { value: string; label: string };

const normalizeLevelName = (value: string) =>
    value.toLowerCase().replace(/[\s-]/g, "");

function buildHierarchyOptionsFromData(apiData: Record<string, unknown>[]) {
    const next: Record<string, SelectOption[]> = {};
    METER_HIERARCHY_LEVELS.forEach((level) => {
        const normalizedTarget = normalizeLevelName(level.levelName);
        next[level.key] = apiData
            .filter(
                (item) =>
                    normalizeLevelName(String(item.levelName ?? "")) ===
                    normalizedTarget,
            )
            .map((item) => ({
                value: String(item.id),
                label: String(item.name),
            }));
    });
    next.dtrNumber = [];
    return next;
}

function resolveSelectValue(
    id: string | number | undefined,
    name: string | undefined,
    options: SelectOption[],
): string {
    if (id != null && String(id).trim() !== "" && String(id) !== "-") {
        return String(id);
    }
    if (name && name !== "-") {
        const byLabel = options.find((opt) => opt.label === name);
        if (byLabel) return byLabel.value;
        const byValue = options.find((opt) => opt.value === name);
        if (byValue) return byValue.value;
    }
    return "";
}

async function fetchChildOptions(parentId: string): Promise<SelectOption[]> {
    const params = new URLSearchParams({ parentId });
    const data = await apiClient.get(
        `/dtrs/filter/filter-options?${params.toString()}`,
    );
    if (!data?.success) return [];
    return (data.data || []).map((item: Record<string, unknown>) => ({
        value: String(item.id),
        label: String(item.name),
    }));
}

async function fetchDtrOptions(substationId: string): Promise<SelectOption[]> {
    const params = new URLSearchParams({
        page: "1",
        pageSize: "500",
        hierarchyId: substationId,
    });
    const data = await apiClient.get(`/dtrs?${params.toString()}`);
    const rows = Array.isArray(data?.data) ? data.data : [];
    return rows.map((row: Record<string, unknown>) => {
        const dtrId = String(row.id ?? "");
        const dtrNumber = String(row.dtrNumber ?? row.dtrId ?? row.id ?? "");
        return { value: dtrId, label: dtrNumber };
    });
}

async function populateMeterHierarchy(
    meter: MeterDetailsRecord,
    baseOptions: Record<string, SelectOption[]>,
) {
    const options: Record<string, SelectOption[]> = {
        ...baseOptions,
        dtrNumber: [],
    };
    const nextValues: Record<string, string> = {
        circle: "",
        division: "",
        subDivision: "",
        section: "",
        substation: "",
        dtrNumber: "",
    };

    const circleValue = resolveSelectValue(
        meter.circleId,
        meter.circle,
        options.circle ?? [],
    );
    nextValues.circle = circleValue;
    if (circleValue) {
        options.division = await fetchChildOptions(circleValue);
    }

    const divisionValue = resolveSelectValue(
        meter.divisionId,
        meter.division,
        options.division ?? [],
    );
    nextValues.division = divisionValue;
    if (divisionValue) {
        options.subDivision = await fetchChildOptions(divisionValue);
    }

    const subDivisionValue = resolveSelectValue(
        meter.subDivisionId,
        meter.subDivision,
        options.subDivision ?? [],
    );
    nextValues.subDivision = subDivisionValue;
    if (subDivisionValue) {
        options.section = await fetchChildOptions(subDivisionValue);
    }

    const sectionValue = resolveSelectValue(
        meter.sectionId,
        meter.section,
        options.section ?? [],
    );
    nextValues.section = sectionValue;
    if (sectionValue) {
        options.substation = await fetchChildOptions(sectionValue);
    }

    const substationValue = resolveSelectValue(
        meter.substationId,
        meter.substation,
        options.substation ?? [],
    );
    nextValues.substation = substationValue;
    if (substationValue) {
        options.dtrNumber = await fetchDtrOptions(substationValue);
    }

    nextValues.dtrNumber =
        meter.dtrId != null && String(meter.dtrId).trim() !== ""
            ? String(meter.dtrId)
            : resolveSelectValue(
                  undefined,
                  meter.dtrNumber,
                  options.dtrNumber ?? [],
              );

    return { options, nextValues };
}

function withPlaceholder(
    label: string,
    options: SelectOption[] = [],
): SelectOption[] {
    return [{ value: "", label: `Select ${label}` }, ...options];
}

export default function EditMeter() {
    const navigate = useNavigate();
    const { meterNumber: meterNumberParam = "" } = useParams<{
        meterNumber: string;
    }>();
    const meterNumber = decodeURIComponent(meterNumberParam).trim();

    const [loading, setLoading] = useState(true);
    const [isDataReady, setIsDataReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const [unmapping, setUnmapping] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [formKey, setFormKey] = useState(0);
    const [hierarchyOptions, setHierarchyOptions] = useState<
        Record<string, SelectOption[]>
    >({});
    const [values, setValues] = useState<Record<string, string>>({
        circle: "",
        division: "",
        subDivision: "",
        section: "",
        substation: "",
        dtrNumber: "",
        capacity: "",
        meterNumber: "",
    });

    const loadDtrOptions = useCallback(async (substationId: string) => {
        const dtrOptions = await fetchDtrOptions(substationId);
        setHierarchyOptions((prev) => ({ ...prev, dtrNumber: dtrOptions }));
    }, []);

    const loadChildHierarchyOptions = useCallback(
        async (parentFilterKey: HierarchyKey, parentValue: string) => {
            const parentIndex = METER_HIERARCHY_LEVELS.findIndex(
                (level) => level.key === parentFilterKey,
            );
            if (
                parentIndex < 0 ||
                parentIndex >= METER_HIERARCHY_LEVELS.length - 1
            ) {
                return;
            }

            const childLevel = METER_HIERARCHY_LEVELS[parentIndex + 1];
            const childOptions = await fetchChildOptions(parentValue);

            setHierarchyOptions((prev) => {
                const next = { ...prev, [childLevel.key]: childOptions };
                for (
                    let i = parentIndex + 2;
                    i < METER_HIERARCHY_LEVELS.length;
                    i++
                ) {
                    next[METER_HIERARCHY_LEVELS[i].key] = [];
                }
                next.dtrNumber = [];
                return next;
            });
        },
        [],
    );

    const handleHierarchyLevelChange = useCallback(
        async (filterKey: HierarchyKey, value: string) => {
            const levelIndex = METER_HIERARCHY_LEVELS.findIndex(
                (level) => level.key === filterKey,
            );
            if (levelIndex < 0) return;

            const cleared: Record<string, string> = { [filterKey]: value };
            for (
                let i = levelIndex + 1;
                i < METER_HIERARCHY_LEVELS.length;
                i++
            ) {
                cleared[METER_HIERARCHY_LEVELS[i].key] = "";
            }
            cleared.dtrNumber = "";
            setValues((prev) => ({ ...prev, ...cleared }));

            setHierarchyOptions((prev) => {
                const next = { ...prev };
                for (
                    let i = levelIndex + 1;
                    i < METER_HIERARCHY_LEVELS.length;
                    i++
                ) {
                    next[METER_HIERARCHY_LEVELS[i].key] = [];
                }
                next.dtrNumber = [];
                return next;
            });

            if (!value) return;

            if (filterKey === "substation") {
                await loadDtrOptions(value);
                return;
            }

            await loadChildHierarchyOptions(filterKey, value);
        },
        [loadChildHierarchyOptions, loadDtrOptions],
    );

    useLayoutEffect(() => {
        setLoading(true);
        setIsDataReady(false);
        setLoadError("");
        setHierarchyOptions({});
        setValues({
            circle: "",
            division: "",
            subDivision: "",
            section: "",
            substation: "",
            dtrNumber: "",
            capacity: "",
            meterNumber: "",
        });
    }, [meterNumber]);

    useEffect(() => {
        if (!meterNumber) {
            setLoadError("Meter number is required.");
            setLoading(false);
            setIsDataReady(false);
            return;
        }

        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setIsDataReady(false);
            setLoadError("");
            try {
                const [meter, filterData] = await Promise.all([
                    fetchMeterDetailsByNumber(meterNumber),
                    apiClient.get("/dtrs/filter/filter-options"),
                ]);

                if (cancelled) return;

                if (!meter) {
                    throw new Error("Meter details not found.");
                }
                if (!filterData?.success) {
                    throw new Error(
                        filterData?.message ||
                            "Failed to load hierarchy options.",
                    );
                }

                const apiData = Array.isArray(filterData.data)
                    ? filterData.data
                    : [];
                const baseOptions = buildHierarchyOptionsFromData(apiData);
                const populated = await populateMeterHierarchy(
                    meter,
                    baseOptions,
                );

                if (cancelled) return;

                setHierarchyOptions(populated.options);
                setValues({
                    ...populated.nextValues,
                    capacity:
                        meter.capacity != null && Number.isFinite(meter.capacity)
                            ? String(meter.capacity)
                            : "",
                    meterNumber: meter.meterNumber || meterNumber,
                });
                setFormKey((prev) => prev + 1);
                setIsDataReady(true);
            } catch (err) {
                if (!cancelled) {
                    setIsDataReady(false);
                    setLoadError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load meter details.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [meterNumber]);

    useEffect(() => {
        if (!isDataReady || loadError || !values.meterNumber) return;

        const applyReadOnlyMeterNumber = () => {
            const input = document.getElementById("meterNumber");
            if (!(input instanceof HTMLInputElement)) return;
            input.readOnly = true;
            input.setAttribute("aria-readonly", "true");
            input.classList.add(
                "cursor-not-allowed",
                "bg-background-secondary/80",
                "dark:bg-white/10",
            );
        };

        applyReadOnlyMeterNumber();
        const timer = window.setTimeout(applyReadOnlyMeterNumber, 0);
        return () => window.clearTimeout(timer);
    }, [isDataReady, loadError, values.meterNumber, formKey]);

    const buildSavePayload = () => {
        const parseId = (value: string) => {
            if (!value) return undefined;
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : undefined;
        };

        const parseCapacity = (value: string) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
        };

        return {
            meterNumber: values.meterNumber,
            circleId: parseId(values.circle),
            divisionId: parseId(values.division),
            subDivisionId: parseId(values.subDivision),
            sectionId: parseId(values.section),
            substationId: parseId(values.substation),
            dtrId: parseId(values.dtrNumber),
            capacity: parseCapacity(values.capacity),
            isMapped: true,
        };
    };

    const handleFormSubmit = async (
        _formData?: Record<string, unknown>,
    ) => {
        if (!values.meterNumber) return;
        setSaving(true);
        try {
            const result = await updateMeterDetails(buildSavePayload());
            if (result?.success === false || result?.status === "error") {
                throw new Error(
                    result?.message || "Failed to update meter details.",
                );
            }
            window.alert(
                result?.message || "Meter details updated successfully.",
            );
            navigate("/meters", { replace: true });
        } catch (err) {
            window.alert(
                err instanceof Error
                    ? err.message
                    : "Failed to save meter changes.",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleUnmap = async () => {
        if (!values.meterNumber) return;
        if (
            !window.confirm("Unmap this meter from its current location?")
        ) {
            return;
        }
        setUnmapping(true);
        try {
            const result = await updateMeterDetails({
                meterNumber: values.meterNumber,
                isMapped: false,
            });
            if (result?.success === false || result?.status === "error") {
                throw new Error(result?.message || "Failed to unmap meter.");
            }
            window.alert(result?.message || "Meter unmapped successfully.");
            navigate("/meters", { replace: true });
        } catch (err) {
            window.alert(
                err instanceof Error ? err.message : "Failed to unmap meter.",
            );
        } finally {
            setUnmapping(false);
        }
    };

    const handleFormCancel = () => {
        navigate("/meters", { replace: true });
    };

    const formInputs: FormInputConfig[] = useMemo(() => {
        const hierarchyInputs: FormInputConfig[] = METER_HIERARCHY_LEVELS.map(
            (level, index) => ({
                name: level.key,
                type: "dropdown",
                label: level.label,
                placeholder: `Select ${level.label}`,
                searchable: false,
                required: true,
                defaultValue: values[level.key] ?? "",
                options: withPlaceholder(
                    level.label,
                    hierarchyOptions[level.key],
                ),
                row: Math.floor(index / 2) + 1,
                col: (index % 2) + 1,
                onChange: (value) => {
                    void handleHierarchyLevelChange(
                        level.key,
                        String(value ?? ""),
                    );
                },
            }),
        );

        const substationRow = Math.floor((METER_HIERARCHY_LEVELS.length - 1) / 2) + 1;
        const dtrRow = Math.ceil(METER_HIERARCHY_LEVELS.length / 2) + 1;

        return [
            ...hierarchyInputs,
            {
                name: "capacity",
                type: "number",
                label: "Capacity (kVA)",
                placeholder: "Capacity (kVA)",
                required: true,
                defaultValue: values.capacity ?? "",
                row: substationRow,
                col: 2,
                validation: {
                    min: 1,
                },
                onChange: (value) => {
                    setValues((prev) => ({
                        ...prev,
                        capacity: String(value ?? ""),
                    }));
                },
            },
            {
                name: "dtrNumber",
                type: "dropdown",
                label: "DTR Number",
                placeholder: "Select DTR Number",
                searchable: false,
                required: true,
                defaultValue: values.dtrNumber ?? "",
                options: withPlaceholder(
                    "DTR Number",
                    hierarchyOptions.dtrNumber,
                ),
                row: dtrRow,
                col: 1,
                onChange: (value) => {
                    setValues((prev) => ({
                        ...prev,
                        dtrNumber: String(value ?? ""),
                    }));
                },
            },
            {
                name: "meterNumber",
                type: "text",
                label: "Meter Number",
                defaultValue: values.meterNumber,
                readOnly: true,
                required: false,
                className:
                    "cursor-not-allowed bg-background-secondary/80 dark:bg-white/10",
                onChange: () => {},
                row: dtrRow,
                col: 2,
            },
        ];
    }, [hierarchyOptions, values, handleHierarchyLevelChange]);

    const formInitialData = useMemo(
        () => ({
            ...values,
        }),
        [values],
    );

    const handleFormChange = useCallback(
        (formData: Record<string, unknown>) => {
            const nextMeterNumber = String(formData.meterNumber ?? "");
            if (
                values.meterNumber &&
                nextMeterNumber !== values.meterNumber
            ) {
                setFormKey((prev) => prev + 1);
            }
        },
        [values.meterNumber],
    );

    const isFormDisabled =
        loading ||
        !isDataReady ||
        saving ||
        unmapping ||
        !!loadError ||
        !values.meterNumber;

    const showLoadingState = loading || (!isDataReady && !loadError);
    const showForm = isDataReady && !loadError && !loading;

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Page
                sections={[
                    {
                        layout: {
                            type: "row" as const,
                            gap: "gap-4",
                            rows: [
                                {
                                    layout: "row" as const,
                                    columns: [
                                        {
                                            name: "PageHeader",
                                            props: {
                                                title: "Edit Meter",
                                                onBackClick: () =>
                                                    navigate("/meters", {
                                                        replace: true,
                                                    }),
                                                backButtonText:
                                                    "Back to Meters",
                                                showMenu: false,
                                                showDropdown: false,
                                                buttons: [
                                                    {
                                                        label: unmapping
                                                            ? "Unmapping..."
                                                            : "Unmap Meter",
                                                        variant: "secondary",
                                                        onClick: () => {
                                                            void handleUnmap();
                                                        },
                                                        disabled:
                                                            isFormDisabled,
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    ...(loadError
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
                                                          visibleErrors: [
                                                              loadError,
                                                          ],
                                                          showRetry: false,
                                                          maxVisibleErrors: 1,
                                                      },
                                                  },
                                              ],
                                          },
                                      ],
                                  },
                              },
                          ]
                        : []),
                    ...(showLoadingState
                        ? [
                              {
                                  layout: {
                                      type: "grid" as const,
                                      columns: 1,
                                      gap: "gap-4",
                                      rows: [
                                          {
                                              layout: "row" as const,
                                              className: "justify-center py-8",
                                              columns: [
                                                  {
                                                      name: "LoadingSpinner",
                                                      props: {},
                                                  },
                                              ],
                                          },
                                      ],
                                  },
                              },
                          ]
                        : []),
                    ...(showForm
                        ? [
                              {
                                  layout: {
                                      type: "grid" as const,
                                      columns: 1,
                                      gap: "gap-4",
                                      rows: [
                                          {
                                              layout: "grid" as const,
                                              gridColumns: 1,
                                              gap: "gap-4",
                                              columns: [
                                                  {
                                                      name: "Form",
                                                      props: {
                                                          formId: `edit-meter-${formKey}`,
                                                          inputs: formInputs,
                                                          initialData:
                                                              formInitialData,
                                                          onChange:
                                                              handleFormChange,
                                                          onSubmit:
                                                              handleFormSubmit,
                                                          submitLabel: saving
                                                              ? "Saving..."
                                                              : "Save Changes",
                                                          cancelLabel: "Cancel",
                                                          showFormActions: true,
                                                          cancelAction:
                                                              handleFormCancel,
                                                          gridLayout: {
                                                              gridRows: 4,
                                                              gridColumns: 2,
                                                              gap: "gap-4",
                                                              className:
                                                                  "w-full",
                                                          },
                                                          formBackground:
                                                              "bg-white dark:bg-gray-800 border border-primary-border dark:border-gray-700 p-4 rounded-2xl ",
                                                          showBorders: true,
                                                          className: "w-full",
                                                          disabled:
                                                              saving ||
                                                              unmapping,
                                                          submitted: saving,
                                                      },
                                                  },
                                              ],
                                          },
                                      ],
                                  },
                              },
                          ]
                        : []),
                ]}
            />
        </Suspense>
    );
}
