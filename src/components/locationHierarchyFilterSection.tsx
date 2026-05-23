import type { HierarchyFilterValues } from "../utils/hierarchyFilters";
import { EMPTY_LOCATION_HIERARCHY_FILTER_OPTIONS } from "../constants/locationHierarchy";

export type LocationHierarchyFilterOptions = typeof EMPTY_LOCATION_HIERARCHY_FILTER_OPTIONS;

type ExtraFilterComponent = {
    name: string;
    props: Record<string, unknown>;
    align?: string;
};

export function createLocationHierarchyFilterSection(params: {
    filterOptions: LocationHierarchyFilterOptions;
    filterValues: HierarchyFilterValues;
    isFiltersLoading: boolean;
    onFilterChange: (filterName: string, value: string) => void;
    onGetData: () => void;
    onReset: () => void;
    extraComponents?: ExtraFilterComponent[];
}) {
    const {
        filterOptions,
        filterValues,
        isFiltersLoading,
        onFilterChange,
        onGetData,
        onReset,
        extraComponents = [],
    } = params;

    return {
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
                    options: [...(filterOptions.discoms ?? [])],
                    value: filterValues.discom,
                    onChange: (value: string) => onFilterChange("discom", value),
                    placeholder: "Select DISCOM",
                    loading: isFiltersLoading,
                    searchable: false,
                },
            },
            {
                name: "Dropdown",
                props: {
                    options: [...(filterOptions.circles ?? [])],
                    value: filterValues.circle,
                    onChange: (value: string) => onFilterChange("circle", value),
                    placeholder: "Select Circle",
                    loading: isFiltersLoading,
                    searchable: false,
                },
            },
            {
                name: "Dropdown",
                props: {
                    options: [...(filterOptions.divisions ?? [])],
                    value: filterValues.division,
                    onChange: (value: string) =>
                        onFilterChange("division", value),
                    placeholder: "Select Division",
                    loading: isFiltersLoading,
                    searchable: false,
                },
            },
            {
                name: "Dropdown",
                props: {
                    options: [...(filterOptions.subDivisions ?? [])],
                    value: filterValues.subDivision,
                    onChange: (value: string) =>
                        onFilterChange("subDivision", value),
                    placeholder: "Select Sub-Division",
                    loading: isFiltersLoading,
                    searchable: false,
                },
            },
            {
                name: "Dropdown",
                props: {
                    options: [...(filterOptions.sections ?? [])],
                    value: filterValues.section,
                    onChange: (value: string) => onFilterChange("section", value),
                    placeholder: "Select Section",
                    loading: isFiltersLoading,
                    searchable: false,
                },
            },
            {
                name: "Dropdown",
                props: {
                    options: [...(filterOptions.substations ?? [])],
                    value: filterValues.substation,
                    onChange: (value: string) =>
                        onFilterChange("substation", value),
                    placeholder: "Select Substation",
                    loading: isFiltersLoading,
                    searchable: false,
                },
            },
            ...extraComponents,
            {
                name: "Button",
                props: {
                    variant: "primary",
                    onClick: onGetData,
                    children: "Get Data",
                    className: "h-10 self-end",
                    searchable: false,
                },
                align: "center",
            },
            {
                name: "Button",
                props: {
                    variant: "secondary",
                    onClick: onReset,
                    children: "Reset",
                    className: "h-10 self-end",
                    searchable: false,
                },
                align: "center",
            },
        ],
    };
}
