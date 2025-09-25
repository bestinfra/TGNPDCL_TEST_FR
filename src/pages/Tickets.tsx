import { lazy } from 'react';
import { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
// const Page = lazy(() => import('SuperAdmin/Page'));
const Page = lazy(() => import('SuperAdmin/Page'));
// Define TableData type locally since we're using federated components
interface TableData {
  [key: string]: string | number | boolean | null | undefined;
}
import BACKEND_URL from '../config';
import { exportChartData } from '../utils/excelExport';

// Dummy data for fallback
const dummyTicketStats = {
  total: 0,
  open: 0,
  inProgress: 0,
  resolved: 0,
  closed: 0
};

const dummyTicketTrends = {
  xAxisData: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  seriesData: [
    {
      name: 'Open Tickets',
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'In Progress Tickets',
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'Resolved Tickets',
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'Closed Tickets',
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }
  ],
  seriesColors: ['#163b7c', '#55b56c', '#dc272c', '#ed8c22']
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
  }
];

export default function Tickets() {
    const navigate = useNavigate();
    
    // State for API data with smart fallbacks
    const [ticketStats, setTicketStats] = useState(dummyTicketStats);
    const [ticketTrends, setTicketTrends] = useState(dummyTicketTrends);
    const [tickets, setTickets] = useState(dummyTickets);
    
    // Loading states
    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [isTrendsLoading, setIsTrendsLoading] = useState(true);
    const [isTableLoading, setIsTableLoading] = useState(true);
    
    // State for tracking failed APIs
    const [failedApis, setFailedApis] = useState<Array<{
        id: string;
        name: string;
        retryFunction: () => Promise<void>;
        errorMessage: string;
    }>>([]);

    const [serverPagination, setServerPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10,
        hasNextPage: false,
        hasPrevPage: false
    });

    // Brand green icon style
    const brandGreenIconStyle = {
        filter: 'brightness(0) saturate(100%) invert(52%) sepia(60%) saturate(497%) hue-rotate(105deg) brightness(95%) contrast(90%)',
    };

    // Enhanced stats array with smart fallbacks and conditional rendering
    const statsArray = [
        { 
            key: 'total', 
            label: 'Total Tickets', 
            icon: 'icons/open-tickets.svg', 
            subtitle1: ticketStats ? `Total active tickets` : '- active tickets', 
            subtitle2: ticketStats ? 'Last 24 hours' : '0', 
            iconStyle: brandGreenIconStyle 
        },
        // { 
        //     key: 'open', 
        //     label: 'Open Tickets', 
        //     icon: 'icons/check-circle.svg', 
        //     subtitle1: ticketStats ? `Successfully resolved` : '- resolved', 
        //     subtitle2: ticketStats ? 'Today' : '0', 
        //     iconStyle: brandGreenIconStyle 
        // },
        { 
            key: 'inProgress', 
            label: 'In Progress Tickets', 
            icon: 'icons/progress.svg', 
            subtitle1: ticketStats ? `Customer satisfaction` : '- satisfaction', 
            subtitle2: ticketStats ? 'Target: 4h' : '- target', 
            iconStyle: brandGreenIconStyle 
        },
        { 
            key: 'resolved', 
            label: 'Resolved Tickets', 
            icon: 'icons/alert-triggered.svg', 
            subtitle1: ticketStats ? `Requires attention` : '- attention', 
            subtitle2: ticketStats ? 'High priority' : '- priority', 
            iconStyle: brandGreenIconStyle 
        },
        // { 
        //     key: 'closed', 
        //     label: 'Closed Tickets', 
        //     icon: 'icons/closed.svg', 
        //     subtitle1: ticketStats ? `Based on ${ticketStats.total || '0'} reviews` : 'Based on - reviews', 
        //     subtitle2: ticketStats ? 'This month' : '- month', 
        //     iconStyle: brandGreenIconStyle  
        // },
    ];

    // Retry function for Stats API
    const retryStatsAPI = async () => {
        setIsStatsLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/tickets/stats`);
            
            if (!res.ok) {
                throw new Error(`Stats API failed with status ${res.status}`);
            }
            
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Stats API returned non-JSON response");
            }
            
            const data = await res.json();
            if (data.success) {
                setTicketStats(data.data);
                // Remove from failed APIs on success
                setFailedApis(prev => prev.filter(api => api.id !== 'stats'));
            } else {
                throw new Error("Stats API returned unsuccessful response");
            }
        } catch (err: any) {
            console.error("Error in Tickets Stats:", err);
            setTicketStats(dummyTicketStats);
        } finally {
            // Add a small delay to make loading state visible
            setTimeout(() => {
                setIsStatsLoading(false);
            }, 1000);
        }
    };

    // Retry function for Trends API
    const retryTrendsAPI = async () => {
        setIsTrendsLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/tickets/trends`);
            
            if (!res.ok) {
                throw new Error(`Trends API failed with status ${res.status}`);
            }
            
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Trends API returned non-JSON response");
            }
            
            const data = await res.json();
            if (data.success) {
                setTicketTrends(data.data);
                // Remove from failed APIs on success
                setFailedApis(prev => prev.filter(api => api.id !== 'trends'));
            } else {
                throw new Error("Trends API returned unsuccessful response");
            }
        } catch (err: any) {
            console.error("Error in Tickets Trends:", err);
            setTicketTrends(dummyTicketTrends);
        } finally {
            // Add a small delay to make loading state visible
            setTimeout(() => {
                setIsTrendsLoading(false);
            }, 1000);
        }
    };

    // Retry function for Table API
    const retryTableAPI = async (page = 1, limit = 10, searchTerm = '') => {
        setIsTableLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', String(page));
            params.append('limit', String(limit));
            
            if (searchTerm && searchTerm.trim()) {
                params.append('search', searchTerm.trim());
            }
            
            const res = await fetch(`${BACKEND_URL}/tickets/table?${params.toString()}`);
            
            if (!res.ok) {
                throw new Error(`Table API failed with status ${res.status}`);
            }
            
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Table API returned non-JSON response");
            }
            
            const data = await res.json();
            if (data.success) {
                setTickets(data.data);
                setServerPagination({
                    currentPage: data.pagination?.currentPage || 1,
                    totalPages: data.pagination?.totalPages || 1,
                    totalCount: data.pagination?.totalCount || 0,
                    limit: data.pagination?.limit || 10,
                    hasNextPage: data.pagination?.hasNextPage || false,
                    hasPrevPage: data.pagination?.hasPrevPage || false,
                });
                // Remove from failed APIs on success
                setFailedApis(prev => prev.filter(api => api.id !== 'table'));
            } else {
                throw new Error("Table API returned unsuccessful response");
            }
        } catch (err: any) {
            console.error("Error in Tickets Table:", err);
            setTickets(dummyTickets);
        } finally {
            // Add a small delay to make loading state visible
            setTimeout(() => {
                setIsTableLoading(false);
            }, 1000);
        }
    };

    // Retry specific API
    const retrySpecificAPI = (apiId: string) => {
        const api = failedApis.find(a => a.id === apiId);
        if (api) {
            api.retryFunction();
        }
    };

    // Fetch ticket stats
    useEffect(() => {
        const fetchStats = async () => {
            setIsStatsLoading(true);
            try {
                const res = await fetch(`${BACKEND_URL}/tickets/stats`);
                
                if (!res.ok) {
                    throw new Error(`Stats API failed with status ${res.status}`);
                }
                
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("Stats API returned non-JSON response");
                }
                
                const data = await res.json();
                if (data.success) {
                    setTicketStats(data.data);
                    // Remove from failed APIs if successful
                    setFailedApis(prev => prev.filter(api => api.id !== 'stats'));
                } else {
                    throw new Error("Stats API returned unsuccessful response");
                }
            } catch (err: any) {
                console.error("Error in Tickets Stats:", err);
                setTicketStats(dummyTicketStats);
                
                // Add to failed APIs
                setFailedApis(prev => {
                    if (!prev.find(api => api.id === 'stats')) {
                        return [...prev, { 
                            id: 'stats', 
                            name: 'Ticket Statistics', 
                            retryFunction: retryStatsAPI, 
                            errorMessage: 'Failed to load Tickets Statistics. Please try again.' 
                        }];
                    }
                    return prev;
                });
            } finally {
                // Add a small delay to make loading state visible
                setTimeout(() => {
                    setIsStatsLoading(false);
                }, 1000);
            }
        };
        
        fetchStats();
    }, []);

    // Fetch ticket trends
    useEffect(() => {
        const fetchTrends = async () => {
            setIsTrendsLoading(true);
            try {
                const res = await fetch(`${BACKEND_URL}/tickets/trends`);
                
                if (!res.ok) {
                    throw new Error(`Trends API failed with status ${res.status}`);
                }
                
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("Trends API returned non-JSON response");
                }
                
                const data = await res.json();
                if (data.success) {
                    setTicketTrends(data.data);
                    // Remove from failed APIs if successful
                    setFailedApis(prev => prev.filter(api => api.id !== 'trends'));
                } else {
                    throw new Error("Trends API returned unsuccessful response");
                }
            } catch (err: any) {
                console.error("Error in Tickets Trends:", err);
                setTicketTrends(dummyTicketTrends);
                
                // Add to failed APIs
                setFailedApis(prev => {
                    if (!prev.find(api => api.id === 'trends')) {
                        return [...prev, { 
                            id: 'trends', 
                            name: 'Ticket Trends', 
                            retryFunction: retryTrendsAPI, 
                            errorMessage: 'Failed to load Tickets Trends. Please try again.' 
                        }];
                    }
                    return prev;
                });
            } finally {
                // Add a small delay to make loading state visible
                setTimeout(() => {
                    setIsTrendsLoading(false);
                }, 1000);
            }
        };
        
        fetchTrends();
    }, []);

    // Fetch tickets table
    useEffect(() => {
        const fetchTable = async () => {
            setIsTableLoading(true);
            try {
                const params = new URLSearchParams();
                params.append('page', '1');
                params.append('limit', '10');
                
                const res = await fetch(`${BACKEND_URL}/tickets/table?${params.toString()}`);
                
                if (!res.ok) {
                    throw new Error(`Table API failed with status ${res.status}`);
                }
                
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("Table API returned non-JSON response");
                }
                
                const data = await res.json();
                if (data.success) {
                    setTickets(data.data);
                    setServerPagination({
                        currentPage: data.pagination?.currentPage || 1,
                        totalPages: data.pagination?.totalPages || 1,
                        totalCount: data.pagination?.totalCount || 0,
                        limit: data.pagination?.limit || 10,
                        hasNextPage: data.pagination?.hasNextPage || false,
                        hasPrevPage: data.pagination?.hasPrevPage || false,
                    });
                    // Remove from failed APIs if successful
                    setFailedApis(prev => prev.filter(api => api.id !== 'table'));
                } else {
                    throw new Error("Table API returned unsuccessful response");
                }
            } catch (err: any) {
                console.error("Error in Tickets Table:", err);
                setTickets(dummyTickets);
                
                // Add to failed APIs
                setFailedApis(prev => {
                    if (!prev.find(api => api.id === 'table')) {
                        return [...prev, { 
                            id: 'table', 
                            name: 'Tickets Table', 
                            retryFunction: () => retryTableAPI(), 
                            errorMessage: 'Failed to load Tickets Table. Please try again.' 
                        }];
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
    }, []);

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
        navigate(`/tickets/${row.id}`);
    };

    const handleEditTicket = (row: TableData) => {
        navigate(`/tickets/${row.id}/edit`);
    };

    const handleDeleteTicket = (row: TableData) => {
        if (confirm(`Are you sure you want to delete ticket ${row.ticketNumber}?`)) {
        }
    };

    const [tableColumns] = useState([
        { key: 'sNo', label: 'S.No' },
        { key: 'ticketNumber', label: 'Ticket ID' },
        { key: 'dtrNumber', label: 'DTR Number' },
        { key: 'subject', label: 'Subject' },
        { key: 'meterSerialNo', label: 'Meter Serial No' },
        { key: 'category', label: 'Category' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
        { key: 'assignedTo', label: 'Assigned To' },
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
        import("xlsx").then((XLSX) => {
            const workbook = XLSX.utils.book_new();

            // 1. Ticket Statistics Cards
            const ticketStatsExportData = statsArray.map((stat) => ({
                Metric: stat.label,
                Value: ticketStats ? (ticketStats[stat.key as keyof typeof ticketStats] === 0 ? '0' : ticketStats[stat.key as keyof typeof ticketStats]) : '0',
                Subtitle1: stat.subtitle1,
                Subtitle2: stat.subtitle2,
            }));

            // 2. Tickets Table Data
            const ticketsTableExportData = tickets.map((ticket, index) => ({
                "S.No": index + 1,
                "Ticket Number": ticket.ticketNumber || "-",
                "DTR Number": ticket.dtrNumber || "-",
                "Subject": ticket.subject || "-",
                "Meter Serial No": ticket.meterSerialNo || "-",
                "Category": ticket.category || "-",
                "Priority": ticket.priority || "-",
                "Status": ticket.status || "-",
                "Assigned To": ticket.assignedTo || "-",
                "Created Date": ticket.createdAt || "-",
                "Description": ticket.description || "-"
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
                        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
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
            [ticketStatsSheet, ticketsTableSheet].forEach(sheet => setAutoWidth(sheet));

            // Append sheets to workbook
            XLSX.utils.book_append_sheet(workbook, ticketStatsSheet, "Ticket Statistics");
            XLSX.utils.book_append_sheet(workbook, ticketsTableSheet, "Tickets List");

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
            link.download = "tickets-list.xlsx";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        });
    };

    return (
        <Suspense fallback={<div>Loading...</div>}>
        <Page
            sections={[
                // Error Section - Above PageHeader
                ...(failedApis.length > 0 ? [{
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
                                            visibleErrors: failedApis.map(api => api.errorMessage),
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
                }] : []),
                {
                    layout: {
                        type: 'row',
                        className: ''
                    },
                    components: [
                        {
                            name: 'PageHeader',
                            props: {
                                title: "Tickets",
                                onBackClick: () => window.history.back(),
                                backButtonText: "Back to Dashboard",
                                buttonsLabel: "Add Ticket",
                                variant: "primary",
                                onClick: () => navigate('/add-ticket'),
                                showMenu: true,
                                showDropdown: true,
                                menuItems: [
                                    { id: 'add', label: 'Add Ticket' },
                                    { id: 'export', label: 'Export' }
                                ],
                                onMenuItemClick: (itemId: string) => {
                                    if (itemId === 'add') {
                                        navigate('/add-ticket');
                                    } else if (itemId === 'export') {
                                        handleExportData();
                                    }
                                }
                            }
                        }
                    ]
                },
                {
                    layout: {
                        type: 'column',
                        rows: [
                            {
                                layout: 'row',
                                columns: statsArray.map(stat => ({
                                    name: 'Card',
                                    props: {
                                        title: stat.label,
                                        value: ticketStats ? (ticketStats[stat.key as keyof typeof ticketStats] === 0 ? '0' : ticketStats[stat.key as keyof typeof ticketStats]) : '0',
                                        icon: stat.icon,
                                        subtitle1: stat.subtitle1,
                                        subtitle2: stat.subtitle2,
                                        iconStyle: stat.iconStyle,
                                        bg: "bg-stat-icon-gradient",
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
                                            ariaLabel:
                                                'Monthly ticket statistics chart',
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
