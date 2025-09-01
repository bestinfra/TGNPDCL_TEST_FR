import { lazy } from 'react';
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BACKEND_URL from '../config';
const Page = lazy(() => import('SuperAdmin/Page'));

// Define TableData type locally since we're using federated components
interface TableData {
  [key: string]: string | number | boolean | null | undefined;
}

const DTRTable: React.FC = () => {
  const navigate = useNavigate();
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [hasRealData, setHasRealData] = useState(false);

  // Check URL parameters to determine which card was clicked
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const title = urlParams.get('title');
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
          { key: 'slNo', label: 'S.No' },
          { key: 'meterNo', label: 'Meter Number' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'location', label: 'Location' },
          {
            key: 'communicationStatus',
            label: 'Communication Status',
            statusIndicator: {},
            isActive: (value: string | number | boolean | null | undefined) =>
              String(value).toLowerCase() === "active" || String(value).toLowerCase() === "communicating",
          },
          { key: 'lastCommunicationDate', label: 'Last Communication' },
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
  const fetchData = useCallback(async (page: number = 1, pageSize: number = 10, search?: string) => {
    setLoading(true);
    try {
      // Use the same API endpoint as DTRDashboard for total-dtrs
      if (cardType === 'total-dtrs') {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("pageSize", pageSize.toString());
        
        if (search) {
          params.append("search", search);
        }

        const response = await fetch(`${BACKEND_URL}/dtrs?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch DTR table");

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format");
        }

        const data = await response.json();
        if (data.success) {
          setTableData(data.data || []);
          // Handle both pagination structures (backend returns 'pagination' object)
          const paginationData = data.pagination || data;
          setServerPagination({
            currentPage: paginationData.currentPage || paginationData.page || 1,
            totalPages: paginationData.totalPages || Math.ceil(paginationData.total / paginationData.pageSize) || 1,
            totalCount: paginationData.totalCount || paginationData.total || 0,
            limit: paginationData.limit || paginationData.pageSize || 10,
            hasNextPage: paginationData.hasNextPage || false,
            hasPrevPage: paginationData.hasPrevPage || false,
          });
          
          // Also set the page and total for backward compatibility
          if (data.pagination) {
            data.page = paginationData.currentPage;
            data.total = paginationData.totalCount;
            data.pageSize = paginationData.limit;
            data.hasNextPage = paginationData.hasNextPage;
            data.hasPrevPage = paginationData.hasPrevPage;
          }
          setError(null);
        } else {
          throw new Error(data.message || "Failed to fetch DTR table");
        }
      } else if (cardType === 'total-lt-feeders') {
        // Use the all-meters endpoint for LT feeders
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("pageSize", pageSize.toString());
        
        if (search) {
          params.append("search", search);
        }

        const response = await fetch(`${BACKEND_URL}/dtrs/all-meters?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch meters data");

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format");
        }

        const data = await response.json();
        if (data.success) {
          setTableData(data.data || []);
          // Handle pagination structure
          const paginationData = data.pagination || data;
          setServerPagination({
            currentPage: paginationData.currentPage || paginationData.page || 1,
            totalPages: paginationData.totalPages || Math.ceil(paginationData.total / paginationData.pageSize) || 1,
            totalCount: paginationData.totalCount || paginationData.total || 0,
            limit: paginationData.limit || paginationData.pageSize || 10,
            hasNextPage: paginationData.hasNextPage || false,
            hasPrevPage: paginationData.hasPrevPage || false,
          });
          
          // Also set the page and total for backward compatibility
          if (data.pagination) {
            data.page = paginationData.currentPage;
            data.total = paginationData.totalCount;
            data.pageSize = paginationData.limit;
            data.hasNextPage = paginationData.hasNextPage;
            data.hasPrevPage = paginationData.hasPrevPage;
          }
          setError(null);
        } else {
          throw new Error(data.message || "Failed to fetch meters data");
        }
      } else if (cardType === 'fuse-blown') {
        // Use the fuse-blown-meters endpoint for fuse blown meters
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("pageSize", pageSize.toString());
        
        if (search) {
          params.append("search", search);
        }

        const response = await fetch(`${BACKEND_URL}/dtrs/fuse-blown-meters?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch fuse blown meters data");

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format");
        }

        const data = await response.json();
        if (data.success) {
          setTableData(data.data || []);
          // Handle pagination structure
          const paginationData = data.pagination || data;
          setServerPagination({
            currentPage: paginationData.currentPage || paginationData.page || 1,
            totalPages: paginationData.totalPages || Math.ceil(paginationData.total / paginationData.pageSize) || 1,
            totalCount: paginationData.totalCount || paginationData.total || 0,
            limit: paginationData.limit || paginationData.pageSize || 10,
            hasNextPage: paginationData.hasNextPage || false,
            hasPrevPage: paginationData.hasPrevPage || false,
          });
          
          // Also set the page and total for backward compatibility
          if (data.pagination) {
            data.page = paginationData.currentPage;
            data.total = paginationData.totalCount;
            data.pageSize = paginationData.limit;
            data.hasNextPage = paginationData.hasNextPage;
            data.hasPrevPage = paginationData.hasPrevPage;
          }
          setError(null);
        } else {
          throw new Error(data.message || "Failed to fetch fuse blown meters data");
        }
      } else if (cardType === 'overloaded-feeders') {
        // Use the overloaded-dtrs endpoint for overloaded DTRs
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("pageSize", pageSize.toString());
        
        if (search) {
          params.append("search", search);
        }

        console.log('🔍 Fetching overloaded DTRs...');
        const response = await fetch(`${BACKEND_URL}/dtrs/overloaded-dtrs?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch overloaded DTRs data");

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format");
        }

        const data = await response.json();
        console.log('📊 API Response for overloaded DTRs:', data);
        console.log('📊 Data array length:', data.data?.length || 0);
        
        if (data.success) {
          console.log('✅ Setting table data to:', data.data || []);
          setTableData(data.data || []);
          console.log('📊 Current tableData state after setTableData:', data.data || []);
          
          // Additional safety check - ensure tableData is empty if API returns empty
          if (!data.data || data.data.length === 0) {
            console.log('🔒 Force setting tableData to empty array');
            setTableData([]);
          }
          
          // Handle pagination structure
          const paginationData = data.pagination || data;
          setServerPagination({
            currentPage: paginationData.currentPage || paginationData.page || 1,
            totalPages: paginationData.totalPages || Math.ceil(paginationData.total / paginationData.pageSize) || 1,
            totalCount: paginationData.totalCount || paginationData.total || 0,
            limit: paginationData.limit || paginationData.pageSize || 10,
            hasNextPage: paginationData.hasNextPage || false,
            hasPrevPage: paginationData.hasPrevPage || false,
          });
          
          // Also set the page and total for backward compatibility
          if (data.pagination) {
            data.page = paginationData.currentPage;
            data.total = paginationData.totalCount;
            data.pageSize = paginationData.limit;
            data.hasNextPage = paginationData.hasNextPage;
            data.hasPrevPage = paginationData.hasPrevPage;
          }
          setError(null);
        } else {
          throw new Error(data.message || "Failed to fetch overloaded DTRs data");
        }
      } else if (cardType === 'underloaded-feeders') {
        // Use the underloaded-dtrs endpoint for underloaded DTRs
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("pageSize", pageSize.toString());
        
        if (search) {
          params.append("search", search);
        }

        const response = await fetch(`${BACKEND_URL}/dtrs/underloaded-dtrs?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch underloaded DTRs data");

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format");
        }

        const data = await response.json();
        if (data.success) {
          setTableData(data.data || []);
          // Handle pagination structure
          const paginationData = data.pagination || data;
          setServerPagination({
            currentPage: paginationData.currentPage || paginationData.page || 1,
            totalPages: paginationData.totalPages || Math.ceil(paginationData.total / paginationData.pageSize) || 1,
            totalCount: paginationData.totalCount || paginationData.total || 0,
            limit: paginationData.limit || paginationData.pageSize || 10,
            hasNextPage: paginationData.hasNextPage || false,
            hasPrevPage: paginationData.hasPrevPage || false,
          });
          
          // Also set the page and total for backward compatibility
          if (data.pagination) {
            data.page = paginationData.currentPage;
            data.total = paginationData.totalCount;
            data.pageSize = paginationData.limit;
            data.hasNextPage = paginationData.hasNextPage;
            data.hasPrevPage = paginationData.hasPrevPage;
          }
          setError(null);
        } else {
          throw new Error(data.message || "Failed to fetch underloaded DTRs data");
        }
      } else if (cardType === 'ht-fuse-blown') {
        // Use the ht-fuse-blown endpoint for HT side fuse blown incidents
        console.log('Fetching HT Fuse Blown data from:', `${BACKEND_URL}/dtrs/ht-fuse-blown`);
        const response = await fetch(`${BACKEND_URL}/dtrs/ht-fuse-blown`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API response:', result);
        
        if (result.success) {
          setTableData(result.data || []);
          setHasRealData(true);
          // Handle pagination structure
          const paginationData = result.pagination || result;
          setServerPagination({
            currentPage: paginationData.currentPage || paginationData.page || 1,
            totalPages: paginationData.totalPages || Math.ceil(paginationData.total / paginationData.pageSize) || 1,
            totalCount: paginationData.totalCount || paginationData.total || 0,
            limit: paginationData.limit || paginationData.pageSize || 10,
            hasNextPage: paginationData.hasNextPage || false,
            hasPrevPage: paginationData.hasPrevPage || false,
          });
          setError(null);
        } else {
          throw new Error(result.message || 'Failed to fetch HT Side Fuse Blown data');
        }
      } else if (cardType === 'lt-fuse-blown') {
        // Use the lt-fuse-blown endpoint for LT side fuse blown incidents
        const response = await fetch(`${BACKEND_URL}/dtrs/lt-fuse-blown`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setTableData(result.data || []);
          setHasRealData(true);
          // Handle pagination structure
          const paginationData = result.pagination || result;
          setServerPagination({
            currentPage: paginationData.currentPage || paginationData.page || 1,
            totalPages: paginationData.totalPages || Math.ceil(paginationData.total / paginationData.pageSize) || 1,
            totalCount: paginationData.totalCount || paginationData.total || 0,
            limit: paginationData.limit || paginationData.pageSize || 10,
            hasNextPage: paginationData.hasNextPage || false,
            hasPrevPage: paginationData.hasPrevPage || false,
          });
          setError(null);
        } else {
          throw new Error(result.message || 'Failed to fetch LT Side Fuse Blown data');
        }
      } else if (cardType === 'unbalanced-dtrs') {
        // Use the unbalanced-dtrs endpoint for unbalanced DTRs
        const response = await fetch(`${BACKEND_URL}/dtrs/unbalanced-dtrs`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API response:', result);
        
        if (result.success) {
          setTableData(result.data || []);
          setHasRealData(true);
          console.log('✅ Unbalanced DTRs data received:', result.data?.length || 0, 'records');
          // Handle pagination structure
          const paginationData = result.pagination || result;
          setServerPagination({
            currentPage: paginationData.currentPage || paginationData.page || 1,
            totalPages: paginationData.totalPages || Math.ceil(paginationData.total / paginationData.pageSize) || 1,
            totalCount: paginationData.totalCount || paginationData.total || 0,
            limit: paginationData.limit || paginationData.pageSize || 10,
            hasNextPage: paginationData.hasNextPage || false,
            hasPrevPage: paginationData.hasPrevPage || false,
          });
          setError(null);
        } else {
          throw new Error(result.message || 'Failed to fetch Unbalanced DTRs data');
        }
      } else if (cardType === 'power-failure-feeders') {
        // Use the power-failure-feeders endpoint for power failure incidents
        console.log('Fetching Power Failure Feeders data from:', `${BACKEND_URL}/dtrs/power-failure-feeders`);
        const response = await fetch(`${BACKEND_URL}/dtrs/power-failure-feeders`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API response:', result);
        
        if (result.success) {
          setTableData(result.data || []);
          setHasRealData(true);
          console.log('✅ Power Failure Feeders data received:', result.data?.length || 0, 'records');
          // Handle pagination structure
          const paginationData = result.pagination || result;
          setServerPagination({
            currentPage: paginationData.currentPage || paginationData.page || 1,
            totalPages: paginationData.totalPages || Math.ceil(paginationData.total / paginationData.pageSize) || 1,
            totalCount: paginationData.totalCount || paginationData.total || 0,
            limit: paginationData.limit || paginationData.pageSize || 10,
            hasNextPage: paginationData.hasNextPage || false,
            hasPrevPage: paginationData.hasPrevPage || false,
          });
          setError(null);
        } else {
          throw new Error(result.message || 'Failed to fetch Power Failure Feeders data');
        }
      } else {
        // For other card types, show empty state
        // TODO: Implement specific API endpoints for other card types
        setTableData([]);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data. Please try again.');
      console.error('Error fetching data:', err);
      
      // Handle error fallback - keep existing data if available, otherwise show empty
      if (!hasRealData) {
        setTableData([]);
      } else {
        console.log('Keeping real API data despite error');
      }
    } finally {
      setLoading(false);
    }
  }, [cardType, hasRealData]);


  useEffect(() => {
    // Reset table data when card type changes
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

  // Monitor tableData changes to debug where data is coming from
  useEffect(() => {
    console.log('🔄 tableData state changed to:', tableData);
    console.log('🔄 tableData length:', tableData.length);
    if (tableData.length > 0) {
      console.log('🔄 tableData content:', JSON.stringify(tableData, null, 2));
    }
  }, [tableData]);

  // Handle row actions
  const handleView = (row: TableData) => {
    console.log('View item:', row);
    // Navigate to detail view based on card type
    if (cardType === 'total-dtrs' && row.dtrId) {
      navigate(`/dtr-detail/${row.dtrId}`);
    } else if (cardType === 'total-lt-feeders' && row.meterNo) {
      // Navigate to meter detail or search for meter
      navigate(`/meters?search=${row.meterNo}`);
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

  const handleEdit = (row: TableData) => {
    console.log('Edit item:', row);
    // Navigate to edit form
    // navigate(`/edit/${row.id}`);
  };

  const handlePageChange = (page: number) => {
    fetchData(page, serverPagination.limit);
  };

  const handleSearch = (searchTerm: string) => {
    fetchData(1, serverPagination.limit, searchTerm);
  };


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
                        buttonsLabel: 'Add New',
                        variant: 'primary',
                        onClick: () => console.log('Add New clicked'),
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
                      props: {
                        data: (() => {
                          console.log('🔍 Rendering Table with tableData:', tableData);
                          console.log('🔍 tableData length:', tableData.length);
                          console.log('🔍 cardType:', cardType);
                          
                          // Safety check: only show data if it matches the current cardType
                          if (cardType === 'overloaded-feeders' && tableData.length > 0) {
                            console.log('⚠️ WARNING: Overloaded feeders should be empty, but tableData has items!');
                            console.log('⚠️ Forcing tableData to empty array');
                            // Force empty array for overloaded feeders
                            return [];
                          }
                          
                          // Safety check: only show data if it matches the current cardType
                          if (cardType === 'underloaded-feeders' && tableData.length > 0) {
                            console.log('⚠️ WARNING: Underloaded feeders should be empty, but tableData has items!');
                            console.log('⚠️ Forcing tableData to empty array');
                            // Force empty array for underloaded feeders
                            return [];
                          }
                          
                          return tableData;
                        })(),
                        columns: getTableColumns(),
                        loading: loading,
                        searchable: true,
                        sortable: true,
                        pagination: true,
                        showHeader: true,
                        showActions: true,
                        onView: handleView,
                        onEdit: handleEdit,
                        onRowClick: (row: TableData) => {
                          if (cardType === 'total-dtrs' && row.dtrId) {
                            navigate(`/dtr-detail/${row.dtrId}`);
                          } else if (cardType === 'total-lt-feeders' && row.meterNo) {
                            // Navigate to meter detail or search for meter
                            navigate(`/meters?search=${row.meterNo}`);
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
                        emptyMessage: cardType === 'ht-fuse-blown' 
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
