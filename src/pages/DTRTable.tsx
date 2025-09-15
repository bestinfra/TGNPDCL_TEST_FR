import { lazy } from 'react';
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BACKEND_URL from '../config';
//import { exportAssetManagementMetersData } from '../utils/excelExport';
const Page = lazy(() => import('SuperAdmin/Page'));

// Define TableData type locally since we're using federated components
interface TableData {
  [key: string]: string | number | boolean | null | undefined;
}

const DTRTable: React.FC = () => {
  const navigate = useNavigate();
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardType, setCardType] = useState<string>('total-dtrs');
  const [cardTitle, setCardTitle] = useState<string>('DTR Management');
  const [serverPagination, setServerPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });
  // Removed hasRealData state to prevent delays

  // Helper function to safely set table data
  const safeSetTableData = (data: TableData[]) => {
    console.log(`[DTRTable] safeSetTableData called - dataLength: ${data.length}`);
    console.log(`[DTRTable] Sample data:`, data.slice(0, 2));
    console.log(`[DTRTable] Current tableData length before update:`, tableData.length);
    
    // Set table data directly from API response
    if (data && data.length > 0) {
      console.log(`[DTRTable] Setting table data with ${data.length} items`);
      setTableData(data);
    } else {
      console.log(`[DTRTable] Setting empty table data - API returned no data`);
      setTableData([]);
    }
  };


  // Check URL parameters to determine which card was clicked
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const title = urlParams.get('title');
    // Removed debugging logs for performance
    if (type) {
      setCardType(type);
    }
    if (title) {
      setCardTitle(decodeURIComponent(title));
    }
  }, []);

  // Dynamic table columns based on card type
  const getTableColumns = () => {
    switch (cardType) {
      case 'total-dtrs':
        return [
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'feedersCount', label: 'Feeders Count' },
          {
            key: 'commStatus',
            label: 'Communication-Status',
            statusIndicator: {},
            isActive: (value: string | number | boolean | null | undefined) =>
              String(value).toLowerCase() === "active",
          },
          { key: 'lastCommunication', label: 'Last Communication' },
        ];
      case 'total-lt-feeders':
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'meterSerialNumber', label: 'Meter Number' },
          { key: 'modemSerialNumber', label: 'Modem Serial Number' },
          { key: 'meterType', label: 'Meter Type' },
          { key: 'meterMake', label: 'Meter Make' },
          { key: 'location', label: 'Location' },
          { key: 'installationDate', label: 'Installation Date' },
        ];
      case 'fuse-blown':
      case 'lt-fuse-blown':
      case 'ht-fuse-blown':
        return [
          { key: 'slNo', label: 'S.No' },
          { key: 'meterNo', label: 'Meter Number' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'location', label: 'Location' },
          { key: 'fuseType', label: 'Fuse Type' },
          { key: 'blownTime', label: 'Blown Time' },
          { key: 'lastReadingDate', label: 'Last Reading Date' },
        ];
      case 'overloaded-feeders':
        return [
          { key: 'slNo', label: 'S.No' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'manufacturer', label: 'Manufacturer' },
          { key: 'model', label: 'Model' },
          { key: 'capacity', label: 'Capacity' },
          { key: 'loadPercentage', label: 'Load %' },
          { key: 'feedersCount', label: 'Feeders Count' },
          { key: 'location', label: 'Location' },
          { key: 'status', label: 'Status' },
        ];
      case 'underloaded-feeders':
        return [
          { key: 'slNo', label: 'S.No' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'manufacturer', label: 'Manufacturer' },
          { key: 'model', label: 'Model' },
          { key: 'capacity', label: 'Capacity' },
          { key: 'loadPercentage', label: 'Load %' },
          { key: 'feedersCount', label: 'Feeders Count' },
          { key: 'location', label: 'Location' },
          { key: 'status', label: 'Status' },
        ];
      case 'unbalanced-dtrs':
        return [
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'phaseA', label: 'Phase A (A)' },
          { key: 'phaseB', label: 'Phase B (A)' },
          { key: 'phaseC', label: 'Phase C (A)' },
          { key: 'imbalance', label: 'Imbalance %' },
          { key: 'location', label: 'Location' },
        ];
      case 'power-failure-feeders':
        return [
          { key: 'feederId', label: 'Feeder ID' },
          { key: 'feederName', label: 'Feeder Name' },
          { key: 'failureTime', label: 'Failure Time' },
          { key: 'affectedConsumers', label: 'Affected Consumers' },
          { key: 'estimatedRestoration', label: 'Est. Restoration' },
          { key: 'location', label: 'Location' },
        ];
      case 'daily-kwh':
      case 'monthly-kwh':
        return [
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'kwh', label: 'kWh Reading' },
          { key: 'previousReading', label: 'Previous Reading' },
          { key: 'consumption', label: 'Consumption' },
          { key: 'location', label: 'Location' },
          { key: 'timestamp', label: 'Timestamp' },
        ];
      case 'daily-kvah':
      case 'monthly-kvah':
        return [
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'kvah', label: 'kVAh Reading' },
          { key: 'previousReading', label: 'Previous Reading' },
          { key: 'consumption', label: 'Consumption' },
          { key: 'location', label: 'Location' },
          { key: 'timestamp', label: 'Timestamp' },
        ];
      case 'daily-kw':
      case 'monthly-kw':
        return [
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'kw', label: 'kW Reading' },
          { key: 'powerFactor', label: 'Power Factor' },
          { key: 'location', label: 'Location' },
          { key: 'timestamp', label: 'Timestamp' },
        ];
      case 'daily-kva':
      case 'monthly-kva':
        return [
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'kva', label: 'kVA Reading' },
          { key: 'powerFactor', label: 'Power Factor' },
          { key: 'location', label: 'Location' },
          { key: 'timestamp', label: 'Timestamp' },
        ];
      default:
        return [
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'feedersCount', label: 'Feeders Count' },
          {
            key: 'commStatus',
            label: 'Communication-Status',
            statusIndicator: {},
            isActive: (value: string | number | boolean | null | undefined) =>
              String(value).toLowerCase() === "active",
          },
          { key: 'lastCommunication', label: 'Last Communication' },
        ];
    }
  };

  // Fetch data based on card type using the actual DTR API
  const fetchData = useCallback(
    async (page: number = 1, pageSize: number = 10, search?: string) => {
      setLoading(true);
      try {
        // Skip widget count validation to avoid unnecessary API calls
        console.log(`[DTRTable] Fetching data for ${cardType}...`);
  
        let url = "";
        const params = new URLSearchParams();
  
        // Always attach pagination params
        params.append("page", page.toString());
        params.append("pageSize", pageSize.toString());
        if (search) params.append("search", search);
  
        // 🔹 Build URL based on cardType
        switch (cardType) {
          case "total-dtrs":
            url = `${BACKEND_URL}/dtrs?${params.toString()}`;
            break;
  
          case "total-lt-feeders":
            url = `${BACKEND_URL}/meters?page=${page}&limit=${pageSize}`;
            break;
  
          case "fuse-blown":
            url = `${BACKEND_URL}/dtrs/fuse-blown-meters?${params.toString()}`;
            break;
  
          case "overloaded-feeders":
            url = `${BACKEND_URL}/dtrs/overloaded-dtrs?${params.toString()}`;
            break;
  
          case "underloaded-feeders":
            url = `${BACKEND_URL}/dtrs/underloaded-dtrs?${params.toString()}`;
            break;
  
          case "ht-fuse-blown":
            url = `${BACKEND_URL}/dtrs/ht-fuse-blown`;
            break;
  
          case "lt-fuse-blown":
            url = `${BACKEND_URL}/dtrs/lt-fuse-blown`;
            break;
  
          case "unbalanced-dtrs":
            url = `${BACKEND_URL}/dtrs/unbalanced-dtrs`;
            break;
  
          case "power-failure-feeders":
            url = `${BACKEND_URL}/dtrs/power-failure-feeders`;
            break;
  
          // 🔹 For charts/analytics-only cards, no backend call
          case "daily-kwh":
          case "monthly-kwh":
          case "daily-kvah":
          case "monthly-kvah":
          case "daily-kw":
          case "monthly-kw":
          case "daily-kva":
          case "monthly-kva":
            console.log(`[DTRTable] ${cardType} has no backend endpoint, showing empty`);
            safeSetTableData([]);
            setServerPagination({
              currentPage: 1,
              totalPages: 1,
              totalCount: 0,
              limit: pageSize,
              hasNextPage: false,
              hasPrevPage: false,
            });
            setError(null);
            setLoading(false);
            return;
  
          default:
            throw new Error(`Unsupported card type: ${cardType}`);
        }
  
        console.log(`[DTRTable] Fetching data for ${cardType} from: ${url}`);
  
        // 🔹 Fetch
        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) throw new Error(`Failed to fetch data for ${cardType}`);
  
        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          throw new Error("Invalid response format");
        }
  
        const data = await response.json();
        console.log(`[DTRTable] ${cardType} response:`, data);
  
        if (data.success) {
          safeSetTableData(data.data || []);
  
          // Normalize pagination
          const paginationData = data.pagination || data;
          setServerPagination({
            currentPage: paginationData.currentPage || paginationData.page || 1,
            totalPages: paginationData.totalPages || Math.ceil((paginationData.total || 0) / (paginationData.pageSize || pageSize)),
            totalCount: paginationData.totalCount || paginationData.total || 0,
            limit: paginationData.limit || paginationData.pageSize || pageSize,
            hasNextPage: paginationData.hasNextPage || false,
            hasPrevPage: paginationData.hasPrevPage || false,
          });
  
          setError(null);
        } else {
          throw new Error(data.message || `Failed to fetch data for ${cardType}`);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch data. Please try again.");
        console.error(`❌ Error fetching ${cardType}:`, err);
      } finally {
        setLoading(false);
      }
    },
    [cardType]
  );
  


  useEffect(() => {
    // Reset table data when card type changes
    console.log(`[DTRTable] useEffect triggered for cardType: ${cardType}`);
    console.log(`[DTRTable] Resetting table data to empty array`);
    
    // Force clear all data immediately
    setTableData([]);
    setLoading(true);
    setError(null);
    
    // Reset pagination
    setServerPagination({
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      limit: 10,
      hasNextPage: false,
      hasPrevPage: false,
    });
    
    // Fetch new data
    fetchData();
    
    // Cleanup function to prevent race conditions
    return () => {
      setTableData([]);
      setLoading(false);
      setError(null);
    };
  }, [cardType, fetchData]);

  // Monitor tableData changes
  useEffect(() => {
    // Removed debugging logs for performance
  }, [tableData]);

  // Handle row actions
  const handleView = (row: TableData) => {
    // Navigate to detail view based on card type
    if (cardType === 'total-dtrs' && row.dtrId) {
      navigate(`/dtr-detail/${row.dtrId}`);
    } else if (cardType === 'total-lt-feeders' && row.meterSerialNumber) {
      // Navigate to meter detail or search for meter
      navigate(`/meters?search=${row.meterSerialNumber}`);
                              } else if (cardType === 'fuse-blown' && row.meterNo) {
                            // Navigate to meter detail or search for meter
                            navigate(`/meters?search=${row.meterNo}`);
                                                    } else if (cardType === 'overloaded-feeders' && row.dtrId) {
                            // Navigate to DTR detail
                            navigate(`/dtr-detail/${row.dtrId}`);
                          } else if (cardType === 'underloaded-feeders' && row.dtrId) {
                            // Navigate to DTR detail
                            navigate(`/dtr-detail/${row.dtrId}`);
                          }
  };

  const handleEdit = (_row: TableData) => {
    // Navigate to edit form
    // navigate(`/edit/${row.id}`);
  };

  const handlePageChange = (page: number) => {
    fetchData(page, serverPagination.limit);
  };

  const handleSearch = (searchTerm: string) => {
    fetchData(1, serverPagination.limit, searchTerm);
  };

  // Handle Export button click
  // const handleExportData = () => {
  //   if (tableData.length > 0) {
  //     exportAssetManagementMetersData(tableData);
  //   } else {
  //     console.warn("No data available to export");
  //   }
  // };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Page
        sections={[
          // Error Section (show when there are errors)
          ...(error
            ? [
              {
                layout: {
                  type: 'column' as const,
                  gap: 'gap-4',
                  rows: [
                    {
                      layout: 'column' as const,
                      columns: [
                        {
                          name: 'Error',
                          props: {
                            visibleErrors: error ? [error] : [],
                            showRetry: true,
                            onRetry: () => fetchData(),
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ]
            : []),
          // Page Header Section
          {
            layout: {
              type: 'column' as const,
              gap: 'gap-4',
              rows: [
                {
                  layout: 'row' as const,
                  columns: [
                    {
                      name: 'PageHeader',
                      props: {
                        title: cardTitle,
                        onBackClick: () => navigate('/dtr-dashboard'),
                        backButtonText: 'Back to Dashboard',
                        buttonsLabel: cardType === 'total-lt-feeders' ? 'Export' : 'Add New',
                        variant: 'primary',
                        onClick: cardType === 'total-lt-feeders' ? undefined : undefined,
                      },
                    },
                  ],
                },
              ],
            },
          },
          // Table Section
          {
            layout: {
              type: 'column' as const,
              gap: 'gap-4',
              rows: [
                {
                  layout: 'column' as const,
                  columns: [
                    {
                        name: 'Table',
                        key: cardType, // Force re-render when cardType changes
                        props: {
                          data: (() => {
                            console.log(`[DTRTable] Rendering table with data:`, tableData);
                            console.log(`[DTRTable] Data length:`, tableData.length);
                            console.log(`[DTRTable] Card type:`, cardType);
                            return tableData;
                          })(),
                        columns: getTableColumns(),
                        loading: loading,
                        searchable: true,
                        sortable: true,
                        pagination: true,
                        showHeader: true,
                        showActions: !['daily-kwh', 'monthly-kwh', 'daily-kvah', 'monthly-kvah', 'daily-kw', 'monthly-kw', 'daily-kva', 'monthly-kva'].includes(cardType),
                        onView: ['daily-kwh', 'monthly-kwh', 'daily-kvah', 'monthly-kvah', 'daily-kw', 'monthly-kw', 'daily-kva', 'monthly-kva'].includes(cardType) ? undefined : handleView,
                        onEdit: ['daily-kwh', 'monthly-kwh', 'daily-kvah', 'monthly-kvah', 'daily-kw', 'monthly-kw', 'daily-kva', 'monthly-kva'].includes(cardType) ? undefined : handleEdit,
                        onRowClick: ['daily-kwh', 'monthly-kwh', 'daily-kvah', 'monthly-kvah', 'daily-kw', 'monthly-kw', 'daily-kva', 'monthly-kva'].includes(cardType) ? undefined : (row: TableData) => {
                          if (cardType === 'total-dtrs' && row.dtrId) {
                            navigate(`/dtr-detail/${row.dtrId}`);
                          } else if (cardType === 'total-lt-feeders' && row.meterSerialNumber) {
                            // Navigate to meter detail or search for meter
                            navigate(`/meters?search=${row.meterSerialNumber}`);
                          } else if (cardType === 'fuse-blown' && row.meterNo) {
                            // Navigate to meter detail or search for meter
                            navigate(`/meters?search=${row.meterNo}`);
                          } else if (cardType === 'overloaded-feeders' && row.dtrId) {
                            navigate(`/dtr-detail/${row.dtrId}`);
                          } else if (cardType === 'underloaded-feeders' && row.dtrId) {
                            navigate(`/dtr-detail/${row.dtrId}`);
                          }
                        },
                        text: cardTitle,
                        availableTimeRanges: [],
                        className: 'w-full',
                        emptyMessage: ['daily-kwh', 'monthly-kwh', 'daily-kvah', 'monthly-kvah', 'daily-kw', 'monthly-kw', 'daily-kva', 'monthly-kva'].includes(cardType)
                          ? 'Consumption data table is not available. This feature is under development.'
                          : cardType === 'ht-fuse-blown' 
                          ? 'No HT side fuse blown incidents found. This indicates all DTRs have healthy voltage levels.' 
                          : cardType === 'lt-fuse-blown'
                          ? 'No LT side fuse blown incidents found. All LT feeders are operating normally.'
                          : cardType === 'unbalanced-dtrs'
                          ? 'No unbalanced DTRs found. All transformers have balanced load distribution.'
                          : cardType === 'power-failure-feeders'
                          ? 'No power failure incidents found. All feeders are operating normally.'
                          : `No ${cardTitle.toLowerCase()} data found`,
                        rowsPerPageOptions: [10, 25, 50],
                        initialRowsPerPage: 10,
                        showSkeletonActionButtons: true,
                        onPageChange: handlePageChange,
                        onSearch: handleSearch,
                        serverPagination: serverPagination,
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
};

export default DTRTable;
