import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "../api/apiUtils";
import {
    EMPTY_LOCATION_HIERARCHY_FILTER_OPTIONS,
    LOCATION_HIERARCHY_LEVELS,
} from "../constants/locationHierarchy";
import { useHierarchyFilters } from "../context/HierarchyFilterContext";
import {
    computeLastSelectedId,
    DEFAULT_HIERARCHY_FILTER_VALUES,
    hasActiveHierarchyFilters,
    rebuildCascadeFilterOptions,
    type HierarchyFilterValues,
} from "../utils/hierarchyFilters";

const DEFAULT_DISCOM_NAME = "TGNPDCL";

function findDiscomInApiData(
    apiData: { id: number; name: string; levelName?: string }[],
    discomName: string,
) {
    const target = discomName.toUpperCase();
    return apiData.find(
        (item) =>
            item.levelName === "DISCOM" &&
            String(item.name).toUpperCase().includes(target),
    );
}

type FilterOptionsState = typeof EMPTY_LOCATION_HIERARCHY_FILTER_OPTIONS;

type UseLocationHierarchyFilterBarOptions = {
    onFiltersReady?: (hierarchyId: string | null) => void;
    reportFilterError?: (retry: () => Promise<void>) => void;
    clearFilterError?: () => void;
    skipInitialFetch?: boolean;
    /** When true, select TGNPDCL DISCOM and apply filters on first load (admin / no user location). */
    autoSelectDefaultDiscom?: boolean;
};

function getStoredUser() {
    try {
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
}

export function useLocationHierarchyFilterBar(
    options: UseLocationHierarchyFilterBarOptions = {},
) {
    const {
        filterValues,
        setFilterValues,
        lastSelectedId,
        filtersApplied,
        applyFilters,
        resetHierarchyFilters,
    } = useHierarchyFilters();

    const [filterOptions, setFilterOptions] = useState<FilterOptionsState>(
        EMPTY_LOCATION_HIERARCHY_FILTER_OPTIONS,
    );
    const [originalApiData, setOriginalApiData] = useState<
        {
            id: number;
            name: string;
            levelName?: string;
            parentId?: number | null;
        }[]
    >([]);
    const [isFiltersLoading, setIsFiltersLoading] = useState(true);
    const [isFiltersReady, setIsFiltersReady] = useState(false);
    const initStartedRef = useRef(false);

    const retryFiltersAPI = useCallback(async () => {
        await fetchFilterOptionsRef.current?.({ skipUserLocation: true });
    }, []);

    const fetchFilterOptionsRef = useRef<
        | ((opts?: {
              skipUserLocation?: boolean;
              restoreValues?: HierarchyFilterValues;
          }) => Promise<{ hierarchyId: string | null }>)
        | null
    >(null);

    const fetchFilterOptions = useCallback(
        async (opts?: {
            skipUserLocation?: boolean;
            restoreValues?: HierarchyFilterValues;
            skipDefaultDiscom?: boolean;
        }): Promise<{ hierarchyId: string | null }> => {
            setIsFiltersLoading(true);
            let resolvedHierarchyId: string | null = null;
            try {
                const data = await apiClient.get("/dtrs/filter/filter-options");
                if (data.success) {
                    const apiData = data.data || [];
                    setOriginalApiData(apiData);
                    options.clearFilterError?.();

                    if (
                        opts?.restoreValues &&
                        hasActiveHierarchyFilters(opts.restoreValues)
                    ) {
                        setFilterOptions((prev) => ({
                            ...prev,
                            ...rebuildCascadeFilterOptions(
                                apiData,
                                opts.restoreValues!,
                                LOCATION_HIERARCHY_LEVELS,
                            ),
                        }));
                        applyFilters(opts.restoreValues);
                        resolvedHierarchyId = computeLastSelectedId(
                            opts.restoreValues,
                        );
                        return { hierarchyId: resolvedHierarchyId };
                    }

                    const transformedData = LOCATION_HIERARCHY_LEVELS.reduce(
                        (acc: FilterOptionsState, level) => {
                            const normalizedTargetLevel = level.levelName
                                .toLowerCase()
                                .replace(/[\s-]/g, "");
                            (acc as Record<string, { value: string; label: string }[]>)[
                                level.optionKey
                            ] = [
                                { value: "all", label: level.allLabel },
                                ...apiData
                                    .filter((item: { levelName?: string }) => {
                                        const normalizedItemLevel =
                                            item.levelName
                                                ?.toLowerCase()
                                                .replace(/[\s-]/g, "");
                                        return (
                                            normalizedItemLevel ===
                                            normalizedTargetLevel
                                        );
                                    })
                                    .map((item: { id: number; name: string }) => ({
                                        value: item.id.toString(),
                                        label: item.name,
                                    })),
                            ];
                            return acc;
                        },
                        { ...EMPTY_LOCATION_HIERARCHY_FILTER_OPTIONS },
                    );

                    setFilterOptions(transformedData);

                    const user = getStoredUser();
                    const userLocationId = user?.locationId?.toString();
                    const isAdmin =
                        user?.accessLevel === "ADMIN" ||
                        user?.accessLevel === "SUPER_ADMIN" ||
                        user?.role === "ADMIN" ||
                        user?.role === "admin";

                    if (
                        userLocationId &&
                        !isAdmin &&
                        !opts?.skipUserLocation
                    ) {
                        const userLocation = apiData.find(
                            (item: { id: number }) =>
                                item.id.toString() === userLocationId,
                        );

                        if (userLocation) {
                            const selectedPath: HierarchyFilterValues = {
                                discom: "all",
                                circle: "all",
                                division: "all",
                                subDivision: "all",
                                section: "all",
                                substation: "all",
                            };
                            let currentItem: {
                                id: number;
                                levelName?: string;
                                parentId?: number | null;
                            } | null = userLocation;

                            while (currentItem) {
                                const level = LOCATION_HIERARCHY_LEVELS.find(
                                    (l) => {
                                        const normalizedL = l.levelName
                                            .toLowerCase()
                                            .replace(/[\s-]/g, "");
                                        const normalizedItem = currentItem!
                                            .levelName?.toLowerCase()
                                            .replace(/[\s-]/g, "");
                                        return normalizedL === normalizedItem;
                                    },
                                );
                                if (level) {
                                    selectedPath[level.filterName] =
                                        currentItem.id.toString();
                                }

                                currentItem = currentItem.parentId
                                    ? apiData.find(
                                          (item: { id: number }) =>
                                              item.id === currentItem!.parentId,
                                      ) ?? null
                                    : null;
                            }

                            setFilterOptions((prev) => ({
                                ...prev,
                                ...rebuildCascadeFilterOptions(
                                    apiData,
                                    selectedPath,
                                    LOCATION_HIERARCHY_LEVELS,
                                ),
                            }));
                            applyFilters(selectedPath);
                            resolvedHierarchyId =
                                computeLastSelectedId(selectedPath);
                        }
                    }

                    const shouldSelectDefaultDiscom =
                        options.autoSelectDefaultDiscom !== false &&
                        !opts?.skipDefaultDiscom &&
                        !resolvedHierarchyId;

                    if (shouldSelectDefaultDiscom) {
                        const defaultDiscom = findDiscomInApiData(
                            apiData,
                            DEFAULT_DISCOM_NAME,
                        );
                        if (defaultDiscom) {
                            const selectedPath: HierarchyFilterValues = {
                                ...DEFAULT_HIERARCHY_FILTER_VALUES,
                                discom: defaultDiscom.id.toString(),
                            };
                            setFilterOptions((prev) => ({
                                ...prev,
                                ...rebuildCascadeFilterOptions(
                                    apiData,
                                    selectedPath,
                                    LOCATION_HIERARCHY_LEVELS,
                                ),
                            }));
                            applyFilters(selectedPath);
                            resolvedHierarchyId =
                                computeLastSelectedId(selectedPath);
                        }
                    }
                } else {
                    throw new Error(
                        data.message || "Failed to fetch filter options",
                    );
                }
            } catch {
                options.reportFilterError?.(retryFiltersAPI);
            } finally {
                setIsFiltersLoading(false);
            }

            return { hierarchyId: resolvedHierarchyId };
        },
        [
            applyFilters,
            options.clearFilterError,
            options.reportFilterError,
            retryFiltersAPI,
            setFilterValues,
        ],
    );

    fetchFilterOptionsRef.current = fetchFilterOptions;

    const updateFilterOptions = useCallback(
        async (filterName: string, selectedValue: string) => {
            if (selectedValue === "all") return;

            try {
                const params = new URLSearchParams();
                params.append("parentId", selectedValue);

                const data = await apiClient.get(
                    `/dtrs/filter/filter-options?${params.toString()}`,
                );

                if (!data.success) return;

                const newOptions = data.data || [];

                switch (filterName) {
                    case "discom":
                        setFilterOptions((prev) => ({
                            ...prev,
                            circles: [
                                { value: "all", label: "All Circles" },
                                ...newOptions.map(
                                    (item: { id: number; name: string }) => ({
                                        value: item.id.toString(),
                                        label: item.name,
                                    }),
                                ),
                            ],
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
                        setFilterValues((prev) => ({
                            ...prev,
                            circle: "all",
                            division: "all",
                            subDivision: "all",
                            section: "all",
                            substation: "all",
                        }));
                        break;

                    case "circle":
                        setFilterOptions((prev) => ({
                            ...prev,
                            divisions: [
                                { value: "all", label: "All Divisions" },
                                ...newOptions.map(
                                    (item: { id: number; name: string }) => ({
                                        value: item.id.toString(),
                                        label: item.name,
                                    }),
                                ),
                            ],
                            subDivisions: [
                                { value: "all", label: "All Sub-Divisions" },
                            ],
                            sections: [{ value: "all", label: "All Sections" }],
                            substations: [
                                { value: "all", label: "All Substations" },
                            ],
                        }));
                        setFilterValues((prev) => ({
                            ...prev,
                            division: "all",
                            subDivision: "all",
                            section: "all",
                            substation: "all",
                        }));
                        break;

                    case "division":
                        setFilterOptions((prev) => ({
                            ...prev,
                            subDivisions: [
                                { value: "all", label: "All Sub-Divisions" },
                                ...newOptions.map(
                                    (item: { id: number; name: string }) => ({
                                        value: item.id.toString(),
                                        label: item.name,
                                    }),
                                ),
                            ],
                            sections: [{ value: "all", label: "All Sections" }],
                            substations: [
                                { value: "all", label: "All Substations" },
                            ],
                        }));
                        setFilterValues((prev) => ({
                            ...prev,
                            subDivision: "all",
                            section: "all",
                            substation: "all",
                        }));
                        break;

                    case "subDivision":
                        setFilterOptions((prev) => ({
                            ...prev,
                            sections: [
                                { value: "all", label: "All Sections" },
                                ...newOptions.map(
                                    (item: { id: number; name: string }) => ({
                                        value: item.id.toString(),
                                        label: item.name,
                                    }),
                                ),
                            ],
                            substations: [
                                { value: "all", label: "All Substations" },
                            ],
                        }));
                        setFilterValues((prev) => ({
                            ...prev,
                            section: "all",
                            substation: "all",
                        }));
                        break;

                    case "section":
                        setFilterOptions((prev) => ({
                            ...prev,
                            substations: [
                                { value: "all", label: "All Substations" },
                                ...newOptions.map(
                                    (item: { id: number; name: string }) => ({
                                        value: item.id.toString(),
                                        label: item.name,
                                    }),
                                ),
                            ],
                        }));
                        setFilterValues((prev) => ({
                            ...prev,
                            substation: "all",
                        }));
                        break;
                }
            } catch {
                // cascade update failed silently
            }
        },
        [setFilterValues],
    );

    const findAllParentValues = useCallback(
        (childFilterName: string, childValue: string) => {
            if (childValue === "all" || !originalApiData.length) return {};

            const childLevel = LOCATION_HIERARCHY_LEVELS.find(
                (level) => level.filterName === childFilterName,
            );
            if (!childLevel) return {};

            const childItem = originalApiData.find((item) => {
                const normalizedItemLevel = item.levelName
                    ?.toLowerCase()
                    .replace(/[\s-]/g, "");
                const normalizedChildLevel = childLevel.levelName
                    .toLowerCase()
                    .replace(/[\s-]/g, "");
                return (
                    normalizedItemLevel === normalizedChildLevel &&
                    item.id.toString() === childValue
                );
            });

            if (!childItem) return {};

            const parentValues: Record<string, string> = {};
            let currentItem = childItem;
            let currentLevelIndex = LOCATION_HIERARCHY_LEVELS.findIndex(
                (level) => level.filterName === childFilterName,
            );

            while (currentItem?.parentId && currentLevelIndex > 0) {
                const parentLevel =
                    LOCATION_HIERARCHY_LEVELS[currentLevelIndex - 1];

                const parentItem = originalApiData.find((item) => {
                    const normalizedItemLevel = item.levelName
                        ?.toLowerCase()
                        .replace(/[\s-]/g, "");
                    const normalizedParentLevel = parentLevel.levelName
                        .toLowerCase()
                        .replace(/[\s-]/g, "");
                    return (
                        normalizedItemLevel === normalizedParentLevel &&
                        item.id === currentItem!.parentId
                    );
                });

                if (parentItem) {
                    parentValues[parentLevel.filterName] =
                        parentItem.id.toString();
                    currentItem = parentItem;
                    currentLevelIndex--;
                } else {
                    break;
                }
            }

            return parentValues;
        },
        [originalApiData],
    );

    const handleFilterChange = useCallback(
        async (
            filterName: string,
            value: string | { target: { value: string } },
        ) => {
            const selectedValue =
                typeof value === "string" ? value : value.target.value;

            const parentValues = findAllParentValues(filterName, selectedValue);

            setFilterValues((prev) => ({
                ...prev,
                [filterName]: selectedValue,
                ...parentValues,
            }));

            await updateFilterOptions(filterName, selectedValue);
        },
        [findAllParentValues, setFilterValues, updateFilterOptions],
    );

    const applyCurrentFilters = useCallback(() => {
        const lastId = computeLastSelectedId(filterValues);
        applyFilters(filterValues);
        return lastId;
    }, [applyFilters, filterValues]);

    const resetLocationFilters = useCallback(async () => {
        resetHierarchyFilters();
        await fetchFilterOptions({
            skipUserLocation: true,
            skipDefaultDiscom: true,
        });
    }, [fetchFilterOptions, resetHierarchyFilters]);

    useEffect(() => {
        if (options.skipInitialFetch || initStartedRef.current) return;
        initStartedRef.current = true;

        void (async () => {
            try {
                const { hierarchyId } = await fetchFilterOptions({
                    skipUserLocation: filtersApplied,
                    restoreValues: filtersApplied ? filterValues : undefined,
                });
                options.onFiltersReady?.(hierarchyId);
            } finally {
                setIsFiltersReady(true);
            }
        })();
    }, [
        fetchFilterOptions,
        filterValues,
        filtersApplied,
        options.onFiltersReady,
        options.skipInitialFetch,
    ]);

    return {
        filterOptions,
        isFiltersLoading,
        isFiltersReady,
        filterValues,
        lastSelectedId,
        handleFilterChange,
        fetchFilterOptions,
        applyCurrentFilters,
        resetLocationFilters,
        retryFiltersAPI,
    };
}
