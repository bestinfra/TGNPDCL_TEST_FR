import { lazy } from "react";
import React, { useState, useEffect } from "react";
interface TableData {
  [key: string]: string | number | boolean | null | undefined;
}
import { useNavigate } from "react-router-dom";
const Page = lazy(() => import("SuperAdmin/Page"));
import { exportChartData } from "../utils/excelExport";
import { FILTER_STYLES } from "../contexts/FilterStyleContext";
import { apiClient } from "../api/apiUtils";

// Dummy data for fallback
const dummyDtrStatsData = {
  totalDtrs: "0",
  totalLtFeeders: "0",
  totalFuseBlown: "0",
  fuseBlownPercentage: "0",
  overloadedFeeders: "0",
  overloadedPercentage: "0",
  underloadedFeeders: "0",
  underloadedPercentage: "0",
  ltSideFuseBlown: "0",
  unbalancedDtrs: "0",
  unbalancedPercentage: "0",
  powerFailureFeeders: "0",
  powerFailurePercentage: "0",
  htSideFuseBlown: "0",
  activeDtrs: "0",
  inactiveDtrs: "0",
  activePercentage: "0",
  inactivePercentage: "0",
};

// Updated filter options structure to match API response
const dummyFilterOptions = {
  discoms: [
    { value: "DISCOM1", label: "DISCOM 1" },
    { value: "DISCOM2", label: "DISCOM 2" },
  ],
  circles: [
    { value: "CIRCLE1", label: "Circle 1" },
    { value: "CIRCLE2", label: "Circle 2" },
  ],
  divisions: [
    { value: "DIV1", label: "Division 1" },
    { value: "DIV2", label: "Division 2" },
  ],
  subDivisions: [
    { value: "SUBDIV1", label: "Sub Division 1" },
    { value: "SUBDIV2", label: "Sub Division 2" },
  ],
  sections: [
    { value: "SECTION1", label: "Section 1" },
    { value: "SECTION2", label: "Section 2" },
  ],
  meterLocations: [
    { value: "INDOOR", label: "Indoor" },
    { value: "OUTDOOR", label: "Outdoor" },
  ],
};

const dummyDtrConsumptionData = {
  daily: { totalKwh: "0", totalKvah: "0", totalKw: "0", totalKva: "0" },
  monthly: {
    totalKwh: "0",
    totalKvah: "0",
    totalKw: "0",
    totalKva: "0",
  },
  currentDay: { totalKwh: "0", totalKvah: "0", totalKw: "0", totalKva: "0" },
};

const dummyDtrTableData = [
  {
    dtrId: "0",
    dtrName: "0",
    feedersCount: "0",
    streetName: "0",
    city: "0",
    commStatus: "0",
    lastCommunication: "0",
  },
];

const dummyAlertsData = [
  {
    alertId: "ALT001",
    type: "Overload",
    feederName: "D1F1(32500114)",
    dtrNumber: "DTR-201",
    occuredOn: "2024-01-15 14:30:00",
    status: "Active",
  },
  {
    alertId: "ALT002",
    type: "Power Failure",
    feederName: "D1F2(32500115)",
    dtrNumber: "DTR-202",
    occuredOn: "2024-01-15 12:15:00",
    status: "Resolved",
  },
];

const dummyChartData = {
  months: ["0"],
  series: [
    { name: "LT FUSE BLOWN", data: [0] },
    { name: "HT FUSE BLOWN", data: [0] },
    { name: "OVERLOAD", data: [0] },
    { name: "UNDERLOAD", data: [0] },
    { name: "POWER FAILURE", data: [0] },
  ],
};

const dummyMeterStatusData = [
  { value: 0, name: "Communicating" },
  { value: 0, name: "Non-Communicating" },
];

const DTRDashboard: React.FC = () => {
  const navigate = useNavigate();

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

  // State for tracking the last selected ID from hierarchy dropdowns
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

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
    currentDay?: {
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
  // const [alertTypes, setAlertTypes] = useState<string[]>([]);
  const alertColors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#9467bd", "#d62728", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
  const statsRange = selectedTimeRange;

  // Loading states
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [isAlertsLoading, setIsAlertsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isFiltersLoading, setIsFiltersLoading] = useState(true);
  const [isMeterStatusLoading, setIsMeterStatusLoading] = useState(true);
  const [meterStatus, setMeterStatus] = useState<any>(null);

  // Transform meter status data to use correct names
  const transformMeterStatusData = (data: any) => {
    if (!data) return dummyMeterStatusData;
    
    return data.map((item: any) => {
      if (item.name === "Active") {
        return { ...item, name: "Communicating" };
      } else if (item.name === "Inactive") {
        return { ...item, name: "Non-Communicating" };
      }
      return item;
    });
  };

  // State for tracking failed APIs
  const [failedApis, setFailedApis] = useState<
    Array<{
      id: string;
      name: string;
      retryFunction: (lastSelectedId?: string) => Promise<void>;
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

  const retryStatsAPI = async (lastSelectedId?: string) => {
    setIsStatsLoading(true);
    try {
      const endpoint = lastSelectedId 
        ? `/dtrs/stats?hierarchyId=${lastSelectedId}`
        : '/dtrs/stats';
      
      const data = await apiClient.get(endpoint);
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
          currentDay: row2.currentDay || {
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

  const retryTableAPI = async (lastSelectedId?: string) => {
    setIsTableLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", "1");
      params.append("pageSize", "10");
      
      // Add lastSelectedId if available
      if (lastSelectedId) {
        params.append("lastSelectedId", lastSelectedId);
      }

      const data = await apiClient.get(`/dtrs?${params.toString()}`);

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

  const retryAlertsAPI = async (lastSelectedId?: string) => {
    setIsAlertsLoading(true);
    try {
      const endpoint = lastSelectedId 
        ? `/dtrs/alerts?lastSelectedId=${lastSelectedId}`
        : '/dtrs/alerts';
      
      const data = await apiClient.get(endpoint);
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

  const retryChartAPI = async (lastSelectedId?: string) => {
    setIsChartLoading(true);
    try {
      const endpoint = lastSelectedId 
        ? `/dtrs/alerts/trends?lastSelectedId=${lastSelectedId}`
        : '/dtrs/alerts/trends';
      
      const data = await apiClient.get(endpoint);
      if (data.success) {
        const rows = data.data || [];
        const monthsList = rows.map((r: any) => r.month);
        
        // Extract all possible alert types from the data
        const allAlertTypes = new Set<string>();
        rows.forEach((row: any) => {
          Object.keys(row).forEach(key => {
            if (key.endsWith('_count') && key !== 'month') {
              const alertType = key.replace('_count', '').replace(/\s+/g, ' ').toUpperCase();
              allAlertTypes.add(alertType);
            }
          });
        });
        
        const alertTypesArray = Array.from(allAlertTypes);
        // setAlertTypes(alertTypesArray);
        
        // Create dynamic series data based on actual alert types
        const seriesData = alertTypesArray.map((alertType, index) => {
          const dataKey = alertType.toLowerCase().replace(/\s+/g, '_') + '_count';
          const data = rows.map((r: any) => r[dataKey] || 0);
          return {
            name: alertType,
            data: data,
            color: alertColors[index % alertColors.length]
          };
        });

        setChartMonths(monthsList);
        setChartSeries(seriesData);
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

  const retryMeterStatusAPI = async (lastSelectedId?: string) => {
    setIsMeterStatusLoading(true);
    try {
      const endpoint = lastSelectedId 
        ? `/dtrs/meter-status?lastSelectedId=${lastSelectedId}`
        : '/dtrs/meter-status';
      
      const data = await apiClient.get(endpoint);
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
        const data = await apiClient.get('/dtrs/filter/filter-options');

        if (data.success) {
          // Transform the API data to match dropdown component format
          const transformedData = {
            discoms: data.data
              .filter((item: any) => item.levelName === "DISCOM")
              .map((item: any) => ({
                value: item.id.toString(),
                label: item.name,
              })),
            circles: data.data
              .filter((item: any) => item.levelName === "CIRCLE")
              .map((item: any) => ({
                value: item.id.toString(),
                label: item.name,
              })),
            divisions: data.data
              .filter((item: any) => item.levelName === "DIVISION")
              .map((item: any) => ({
                value: item.id.toString(),
                label: item.name,
              })),
            subDivisions: data.data
              .filter((item: any) => item.levelName === "SUB-DIVISION")
              .map((item: any) => ({
                value: item.id.toString(),
                label: item.name,
              })),
            sections: data.data
              .filter((item: any) => item.levelName === "SECTION")
              .map((item: any) => ({
                value: item.id.toString(),
                label: item.name,
              })),
            meterLocations: data.data
              .filter((item: any) => item.levelName === "METER-LOCATION")
              .map((item: any) => ({
                value: item.id.toString(),
                label: item.name,
              })),
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
        const endpoint = lastSelectedId 
          ? `/dtrs/stats?lastSelectedId=${lastSelectedId}`
          : '/dtrs/stats';
        
        const data = await apiClient.get(endpoint);

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
            currentDay: row2.currentDay || {
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
        
        // Add lastSelectedId if available
        if (lastSelectedId) {
          params.append("lastSelectedId", lastSelectedId);
        }

        const data = await apiClient.get(`/dtrs?${params.toString()}`);
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
        const endpoint = lastSelectedId 
          ? `/dtrs/alerts?lastSelectedId=${lastSelectedId}`
          : '/dtrs/alerts';
        
        const data = await apiClient.get(endpoint);
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
        const endpoint = lastSelectedId 
          ? `/dtrs/alerts/trends?lastSelectedId=${lastSelectedId}`
          : '/dtrs/alerts/trends';
        
        const data = await apiClient.get(endpoint);
        if (data.success) {
          const rows = data.data || [];
          const monthsList = rows.map((r: any) => r.month);
          
          // Extract all possible alert types from the data
          const allAlertTypes = new Set<string>();
          rows.forEach((row: any) => {
            Object.keys(row).forEach(key => {
              if (key.endsWith('_count') && key !== 'month') {
                const alertType = key.replace('_count', '').replace(/_/g, ' ').toUpperCase();
                allAlertTypes.add(alertType);
              }
            });
          });
          
          const alertTypesArray = Array.from(allAlertTypes);
          // setAlertTypes(alertTypesArray);
          
          // Create dynamic series data based on actual alert types
          const seriesData = alertTypesArray.map((alertType, index) => {
            const dataKey = alertType.toLowerCase().replace(/\s+/g, '_') + '_count';
            const data = rows.map((r: any) => r[dataKey] || 0);
            return {
              name: alertType,
              data: data,
              color: alertColors[index % alertColors.length]
            };
          });

          setChartMonths(monthsList);
          setChartSeries(seriesData);
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
        const endpoint = lastSelectedId 
          ? `/dtrs/meter-status?lastSelectedId=${lastSelectedId}`
          : '/dtrs/meter-status';
        
        const data = await apiClient.get(endpoint);
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

  // Refetch stats when lastSelectedId changes
  // useEffect(() => {

  //   if (lastSelectedId !== null) {
  //     retryStatsAPI();
  //   }
  // }, [lastSelectedId]);

  const handleExportData = async () => {
    try {
      // Show loading state or progress indicator
      console.log("Fetching complete data for export...");
      
      // Fetch all data from APIs
      const [fullDtrData, fullAlertsData] = await Promise.all([
        // Fetch all DTR data
        fetch(`${BACKEND_URL}/dtrs?page=1&pageSize=10000${lastSelectedId ? `&lastSelectedId=${lastSelectedId}` : ''}`)
          .then(response => {
            if (!response.ok) throw new Error("Failed to fetch full DTR data");
            return response.json();
          })
          .then(data => data.success ? data.data : [])
          .catch(err => {
            console.error("Error fetching full DTR data:", err);
            return dtrTableData; // Fallback to current data
          }),
        
        // Fetch all alerts data
        fetch(`${BACKEND_URL}/dtrs/alerts?limit=10000${lastSelectedId ? `&lastSelectedId=${lastSelectedId}` : ''}`)
          .then(response => {
            if (!response.ok) throw new Error("Failed to fetch full alerts data");
            return response.json();
          })
          .then(data => data.success ? data.data : [])
          .catch(err => {
            console.error("Error fetching full alerts data:", err);
            return alertsData; // Fallback to current data
          })
      ]);

      // Now create the Excel export with full data
      import("xlsx").then((XLSX) => {
        const workbook = XLSX.utils.book_new();
        
        // Create a comprehensive single sheet with all data
        const exportData: any[] = [];
        
        // 1. DTR Statistics
        exportData.push(["DTR Statistics", "", "", "", ""]);
        exportData.push(["Metric", "Value", "Description", "", ""]);
        
        dtrStatsCards.forEach((stat) => {
          exportData.push([
            stat.title,
            stat.value,
            stat.subtitle1 || "",
            "", ""
          ]);
        });
        
        exportData.push(["", "", "", "", ""]); // Empty row
        
        // 2. Consumption & Energies
        exportData.push([`Consumption & Energies (${selectedTimeRange})`, "", "", "", ""]);
        exportData.push(["Metric", "Value", "Description", "", ""]);
        
        const currentConsumptionCards = getCurrentConsumptionCards();
        currentConsumptionCards.forEach((card) => {
          exportData.push([
            card.title,
            card.value,
            card.subtitle1 || "",
            "", ""
          ]);
        });
        
        exportData.push(["", "", "", "", ""]); // Empty row
        
        // 3. Meter Communication Status
        exportData.push(["Meter Communication Status", "", "", "", ""]);
        exportData.push(["Status", "Count", "Percentage", "", ""]);
        
        const meterStatusData = transformMeterStatusData(meterStatus);
        const totalMeterCount = meterStatusData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
        
        meterStatusData.forEach((status: any) => {
          const percentage = totalMeterCount > 0 ? ((status.value / totalMeterCount) * 100).toFixed(2) + '%' : 'N/A';
          exportData.push([
            status.name || "N/A",
            status.value || 0,
            percentage,
            "", ""
          ]);
        });
        
        exportData.push(["", "", "", "", ""]); // Empty row
        
        // 4. DTR Alert Trends
        exportData.push(["DTR Alert Trends", "", "", "", ""]);
        
        // Create header row for alert trends
        const alertTrendsHeader = ["Month"];
        chartSeries.forEach((series) => {
          alertTrendsHeader.push(series.name);
        });
        exportData.push(alertTrendsHeader);
        
        // Add alert trends data
        chartMonths.forEach((month, monthIndex) => {
          const row = [month];
          chartSeries.forEach((series) => {
            row.push(String(series.data[monthIndex] || 0));
          });
          exportData.push(row);
        });
        
        exportData.push(["", "", "", "", ""]); // Empty row
        
        // 5. Latest Alerts (ALL ALERTS)
        exportData.push([`All Alerts (${fullAlertsData.length} records)`, "", "", "", ""]);
        exportData.push(["Alert ID", "Type", "Meter Number", "DTR Number", "Occurred On"]);
        
        fullAlertsData.forEach((alert: any) => {
          exportData.push([
            alert.alertId || "N/A",
            alert.type || "N/A",
            alert.feederName || "N/A",
            alert.dtrNumber || "N/A",
            alert.occuredOn || "N/A"
          ]);
        });
        
        exportData.push(["", "", "", "", ""]); // Empty row
        
        // 6. Distribution Transformers (ALL DTRs)
        exportData.push([`All Distribution Transformers (${fullDtrData.length} records)`, "", "", "", ""]);
        exportData.push(["DTR ID", "DTR Name", "Feeders Count", "Communication Status", "Last Communication"]);
        
        fullDtrData.forEach((dtr: any) => {
          exportData.push([
            dtr.dtrId || "N/A",
            dtr.dtrName || "N/A",
            dtr.feedersCount || "N/A",
            dtr.commStatus || "N/A",
            dtr.lastCommunication || "N/A"
          ]);
        });
        
        // Convert to worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(exportData);
        
        // Set column widths
        const colWidths = [
          { wch: 25 }, // Column A
          { wch: 20 }, // Column B
          { wch: 25 }, // Column C
          { wch: 20 }, // Column D
          { wch: 25 }  // Column E
        ];
        worksheet["!cols"] = colWidths;
        
        // Add the sheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, "DTR Dashboard Complete Data");
        
        // Generate and download the file
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
        link.download = `dtr-dashboard-complete-data-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log("Export completed successfully!");
      });
    } catch (error) {
      console.error("Error during export:", error);
      // You might want to show a user-friendly error message here
      alert("Failed to export data. Please try again.");
    }
  };

  const handleChartDownload = () => {
    exportChartData(chartMonths, chartSeries, "dtr-alerts-trends");
  };

  const handleViewDTR = (row: TableData) => {

    navigate(`/dtr-detail/${row.dtrId}`);
  };

  const handlePageChange = () => {
    retryTableAPI(undefined);
  };

  const handleSearch = () => {
    retryTableAPI(undefined);
  };

      const handleTimeRangeChange = (range: string) => {
      setSelectedTimeRange(range as "Daily" | "Monthly");
    };

  // Function to update filter options based on selection
  const updateFilterOptions = async (filterName: string, selectedValue: any) => {
    const name = selectedValue.target?.value || selectedValue;
    const value = selectedValue.target?.value || selectedValue;
    if (name === "all") return;

    try {

      
      const params = new URLSearchParams();
      params.append("parentId", value);
      
      const data = await apiClient.get(`/dtrs/filter/filter-options?${params.toString()}`);
      
      
      if (data.success) {
        const newOptions = data.data || [];

        // Update the appropriate filter options based on filterName
        // and reset dependent filters
        switch (filterName) {
          case "discom":

            setFilterOptions(prev => ({
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
              divisions: [{ value: "all", label: "All Divisions" }],
              subDivisions: [{ value: "all", label: "All Sub-Divisions" }],
              sections: [{ value: "all", label: "All Sections" }],
              meterLocations: [{ value: "all", label: "All Meter Locations" }],
            }));
            break;

          case "circle":

            setFilterOptions(prev => ({
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
              subDivisions: [{ value: "all", label: "All Sub-Divisions" }],
              sections: [{ value: "all", label: "All Sections" }],
              meterLocations: [{ value: "all", label: "All Meter Locations" }],
            }));
            break;

          case "division":

            setFilterOptions(prev => ({
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
              meterLocations: [{ value: "all", label: "All Meter Locations" }],
            }));
            break;

          case "subDivision":

            setFilterOptions(prev => ({
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
              meterLocations: [{ value: "all", label: "All Meter Locations" }],
            }));
            break;

          case "section":

            setFilterOptions(prev => ({
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
        error
      );
    }
  };

  // Filter change handlers
  const handleFilterChange = async (
    filterName: string,
    value: string | { target: { value: string } }
  ) => {


    // Handle both string and event object cases
    const selectedValue =
      typeof value === "string" ? value : value.target.value;

    setFilterValues((prev) => ({
      ...prev,
      [filterName]: selectedValue,
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
    
    setLastSelectedId(lastId);

    
    try {
      const params = new URLSearchParams();
      Object.entries(filterValues).forEach(([key, value]) => {
        if (value !== "all") {
          params.append(key, value);
        }
      });



      // Refresh data with new filters
      retryStatsAPI(lastId || undefined);
      retryTableAPI(lastId || undefined);
      retryAlertsAPI(lastId || undefined);
      retryChartAPI(lastId || undefined);
    } catch (error) {
      console.error("Error applying filters:", error);
    }
  };

  // DTR statistics cards data - Using API data
  const dtrStatsCards = [
    {
      title: "Total DTRs",
      value: dtrStatsData.totalDtrs || dtrStatsData?.row1?.totalDtrs || "0",
      icon: "icons/dtr.svg",
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
        "0",
      icon: "icons/feeder.svg",
      subtitle1: "Connected to DTRs",
      onValueClick: () =>
        navigate("/dtr-table?type=total-lt-feeders&title=Total%20LT%20Feeders"),
      loading: isStatsLoading,
    },
    {
      title: "Total Fuse Blown",
      value:
        dtrStatsData.totalFuseBlown ||
        dtrStatsData?.row1?.totalFuseBlown ||
        "0",
      icon: "icons/power_failure.svg",
      subtitle1: `${
        dtrStatsData.fuseBlownPercentage ||
        dtrStatsData?.row1?.fuseBlownPercentage ||
        "0"
      }% of Total DTRs`,
      onValueClick: () =>
        navigate("/dtr-table?type=fuse-blown&title=Today%27s%20Fuse%20Blown"),
      loading: isStatsLoading,
    },
    {
      title: "Overloaded DTRs",
      value:
        dtrStatsData.overloadedFeeders ||
        dtrStatsData?.row1?.overloadedFeeders ||
        0,
      icon: "icons/dtr.svg",
      subtitle1: (() => {
        const count = dtrStatsData.overloadedFeeders || dtrStatsData?.row1?.overloadedFeeders || 0;
        if (count === 0) {
          return "No DTRs with load > 90%";
        }
        return `${dtrStatsData.overloadedPercentage || dtrStatsData?.row1?.overloadedPercentage || 0}% of Total Feeders`;
      })(),
      onValueClick: () =>
        navigate(
          "/dtr-table?type=overloaded-feeders&title=Overloaded%20Feeders"
        ),
      loading: isStatsLoading,
    },
    {
      title: "Underloaded DTRs",
      value:
        dtrStatsData.underloadedFeeders ||
        dtrStatsData?.row1?.underloadedFeeders ||
        0,
      icon: "icons/dtr.svg",
      subtitle1: (() => {
        const count = dtrStatsData.underloadedFeeders || dtrStatsData?.row1?.underloadedFeeders || 0;
        if (count === 0) {
          return "No DTRs with load < 30%";
        }
        return `${dtrStatsData.underloadedPercentage || dtrStatsData?.row1?.underloadedPercentage || 0}% of Total Feeders`;
      })(),
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
        "0",
      icon: "icons/power_failure.svg",
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
        "0",
      icon: "icons/dtr.svg",
      subtitle1: `${
        dtrStatsData.unbalancedPercentage ||
        dtrStatsData?.row1?.unbalancedPercentage ||
        "0"
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
        "0",
      icon: "icons/power_failure.svg",
      subtitle1: `${
        dtrStatsData.powerFailurePercentage ||
        dtrStatsData?.row1?.powerFailurePercentage ||
        "0"
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
        "0",
      icon: "icons/dtr.svg",
      subtitle1: "Incidents Today",
      onValueClick: () =>
        navigate(
          "/dtr-table?type=ht-fuse-blown&title=HT%20Side%20Fuse%20Blown"
        ),
      loading: isStatsLoading,
    },
  ];

  // DTR Consumption Cards - Daily data - Commented out as not currently used
  /*
  const dailyConsumptionCards = [
    {
      title: "Total kWh",
      value: String(dtrConsumptionData.daily.totalKwh || "0"),
      icon: "icons/energy.svg",
      subtitle1: "Today's Active Energy",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=daily-kwh&title=Total%20kWh%20(Today)"),
    },
    {
      title: "Total kVAh",
      value: String(dtrConsumptionData.daily.totalKvah || "0"),
      icon: "icons/energy.svg",
      subtitle1: "Today's Apparent Energy",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=daily-kvah&title=Total%20kVAh%20(Today)"),
    },
    {
      title: "Total kW",
      value: String(dtrConsumptionData.daily.totalKw || "0"),
      icon: "icons/energy.svg",
      subtitle1: "Current Active Power",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=daily-kw&title=Total%20kW%20(Current)"),
    },
    {
      title: "Total kVA",
      value: String(dtrConsumptionData.daily.totalKva || "0"),
      icon: "icons/energy.svg",
      subtitle1: "Current Apparent Power",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=daily-kva&title=Total%20kVA%20(Current)"),
    },
    {
      title: "Active DTRs",
      value: Number(dtrStatsData?.activeDtrs || "0"),
      icon: "icons/dtr.svg",
      subtitle1: `${dtrStatsData?.activePercentage ?? "0"}% of Total DTRs`,
      iconStyle: FILTER_STYLES.WHITE, // White icon for Active DTRs
      bg: "bg-[var(--color-secondary)]",
      loading: isStatsLoading,
    },
    {
      title: "In-Active DTRs",
      value: Number(dtrStatsData?.inactiveDtrs || "0"),
      icon: "icons/dtr.svg",
      subtitle1: `${dtrStatsData?.inactivePercentage ?? "0"}% of Total DTRs`,
      iconStyle: FILTER_STYLES.WHITE, // White icon for In-Active DTRs
      bg: "bg-[var(--color-danger)]",
      loading: isStatsLoading,
    },
  ];
  */

  // DTR Consumption Cards - Monthly data
  const monthlyConsumptionCards = [
    {
      title: "Total kWh",
      value: String(dtrConsumptionData.monthly.totalKwh || "0"),
      icon: "icons/consumption.svg",
      subtitle1: "Monthly Active Energy",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=monthly-kwh&title=Total%20kWh%20(Monthly)"),
    },
    {
      title: "Total kVAh",
      value: String(dtrConsumptionData.monthly.totalKvah || "0"),
      icon: "icons/consumption.svg",
      subtitle1: "Monthly Apparent Energy",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=monthly-kvah&title=Total%20kVAh%20(Monthly)"),
    },
    {
      title: "Avg kW",
      value: String(dtrConsumptionData.monthly.totalKw || "0"),
      icon: "icons/consumption.svg",
      subtitle1: "Monthly Average Power",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=monthly-kw&title=Avg%20kW%20(Monthly)"),
    },
    {
      title: "Avg kVA",
      value: String(dtrConsumptionData.monthly.totalKva || "0"),
      icon: "icons/consumption.svg",
      subtitle1: "Monthly Average Apparent",
      bg: "bg-stat-icon-gradient",
      loading: isStatsLoading,
      onValueClick: () =>
        navigate("/dtr-table?type=monthly-kva&title=Avg%20kVA%20(Monthly)"),
    },
    {
      title: "Active DTRs",
      value: Number(dtrStatsData?.activeDtrs || "0"),
      icon: "icons/dtr.svg",
      subtitle1: `${dtrStatsData?.activePercentage ?? "0"}% of Total DTRs`,
      iconStyle: FILTER_STYLES.WHITE, // White icon for Active DTRs
      bg: "bg-[var(--color-secondary)]",
      loading: isStatsLoading,
    },
    {
      title: "In-Active DTRs",
      value: Number(dtrStatsData?.inactiveDtrs || "0"),
      icon: "icons/dtr.svg",
      subtitle1: `${dtrStatsData?.inactivePercentage ?? "0"}% of Total DTRs`,
      iconStyle: FILTER_STYLES.WHITE, // White icon for In-Active DTRs
      bg: "bg-[var(--color-danger)]",
      loading: isStatsLoading,
    },
  ];

      // Get current consumption cards data based on selected time range
    const getCurrentConsumptionCards = () => {
      if (selectedTimeRange === "Daily") {
        // For daily, use currentDay data if available, otherwise fall back to daily
        const currentDayData = dtrConsumptionData.currentDay || dtrConsumptionData.daily;
      return [
        {
          title: "Total kWh",
          value: String(currentDayData.totalKwh || "0"),
          icon: "icons/energy.svg",
          subtitle1: "Today's Active Energy",
          bg: "bg-stat-icon-gradient",
          loading: isStatsLoading,
          onValueClick: () =>
            navigate("/dtr-table?type=daily-kwh&title=Total%20kWh%20(Today)"),
        },
        {
          title: "Total kVAh",
          value: String(currentDayData.totalKvah || "0"),
          icon: "icons/energy.svg",
          subtitle1: "Today's Apparent Energy",
          bg: "bg-stat-icon-gradient",
          loading: isStatsLoading,
          onValueClick: () =>
            navigate("/dtr-table?type=daily-kvah&title=Total%20kVAh%20(Today)"),
        },
        {
          title: "Total kW",
          value: String(currentDayData.totalKw || "0"),
          icon: "icons/energy.svg",
          subtitle1: "Current Active Power",
          bg: "bg-stat-icon-gradient",
          loading: isStatsLoading,
          onValueClick: () =>
            navigate("/dtr-table?type=daily-kw&title=Total%20kW%20(Current)"),
        },
        {
          title: "Total kVA",
          value: String(currentDayData.totalKva || "0"),
          icon: "icons/energy.svg",
          subtitle1: "Current Apparent Power",
          bg: "bg-stat-icon-gradient",
          loading: isStatsLoading,
          onValueClick: () =>
            navigate("/dtr-table?type=daily-kva&title=Total%20kVA%20(Current)"),
        },
        {
          title: "Active DTRs",
          value: Number(dtrStatsData?.activeDtrs || "0"),
          icon: "icons/dtr.svg",
          subtitle1: `${dtrStatsData?.activePercentage ?? "0"}% of Total DTRs`,
          iconStyle: FILTER_STYLES.WHITE,
          bg: "bg-[var(--color-secondary)]",
          loading: isStatsLoading,
        },
        {
          title: "In-Active DTRs",
          value: Number(dtrStatsData?.inactiveDtrs || "0"),
          icon: "icons/dtr.svg",
          subtitle1: `${dtrStatsData?.inactivePercentage ?? "0"}% of Total DTRs`,
          iconStyle: FILTER_STYLES.WHITE,
          bg: "bg-[var(--color-danger)]",
          loading: isStatsLoading,
        },
      ];
          } else {
        // For monthly, use monthly data
        return monthlyConsumptionCards;
      }
  };

  // Dummy data for DTRs table
  const dtrTableColumns = [
    { key: "dtrId", label: "DTR ID" },
    { key: "dtrName", label: "DTR Name" },
    { key: "feedersCount", label: "Feeders Count" },
    { key: "Meter Location", label: "Meter Location" },
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
    { key: "alertId", label: "Alert ID" },
    { key: "type", label: "Type" },
    { key: "feederName", label: "Meter Number" },
    { key: "dtrNumber", label: "DTR Number" },
    { key: "occuredOn", label: "Occured On" },
   // { key: "status", label: "Status" },
  ];

  return (
    <div className="overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                  backButtonText:'',
                  onClick: () => handleExportData(),
                  showMenu: true,
                  showDropdown: true,
                  menuItems: [
                    { id: "all", label: "Alerts" },
                    { id: "export", label: "Export" },
                  ],
                  onMenuItemClick: (_itemId: string) => {
                    // Handle menu item click if needed
                  },
                },
              },
            ],
          },
          // Filter Section
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
                  options: [...filterOptions.discoms],
                  value: filterValues.discom,
                  onChange: (value: string) =>
                    handleFilterChange("discom", value),
                  placeholder: "Select DISCOM",
                  loading: isFiltersLoading,
                  searchable: false,
                },
              },
              {
                name: "Dropdown",
                props: {
                  options: [...filterOptions.circles],
                  value: filterValues.circle,
                  onChange: (value: string) =>
                    handleFilterChange("circle", value),
                  placeholder: "Select Circle",
                  loading: isFiltersLoading,
                  searchable: false,
                },
              },
              {
                name: "Dropdown",
                props: {
                  options: [...filterOptions.divisions],
                  value: filterValues.division,
                  onChange: (value: string) =>
                    handleFilterChange("division", value),
                  placeholder: "Select Division",
                  loading: isFiltersLoading,
                  searchable: false,
                },
              },
              {
                name: "Dropdown",
                props: {
                  options: [...filterOptions.subDivisions],
                  value: filterValues.subDivision,
                  onChange: (value: string) =>
                    handleFilterChange("subDivision", value),
                  placeholder: "Select Sub-Division",
                  loading: isFiltersLoading,
                  searchable: false,
                },
              },
              {
                name: "Dropdown",
                props: {
                  options: [...filterOptions.sections],
                  value: filterValues.section,
                  onChange: (value: string) =>
                    handleFilterChange("section", value),
                  placeholder: "Select Section",
                  loading: isFiltersLoading,
                  searchable: false,
                },
              },
              {
                name: "Dropdown",
                props: {
                  options: [...filterOptions.meterLocations],
                  value: filterValues.meterLocation,
                  onChange: (value: string) =>
                    handleFilterChange("meterLocation", value),
                  placeholder: "Select Meter Location",
                  loading: isFiltersLoading,
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
                  searchable: false
                },
                align: "center",
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
                        title: "Consumption & Energies",
                        titleLevel: 2,
                        titleSize: "md",
                        titleVariant: "primary",
                        titleWeight: "medium",
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
                      " rounded-3xl  dark:bg-primary-dark-light",
                    columns: [
                   
                      {
                        name: "PieChart",
                        props: {
                          data: transformMeterStatusData(meterStatus),
                          height: 330,
                          showLegend: false,
                          showNoDataMessage: false, 
                          showDownloadButton: true,
                          enableHover:false,
                          availableTimeRanges: [],  
                          className: "",
                             showHeader:true,
                             headerTitle:"Communication Status",
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
                 
                ],
              },
            },
          {
            layout: {
              type: "grid" as const,
              className: "",
              columns: 2,
            },
            components: [
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
                span:{col:2,row:1}
              },
            ],
          },
        
          // // Latest Alerts section
          {
            layout: {
              type: "grid" as const,
              className: "",
              columns: 2,
            },
            components: [
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
                span: { col: 2, row: 1 },
              },
            ],
          },
        ]}
      />
    </div>
  );
};

export default DTRDashboard;
