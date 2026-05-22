import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";
import {
    computeLastSelectedId,
    clearPersistedHierarchyFilters,
    DEFAULT_HIERARCHY_FILTER_VALUES,
    readPersistedHierarchyFilters,
    type HierarchyFilterValues,
    writePersistedHierarchyFilters,
} from "../utils/hierarchyFilters";

type HierarchyFilterContextValue = {
    filterValues: HierarchyFilterValues;
    lastSelectedId: string | null;
    filtersApplied: boolean;
    setFilterValues: React.Dispatch<React.SetStateAction<HierarchyFilterValues>>;
    setLastSelectedId: (id: string | null) => void;
    applyFilters: (values: HierarchyFilterValues) => void;
    syncFiltersFromUrl: (
        values: HierarchyFilterValues,
        hierarchyId?: string | null,
    ) => void;
    resetHierarchyFilters: () => void;
};

const stored = readPersistedHierarchyFilters();

const HierarchyFilterContext = createContext<HierarchyFilterContextValue | null>(
    null,
);

export function HierarchyFilterProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [filterValues, setFilterValuesState] = useState<HierarchyFilterValues>(
        () => stored?.filterValues ?? DEFAULT_HIERARCHY_FILTER_VALUES,
    );
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(
        () => stored?.lastSelectedId ?? null,
    );
    const [filtersApplied, setFiltersApplied] = useState(
        () => stored?.filtersApplied ?? false,
    );

    const persist = useCallback(
        (
            values: HierarchyFilterValues,
            lastId: string | null,
            applied: boolean,
        ) => {
            writePersistedHierarchyFilters({
                filterValues: values,
                lastSelectedId: lastId,
                filtersApplied: applied,
            });
        },
        [],
    );

    const setFilterValues: React.Dispatch<
        React.SetStateAction<HierarchyFilterValues>
    > = useCallback(
        (action) => {
            setFilterValuesState((prev) => {
                const next =
                    typeof action === "function" ? action(prev) : action;
                persist(next, lastSelectedId, filtersApplied);
                return next;
            });
        },
        [lastSelectedId, filtersApplied, persist],
    );

    const applyFilters = useCallback(
        (values: HierarchyFilterValues) => {
            const lastId = computeLastSelectedId(values);
            setFilterValues(values);
            setLastSelectedId(lastId);
            setFiltersApplied(true);
            persist(values, lastId, true);
        },
        [persist],
    );

    const syncFiltersFromUrl = useCallback(
        (values: HierarchyFilterValues, hierarchyId?: string | null) => {
            const lastId =
                hierarchyId?.trim() || computeLastSelectedId(values);
            setFilterValues(values);
            setLastSelectedId(lastId);
            const applied = Boolean(lastId);
            setFiltersApplied(applied);
            persist(values, lastId, applied);
        },
        [persist],
    );

    const resetHierarchyFilters = useCallback(() => {
        setFilterValues(DEFAULT_HIERARCHY_FILTER_VALUES);
        setLastSelectedId(null);
        setFiltersApplied(false);
        clearPersistedHierarchyFilters();
    }, []);

    const value = useMemo(
        () => ({
            filterValues,
            lastSelectedId,
            filtersApplied,
            setFilterValues,
            setLastSelectedId: (id: string | null) => {
                setLastSelectedId(id);
                persist(filterValues, id, filtersApplied);
            },
            applyFilters,
            syncFiltersFromUrl,
            resetHierarchyFilters,
        }),
        [
            filterValues,
            lastSelectedId,
            filtersApplied,
            applyFilters,
            syncFiltersFromUrl,
            resetHierarchyFilters,
            persist,
        ],
    );

    return (
        <HierarchyFilterContext.Provider value={value}>
            {children}
        </HierarchyFilterContext.Provider>
    );
}

export function useHierarchyFilters(): HierarchyFilterContextValue {
    const ctx = useContext(HierarchyFilterContext);
    if (!ctx) {
        throw new Error(
            "useHierarchyFilters must be used within HierarchyFilterProvider",
        );
    }
    return ctx;
}
