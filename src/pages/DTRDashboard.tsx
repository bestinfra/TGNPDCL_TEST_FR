import { lazy } from "react";
import React, { useState, useEffect } from "react";
interface TableData {
  [key: string]: string | number | boolean | null | undefined;
}
import { useNavigate } from "react-router-dom";
const Page = lazy(() => import("SuperAdmin/Page"));
import { exportChartData } from "../utils/excelExport";
import { FILTER_STYLES } from "../contexts/FilterStyleContext";
import BACKEND_URL from "../config";

// Dummy data for fallback
const dummyDtrStatsData = {
  totalDtrs: "N/A",
  totalLtFeeders: "N/A",
  totalFuseBlown: "N/A",
  fuseBlownPercentage: "N/A",
  overloadedFeeders: "N/A",
  overloadedPercentage: "N/A",
  underloadedFeeders: "N/A",
  underloadedPercentage: "N/A",
  ltSideFuseBlown: "N/A",
  unbalancedDtrs: "N/A",
  unbalancedPercentage: "N/A",
  powerFailureFeeders: "N/A",
  powerFailurePercentage: "N/A",
  htSideFuseBlown: "N/A",
  activeDtrs: "N/A",
  inactiveDtrs: "N/A",
  activePercentage: "N/A",
  inactivePercentage: "N/A",
};

// Updated filter options structure to match API response
const dummyFilterOptions = {
  discoms: [
    { value: "DISCOM1", label: "DISCOM 1" },
    { value: "DISCOM2", label: "DISCOM 2" }
  ],
  circles: [
    { value: "CIRCLE1", label: "Circle 1" },
    { value: "CIRCLE2", label: "Circle 2" }
  ],
  divisions: [
    { value: "DIV1", label: "Division 1" },
    { value: "DIV2", label: "Division 2" }
  ],
  subDivisions: [
    { value: "SUBDIV1", label: "Sub Division 1" },
    { value: "SUBDIV2", label: "Sub Division 2" }
  ],
  sections: [
    { value: "SECTION1", label: "Section 1" },
    { value: "SECTION2", label: "Section 2" }
  ],
  meterLocations: [
    { value: "INDOOR", label: "Indoor" },
    { value: "OUTDOOR", label: "Outdoor" }
  ],
};

const dummyDtrConsumptionData = {
  daily: { totalKwh: "N/A", totalKvah: "N/A", totalKw: "N/A", totalKva: "N/A" },
  monthly: {
    totalKwh: "N/A",
    totalKvah: "N/A",
    totalKw: "N/A",
    totalKva: "N/A",
  },
};

const dummyDtrTableData = [
  {
    dtrId: "N/A",
    dtrName: "N/A",
    feedersCount: "N/A",
    streetName: "N/A",
    city: "N/A",
    commStatus: "N/A",
    lastCommunication: "N/A",
  },
];

const dummyAlertsData = [
  {
    alert: "N/A",
    date: "N/A",
  },
];

const dummyChartData = {
  months: ["N/A"],
  series: [
    { name: "Detected", data: [0] },
    { name: "Analyzing", data: [0] },
    { name: "Repairing", data: [0] },
    { name: "Resolved", data: [0] },
    { name: "Unresolved", data: [0] },
  ],
};

const dummyMeterStatusData = [
  { value: 0, name: "Communicating" },
  { value: 0, name: "Non-Communicating" },
];

const DTRDashboard: React.FC = () => {
  const navigate = useNavigate();

  // State for time range toggle
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "Daily" | "Monthly"
  >("Daily");

  // State for filter values
  const [filterValues, setFilterValues] = useState({
    discom: "all",
    circle: "all",
    division: "all",
    subDivision: "all",
    section: "all",
    meterLocation: "all",
  });

  // State for filter options from backend
  const [filterOptions, setFilterOptions] = useState(dummyFilterOptions);

  // State for API data
  const [dtrStatsData, setDtrStatsData] = useState<any>(dummyDtrStatsData);
  const [dtrConsumptionData, setDtrConsumptionData] = useState<{
    daily: {
      totalKwh: string | number;
      totalKvah: string | number;
      totalKw: string | number;
      totalKva: string | number;
    };
    monthly: {
      totalKwh: string | number;
      totalKvah: string | number;
      totalKw: string | number;
      totalKva: string | number;
    };
  }>(dummyDtrConsumptionData);
  const [dtrTableData, setDtrTableData] =
    useState<TableData[]>(dummyDtrTableData);
  const [alertsData, setAlertsData] = useState<any[]>(dummyAlertsData);
  const [serverPagination, setServerPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Chart data variables (alerts trends)
  const [chartMonths, setChartMonths] = useState<string[]>(
    dummyChartData.months
  );
  const [chartSeries, setChartSeries] = useState<
    { name: string; data: number[] }[]
  >(dummyChartData.series);
  const alertColors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#9467bd", "#d62728"];
  const statsRange = selectedTimeRange;

  // Loading states
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [isAlertsLoading, setIsAlertsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isFiltersLoading, setIsFiltersLoading] = useState(true);
  const [isMeterStatusLoading, setIsMeterStatusLoading] = useState(true);
  const [meterStatus, setMeterStatus] = useState<any>(null);

  // State for tracking failed APIs
  const [failedApis, setFailedApis] = useState<
    Array<{
      id: string;
      name: string;
      retryFunction: () => Promise<void>;
      errorMessage: string;
    }>
  >([]);

  const retryFiltersAPI = async () => {
    // setIsFiltersLoading(true);
    // try {
    //   const response = await fetch(`${BACKEND_URL}/dtrs/filter-options`);
    //   if (!response.ok) throw new Error("Failed to fetch filter options");

    //   const contentType = response.headers.get("content-type");
    //   if (!contentType || !contentType.includes("application/json")) {
    //     throw new Error("Invalid response format");
    //   }

    //   const data = await response.json();
    //   console.log('data 2', data);
    //   if (data.success) {
    //     setFilterOptions(data.data || dummyFilterOptions);
    //     setFailedApis((prev) => prev.filter((api) => api.id !== "filters"));
    //   } else {
    //     throw new Error(data.message || "Failed to fetch filter options");
    //   }
    // } catch (err: any) {
    //   console.error("Error in Filters API:", err);
    //   setFilterOptions(dummyFilterOptions);
    // } finally {
    //   setTimeout(() => {
    //     setIsFiltersLoading(false);
    //   }, 1000);
    // }
  };

  const retryStatsAPI = async () => {
    setIsStatsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/dtrs/stats`);
      if (!response.ok) throw new Error("Failed to fetch DTR stats");

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format");
      }

      const data = await response.json();
      if (data.success) {
        const row1 = data.data?.row1 || {};
        const row2 = data.data?.row2 || {};
        setDtrStatsData(row1);
        setDtrConsumptionData({
          daily: row2.daily || {
            totalKwh: 0,
            totalKvah: 0,
            totalKw: 0,
            totalKva: 0,
          },
          monthly: row2.monthly || {
            totalKwh: 0,
            totalKvah: 0,
            totalKw: 0,
            totalKva: 0,
          },
        });
        setFailedApis((prev) => prev.filter((api) => api.id !== "stats"));
      } else {
        throw new Error(data.message || "Failed to fetch DTR stats");
      }
    } catch (err: any) {
      console.error("Error in Stats API:", err);
      setDtrStatsData(dummyDtrStatsData);
      setDtrConsumptionData(dummyDtrConsumptionData);
    } finally {
      setTimeout(() => {
        setIsStatsLoading(false);
      }, 1000);
    }
  };

  const retryTableAPI = async () => {
    setIsTableLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", "1");
      params.append("pageSize", "10");

      const response = await fetch(`${BACKEND_URL}/dtrs?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch DTR table");

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format");
      }

      const data = await response.json();
      if (data.success) {
        setDtrTableData(data.data);
        setServerPagination({
          currentPage: data.page || 1,
          totalPages: Math.ceil(data.total / data.pageSize) || 1,
          totalCount: data.total || 0,
          limit: data.pageSize || 10,
          hasNextPage: data.hasNextPage || false,
          hasPrevPage: data.hasPrevPage || false,
        });
        setFailedApis((prev) => prev.filter((api) => api.id !== "table"));
      } else {
        throw new Error(data.message || "Failed to fetch DTR table");
      }
    } catch (err: any) {
      console.error("Error in Table API:", err);
      setDtrTableData(dummyDtrTableData);
    } finally {
      setTimeout(() => {
        setIsTableLoading(false);
      }, 1000);
    }
  };

  const retryAlertsAPI = async () => {
    setIsAlertsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/dtrs/alerts`);
      if (!response.ok) throw new Error("Failed to fetch DTR alerts");

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format");
      }

      const data = await response.json();
      if (data.success) {
        setAlertsData(data.data);
        setFailedApis((prev) => prev.filter((api) => api.id !== "alerts"));
      } else {
        throw new Error(data.message || "Failed to fetch DTR alerts");
      }
    } catch (err: any) {
      console.error("Error in Alerts API:", err);
      setAlertsData(dummyAlertsData);
    } finally {
      setTimeout(() => {
        setIsAlertsLoading(false);
      }, 1000);
    }
  };

  const retryChartAPI = async () => {
    setIsChartLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/dtrs/alerts/trends`);
      if (!response.ok) throw new Error("Failed to fetch DTR alerts trends");

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format");
      }

      const data = await response.json();
      if (data.success) {
        const rows = data.data || [];
        const monthsList = rows.map((r: any) => r.month);
        const detected = rows.map((r: any) => r.detected_count || 0);
        const analyzing = rows.map((r: any) => r.analyzing_count || 0);
        const repairing = rows.map((r: any) => r.repairing_count || 0);
        const resolved = rows.map((r: any) => r.resolved_count || 0);
        const unresolved = rows.map((r: any) => r.unresolved_count || 0);

        setChartMonths(monthsList);
        setChartSeries([
          { name: "Detected", data: detected },
          { name: "Analyzing", data: analyzing },
          { name: "Repairing", data: repairing },
          { name: "Resolved", data: resolved },
          { name: "Unresolved", data: unresolved },
        ]);
        setFailedApis((prev) => prev.filter((api) => api.id !== "chart"));
      } else {
        throw new Error(data.message || "Failed to fetch DTR alerts trends");
      }
    } catch (err: any) {
      console.error("Error in Chart API:", err);
      setChartMonths(dummyChartData.months);
      setChartSeries(dummyChartData.series);
    } finally {
      setTimeout(() => {
        setIsChartLoading(false);
      }, 1000);
    }
  };

  const retryMeterStatusAPI = async () => {
    setIsMeterStatusLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/consumer/meter-status`);
      if (!response.ok) throw new Error("Failed to fetch meter status");

      const data = await response.json();
      if (data.success) {
        setMeterStatus(data.data);
        setFailedApis((prev) => prev.filter((api) => api.id !== "meterStatus"));
      } else {
        throw new Error(data.message || "Failed to fetch meter status");
      }
    } catch (err: any) {
      console.error("Error in Meter Status API:", err);
      setMeterStatus(null);
    } finally {
      setTimeout(() => {
        setIsMeterStatusLoading(false);
      }, 1000);
    }
  };

  // Retry specific API
  const retrySpecificAPI = (apiId: string) => {
    const api = failedApis.find((a) => a.id === apiId);
    if (api) {
      api.retryFunction();
    }
  };

  // Load data on component mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      setIsFiltersLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/dtrs/filter/filter-options`);
        console.log("response", response);
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format");
        }

        const data = await response.json();
        console.log('data 2', data);
        if (data.success) {
          // Transform the API data to match dropdown component format
          const transformedData = {
            discoms: data.data
              .filter((item: any) => item.levelName === "DISCOM")
              .map((item: any) => ({ value: item.id.toString(), label: item.name })),
            circles: data.data
              .filter((item: any) => item.levelName === "CIRCLE")
              .map((item: any) => ({ value: item.id.toString(), label: item.name })),
            divisions: data.data
              .filter((item: any) => item.levelName === "DIVISION")
              .map((item: any) => ({ value: item.id.toString(), label: item.name })),
            subDivisions: data.data
              .filter((item: any) => item.levelName === "SUB-DIVISION")
              .map((item: any) => ({ value: item.id.toString(), label: item.name })),
            sections: data.data
              .filter((item: any) => item.levelName === "SECTION")
              .map((item: any) => ({ value: item.id.toString(), label: item.name })),
            meterLocations: data.data
              .filter((item: any) => item.levelName === "METER-LOCATION")
              .map((item: any) => ({ value: item.id.toString(), label: item.name }))
          };
          
          setFilterOptions(transformedData);
        } else {
          throw new Error(data.message || "Failed to fetch filter options");
        }
      } catch (error) {
        console.error("Error fetching filter options:", error);
        setFailedApis((prev) => {
          if (!prev.find((api) => api.id === "filters")) {
            return [
              ...prev,
              {
                id: "filters",
                name: "Filter Options",
                retryFunction: retryFiltersAPI,
                errorMessage:
                  "Failed to load Filter Options. Please try again.",
              },
            ];
          }
          return prev;
        });
      } finally {
        setTimeout(() => {
          setIsFiltersLoading(false);
        }, 1000);
      }
    };


    const fetchDTRStats = async () => {
      setIsStatsLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/dtrs/stats`);
        if (!response.ok) throw new Error("Failed to fetch DTR stats");

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format");
        }

        const data = await response.json();
        if (data.success) {
          const row1 = data.data?.row1 || {};
          const row2 = data.data?.row2 || {};
          setDtrStatsData(row1);
          setDtrConsumptionData({
            daily: row2.daily || {
              totalKwh: 0,
              totalKvah: 0,
              totalKw: 0,
              totalKva: 0,
            },
            monthly: row2.monthly || {
              totalKwh: 0,
              totalKvah: 0,
              totalKw: 0,
              totalKva: 0,
            },
          });
        } else {
          throw new Error(data.message || "Failed to fetch DTR stats");
        }
      } catch (error) {
        console.error("Error fetching DTR stats:", error);
        setDtrStatsData(dummyDtrStatsData);
        setDtrConsumptionData(dummyDtrConsumptionData);
        setFailedApis((prev) => {
          if (!prev.find((api) => api.id === "stats")) {
            return [
              ...prev,
              {
                id: "stats",
                name: "DTR Stats",
                retryFunction: retryStatsAPI,
                errorMessage:
                  "Failed to load DTR Statistics. Please try again.",
              },
            ];
          }
          return prev;
        });
      } finally {
        setTimeout(() => {
          setIsStatsLoading(false);
        }, 1000);
      }
    };

    const fetchDTRTable = async () => {
      setIsTableLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", "1");
        params.append("pageSize", "10");

        const response = await fetch(
          `${BACKEND_URL}/dtrs?${params.toString()}`
        );
        if (!response.ok) throw new Error("Failed to fetch DTR table");

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format");
        }

        const data = await response.json();
        if (data.success) {
          setDtrTableData(data.data);
          setServerPagination({
            currentPage: data.page || 1,
            totalPages: Math.ceil(data.total / data.pageSize) || 1,
            totalCount: data.total || 0,
            limit: data.pageSize || 10,
            hasNextPage: data.hasNextPage || false,
            hasPrevPage: data.hasPrevPage || false,
          });
        } else {
          throw new Error(data.message || "Failed to fetch DTR table");
        }
      } catch (error) {
        setDtrTableData(dummyDtrTableData);
        setFailedApis((prev) => {
          if (!prev.find((api) => api.id === "table")) {
            return [
              ...prev,
              {
                id: "table",
                name: "DTR Table",
                retryFunction: retryTableAPI,
                errorMessage: "Failed to load DTR Table. Please try again.",
              },
            ];
          }
          return prev;
        });
      } finally {
        setTimeout(() => {
          setIsTableLoading(false);
        }, 1000);
      }
    };

    const fetchDTRAlerts = async () => {
      setIsAlertsLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/dtrs/alerts`);
        if (!response.ok) throw new Error("Failed to fetch DTR alerts");

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format");
        }

        const data = await response.json();
        if (data.success) {
          setAlertsData(data.data);
        } else {
          throw new Error(data.message || "Failed to fetch DTR alerts");
        }
      } catch (error) {
        setAlertsData(dummyAlertsData);
        setFailedApis((prev) => {
          if (!prev.find((api) => api.id === "alerts")) {
            return [
              ...prev,
              {
                id: "alerts",
                name: "DTR Alerts",
                retryFunction: retryAlertsAPI,
                errorMessage: "Failed to load DTR Alerts. Please try again.",
              },
            ];
          }
          return prev;
        });
      } finally {
        setTimeout(() => {
          setIsAlertsLoading(false);
        }, 1000);
      }
    };

    const fetchDTRAlertsTrends = async () => {
      setIsChartLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/dtrs/alerts/trends`);
        if (!response.ok) throw new Error("Failed to fetch DTR alerts trends");

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format");
        }

        const data = await response.json();
        if (data.success) {
          const rows = data.data || [];
          const monthsList = rows.map((r: any) => r.month);
          const detected = rows.map((r: any) => r.detected_count || 0);
          const analyzing = rows.map((r: any) => r.analyzing_count || 0);
          const repairing = rows.map((r: any) => r.repairing_count || 0);
          const resolved = rows.map((r: any) => r.resolved_count || 0);
          const unresolved = rows.map((r: any) => r.unresolved_count || 0);

          setChartMonths(monthsList);
          setChartSeries([
            { name: "Detected", data: detected },
            { name: "Analyzing", data: analyzing },
            { name: "Repairing", data: repairing },
            { name: "Resolved", data: resolved },
            { name: "Unresolved", data: unresolved },
          ]);
        } else {
          throw new Error(data.message || "Failed to fetch DTR alerts trends");
        }
      } catch (error) {
        setChartMonths(dummyChartData.months);
        setChartSeries(dummyChartData.series);
        setFailedApis((prev) => {
          if (!prev.find((api) => api.id === "chart")) {
            return [
              ...prev,
              {
                id: "chart",
                name: "DTR Chart",
                retryFunction: retryChartAPI,
                errorMessage:
                  "Failed to load DTR Chart Data. Please try again.",
              },
            ];
          }
          return prev;
        });
      } finally {
        setTimeout(() => {
          setIsChartLoading(false);
        }, 1000);
      }
    };

    const fetchMeterStatus = async () => {
      setIsMeterStatusLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/consumer/meter-status`);
        if (!response.ok) throw new Error("Failed to fetch meter status");

        const data = await response.json();
        if (data.success) {
          setMeterStatus(data.data);
        } else {
          throw new Error(data.message || "Failed to fetch meter status");
        }
      } catch (error) {
        setMeterStatus(null);
        setFailedApis((prev) => {
          if (!prev.find((api) => api.id === "meterStatus")) {
            return [
              ...prev,
              {
                id: "meterStatus",
                name: "Meter Status",
                retryFunction: retryMeterStatusAPI,
                errorMessage:
                  "Failed to load Meter Status Data. Please try again.",
              },
            ];
          }
          return prev;
        });
      } finally {
        setTimeout(() => {
          setIsMeterStatusLoading(false);
        }, 1000);
      }
    };

    fetchFilterOptions();
    fetchDTRStats();
    fetchDTRTable();
    fetchDTRAlerts();
    fetchDTRAlertsTrends();
    fetchMeterStatus();
  }, []);

  const handleExportData = () => {
    import("xlsx").then((XLSX) => {
      const workbook = XLSX.utils.book_new();

      const dtrStatsExportData = dtrStatsCards.map((stat) => ({
        Metric: stat.title,
        Value: stat.value,
        Subtitle: stat.subtitle1 || "",
      }));

      const currentConsumptionCards = getCurrentConsumptionCards();
      const consumptionWidgetsExportData = currentConsumptionCards.map(
        (card) => ({
          Metric: card.title,
          Value: card.value,
          Subtitle: card.subtitle1 || "",
        })
      );

      const dtrStatsSheet = XLSX.utils.json_to_sheet(dtrStatsExportData);
      const consumptionWidgetsSheet = XLSX.utils.json_to_sheet(
        consumptionWidgetsExportData
      );

      XLSX.utils.book_append_sheet(
        workbook,
        dtrStatsSheet,
        "DTR Statistics Widgets"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        consumptionWidgetsSheet,
        "Consumption Widgets"
      );

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
      link.download = "dtr-dashboard-widgets.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    });
  };

  const handleChartDownload = () => {
    exportChartData(chartMonths, chartSeries, "dtr-alerts-trends");
  };

  const handleViewDTR = (row: TableData) => {
    console.log("Viewing DTR:", row);
    navigate(`/dtr-detail/${row.dtrId}`);
  };

  const handlePageChange = () => {
    retryTableAPI();
  };

  const handleSearch = () => {
    retryTableAPI();
  };

  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range as "Daily" | "Monthly");
  };

  // Function to update filter options based on selection
  const updateFilterOptions = async (filterName: string, selectedValue: string) => {
    const name = selectedValue.target.value;
    const value = selectedValue.target.value;
    if (name === "all") return;

    try {
      console.log(`🔄 Updating filter options for ${filterName} with value: ${name}`);
      
      const params = new URLSearchParams();
      params.append('parentId', value);
      const apiUrl = `${BACKEND_URL}/dtrs/filter/filter-options?${params.toString()}`;
      console.log(`📡 Calling API: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Failed to fetch filter options");
      
      const data = await response.json();
      console.log(`📥 API Response for ${filterName}:`, data);
      
      if (data.success) {
        const newOptions = data.data || [];
        console.log(`✅ Found ${newOptions.length} options for ${filterName}:`, newOptions);
        console.log("newOptions", newOptions);
        // Update the appropriate filter options based on filterName
        // and reset dependent filters
        switch (filterName) {
          case "discom":
            console.log(`🏢 Updating circles for DISCOM ${name}`);
            setFilterOptions(prev => ({
              ...prev,
              circles: [{ value: "all", label: "All Circles" }, ...newOptions.map((item: any) => ({ 
                value: item.id.toString(), 
                label: item.name 
              }))]
            }));
            // Reset dependent filters
            setFilterValues(prev => ({
              ...prev,
              circle: "all",
              division: "all",
              subDivision: "all",
              section: "all",
              meterLocation: "all"
            }));
            // Clear dependent dropdowns
            setFilterOptions(prev => ({
              ...prev,
              divisions: [{ value: "all", label: "All Divisions" }],
              subDivisions: [{ value: "all", label: "All Sub-Divisions" }],
              sections: [{ value: "all", label: "All Sections" }],
              meterLocations: [{ value: "all", label: "All Meter Locations" }]
            }));
            break;
            
          case "circle":
            console.log(`⭕ Updating divisions for Circle ${name}`);
            setFilterOptions(prev => ({
              ...prev,
              divisions: [{ value: "all", label: "All Divisions" }, ...newOptions.map((item: any) => ({ 
                value: item.id.toString(), 
                label: item.name 
              }))]
            }));
            // Reset dependent filters
            setFilterValues(prev => ({
              ...prev,
              division: "all",
              subDivision: "all",
              section: "all",
              meterLocation: "all"
            }));
            // Clear dependent dropdowns
            setFilterOptions(prev => ({
              ...prev,
              subDivisions: [{ value: "all", label: "All Sub-Divisions" }],
              sections: [{ value: "all", label: "All Sections" }],
              meterLocations: [{ value: "all", label: "All Meter Locations" }]
            }));
            break;
            
          case "division":
            console.log(`📊 Updating sub-divisions for Division ${selectedValue}`);
            setFilterOptions(prev => ({
              ...prev,
              subDivisions: [{ value: "all", label: "All Sub-Divisions" }, ...newOptions.map((item: any) => ({ 
                value: item.id.toString(), 
                label: item.name 
              }))]
            }));
            // Reset dependent filters
            setFilterValues(prev => ({
              ...prev,
              subDivision: "all",
              section: "all",
              meterLocation: "all"
            }));
            // Clear dependent dropdowns
            setFilterOptions(prev => ({
              ...prev,
              sections: [{ value: "all", label: "All Sections" }],
              meterLocations: [{ value: "all", label: "All Meter Locations" }]
            }));
            break;
            
          case "subDivision":
            console.log(`🔧 Updating sections for Sub-Division ${selectedValue}`);
            setFilterOptions(prev => ({
              ...prev,
              sections: [{ value: "all", label: "All Sections" }, ...newOptions.map((item: any) => ({ 
                value: item.id.toString(), 
                label: item.name 
              }))]
            }));
            // Reset dependent filters
            setFilterValues(prev => ({
              ...prev,
              section: "all",
              meterLocation: "all"
            }));
            // Clear dependent dropdowns
            setFilterOptions(prev => ({
              ...prev,
              meterLocations: [{ value: "all", label: "All Meter Locations" }]
            }));
            break;
            
          case "section":
            console.log(`📍 Updating meter locations for Section ${selectedValue}`);
            setFilterOptions(prev => ({
              ...prev,
              meterLocations: [{ value: "all", label: "All Meter Locations" }, ...newOptions.map((item: any) => ({ 
                value: item.id.toString(), 
                label: item.name 
              }))]
            }));
            // Reset dependent filters
            setFilterValues(prev => ({
              ...prev,
              meterLocation: "all"
            }));
            break;
        }
        
        console.log(`✅ Successfully updated ${filterName} filter options`);
      }
    } catch (error) {
      console.error(`❌ Error updating filter options for ${filterName}:`, error);
    }
  };

  // Filter change handlers
  const handleFilterChange = async (filterName: string, value: string) => {
    console.log("value", value);
    console.log("filterName", filterName);
    setFilterValues((prev) => ({
      ...prev,
      [filterName]: value.target.value,
    }));
    
    // Update dependent filter options
    await updateFilterOptions(filterName, value);
  };

  // Handle Get Data button click
  const handleGetData = async () => {
    console.log("Filter values:", filterValues);
    // Here you can implement the logic to fetch data based on filters
    // For example, call the DTR stats API with filter parameters
    try {
      const params = new URLSearchParams();
      Object.entries(filterValues).forEach(([key, value]) => {
        if (value !== "all") {
          params.append(key, value);
        }
      });

      // Refresh data with new filters
      retryStatsAPI();
      retryTableAPI();
      retryAlertsAPI();
      retryChartAPI();
    } catch (error) {
      console.error("Error applying filters:", error);
    }
  };

  // DTR statistics cards data - Using API data
  const dtrStatsCards = [
    {
      title: "Total DTRs",
      value: dtrStatsData.totalDtrs || dtrStatsData?.row1?.totalDtrs || "N/A",
      icon: "/icons/dtr.svg",
      subtitle1: "Total Transformer Units",
      onValueClick: () =>
        navigate("/dtr-table?type=total-dtrs&title=Total%20DTRs"),
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
    },
    {
      title: "Total LT Feeders",
      value:
        dtrStatsData.totalLtFeeders ||
        dtrStatsData?.row1?.totalLtFeeders ||
        "N/A",
      icon: "/icons/feeder.svg",
      subtitle1: "Connected to DTRs",
      onValueClick: () =>
        navigate("/dtr-table?type=total-lt-feeders&title=Total%20LT%20Feeders"),
      loading: isStatsLoading,
    },
    {
      title: "Today's Fuse Blown",
      value:
        dtrStatsData.totalFuseBlown ||
        dtrStatsData?.row1?.totalFuseBlown ||
        "N/A",
      icon: "/icons/power_failure.svg",
      subtitle1: `${
        dtrStatsData.fuseBlownPercentage ||
        dtrStatsData?.row1?.fuseBlownPercentage ||
        "N/A"
      }% of Total DTRs`,
      onValueClick: () =>
        navigate("/dtr-table?type=fuse-blown&title=Today%27s%20Fuse%20Blown"),
      loading: isStatsLoading,
    },
    {
      title: "Overloaded Feeders",
      value:
        dtrStatsData.overloadedFeeders ||
        dtrStatsData?.row1?.overloadedFeeders ||
        "N/A",
      icon: "/icons/dtr.svg",
      subtitle1: `${
        dtrStatsData.overloadedPercentage ||
        dtrStatsData?.row1?.overloadedPercentage ||
        "N/A"
      }% of Total Feeders`,
      onValueClick: () =>
        navigate(
          "/dtr-table?type=overloaded-feeders&title=Overloaded%20Feeders"
        ),
      loading: isStatsLoading,
    },
    {
      title: "Underloaded Feeders",
      value:
        dtrStatsData.underloadedFeeders ||
        dtrStatsData?.row1?.underloadedFeeders ||
        "N/A",
      icon: "/icons/dtr.svg",
      subtitle1: `${
        dtrStatsData.underloadedPercentage ||
        dtrStatsData?.row1?.underloadedPercentage ||
        "N/A"
      }% of Total Feeders`,
      onValueClick: () =>
        navigate(
          "/dtr-table?type=underloaded-feeders&title=Underloaded%20Feeders"
        ),
      loading: isStatsLoading,
    },
    {
      title: "LT Side Fuse Blown",
      value:
        dtrStatsData.ltSideFuseBlown ||
        dtrStatsData?.row1?.ltSideFuseBlown ||
        "N/A",
      icon: "/icons/power_failure.svg",
      subtitle1: "Incidents Today",
      onValueClick: () =>
        navigate(
          "/dtr-table?type=lt-fuse-blown&title=LT%20Side%20Fuse%20Blown"
        ),
      loading: isStatsLoading,
    },
    {
      title: "Unbalanced DTRs",
      value:
        dtrStatsData.unbalancedDtrs ||
        dtrStatsData?.row1?.unbalancedDtrs ||
        "N/A",
      icon: "/icons/dtr.svg",
      subtitle1: `${
        dtrStatsData.unbalancedPercentage ||
        dtrStatsData?.row1?.unbalancedPercentage ||
        "N/A"
      }% of Total DTRs`,
      onValueClick: () =>
        navigate("/dtr-table?type=unbalanced-dtrs&title=Unbalanced%20DTRs"),
      loading: isStatsLoading,
    },
    {
      title: "Power Failure Feeders",
      value:
        dtrStatsData.powerFailureFeeders ||
        dtrStatsData?.row1?.powerFailureFeeders ||
        "N/A",
      icon: "/icons/power_failure.svg",
      subtitle1: `${
        dtrStatsData.powerFailurePercentage ||
        dtrStatsData?.row1?.powerFailurePercentage ||
        "N/A"
      }% of Feeders`,
      onValueClick: () =>
        navigate(
          "/dtr-table?type=power-failure-feeders&title=Power%20Failure%20Feeders"
        ),
      loading: isStatsLoading,
    },
    {
      title: "HT Side Fuse Blown",
      value:
        dtrStatsData.htSideFuseBlown ||
        dtrStatsData?.row1?.htSideFuseBlown ||
        "N/A",
      icon: "/icons/dtr.svg",
      subtitle1: "Incidents Today",
      onValueClick: () =>
        navigate(
          "/dtr-table?type=ht-fuse-blown&title=HT%20Side%20Fuse%20Blown"
        ),
      loading: isStatsLoading,
    },
  ];

  // DTR Consumption Cards - Daily data
  const dailyConsumptionCards = [
    {
      title: "Total kWh",
      value: String(dtrConsumptionData.daily.totalKwh || "N/A"),
      icon: "/icons/energy.svg",
      subtitle1: "Today's Active Energy",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=daily-kwh&title=Total%20kWh%20(Today)"),
    },
    {
      title: "Total kVAh",
      value: String(dtrConsumptionData.daily.totalKvah || "N/A"),
      icon: "/icons/energy.svg",
      subtitle1: "Today's Apparent Energy",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=daily-kvah&title=Total%20kVAh%20(Today)"),
    },
    {
      title: "Total kW",
      value: String(dtrConsumptionData.daily.totalKw || "N/A"),
      icon: "/icons/energy.svg",
      subtitle1: "Current Active Power",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=daily-kw&title=Total%20kW%20(Current)"),
    },
    {
      title: "Total kVA",
      value: String(dtrConsumptionData.daily.totalKva || "N/A"),
      icon: "/icons/energy.svg",
      subtitle1: "Current Apparent Power",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=daily-kva&title=Total%20kVA%20(Current)"),
    },
    {
      title: "Active DTRs",
      value: Number(dtrStatsData?.activeDtrs || "N/A"),
      icon: "/icons/dtr.svg",
      subtitle1: `${dtrStatsData?.activePercentage ?? "N/A"}% of Total DTRs`,
      iconStyle: FILTER_STYLES.WHITE, // White icon for Active DTRs
      bg: "bg-[var(--color-secondary)]",
      loading: isStatsLoading,
    },
    {
      title: "In-Active DTRs",
      value: Number(dtrStatsData?.inactiveDtrs || "N/A"),
      icon: "/icons/dtr.svg",
      subtitle1: `${dtrStatsData?.inactivePercentage ?? "N/A"}% of Total DTRs`,
      iconStyle: FILTER_STYLES.WHITE, // White icon for In-Active DTRs
      bg: "bg-[var(--color-danger)]",
      loading: isStatsLoading,
    },
  ];

  // DTR Consumption Cards - Monthly data
  const monthlyConsumptionCards = [
    {
      title: "Total kWh",
      value: String(dtrConsumptionData.monthly.totalKwh || "N/A"),
      icon: "/icons/consumption.svg",
      subtitle1: "Monthly Active Energy",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=monthly-kwh&title=Total%20kWh%20(Monthly)"),
    },
    {
      title: "Total kVAh",
      value: String(dtrConsumptionData.monthly.totalKvah || "N/A"),
      icon: "/icons/consumption.svg",
      subtitle1: "Monthly Apparent Energy",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=monthly-kvah&title=Total%20kVAh%20(Monthly)"),
    },
    {
      title: "Avg kW",
      value: String(dtrConsumptionData.monthly.totalKw || "N/A"),
      icon: "/icons/consumption.svg",
      subtitle1: "Monthly Average Power",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=monthly-kw&title=Avg%20kW%20(Monthly)"),
    },
    {
      title: "Avg kVA",
      value: String(dtrConsumptionData.monthly.totalKva || "N/A"),
      icon: "/icons/consumption.svg",
      subtitle1: "Monthly Average Apparent",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=monthly-kva&title=Avg%20kVA%20(Monthly)"),
    },
    {
      title: "Active DTRs",
      value: Number(dtrStatsData?.activeDtrs || "N/A"),
      icon: "/icons/dtr.svg",
      subtitle1: `${dtrStatsData?.activePercentage ?? "N/A"}% of Total DTRs`,
      iconStyle: FILTER_STYLES.WHITE, // White icon for Active DTRs
      bg: "bg-[var(--color-secondary)]",
      loading: isStatsLoading,
    },
    {
      title: "In-Active DTRs",
      value: Number(dtrStatsData?.inactiveDtrs || "N/A"),
      icon: "/icons/dtr.svg",
      subtitle1: `${dtrStatsData?.inactivePercentage ?? "N/A"}% of Total DTRs`,
      iconStyle: FILTER_STYLES.WHITE, // White icon for In-Active DTRs
      bg: "bg-[var(--color-danger)]",
      loading: isStatsLoading,
    },
  ];

  // Get current consumption cards data based on selected time range
  const getCurrentConsumptionCards = () => {
    return selectedTimeRange === "Daily"
      ? dailyConsumptionCards
      : monthlyConsumptionCards;
  };

  // Dummy data for DTRs table
  const dtrTableColumns = [
    { key: "dtrId", label: "DTR ID" },
    { key: "dtrName", label: "DTR Name" },
    { key: "feedersCount", label: "Feeders Count" },
    // { key: "streetName", label: "Street Name" },
    // { key: "city", label: "City" },
    {
      key: "commStatus",
      label: "Communication-Status",
      statusIndicator: {},
      isActive: (value: string | number | boolean | null | undefined) =>
        String(value).toLowerCase() === "active",
    },
    { key: "lastCommunication", label: "Last Communication" },
  ];

  // Dummy data for Latest Alerts table
  const alertsTableColumns = [
    { key: "alert", label: "Alert" },
    { key: "date", label: "Occured On" },
  ];

  return (
    <div className=" sticky top-0 ">
      <Page
        sections={[
          // Error Section - Above PageHeader
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
                              visibleErrors: failedApis.map(
                                (api) => api.errorMessage
                              ),
                              showRetry: true,
                              maxVisibleErrors: 3, // Show max 3 errors at once
                              failedApis: failedApis, // Pass all failed APIs for individual retry
                              onRetrySpecific: retrySpecificAPI, // Pass the retry function
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              ]
            : []),

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
                  title: "DTR Dashboard",
                  onBackClick: () => window.history.back(),
                  buttonsLabel: "Export",
                  variant: "primary",
                  onClick: () => handleExportData(),
                  showMenu: true,
                  showDropdown: true,
                  menuItems: [
                    { id: "all", label: "Alerts" },
                    { id: "export", label: "Export" },
                  ],
                  onMenuItemClick: (itemId: string) => {
                    console.log(`Filter by: ${itemId}`);
                  },
                },
              },
            ],
          },
          // Filter Section
          {
            layout: {
              type: "grid" as const,
              columns: 7,
              gap: "gap-4 ",
              className: " flex items-center justify-center",
            },
            components: [
              {
                name: "Dropdown",
                props: {
                  label: "DISCOM",
                  options: [ ...filterOptions.discoms],
                  value: filterValues.discom,
                  onChange: (value: string) =>
                    handleFilterChange("discom", value),
                  placeholder: "Select DISCOM",
                  loading: isFiltersLoading,
                  searchable: false,
                },
                span: { col: 1, row: 1 },
              },
              {
                name: "Dropdown",
                props: {
                  label: "CIRCLE",
                  options: [ ...filterOptions.circles],
                  value: filterValues.circle,
                  onChange: (value: string) =>
                    handleFilterChange("circle", value),
                  placeholder: "Select Circle",
                  loading: isFiltersLoading,
                  searchable: false,
                },
                span: { col: 1, row: 1 },
              },
              {
                name: "Dropdown",
                props: {
                  label: "DIVISION",
                  options: [...filterOptions.divisions],
                  value: filterValues.division,
                  onChange: (value: string) =>
                    handleFilterChange("division", value),
                  placeholder: "Select Division",
                  loading: isFiltersLoading,
                  searchable: false,
                },
                span: { col: 1, row: 1 },
              },
              {
                name: "Dropdown",
                props: {
                  label: "SUB-DIVISION",
                  options: [ ...filterOptions.subDivisions],
                  value: filterValues.subDivision,
                  onChange: (value: string) =>
                    handleFilterChange("subDivision", value),
                  placeholder: "Select Sub-Division",
                  loading: isFiltersLoading,
                  searchable: false,
                },
                span: { col: 1, row: 1 },
              },
              {
                name: "Dropdown",
                props: {
                  label: "SECTION",
                  options: [ ...filterOptions.sections],
                  value: filterValues.section,
                  onChange: (value: string) =>
                    handleFilterChange("section", value),
                  placeholder: "Select Section",
                  loading: isFiltersLoading,
                  searchable: false,
                },
                span: { col: 1, row: 1 },
              },
              {
                name: "Dropdown",
                props: {
                  label: "METER LOCATION",
                  options: [ ...filterOptions.meterLocations],
                  value: filterValues.meterLocation,
                  onChange: (value: string) =>
                    handleFilterChange("meterLocation", value),
                  placeholder: "Select Meter Location",
                  loading: isFiltersLoading,
                  searchable: false,
                },
                span: { col: 1, row: 1 },
              },
              {
                name: "Button",
                props: {
                  variant: "primary",
                  onClick: handleGetData,
                  children: "Get Data",
                  className: "h-10 px-6 self-end",
                  loading:
                    isStatsLoading ||
                    isTableLoading ||
                    isAlertsLoading ||
                    isChartLoading,
                  searchable: false,
                },
                span: { col: 1, row: 1 },
              },
            ],
          },
          // DTR Statistics Cards
          {
            layout: {
              type: "grid",
              columns: 5,
              gap: "gap-4",
              rows: [
                {
                  layout: "grid",
                  gap: "gap-4",
                  gridColumns: 3,
                  span: { col: 3, row: 1 },
                  className:
                    "border border-primary-border dark:border-dark-border rounded-3xl p-4 bg-background-secondary dark:bg-primary-dark-light",
                  columns: [
                    {
                      name: "SectionHeader",
                      props: {
                        title: "Distribution Transformer (DTR) Statistics",
                        titleLevel: 2,
                        titleSize: "md",
                        titleVariant: "primary",
                        titleWeight: "medium",
                        titleAlign: "left",
                        rightComponent: {
                          name: "Button",
                          props: {
                            variant: "secondary",
                            onClick: () =>
                              navigate(
                                "/dtr-table?type=total-dtrs&title=Total%20DTRs"
                              ),
                            children: "View All",
                            className: "px-4 py-2 text-sm",
                          },
                        },
                        layout: "horizontal",
                        gap: "gap-4",
                      },
                      span: { col: 3, row: 1 },
                    },
                    ...dtrStatsCards.map((stat) => ({
                      name: "Card",
                      props: {
                        title: stat.title,
                        value: stat.value,
                        icon: stat.icon,
                        subtitle1: stat.subtitle1,
                        onValueClick: stat.onValueClick,
                        bg: stat.bg || "bg-stat-icon-gradient",
                        loading: stat.loading,
                      },
                      span: { col: 1 as const, row: 1 as const },
                    })),
                  ],
                },
                {
                  layout: "grid",
                  gap: "gap-4",
                  gridColumns: 2,
                  span: { col: 2, row: 1 },
                  className:
                    "border border-primary-border dark:border-dark-border rounded-3xl p-4 bg-background-secondary dark:bg-primary-dark-light",
                  columns: [
                    {
                      name: "SectionHeader",
                      props: {
                        title: "Latest Alerts",
                        titleLevel: 2,
                        titleSize: "md",
                        titleVariant: "primary",
                        titleAlign: "left",
                        rightComponent: {
                          name: "TimeRangeSelector",
                          props: {
                            availableTimeRanges: ["Daily", "Monthly"],
                            selectedTimeRange: selectedTimeRange,
                            handleTimeRangeChange: handleTimeRangeChange,
                            timeRangeLabels: {},
                          },
                        },
                        layout: "horizontal",
                        gap: "gap-4",
                      },
                      span: { col: 2, row: 1 },
                    },
                    ...getCurrentConsumptionCards().map((card) => ({
                      name: "Card",
                      props: {
                        title: card.title,
                        value: card.value,
                        icon: card.icon,
                        subtitle1: card.subtitle1,
                        iconStyle: card.iconStyle, // Only for Active/In-Active DTRs
                        bg: card.bg || "bg-stat-icon-gradient",
                        loading: card.loading,
                      },
                      span: { col: 1 as const, row: 1 as const },
                    })),
                  ],
                },
              ],
            },
          },

          // DTRs Table section
          {
            layout: {
              type: "grid",
              columns: 2,
              gap: "gap-4",
              rows: [
                {
                  layout: "grid",
                  gridColumns: 1,
                  gap: "gap-4",
                  className:
                    "border border-primary-border dark:border-dark-border rounded-3xl  dark:bg-primary-dark-light",
                  columns: [
                    
                    {
                      name: "Holder",
                      props: {
                        title: "Meter Status",
                        subtitle:
                          "Distribution of communicating and non-communicating meters",
                        className: "border-none rounded-t-3xl ",
                      },
                    },
                    {
                      name: "PieChart",
                      props: {
                        data: meterStatus || dummyMeterStatusData,
                        height: 330,
                        showLegend: false,
                        showNoDataMessage: false,
                        showHeader: false,
                        className: "p-4",
                        onClick: (segmentName?: string) => {
                          if (segmentName === "Communicating")
                            navigate("/connect-disconnect/communicating");
                          else if (segmentName === "Non-Communicating")
                            navigate("/connect-disconnect/non-communicating");
                          else navigate("/connect-disconnect");
                        },
                        isLoading: isMeterStatusLoading,
                      },
                    },
                  ],
                },
                {
                  layout: "grid",
                  gridColumns: 1,
                  gap: "gap-4",
                  columns: [
                    {
                      name: "StackedBarChart",
                  props: {
                    xAxisData: chartMonths,
                    seriesData: chartSeries,
                    seriesColors: alertColors,
                    height: 300,
                    showLegendInteractions: true,
                    timeRange: statsRange,
                    showHeader: true,
                    headerTitle: "DTR Alert Statistics",
                    showDownloadButton: true,
                    onDownload: () => handleChartDownload(),
                    isLoading: isChartLoading,
                  },
                    },
                  ],
                },

                // {
                //   name: "StackedBarChart",
                //   props: {
                //     xAxisData: chartMonths,
                //     seriesData: chartSeries,
                //     seriesColors: alertColors,
                //     height: 300,
                //     showLegendInteractions: true,
                //     timeRange: statsRange,
                //     showHeader: true,
                //     headerTitle: "DTR Alert Statistics",
                //     showDownloadButton: true,
                //     onDownload: () => handleChartDownload(),
                //     isLoading: isChartLoading,
                //   },
                // },
              ],
            },
          },
          // // Latest Alerts section
          {
            layout: {
              type: "grid" as const,
              className: "",
              columns: 2,
            },
            components: [
              // {
              //   name: "StackedBarChart",
              //   props: {
              //     xAxisData: chartMonths,
              //     seriesData: chartSeries,
              //     seriesColors: alertColors,
              //     height: 300,
              //     showLegendInteractions: true,
              //     timeRange: statsRange,
              //     showHeader: true,
              //     headerTitle: "DTR Alert Statistics",
              //     showDownloadButton: true,
              //     onDownload: () => handleChartDownload(),
              //     isLoading: isChartLoading,
              //   },
              // },
              {
                name: "Table",
                props: {
                  data: dtrTableData,
                  columns: dtrTableColumns,
                  showHeader: true,
                  headerTitle: "Distribution Transformers",
                  headerClassName: "h-18",
                  searchable: true,
                  sortable: true,
                  initialRowsPerPage: 10,
                  showActions: true,
                  text: "DTR Management Table",
                  onRowClick: (row: TableData) =>
                    navigate(`/dtr-detail/${row.dtrId}`),
                  onView: handleViewDTR,
                  availableTimeRanges: [],
                  onPageChange: handlePageChange,
                  onSearch: handleSearch,
                  pagination: true,
                  serverPagination: serverPagination,
                  loading: isTableLoading,
                },
              },
              {
                name: "Table",
                props: {
                  data: alertsData,
                  columns: alertsTableColumns,
                  showHeader: true,
                  headerTitle: "Latest Alerts",
                  headerClickable: true,
                  onHeaderClick: () => navigate("/dtr-table?tab=alerts"),
                  showActions: false,
                  searchable: true,
                  pagination: true,
                  availableTimeRanges: [],
                  initialRowsPerPage: 3,
                  emptyMessage: "No alerts found",
                  loading: isAlertsLoading,
                  onRowClick: () =>
                    navigate("/dtr-table?type=alerts&title=Latest%20Alerts"),
                },
              },
            ],
          },
        ]}
      />
    </div>
  );
};

export default DTRDashboard;
