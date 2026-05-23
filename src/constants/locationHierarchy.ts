import type { HierarchyLevelConfig } from "../utils/hierarchyFilters";

export const LOCATION_HIERARCHY_LEVELS: readonly HierarchyLevelConfig[] = [
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
    {
        filterName: "substation",
        levelName: "Substation",
        optionKey: "substations",
        allLabel: "All Substations",
    },
] as const;

export const EMPTY_LOCATION_HIERARCHY_FILTER_OPTIONS = {
    discoms: [{ value: "all", label: "All DISCOMs" }],
    circles: [{ value: "all", label: "All Circles" }],
    divisions: [{ value: "all", label: "All Divisions" }],
    subDivisions: [{ value: "all", label: "All Sub-Divisions" }],
    sections: [{ value: "all", label: "All Sections" }],
    substations: [{ value: "all", label: "All Substations" }],
};

export const COMMUNICATION_STATUS_FILTER_OPTIONS = [
    { value: "all", label: "Comm Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
] as const;
