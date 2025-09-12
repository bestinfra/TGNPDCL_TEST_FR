import { lazy } from 'react';
import { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
const Page = lazy(() => import('SuperAdmin/Page'));
// Define TableData type locally since we're using federated components
interface TableData {
  [key: string]: string | number | boolean | null | undefined;
}
import BACKEND_URL from '../config';

export default function DataLogger() {
    const navigate = useNavigate();
    
    // State for tracking failed APIs (like Users.tsx)
    const [failedApis, setFailedApis] = useState<Array<{
        id: string;
        name: string;
        retryFunction: () => Promise<void>;
        errorMessage: string;
    }>>([]);

    const [dataLoggerData, setDataLoggerData] = useState<TableData[]>([]);
    const [loading, setLoading] = useState(true);
    const [serverPagination, setServerPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 8,
        hasNextPage: false,
        hasPrevPage: false,
    });

    // Retry specific API function (like Users.tsx)
    const retrySpecificAPI = (apiId: string) => {
        const api = failedApis.find((a) => a.id === apiId);
        if (api) {
            api.retryFunction();
        }
    };

    // Fetch Data Loggers
    const fetchDataLoggers = async (page = 1, limit = 8) => {
        setLoading(true);
        setFailedApis(prev => prev.filter(api => api.id !== 'dataLoggers'));
        
        try {
            const res = await fetch(`${BACKEND_URL}/meters/dataloggers?page=${page}&limit=${limit}`);
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const result = await res.json();
            if (!result.success) {
                throw new Error(result.message || 'Failed to fetch data loggers');
            }
            
            setDataLoggerData(result.data || []);
            if (result.pagination) {
                setServerPagination(result.pagination);
            }
        } catch (error: any) {
            console.error('Failed to fetch data loggers:', error);
            
            // Add to failed APIs
            setFailedApis(prev => [...prev, {
                id: 'dataLoggers',
                name: 'Data Loggers',
                retryFunction: () => fetchDataLoggers(page, limit),
                errorMessage: 'Failed to load Data Loggers. Please try again.',
            }]);
            
            setDataLoggerData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDataLoggers();
    }, []);

    const [tableColumns] = useState([
        { key: 'Exp', label: 'Export' },
        { key: 'modemSlNo', label: 'DCU / Modem Sl No' },
        { key: 'installationDate', label: 'Installation Date' },
    ]);

    const handlePageChange = (page: number, limit: number) => {
        // Fetch data for the new page
        fetchDataLoggers(page, limit);
    };

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Page
                sections={[
                    // Error Section (show when there are failed APIs)
                    ...(failedApis.length > 0
                        ? [
                            {
                                layout: {
                                    type: 'column' as const,
                                    gap: 'gap-4',
                                },
                                components: [
                                    {
                                        name: 'Error',
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
                                    title: 'Data Logger Management',
                                    onBackClick: () => { navigate('/superadmin') },
                                    backButtonText: 'Back to Dashboard',
                                    buttonsLabel: 'Add Data Logger',
                                    variant: 'primary',
                                    showMenu: true,
                                    showDropdown: true,
                                    menuItems: [
                                        { id: 'all', label: 'All Devices' },
                                        {
                                            id: 'online',
                                            label: 'Online Devices',
                                        },
                                        {
                                            id: 'offline',
                                            label: 'Offline Devices',
                                        },
                                        {
                                            id: 'standby',
                                            label: 'Standby Devices',
                                        },
                                        {
                                            id: 'maintenance',
                                            label: 'Maintenance Required',
                                        },
                                        {
                                            id: 'low-battery',
                                            label: 'Low Battery',
                                        },
                                    ],
                                    onMenuItemClick: (_itemId: string) => {
                                    },
                                },
                            },
                        ],
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
                                                data: dataLoggerData,
                                                columns: tableColumns,
                                                loading: loading,
                                                showHeader: true,
                                                headerTitle: 'Data Logger Devices',
                                                searchable: true,
                                                sortable: true,
                                                pagination: true,
                                                showActions: true,
                                                availableTimeRanges: [],
                                                text: 'Data Logger Management Table',
                                                serverPagination: serverPagination,
                                                onPageChange: handlePageChange,
                                                emptyMessage: 'No data logger devices found',
                                                onView: (row: TableData) => {
                                                    // Navigate to the data logger dashboard with the row ID
                                                    const dataLoggerId = row.modemSlNo || row.sNo?.toString() || '-';
                                                    if (dataLoggerId && dataLoggerId !== '-') {
                                                        navigate(`/data-logger/${dataLoggerId}`);
                                                    }
                                                },
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
