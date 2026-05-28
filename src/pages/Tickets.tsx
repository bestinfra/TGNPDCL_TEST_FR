import { lazy } from 'react';
import { Suspense, useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
const Page = lazy(() => import('SuperAdmin/Page'));
import { createLocationHierarchyFilterSection } from '../components/locationHierarchyFilterSection';
import { useLocationHierarchyFilterBar } from '../hooks/useLocationHierarchyFilterBar';
// Define TableData type locally since we're using federated components
interface TableData {
  [key: string]: string | number | boolean | null | undefined;
}
import BACKEND_URL, { buildApiUrl } from '../config';
import { exportChartData } from '../utils/excelExport';
import { getStoredToken, logout } from '../api/subAppAuth';

// API Response Types
interface TicketResponse {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  type: string;
  category: string;
  priority: string;
  status: string;
  appId: number;
  createdById: number;
  assignedToId: number | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  createdAt: string;
  updatedAt: string;
  assignedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  tags: string[];
  createdBy: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  assignedTo: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  } | null;
  app: {
    id: number;
    name: string;
    subdomain: string;
  };
  comments: any[];
  _count: {
    comments: number;
    attachments: number;
  };
}

interface ApiResponse {
  status: string;
  timestamp: string;
  traceId: string;
  message: string;
  meta: {
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      pageSize: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
  data: TicketResponse[];
}

// Dummy data for fallback
const dummyTicketStats = {
  total: 0,
  open: 0,
  inProgress: 0,
  resolved: 0,
  closed: 0,
};

const dummyTicketTrends = {
  xAxisData: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  seriesData: [
    {
      name: 'Open Tickets',
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      color: '#55b56c',
    },
    {
      name: 'In Progress Tickets',
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      color: '#55b56c',
    },
    {
      name: 'Resolved Tickets',
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      name: 'Closed Tickets',
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  ],
  seriesColors: ['#163b7c', '#55b56c', '#dc272c', '#ed8c22'],
};

const dummyTickets = [
  {
    id: 1,
    ticketNumber: '0',
    dtrNumber: '0',
    subject: '0',
    priority: '0',
    status: '0',
    assignedTo: '0',
    createdAt: '0',
    category: '0',
    meterSerialNo: '0',
    description: '0',
  },
];

// Helper function to calculate statistics from tickets array
const calculateStats = (tickets: TicketResponse[]) => {
  const stats = {
    total: tickets.length,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  };

  tickets.forEach(ticket => {
    const status = ticket.status?.toUpperCase();
    if (status === 'OPEN') {
      stats.open++;
    } else if (status === 'IN_PROGRESS' || status === 'INPROGRESS') {
      stats.inProgress++;
    } else if (status === 'RESOLVED') {
      stats.resolved++;
    } else if (status === 'CLOSED') {
      stats.closed++;
    }
  });

  return stats;
};

// Helper function to calculate trends from tickets array
const calculateTrends = (tickets: TicketResponse[]) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthData: { [key: string]: { open: number; inProgress: number; resolved: number; closed: number } } = {};

  // Initialize all months with zeros
  monthNames.forEach(month => {
    monthData[month] = { open: 0, inProgress: 0, resolved: 0, closed: 0 };
  });

  // Process each ticket
  tickets.forEach(ticket => {
    if (ticket.createdAt) {
      const date = new Date(ticket.createdAt);
      const monthIndex = date.getMonth();
      const monthName = monthNames[monthIndex];
      const status = ticket.status?.toUpperCase();

      if (monthData[monthName]) {
        if (status === 'OPEN') {
          monthData[monthName].open++;
        } else if (status === 'IN_PROGRESS' || status === 'INPROGRESS') {
          monthData[monthName].inProgress++;
        } else if (status === 'RESOLVED') {
          monthData[monthName].resolved++;
        } else if (status === 'CLOSED') {
          monthData[monthName].closed++;
        }
      }
    }
  });

  // Build series data
  const seriesData = [
    {
      name: 'Open Tickets',
      data: monthNames.map(month => monthData[month].open),
      color: '#55b56c',
    },
    {
      name: 'In Progress Tickets',
      data: monthNames.map(month => monthData[month].inProgress),
      color: '#55b56c',
    },
    {
      name: 'Resolved Tickets',
      data: monthNames.map(month => monthData[month].resolved),
    },
    {
      name: 'Closed Tickets',
      data: monthNames.map(month => monthData[month].closed),
    },
  ];

  return {
    xAxisData: monthNames,
    seriesData,
    seriesColors: ['#163b7c', '#55b56c', '#dc272c', '#ed8c22'],
  };
};

// Helper function to get token from all possible storage locations
const getToken = (): string | null => {
  // Try multiple possible token storage keys
  const possibleKeys = ['my-gate', 'token', 'accessToken', 'authToken'];
  const storages = [localStorage, sessionStorage];
  
  for (const storage of storages) {
    for (const key of possibleKeys) {
      const token = storage.getItem(key);
      if (token) {
        console.log(`✅ Token found in ${storage === localStorage ? 'localStorage' : 'sessionStorage'} with key: ${key}`);
        return token;
      }
    }
  }
  
  // Also try the getStoredToken function
  const token = getStoredToken();
  if (token) {
    console.log('✅ Token found via getStoredToken()');
    return token;
  }
  
  console.warn('⚠️ No token found in any storage location');
  console.warn('⚠️ Checked keys:', possibleKeys);
  console.warn('⚠️ Checked storages: localStorage, sessionStorage');
  return null;
};

// Helper function to make authenticated API requests with token expiration handling
const buildAuthHeaders = (token: string, headers?: HeadersInit): HeadersInit => {
  return {
    'Content-Type': 'application/json',
    ...(headers || {}),
    Authorization: `Bearer ${token}`,
  };
};

const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getToken();

  // Debug logging
  if (token) {
    console.log('🔑 Token found:', token.substring(0, 30) + '...');
    console.log('🔑 Token length:', token.length);
  } else {
    console.error('❌ No authentication token found!');
    console.error('❌ Please login again. The token may have expired or was not stored correctly.');
    throw new Error('Authentication required. Please login again.');
  }

  // Prepare headers with authentication
  const headers = buildAuthHeaders(token, options.headers);

  try {
    // Log the request URL for debugging
    console.log('🌐 Making API request to:', url);
    console.log('🌐 Request method:', options.method || 'GET');
    console.log('🌐 Request body:', options.body);
    
    const response = await fetch(url, {
      ...options,
      headers,
      // Remove credentials: 'include' to avoid CORS issues with localhost
      // credentials: 'include',
    });
    
    console.log('📥 Response status:', response.status, response.statusText);

    // Handle token expiration (401 Unauthorized)
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 401 Unauthorized - Token expired or invalid');
      console.error('❌ Error details:', errorData);
      console.warn('🔄 Redirecting to login...');
      logout();
      throw new Error('Your session has expired. Please login again.');
    }

    // Handle forbidden access (403)
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 403 Forbidden - Access denied');
      console.error('❌ Error details:', errorData);
      console.warn('🔄 Redirecting to login...');
      logout();
      throw new Error('You do not have permission to access this resource.');
    }

    // Handle 404 Not Found
    if (response.status === 404) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 404 Not Found - Endpoint does not exist');
      console.error('❌ Requested URL:', url);
      console.error('❌ Error details:', errorData);
      console.error('❌ Response path from server:', errorData.path);
      
      // Check if the error path differs from requested URL
      if (errorData.path && errorData.path !== url) {
        console.warn('⚠️ Server returned different path:', errorData.path);
        console.warn('⚠️ This might indicate a routing issue or incorrect endpoint');
      }
      
      // Provide helpful error message
      const errorMessage = errorData.path 
        ? `API endpoint not found. Server path: ${errorData.path}. Please verify the endpoint exists.`
        : `API endpoint not found: ${url}. Please verify the endpoint exists.`;
      
      throw new Error(errorMessage);
    }

    return response;
  } catch (error) {
    // If it's already our custom error, rethrow it
    if (error instanceof Error && error.message.includes('session has expired')) {
      throw error;
    }
    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }
    throw error;
  }
};

// Helper function to map API ticket to table format
const mapTicketToTableFormat = (ticket: TicketResponse, index: number): TableData => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '0';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '0';
    }
  };

  const formatPriority = (priority: string) => {
    if (!priority) return '0';
    return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
  };

  const formatStatus = (status: string) => {
    if (!status) return '0';
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return {
    sNo: index + 1,
    id: ticket.id,
    ticketNumber: ticket.ticketNumber || '0',
    subject: ticket.title || '0',
    category: ticket.category
      ? ticket.category
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
      : '0',
    priority: formatPriority(ticket.priority),
    status: formatStatus(ticket.status),
    createdAt: formatDate(ticket.createdAt),
    description: ticket.description || '0',
  };
};

export default function Tickets() {
  const navigate = useNavigate();
  const {
    filterOptions,
    isFiltersLoading,
    isFiltersReady,
    filterValues,
    lastSelectedId,
    handleFilterChange: handleHierarchyFilterChange,
    applyCurrentFilters,
    resetLocationFilters,
  } = useLocationHierarchyFilterBar({
    autoSelectDefaultDiscom: true,
  });
  const selectedLocationId = lastSelectedId;

  const handleGetData = useCallback(() => {
    applyCurrentFilters();
  }, [applyCurrentFilters]);

  const handleResetFilters = useCallback(async () => {
    await resetLocationFilters();
  }, [resetLocationFilters]);

  const locationHierarchyFilterSection = useMemo(
    () =>
      createLocationHierarchyFilterSection({
        filterOptions,
        filterValues,
        isFiltersLoading,
        onFilterChange: handleHierarchyFilterChange,
        onGetData: handleGetData,
        onReset: () => {
          void handleResetFilters();
        },
      }),
    [
      filterOptions,
      filterValues,
      isFiltersLoading,
      handleHierarchyFilterChange,
      handleGetData,
      handleResetFilters,
    ],
  );

  // State for API data with smart fallbacks
  const [ticketStats, setTicketStats] = useState(dummyTicketStats);
  const [ticketTrends, setTicketTrends] = useState(dummyTicketTrends);
  const [tickets, setTickets] = useState(dummyTickets);
  const [_allTickets, setAllTickets] = useState<TicketResponse[]>([]); // Store all tickets for stats/trends

  // Loading states
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isTrendsLoading, setIsTrendsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(true);

  // State for tracking failed APIs
  const [failedApis, setFailedApis] = useState<
    Array<{
      id: string;
      name: string;
      retryFunction: () => Promise<void>;
      errorMessage: string;
    }>
  >([]);

  const [serverPagination, setServerPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const isApiSuccess = (payload: any) => payload?.status === 'success' || payload?.success === true;

  // Brand green icon style
  const brandGreenIconStyle = {
    filter:
      'brightness(0) saturate(100%) invert(52%) sepia(60%) saturate(497%) hue-rotate(105deg) brightness(95%) contrast(90%)',
  };

  const appendLocationIdParam = (params: URLSearchParams) => {
    if (selectedLocationId) {
      params.set('locationId', String(selectedLocationId));
    }
    return params;
  };

  // Enhanced stats array with smart fallbacks and conditional rendering
  const statsArray = [
    {
      key: 'total',
      label: 'Total Tickets',
      icon: 'icons/open-tickets.svg',
      subtitle1: ticketStats ? `Total active tickets` : '- active tickets',
      subtitle2: ticketStats ? 'Last 24 hours' : '0',
      iconStyle: brandGreenIconStyle,
    },
    {
      key: 'open',
      label: 'Open Tickets',
      icon: 'icons/check-circle.svg',
      subtitle1: ticketStats ? `Successfully resolved` : '- resolved',
      subtitle2: ticketStats ? 'Today' : '0',
      iconStyle: brandGreenIconStyle,
    },
    {
      key: 'inProgress',
      label: 'In Progress Tickets',
      icon: 'icons/progress.svg',
      subtitle1: ticketStats ? `Customer satisfaction` : '- satisfaction',
      subtitle2: ticketStats ? 'Target: 4h' : '- target',
      iconStyle: brandGreenIconStyle,
    },
    {
      key: 'resolved',
      label: 'Resolved Tickets',
      icon: 'icons/alert-triggered.svg',
      subtitle1: ticketStats ? `Requires attention` : '- attention',
      subtitle2: ticketStats ? 'High priority' : '- priority',
      iconStyle: brandGreenIconStyle,
    },
    {
      key: 'closed',
      label: 'Closed Tickets',
      icon: 'icons/closed.svg',
      subtitle1: ticketStats
        ? `Based on ${ticketStats.total || '0'} reviews`
        : 'Based on - reviews',
      subtitle2: ticketStats ? 'This month' : '- month',
      iconStyle: brandGreenIconStyle,
    },
  ];

  // Fetch all tickets for stats and trends calculation
  const fetchAllTicketsForStats = async () => {
    try {
      // Ensure BACKEND_URL is properly set
      console.log('🔍 BACKEND_URL from config:', BACKEND_URL);
      console.log('🔍 Environment check:', {
        PROD: import.meta.env.PROD,
        DEV: import.meta.env.DEV,
        MODE: import.meta.env.MODE,
      });
      
      if (!BACKEND_URL) {
        throw new Error('BACKEND_URL is not configured. Please set VITE_API_BASE_URL environment variable.');
      }
      
      const params = appendLocationIdParam(new URLSearchParams());
      params.set('page', '1');
      params.set('limit', '1000');
      const url = buildApiUrl(`tickets/table?${params.toString()}`);
      console.log('📡 Fetching tickets for stats/trends from:', url);
      const res = await authenticatedFetch(url);

      if (!res.ok) {
        const errorText = await res.text().catch(() => res.statusText);
        throw new Error(`API failed with status ${res.status}: ${errorText}`);
      }

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API returned non-JSON response');
      }

      const data: ApiResponse = await res.json();
      
      console.log('📥 API Response received:');
      console.log('  - Status:', data.status);
      console.log('  - Message:', data.message);
      console.log('  - Data array length:', Array.isArray(data.data) ? data.data.length : 'Not an array');
      console.log('  - Full response:', data);

      if (isApiSuccess(data) && Array.isArray(data.data)) {
        console.log('✅ Success! Processing', data.data.length, 'tickets');
        setAllTickets(data.data);
        // Calculate stats from all tickets
        const stats = calculateStats(data.data);
        console.log('📊 Calculated stats:', stats);
        setTicketStats(stats);
        // Calculate trends from all tickets
        const trends = calculateTrends(data.data);
        console.log('📈 Calculated trends:', trends);
        setTicketTrends(trends);
        // Remove from failed APIs on success
        setFailedApis(prev => prev.filter(api => api.id !== 'stats' && api.id !== 'trends'));
      } else {
        console.error('❌ API response validation failed:');
        console.error('  - Status:', data.status);
        console.error('  - Data is array?', Array.isArray(data.data));
        console.error('  - Data:', data.data);
        throw new Error(data.message || 'API returned unsuccessful response');
      }
    } catch (err: any) {
      console.error('Error fetching tickets for stats/trends:', err);
      setTicketStats(dummyTicketStats);
      setTicketTrends(dummyTicketTrends);
      
      // Re-throw if it's an authentication error or 404 (will be handled by caller)
      if (err.message && (
        err.message.includes('session has expired') || 
        err.message.includes('permission') ||
        err.message.includes('Authentication required') ||
        err.message.includes('404') ||
        err.message.includes('not found')
      )) {
        throw err;
      }
    }
  };

  // Retry function for Stats/Trends API
  const retryStatsTrendsAPI = async () => {
    setIsStatsLoading(true);
    setIsTrendsLoading(true);
    await fetchAllTicketsForStats();
    setTimeout(() => {
      setIsStatsLoading(false);
      setIsTrendsLoading(false);
    }, 1000);
  };

  // Retry function for Table API
  const retryTableAPI = async (page = 1, limit = 1000, searchTerm = '') => {
    setIsTableLoading(true);
    try {
      // Ensure BACKEND_URL is properly set
      if (!BACKEND_URL) {
        throw new Error('BACKEND_URL is not configured. Please set VITE_API_BASE_URL environment variable.');
      }
      
      const params = appendLocationIdParam(new URLSearchParams());
      params.append('page', String(page));
      params.append('limit', String(limit));

      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const url = buildApiUrl(`tickets/table?${params.toString()}`);
      console.log('Fetching tickets table from:', url);
      const res = await authenticatedFetch(url);

      if (!res.ok) {
        const errorText = await res.text().catch(() => res.statusText);
        throw new Error(`Table API failed with status ${res.status}: ${errorText}`);
      }

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Table API returned non-JSON response');
      }

      const data: ApiResponse = await res.json();
      
      console.log('📥 Table API Response received:');
      console.log('  - Status:', data.status);
      console.log('  - Data array length:', Array.isArray(data.data) ? data.data.length : 'Not an array');
      console.log('  - Pagination:', data.meta?.pagination);

      if (isApiSuccess(data) && Array.isArray(data.data)) {
        console.log('✅ Table Success! Processing', data.data.length, 'tickets');
        // Map tickets to table format
        const mappedTickets = data.data.map((ticket, index) => mapTicketToTableFormat(ticket, index));
        console.log('📋 Mapped tickets for table:', mappedTickets);
        setTickets(mappedTickets as any);

        // Update pagination from meta.pagination
        if (data.meta?.pagination) {
          setServerPagination({
            currentPage: data.meta.pagination.currentPage || 1,
            totalPages: data.meta.pagination.totalPages || 1,
            totalCount: data.meta.pagination.totalCount || 0,
            limit: data.meta.pagination.pageSize || limit,
            hasNextPage: data.meta.pagination.hasNextPage || false,
            hasPrevPage: data.meta.pagination.hasPrevPage || false,
          });
        }

        // Remove from failed APIs on success
        setFailedApis(prev => prev.filter(api => api.id !== 'table'));
      } else {
        throw new Error('Table API returned unsuccessful response');
      }
    } catch (err: any) {
      console.error('Error in Tickets Table:', err);
      
      // Handle authentication errors
      if (err.message && (err.message.includes('session has expired') || err.message.includes('permission'))) {
        // Don't add to failed APIs, logout will handle redirect
        setTickets(dummyTickets);
        return; // Exit early, logout will redirect
      }
      
      setTickets(dummyTickets);

      // Add to failed APIs
      setFailedApis(prev => {
        if (!prev.find(api => api.id === 'table')) {
          return [
            ...prev,
            {
              id: 'table',
              name: 'Tickets Table',
              retryFunction: () => retryTableAPI(page, limit, searchTerm),
              errorMessage: err.message || 'Failed to load Tickets Table. Please try again.',
            },
          ];
        }
        return prev;
      });
    } finally {
      // Add a small delay to make loading state visible
      setTimeout(() => {
        setIsTableLoading(false);
      }, 1000);
    }
  };

  // Retry specific API
  // const retrySpecificAPI = (apiId: string) => {
  //   const api = failedApis.find(a => a.id === apiId);
  //   if (api) {
  //     api.retryFunction();
  //   }
  // };

  // Fetch ticket stats and trends after hierarchy filters init
  useEffect(() => {
    if (!isFiltersReady) return;

    const fetchStats = async () => {
      setIsStatsLoading(true);
      setIsTrendsLoading(true);
      try {
        await fetchAllTicketsForStats();
      } catch (err: any) {
        console.error('Error in Tickets Stats/Trends:', err);
        
        // Handle authentication errors
        if (err.message && (err.message.includes('session has expired') || err.message.includes('permission'))) {
          // Don't add to failed APIs, logout will handle redirect
          setTicketStats(dummyTicketStats);
          setTicketTrends(dummyTicketTrends);
          return; // Exit early, logout will redirect
        }
        
        setTicketStats(dummyTicketStats);
        setTicketTrends(dummyTicketTrends);

        // Add to failed APIs
        setFailedApis(prev => {
          const hasStats = prev.find(api => api.id === 'stats');
          const hasTrends = prev.find(api => api.id === 'trends');
          const newApis = [...prev];

          if (!hasStats) {
            newApis.push({
              id: 'stats',
              name: 'Ticket Statistics',
              retryFunction: retryStatsTrendsAPI,
              errorMessage: err.message || 'Failed to load Tickets Statistics. Please try again.',
            });
          }

          if (!hasTrends) {
            newApis.push({
              id: 'trends',
              name: 'Ticket Trends',
              retryFunction: retryStatsTrendsAPI,
              errorMessage: err.message || 'Failed to load Tickets Trends. Please try again.',
            });
          }

          return newApis;
        });
      } finally {
        // Add a small delay to make loading state visible
        setTimeout(() => {
          setIsStatsLoading(false);
          setIsTrendsLoading(false);
        }, 1000);
      }
    };

    fetchStats();
  }, [isFiltersReady, selectedLocationId]);

  // Fetch tickets table after hierarchy filters init
  useEffect(() => {
    if (!isFiltersReady) return;

    const fetchTable = async () => {
      setIsTableLoading(true);
      try {
        // Ensure BACKEND_URL is properly set
        if (!BACKEND_URL) {
          throw new Error('BACKEND_URL is not configured. Please set VITE_API_BASE_URL environment variable.');
        }
        
        const params = appendLocationIdParam(new URLSearchParams());
        params.append('page', '1');
        params.append('limit', '1000');

        const url = buildApiUrl(`tickets/table?${params.toString()}`);
        console.log('Fetching tickets table (initial load) from:', url);
        const res = await authenticatedFetch(url);

        if (!res.ok) {
          const errorText = await res.text().catch(() => res.statusText);
          throw new Error(`Table API failed with status ${res.status}: ${errorText}`);
        }

        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Table API returned non-JSON response');
        }

        const data: ApiResponse = await res.json();

        if (isApiSuccess(data) && Array.isArray(data.data)) {
          // Map tickets to table format
          const mappedTickets = data.data.map((ticket, index) => mapTicketToTableFormat(ticket, index));
          setTickets(mappedTickets as any);

          // Update pagination from meta.pagination
          if (data.meta?.pagination) {
            setServerPagination({
              currentPage: data.meta.pagination.currentPage || 1,
              totalPages: data.meta.pagination.totalPages || 1,
              totalCount: data.meta.pagination.totalCount || 0,
              limit: data.meta.pagination.pageSize || 1000,
              hasNextPage: data.meta.pagination.hasNextPage || false,
              hasPrevPage: data.meta.pagination.hasPrevPage || false,
            });
          }

          // Remove from failed APIs if successful
          setFailedApis(prev => prev.filter(api => api.id !== 'table'));
        } else {
          throw new Error('Table API returned unsuccessful response');
        }
      } catch (err: any) {
        console.error('Error in Tickets Table:', err);
        
        // Handle authentication errors
        if (err.message && (err.message.includes('session has expired') || err.message.includes('permission'))) {
          // Don't add to failed APIs, logout will handle redirect
          setTickets(dummyTickets);
          return; // Exit early, logout will redirect
        }
        
        setTickets(dummyTickets);

        // Add to failed APIs
        setFailedApis(prev => {
          if (!prev.find(api => api.id === 'table')) {
            return [
              ...prev,
              {
                id: 'table',
                name: 'Tickets Table',
                retryFunction: () => retryTableAPI(),
                errorMessage: err.message || 'Failed to load Tickets Table. Please try again.',
              },
            ];
          }
          return prev;
        });
      } finally {
        // Add a small delay to make loading state visible
        setTimeout(() => {
          setIsTableLoading(false);
        }, 1000);
      }
    };

    fetchTable();
  }, [isFiltersReady, selectedLocationId]);

  // Refresh data when component comes into focus (e.g., after adding a ticket)
  useEffect(() => {
    const handleFocus = () => {
      // Refresh stats, trends, and table when window regains focus
      fetchAllTicketsForStats();
      retryTableAPI(serverPagination.currentPage, serverPagination.limit);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedLocationId, serverPagination.currentPage, serverPagination.limit]);

  // Handle table pagination
  const handlePageChange = (page: number, limit: number) => {
    retryTableAPI(page, limit);
  };

  // Handle table search
  const handleSearch = (searchTerm: string) => {
    // Reset to first page when searching
    retryTableAPI(1, serverPagination.limit, searchTerm);
  };

  // Handle ticket actions
  const handleViewTicket = (row: TableData) => {
    console.log('Viewing ticket:', row);
    navigate(`/tickets/${row.ticketNumber}`);
  };

  const handleEditTicket = (row: TableData) => {
    console.log('Editing ticket:', row);
    navigate(`/tickets/${row.ticketNumber}/edit`);
  };

  const handleDeleteTicket = (row: TableData) => {
    console.log('Deleting ticket:', row);
    if (confirm(`Are you sure you want to delete ticket ${row.ticketNumber}?`)) {
      console.log('Ticket deleted:', row.id);
    }
  };

  const [tableColumns] = useState([
    { key: 'sNo', label: 'S.No' },
    { key: 'ticketNumber', label: 'Ticket ID' },
    { key: 'subject', label: 'Subject' },
    { key: 'category', label: 'Category' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created Date' },
  ]);

  // Chart download handler
  const handleChartDownload = () => {
    if (ticketTrends?.xAxisData && ticketTrends?.seriesData) {
      exportChartData(ticketTrends.xAxisData, ticketTrends.seriesData, 'ticket-statistics-data');
    }
  };

  // Export function for tickets data
  const handleExportData = () => {
    import('xlsx').then((XLSX) => {
      const workbook = XLSX.utils.book_new();

      // 1. Ticket Statistics Cards
      const ticketStatsExportData = statsArray.map((stat) => ({
        Metric: stat.label,
        Value: ticketStats
          ? ticketStats[stat.key as keyof typeof ticketStats] === 0
            ? '0'
            : ticketStats[stat.key as keyof typeof ticketStats]
          : '0',
        Subtitle1: stat.subtitle1,
        Subtitle2: stat.subtitle2,
      }));

      // 2. Tickets Table Data
      const ticketsTableExportData = tickets.map((ticket, index) => ({
        'S.No': index + 1,
        'Ticket Number': ticket.ticketNumber || '-',
        Subject: ticket.subject || '-',
        Category: ticket.category || '-',
        Priority: ticket.priority || '-',
        Status: ticket.status || '-',
        'Created Date': ticket.createdAt || '-',
        Description: ticket.description || '-',
      }));

      // Create sheets with auto-sizing
      const ticketStatsSheet = XLSX.utils.json_to_sheet(ticketStatsExportData);
      const ticketsTableSheet = XLSX.utils.json_to_sheet(ticketsTableExportData);

      // Auto-size columns for better readability
      const setAutoWidth = (worksheet: any) => {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        const colWidths: any[] = [];

        for (let C = range.s.c; C <= range.e.c; ++C) {
          let maxWidth = 10;
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const cellAddress = XLSX.utils.encode_cell({
              r: R,
              c: C,
            });
            const cell = worksheet[cellAddress];
            if (cell && cell.v) {
              const cellLength = cell.v.toString().length;
              maxWidth = Math.max(maxWidth, cellLength);
            }
          }
          colWidths[C] = { wch: Math.min(maxWidth + 2, 50) }; // Max width 50
        }
        worksheet['!cols'] = colWidths;
      };

      // Apply auto-width to all sheets
      [ticketStatsSheet, ticketsTableSheet].forEach((sheet) => setAutoWidth(sheet));

      // Append sheets to workbook
      XLSX.utils.book_append_sheet(workbook, ticketStatsSheet, 'Ticket Statistics');
      XLSX.utils.book_append_sheet(workbook, ticketsTableSheet, 'Tickets List');

      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });

      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tickets-list.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    });
  };

  const visibleFailedApis = failedApis.filter(
    (api) => typeof api.errorMessage === 'string' && api.errorMessage.trim().length > 0
  );

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Page
        sections={[
          // Error Section - Above PageHeader
          ...(visibleFailedApis.length > 0
            ? [
              // {
              //   layout: {
              //     type: 'column' as const,
              //     gap: 'gap-4',
              //     rows: [
              //       {
              //         layout: 'column' as const,
              //         columns: [
              //           {
              //             name: 'Error',
              //             props: {
              //               visibleErrors: visibleFailedApis.map((api) => api.errorMessage),
              //               showRetry: true,
              //               maxVisibleErrors: 3, // Show max 3 errors at once
              //               failedApis: visibleFailedApis, // Pass all failed APIs for individual retry
              //               onRetrySpecific: retrySpecificAPI, // Pass the retry function
              //             },
              //           },
              //         ],
              //       },
              //     ],
              //   },
              // },

            ]
            : []),
          {
            layout: {
              type: 'row',
              className: '',
            },
            components: [
              {
                name: 'PageHeader',
                props: {
                  title: 'Tickets',
                  onBackClick: () => window.history.back(),
                  backButtonText: 'Back to Dashboard',
                  buttonsLabel: 'Add Ticket',
                  variant: 'primary',
                  onClick: () => navigate('/add-ticket'),
                  showMenu: true,
                  showDropdown: true,
                  menuItems: [
                    { id: 'add', label: 'Add Ticket' },
                    { id: 'export', label: 'Export' },
                  ],
                  onMenuItemClick: (itemId: string) => {
                    console.log(`Filter by: ${itemId}`);
                    if (itemId === 'add') {
                      navigate('/add-ticket');
                    } else if (itemId === 'export') {
                      handleExportData();
                    }
                  },
                },
              },
            ],
          },
          locationHierarchyFilterSection,
          {
            layout: {
              type: 'column',
              rows: [
                {
                  layout: 'row',
                  columns: statsArray.map((stat) => ({
                    name: 'Card',
                    props: {
                      title: stat.label,
                      value: ticketStats
                        ? ticketStats[stat.key as keyof typeof ticketStats] === 0
                          ? '0'
                          : ticketStats[stat.key as keyof typeof ticketStats]
                        : '0',
                      icon: stat.icon,
                      subtitle1: stat.subtitle1,
                      subtitle2: stat.subtitle2,
                      iconStyle: stat.iconStyle,
                      bg: 'bg-stat-icon-gradient',
                      loading: isStatsLoading,
                    },
                  })),
                },
              ],
            },
          },
          {
            layout: {
              type: 'grid',
              columns: 1,
              rows: [
                {
                  layout: 'grid',
                  gridColumns: 1,
                  columns: [
                    {
                      name: 'BarChart',
                      props: {
                        xAxisData: ticketTrends?.xAxisData || dummyTicketTrends.xAxisData,
                        seriesData: ticketTrends?.seriesData || dummyTicketTrends.seriesData,
                        seriesColors: ticketTrends?.seriesColors || dummyTicketTrends.seriesColors,
                        height: '400px',
                        showHeader: true,
                        headerTitle: 'Ticket Statistics',
                        dateRange: '2024',
                        showDownloadButton: true,
                        headerHeight: 'h-12',
                        ariaLabel: 'Monthly ticket statistics chart',
                        onDownload: handleChartDownload,
                        isLoading: isTrendsLoading,
                      },
                    },
                  ],
                },
              ],
            },
          },
          {
            layout: {
              type: 'grid',
              columns: 1,
              gap: 'gap-4',
              rows: [
                {
                  layout: 'grid',
                  gridColumns: 1,
                  gap: 'gap-4',
                  className: 'pb-4',
                  columns: [
                    {
                      name: 'Table',
                      props: {
                        data: tickets || dummyTickets,
                        columns: tableColumns,
                        showHeader: true,
                        headerTitle: 'Recent Tickets',
                        dateRange: 'Last 30 days',
                        headerClassName: 'h-18',
                        searchable: true,
                        sortable: true,
                        pagination: true,
                        initialRowsPerPage: 10,
                        showActions: true,
                        text: 'Ticket Management Table',
                        onEdit: handleEditTicket,
                        onDelete: handleDeleteTicket,
                        onView: handleViewTicket,
                        onPageChange: handlePageChange,
                        onSearch: handleSearch,
                        serverPagination: serverPagination,
                        availableTimeRanges: [],
                        isLoading: isTableLoading,
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
}
