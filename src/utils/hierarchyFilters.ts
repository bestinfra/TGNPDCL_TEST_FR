export const HIERARCHY_FILTER_STORAGE_KEY = "dtrHierarchyFilters";

export type HierarchyFilterValues = {
    discom: string;
    circle: string;
    division: string;
    subDivision: string;
    section: string;
    substation: string;
};

export const DEFAULT_HIERARCHY_FILTER_VALUES: HierarchyFilterValues = {
    discom: "all",
    circle: "all",
    division: "all",
    subDivision: "all",
    section: "all",
    substation: "all",
};

export type HierarchyLevelConfig = {
    filterName: keyof HierarchyFilterValues;
    levelName: string;
    optionKey: string;
    allLabel: string;
};

export type PersistedHierarchyFilters = {
    filterValues: HierarchyFilterValues;
    lastSelectedId: string | null;
    filtersApplied: boolean;
};

const FILTER_PARAM_KEYS: (keyof HierarchyFilterValues)[] = [
    "discom",
    "circle",
    "division",
    "subDivision",
    "section",
    "substation",
];

export function computeLastSelectedId(
    values: HierarchyFilterValues,
): string | null {
    if (values.substation !== "all") return values.substation;
    if (values.section !== "all") return values.section;
    if (values.subDivision !== "all") return values.subDivision;
    if (values.division !== "all") return values.division;
    if (values.circle !== "all") return values.circle;
    if (values.discom !== "all") return values.discom;
    return null;
}

export function hasActiveHierarchyFilters(
    values: HierarchyFilterValues,
): boolean {
    return computeLastSelectedId(values) !== null;
}

export function readPersistedHierarchyFilters(): PersistedHierarchyFilters | null {
    try {
        const raw = sessionStorage.getItem(HIERARCHY_FILTER_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PersistedHierarchyFilters;
        if (!parsed?.filterValues) return null;
        return {
            filterValues: {
                ...DEFAULT_HIERARCHY_FILTER_VALUES,
                ...parsed.filterValues,
            },
            lastSelectedId: parsed.lastSelectedId ?? null,
            filtersApplied: Boolean(parsed.filtersApplied),
        };
    } catch {
        return null;
    }
}

export function writePersistedHierarchyFilters(
    state: PersistedHierarchyFilters,
): void {
    sessionStorage.setItem(
        HIERARCHY_FILTER_STORAGE_KEY,
        JSON.stringify(state),
    );
}

export function clearPersistedHierarchyFilters(): void {
    sessionStorage.removeItem(HIERARCHY_FILTER_STORAGE_KEY);
}

export function appendHierarchyFiltersToSearchParams(
    params: URLSearchParams,
    filterValues?: HierarchyFilterValues | null,
    hierarchyId?: string | null,
): void {
    if (filterValues) {
        FILTER_PARAM_KEYS.forEach((key) => {
            const value = filterValues[key];
            if (value && value !== "all") {
                params.set(key, value);
            }
        });
    }
    const hid =
        hierarchyId?.toString().trim() ||
        (filterValues ? computeLastSelectedId(filterValues) : null);
    if (hid) params.set("hierarchyId", hid);
}

export function parseHierarchyFiltersFromSearchParams(
    params: URLSearchParams,
): {
    filterValues: HierarchyFilterValues;
    lastSelectedId: string | null;
} {
    const filterValues = { ...DEFAULT_HIERARCHY_FILTER_VALUES };
    FILTER_PARAM_KEYS.forEach((key) => {
        const value = params.get(key);
        if (value) filterValues[key] = value;
    });
    const hierarchyId =
        params.get("hierarchyId") || params.get("lastSelectedId");
    const lastSelectedId =
        hierarchyId?.trim() || computeLastSelectedId(filterValues);
    return { filterValues, lastSelectedId };
}

function normalizeLevelName(levelName: string): string {
    return levelName.toLowerCase().replace(/[\s-]/g, "");
}

/** Rebuild dependent dropdown options from flat hierarchy API data without resetting selections. */
export function rebuildCascadeFilterOptions(
    apiData: { id: number; name: string; levelName?: string; parentId?: number | null }[],
    values: HierarchyFilterValues,
    hierarchyLevels: readonly HierarchyLevelConfig[],
): Record<string, { value: string; label: string }[]> {
    let parentId: string | null = null;
    const result: Record<string, { value: string; label: string }[]> = {};

    for (const level of hierarchyLevels) {
        const normalizedTarget = normalizeLevelName(level.levelName);
        const items = apiData.filter((item) => {
            const normalizedItem = normalizeLevelName(item.levelName ?? "");
            if (normalizedItem !== normalizedTarget) return false;
            if (parentId === null) return true;
            return item.parentId?.toString() === parentId;
        });

        result[level.optionKey] = [
            { value: "all", label: level.allLabel },
            ...items.map((item) => ({
                value: item.id.toString(),
                label: item.name,
            })),
        ];

        const selected = values[level.filterName];
        parentId = selected !== "all" ? selected : null;
    }

    return result;
}
