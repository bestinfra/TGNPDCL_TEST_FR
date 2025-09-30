import React, { useState, useEffect,lazy } from "react";
import { useNavigate } from "react-router-dom";
const Page = lazy(() => import("SuperAdmin/Page"));
import BACKEND_URL from '../config';

// Dummy data for fallback
const dummyAlertStats = {
  totalAlerts: "0",
  resolvedAlerts: "0",
  activeAlerts: "0",
  todayOccurred: "0",
};

const dummyFilterOptions = {
  statusOptions: [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "resolved", label: "Resolved" },
  ],
  alertTypeOptions: [
    { value: "all", label: "All Types" },
    { value: "overload", label: "Overload" },
    { value: "power_failure", label: "Power Failure" },
    { value: "communication_loss", label: "Communication Loss" },
    { value: "voltage_fluctuation", label: "Voltage Fluctuation" },
  ],
};

const dummyAlertTableData = [
  {
    sNo: 1,
    dtrId: "DTR001",
    meter: "MTR001",
    tamperType: "Cover Tamper",
    status: "Active",
    duration: "2h 30m",
  },
  {
    sNo: 2,
    dtrId: "DTR002",
    meter: "MTR002",
    tamperType: "Magnetic Tamper",
    status: "Resolved",
    duration: "45m",
  },
  {
    sNo: 3,
    dtrId: "DTR003",
    meter: "MTR003",
    tamperType: "Reverse Polarity",
    status: "Active",
    duration: "1h 15m",
  },
];

const dummyTimelineData = {
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  series: [
    { name: "Active", data: [5, 8, 12, 6, 15, 10] },
    { name: "Resolved", data: [10, 15, 8, 20, 12, 18] },
  ],
};

const dummyTrendData = {
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  series: [{ name: "Total Alerts", data: [15, 23, 20, 26, 27, 28] }],
};

const dummyPieData = [
  { value: 45, name: "Overload", unit: "alerts" },
  { value: 25, name: "Power Failure", unit: "alerts" },
  { value: 20, name: "Communication Loss", unit: "alerts" },
  { value: 10, name: "Voltage Fluctuation", unit: "alerts" },
];

const dummyActivityLogData = [
  {
    id: 1,
    description: "MTR001 - DTR001",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    subText: "Alert Count: 15 | Last Alert: 2 hours ago",
    author: "System",
    status: "Active",
  },
  {
    id: 2,
    description: "MTR002 - DTR002",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    subText: "Alert Count: 12 | Last Alert: 4 hours ago",
    author: "System",
    status: "Resolved",
  },
  {
    id: 3,
    description: "MTR003 - DTR003",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    subText: "Alert Count: 10 | Last Alert: 1 day ago",
    author: "System",
    status: "Active",
  },
  {
    id: 4,
    description: "MTR004 - DTR004",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    subText: "Alert Count: 8 | Last Alert: 2 days ago",
    author: "System",
    status: "Resolved",
  },
  {
    id: 5,
    description: "MTR005 - DTR005",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    subText: "Alert Count: 6 | Last Alert: 3 days ago",
    author: "System",
    status: "Resolved",
  },
];

const MeterAlert: React.FC = () => {
  const navigate = useNavigate();

  // Filter states - Initialize empty so tracker only shows when user selects something
  const [filterValues, setFilterValues] = useState({
    meterId: "",
    status: "all",
    dateRange: { start: "", end: "" },
    alertType: "all",
  });

  // Data states
  const [alertStats, setAlertStats] = useState(dummyAlertStats);
  const [alertTableData, _setAlertTableData] = useState(dummyAlertTableData);
  const [filterOptions, _setFilterOptions] = useState(dummyFilterOptions);
  const [timelineData, _setTimelineData] = useState(dummyTimelineData);
  const [_trendData, _setTrendData] = useState(dummyTrendData);
  const [pieData, _setPieData] = useState(dummyPieData);
  const [activityLogData, _setActivityLogData] = useState(dummyActivityLogData);

  // Loading states
  const [isStatsLoading, _setIsStatsLoading] = useState(false);
  const [isTableLoading, _setIsTableLoading] = useState(false);
  const [isChartLoading, _setIsChartLoading] = useState(false);

   // Error states - following the pattern from MetersList.tsx
   const [error, setError] = useState<string | null>("Failed to fetch alert statistics. Please try again.");

  // Alert statistics cards
  const alertStatsCards = [
    {
      title: "Total Alerts",
      value: alertStats.totalAlerts,
      icon: "icons/alert.svg",
      subtitle1: "All Time Alerts",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () => navigate("/meter-alert-table?type=all"),
    },
    {
      title: "Resolved",
      value: alertStats.resolvedAlerts,
      icon: "icons/check.svg",
      subtitle1: "Successfully Resolved",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () => navigate("/meter-alert-table?type=resolved"),
    },
    {
      title: "Active",
      value: alertStats.activeAlerts,
      icon: "icons/warning.svg",
      subtitle1: "Currently Active",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () => navigate("/meter-alert-table?type=active"),
    },
    {
      title: "Today Occurred",
      value: alertStats.todayOccurred,
      icon: "icons/calendar.svg",
      subtitle1: "Alerts Today",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () => navigate("/meter-alert-table?type=today"),
    },
  ];

  // Alert table columns
  const alertTableColumns = [
    { key: "sNo", label: "S.No" },
    { key: "dtrId", label: "DTR ID" },
    { key: "meter", label: "Meter" },
    { key: "tamperType", label: "Tamper Type" },
    {
      key: "status",
      label: "Status",
      statusIndicator: {},
      isActive: (value: string) => value.toLowerCase() === "active",
    },
    { key: "duration", label: "Duration" },
  ];

  // Filter change handlers
  const handleFilterChange = (filterName: string, value: any) => {
    setFilterValues((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setFilterValues((prev) => ({
      ...prev,
      dateRange: { start, end },
    }));
  };

  const handleExportData = () => {
    // Export functionality
    console.log("Exporting alert data...");
  };

  const handleChartDownload = () => {
    console.log("Downloading chart data...");
  };

   // Error handling functions - following the pattern from MetersList.tsx
   const handleRetry = () => {
     setError(null);
     window.location.reload();
   };

  // Self-contained tracking system - no imports needed!
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [activeComponents, setActiveComponents] = useState<
    Array<{
      id: string;
      name: string;
      value: any;
      label?: string;
    }>
  >([]);

  useEffect(() => {
    const components: Array<{
      id: string;
      name: string;
      value: any;
      label?: string;
    }> = [];

    // Track Meter ID
    if (filterValues.meterId && filterValues.meterId.trim()) {
      components.push({
        id: "meterId-filter",
        name: `Meter ID: ${filterValues.meterId}`,
        value: filterValues.meterId,
      });
    }

    if (filterValues.status && filterValues.status !== "all") {
      const statusLabel =
        filterOptions.statusOptions.find(
          (opt) => opt.value === filterValues.status
        )?.label || filterValues.status;
      components.push({
        id: "status-filter",
        name: `Status: ${statusLabel}`,
        value: filterValues.status,
        label: statusLabel,
      });
    }

    if (filterValues.alertType && filterValues.alertType !== "all") {
      const alertTypeLabel =
        filterOptions.alertTypeOptions.find(
          (opt) => opt.value === filterValues.alertType
        )?.label || filterValues.alertType;
      components.push({
        id: "alertType-filter",
        name: `Alert Type: ${alertTypeLabel}`,
        value: filterValues.alertType,
        label: alertTypeLabel,
      });
    }

    if (filterValues.dateRange.start || filterValues.dateRange.end) {
      const dateRangeLabel =
        filterValues.dateRange.start && filterValues.dateRange.end
          ? `Date Range: ${filterValues.dateRange.start} to ${filterValues.dateRange.end}`
          : filterValues.dateRange.start
          ? `From: ${filterValues.dateRange.start}`
          : `Until: ${filterValues.dateRange.end}`;

      components.push({
        id: "dateRange-filter",
        name: dateRangeLabel,
        value: {
          start: filterValues.dateRange.start,
          end: filterValues.dateRange.end,
        },
      });
    }

    // Update state
    setActiveComponents(components);
    setHasActiveFilters(components.length > 0);
  }, [filterValues, filterOptions]);

  return (
    <div className="overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <Page
         sections={[
           // Error section - following pattern from MetersList.tsx
           ...(error ? [{
             layout: {
               type: 'column' as const,
               gap: 'gap-4',
             },
             components: [
               {
                 name: 'Error',
                 props: {
                   visibleErrors: [error],
                   onRetry: handleRetry,
                   showRetry: true,
                   maxVisibleErrors: 1,
                 },
               },
             ],
           }] : []),
          // Header section
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
                  title: "Meter Alert Dashboard",
                  onBackClick: () => window.history.back(),
                  buttonsLabel: "Export",
                  variant: "primary",
                  backButtonText: "",
                  onClick: handleExportData,
                  showMenu: true,
                  showDropdown: true,
                  menuItems: [{ id: "export", label: "Export" }],
                  onMenuItemClick: (_itemId: string) => {
                    // Handle menu item click
                  },
                },
              },
            ],
          },

           // Filter Section - following MetersList.tsx pattern (NO DUPLICATES)
           {
             layout: {
               type: 'grid' as const,
               columns: 4,
               gap: 'gap-4',
             },
             components: [
               {
                 name: "Input",
                 props: {
                   type: "text",
                   placeholder: "Enter Meter ID",
                   value: filterValues.meterId,
                   onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                     handleFilterChange("meterId", e.target.value),
                   className: "w-full",
                 },
               },
               {
                 name: "Dropdown",
                 props: {
                   options: filterOptions.statusOptions,
                   value: filterValues.status,
                   onChange: (value: string) =>
                     handleFilterChange("status", value),
                   placeholder: "Select Status",
                   searchable: false,
                   className: "w-full",
                 },
               },
               {
                 name: "RangePicker",
                 props: {
                   startDate: filterValues.dateRange.start,
                   endDate: filterValues.dateRange.end,
                   onChange: handleDateRangeChange,
                   placeholder: "Select Date Range",
                   className: "w-full",
                 },
               },
               {
                 name: "Dropdown",
                 props: {
                   options: filterOptions.alertTypeOptions,
                   value: filterValues.alertType,
                   onChange: (value: string) =>
                     handleFilterChange("alertType", value),
                   placeholder: "Select Alert Type",
                   searchable: false,
                   className: "w-full",
                 },
               },
             ],
           },
           // SimpleTracker Section - separate section (only show when filters are active)
           ...(hasActiveFilters ? [{
             layout: {
               type: 'column' as const,
               gap: 'gap-4',
             },
             components: [
               {
                 name: "SimpleTracker",
                 props: {
                   title: "Active Filters",
                   showRemoveButton: true,
                   activeComponents: activeComponents,
                   onRemoveComponent: (componentId: string) => {
                     switch (componentId) {
                       case "meterId-filter":
                         handleFilterChange("meterId", "");
                         break;
                       case "status-filter":
                         handleFilterChange("status", "all");
                         break;
                       case "alertType-filter":
                         handleFilterChange("alertType", "all");
                         break;
                       case "dateRange-filter":
                         handleDateRangeChange("", "");
                         break;
                       default:
                         console.log("Remove component:", componentId);
                     }
                   },
                   onComponentClick: (componentId: string) => {
                     console.log("Clicked on component:", componentId);
                   },
                 },
               },
             ],
           }] : []),

          // Alert Statistics Cards
          {
            layout: {
              type: "grid",
              columns: 4,
              gap: "gap-4",
              className:
                "border border-primary-border dark:border-dark-border rounded-3xl p-4 bg-background-secondary dark:bg-primary-dark-light",
            },
            components: [
              {
                name: "SectionHeader",
                props: {
                  title: "Alert Statistics",
                  titleLevel: 2,
                  titleSize: "md",
                  titleVariant: "primary",
                  titleWeight: "medium",
                  titleAlign: "left",
                },
                span: { col: 4, row: 1 },
              },
              ...alertStatsCards.map((stat) => ({
                name: "Card",
                props: {
                  title: stat.title,
                  value: stat.value,
                  icon: stat.icon,
                  subtitle1: stat.subtitle1,
                  onValueClick: stat.onValueClick,
                  bg: stat.bg,
                  loading: stat.loading,
                },
                span: { col: 1 as const, row: 1 as const },
              })),
            ],
          },

          // Charts Section
          {
            layout: {
              type: "grid",
              columns: 2,
              gap: "gap-4",
              rows: [
                {
                  layout: "grid",
                  gridColumns: 1,
                  span: { col: 2, row: 1 },
                  columns: [
                    {
                      name: "StackedBarChart",
                      props: {
                        xAxisData: timelineData.months,
                        seriesData: timelineData.series,
                        height: 300,
                        showHeader: true,
                        headerTitle: "Alert Timeline",
                        showDownloadButton: true,
                        onDownload: handleChartDownload,
                        isLoading: isChartLoading,
                        isTimeFormat: true,
                        timeFormat: "24h",
                        timeInterval: 60,
                      },
                    },
                  ],
                },
                {
                  layout: "grid",
                  gridColumns: 1,
                  span: { col: 2, row: 1 },
                  columns: [
                    {
                      name: "BarChart",
                      props: {
                        xAxisData: timelineData.months,
                        seriesColors: ["#163b7c", "#55b56c"], // Force brand colors
                        seriesData: timelineData.series,
                        height: 300,
                        showHeader: true,
                        headerTitle: "Alert Timeline",
                        showDownloadButton: true,
                        onDownload: handleChartDownload,
                        isLoading: isChartLoading,
                        isTimeFormat: true,
                        timeFormat: "24h",
                        timeInterval: 60,
                      },
                    },
                  ],
                },
                {
                  layout: "grid",
                  gridColumns: 2,
                  span: { col: 2, row: 1 },
                  columns: [
                    // {
                    //   name: "BarChart",
                    //   props: {
                    //     xAxisData: trendData.months,
                    //     seriesData: trendData.series,
                    //     height: 300,
                    //     showHeader: true,
                    //     headerTitle: "Alert Trend",
                    //     showDownloadButton: true,
                    //     onDownload: handleChartDownload,
                    //     isLoading: isChartLoading,
                    //   },
                    //   span: { col: 1, row: 1 },
                    // },
                    {
                      name: "PieChart",
                      props: {
                        data: pieData,
                        height: 300,
                        showHeader: true,
                        headerTitle: "Alert Types Distribution",
                        showDownloadButton: true,
                        isLoading: isChartLoading,
                        onClick: (segmentName?: string) => {
                          if (segmentName) {
                            navigate(
                              `/meter-alert-table?type=${segmentName
                                .toLowerCase()
                                .replace(/\s+/g, "-")}`
                            );
                          }
                        },
                        // Enhanced features
                        showStatsSection: true,
                        Avg: true,
                        valueUnit: "alerts",

                        // Dynamic colors and custom labels
                        useDynamicColors: true,
                        colorPalette: "status",
                        customLabels: {
                          Overload: "Overload Alerts",
                          "Power Failure": "Power Failure Alerts",
                          "Communication Loss": "Communication Loss Alerts",
                          "Voltage Fluctuation": "Voltage Fluctuation Alerts",
                          "Tamper Detection": "Tamper Detection Alerts",
                          "Meter Fault": "Meter Fault Alerts",
                        },

                        // Download functionality
                        onDownload: (timeRange: string, viewType: string) => {
                          console.log(
                            "Downloading chart data for:",
                            timeRange,
                            viewType
                          );
                          handleChartDownload();
                        },
                      },
                      span: { col: 1, row: 1 },
                    },
                    {
                      name: "ActivityLog",
                      props: {
                        title: "Top Meters by Alert Count",
                        entries: activityLogData,
                        maxHeight: "h-80",
                      },
                    },
                  ],
                },
              ],
            },
          },

          // Alert Table Section
          {
            layout: {
              type: "grid" as const,
              className: "",
              columns: 1,
            },
            components: [
              {
                name: "Table",
                props: {
                  data: alertTableData,
                  columns: alertTableColumns,
                  showHeader: true,
                  headerTitle: "Alert Details",
                  searchable: true,
                  sortable: true,
                  initialRowsPerPage: 10,
                  showActions: true,
                  text: "Alert Management Table",
                  onRowClick: (row: any) =>
                    navigate(`/alert-detail/${row.dtrId}`),
                  onView: (row: any) => navigate(`/alert-detail/${row.dtrId}`),
                  pagination: true,
                  loading: isTableLoading,
                  emptyMessage: "No alerts found",
                },
                span: { col: 1, row: 1 },
              },
            ],
          },
        ]}
      />
    </div>
  );
};

export default MeterAlert;
