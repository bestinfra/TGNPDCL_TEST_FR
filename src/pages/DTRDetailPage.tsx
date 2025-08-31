import { useState, useEffect, lazy } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
const Page = lazy(() => import('SuperAdmin/Page'));
import { FILTER_STYLES } from '@/contexts/FilterStyleContext';
import BACKEND_URL from '../config';

// Dummy data for fallback
const dummyDTRData = {
    name: 'N/A',
    dtrNo: 'N/A',
    division: 'N/A',
    subDivision: 'N/A',
    substation: 'N/A',
    feeder: 'N/A',
    feederNo: 'N/A',
    condition: 'N/A',
    capacity: 'N/A',
    address: 'N/A',
    location: { lat: 0, lng: 0 },
    stats: [
        {
            title: 'Total LT Feeders',
            value: 'N/A',
            icon: '/icons/feeder.svg',
            subtitle1: 'Connected to DTR',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'Total kW',
            value: 'N/A',
            icon: '/icons/energy.svg',
            subtitle1: 'Active Power',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'Total kVA',
            value: 'N/A',
            icon: '/icons/energy.svg',
            subtitle1: 'Apparent Power',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'Total kWh',
            value: 'N/A',
            icon: '/icons/energy.svg',
            subtitle1: 'Cumulative Active Energy',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'Total kVAh',
            value: 'N/A',
            icon: '/icons/energy.svg',
            subtitle1: 'Cumulative Apparent Energy',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'LT Feeders Fuse Blown',
            value: 'N/A',
            icon: '/icons/power_failure.svg',
            subtitle1: 'Requires maintenance',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'Unbalanced LT Feeders',
            value: 'N/A',
            icon: '/icons/power_failure.svg',
            subtitle1: 'Requires attention',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'Power On',
            value: 'N/A',
            icon: '/icons/power_failure.svg',
            subtitle1: '',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'Power Off',
            value: 'N/A',
            icon: '/icons/power_failure.svg',
            subtitle1: '',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
            bg: 'bg-[var(--color-danger)]',
            iconStyle: FILTER_STYLES.WHITE,
        },
        {
            title: 'Status',
            value: 'N/A',
            icon: '/icons/units.svg',
            subtitle1: 'N/A',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
            bg: 'bg-[var(--color-secondary)]',
            iconStyle: FILTER_STYLES.WHITE,
        },
    ],
};

const dummyDailyConsumptionData = {
    xAxisData: ['N/A'],
    seriesData: [
        {
            name: 'Consumption',
            data: [0],
        },
    ],
};

const dummyFeedersData = [
    {
        sNo: 1,
        feederName: 'NA',
        loadStatus: 'N/A',
        condition: 'N/A',
        capacity: 'N/A',
        address: 'NA',
    }
];

const dummyAlertsData = [
    {
            alertId: 'NA',
        type: 'N/A',
        feederName: 'NA',
        occuredOn: 'NA',
    }
];

const DTRDetailPage = () => {
    const { dtrId } = useParams();
    const navigate = useNavigate();
    
    console.log('DTR Detail Page - DTR ID:', dtrId);
    
    // State for API data
    const [dtr, setDtr] = useState(dummyDTRData);
    const [dailyConsumptionData, setDailyConsumptionData] = useState(dummyDailyConsumptionData);
    const [feedersData, setFeedersData] = useState(dummyFeedersData);
    const [alertsData, setAlertsData] = useState(dummyAlertsData);

    // Loading states
    const [isDtrLoading, setIsDtrLoading] = useState(true);
    const [_isConsumptionLoading, setIsConsumptionLoading] = useState(true);
    const [isFeedersLoading, setIsFeedersLoading] = useState(true);
    const [isAlertsLoading, setIsAlertsLoading] = useState(true);

    // Simple error state like Prepaid.tsx
    const [errorMessages, setErrors] = useState<any[]>([]);

    // Clear all error messages
    const clearErrors = () => {
        setErrors([]);
    };

    // Remove a specific error message
    const removeError = (indexToRemove: number) => {
        setErrors(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    // Retry all APIs
    const retryAllAPIs = () => {
        clearErrors();
        // Retry all APIs by refreshing the page
        window.location.reload();
    };

    // Load data on component mount
    useEffect(() => {
        const fetchDtrData = async () => {
            setIsDtrLoading(true);
            try {
                // Simulate API call - replace with actual API
                const response = await fetch(`${BACKEND_URL}/dtr/${dtrId}`);
                if (!response.ok) throw new Error('Failed to fetch DTR data');
                
                const data = await response.json();
                setDtr(data);
            } catch (error) {
                console.error('Error fetching DTR data:', error);
                setDtr(dummyDTRData);
                setErrors(prev => {
                    if (!prev.includes("Failed to fetch DTR data")) {
                        const updated = [...prev, "Failed to fetch DTR data"];
                        return updated;
                    }
                    return prev;
                });
            } finally {
                setTimeout(() => {
                    setIsDtrLoading(false);
                }, 1000);
            }
        };

        const fetchConsumptionData = async () => {
            setIsConsumptionLoading(true);
            try {
                // Simulate API call - replace with actual API
                const response = await fetch(`${BACKEND_URL}/dtr/${dtrId}/consumption`);
                if (!response.ok) throw new Error('Failed to fetch consumption data');
                
                const data = await response.json();
                setDailyConsumptionData(data);
            } catch (error) {
                setDailyConsumptionData(dummyDailyConsumptionData);
                setErrors(prev => {
                    if (!prev.includes("Failed to fetch consumption data")) {
                        const updated = [...prev, "Failed to fetch consumption data"];
                        return updated;
                    }
                    return prev;
                });
            } finally {
                setTimeout(() => {
                    setIsConsumptionLoading(false);
                }, 1000);
            }
        };

        const fetchFeedersData = async () => {
            setIsFeedersLoading(true);
            try {
                // Simulate API call - replace with actual API
                const response = await fetch(`${BACKEND_URL}/dtr/${dtrId}/feeders`);
                if (!response.ok) throw new Error('Failed to fetch feeders data');
                
                const data = await response.json();
                setFeedersData(data);
            } catch (error) {
                setFeedersData(dummyFeedersData);
                setErrors(prev => {
                    if (!prev.includes("Failed to fetch feeders data")) {
                        const updated = [...prev, "Failed to fetch feeders data"];
                        return updated;
                    }
                    return prev;
                });
            } finally {
                setTimeout(() => {
                    setIsFeedersLoading(false);
                }, 1000);
            }
        };

        const fetchAlertsData = async () => {
            setIsAlertsLoading(true);
            try {
                // Simulate API call - replace with actual API
                const response = await fetch(`${BACKEND_URL}/dtr/${dtrId}/alerts`);
                if (!response.ok) throw new Error('Failed to fetch alerts data');
                
                const data = await response.json();
                setAlertsData(data);
            } catch (error) {
                setAlertsData(dummyAlertsData);
                setErrors(prev => {
                    if (!prev.includes("Failed to fetch alerts data")) {
                        const updated = [...prev, "Failed to fetch alerts data"];
                        return updated;
                    }
                    return prev;
                });
            } finally {
                setTimeout(() => {
                    setIsAlertsLoading(false);
                }, 1000);
            }
        };

        fetchDtrData();
        fetchConsumptionData();
        fetchFeedersData();
        fetchAlertsData();
    }, [dtrId]);

    const lastComm = 'N/A';

    // Handle Excel download for all DTR data in a single file
    const handleExportData = () => {
        // Import XLSX library
        import('xlsx').then((XLSX) => {
            // Create a new workbook
            const workbook = XLSX.utils.book_new();

            // Prepare DTR Information data
            const dtrInfoData = [
                {
                    'DTR No': dtr.dtrNo,
                    'DTR Name': dtr.name,
                    'Division': dtr.division,
                    'Sub-Division': dtr.subDivision,
                    'Substation': dtr.substation,
                    'Feeder': dtr.feeder,
                    'Feeder No': dtr.feederNo,
                    'Rating': '15.00 kVA', // Using the rating from stats
                    'Condition': dtr.condition,
                    'Capacity': dtr.capacity,
                    'Address': dtr.address,
                    'Location': `${dtr.location.lat}, ${dtr.location.lng}`,
                }
            ];

            // Prepare DTR Statistics data
            const dtrStatsData = dtr.stats.map(stat => ({
                'Metric': stat.title,
                'Value': stat.value,
                'Subtitle': stat.subtitle1 || '',
            }));

            // Prepare Feeders data
            const feedersExportData = feedersData.map(feeder => ({
                'S.No': feeder.sNo,
                'Feeder Name': feeder.feederName,
                'Load Status': feeder.loadStatus,
                'Condition': feeder.condition,
                'Capacity': feeder.capacity,
                'Address': feeder.address,
            }));

            // Prepare Alerts data
            const alertsExportData = alertsData.map(alert => ({
                'Alert ID': alert.alertId,
                'Type': alert.type,
                'Feeder Name': alert.feederName,
                'Occurred On': alert.occuredOn,
            }));

            // Prepare Daily Consumption data
            const consumptionExportData = dailyConsumptionData.xAxisData.map((date, index) => ({
                'Date': date,
                'Consumption (kWh)': dailyConsumptionData.seriesData[0].data[index],
            }));

            // Convert data to worksheets
            const dtrInfoSheet = XLSX.utils.json_to_sheet(dtrInfoData);
            const dtrStatsSheet = XLSX.utils.json_to_sheet(dtrStatsData);
            const feedersSheet = XLSX.utils.json_to_sheet(feedersExportData);
            const alertsSheet = XLSX.utils.json_to_sheet(alertsExportData);
            const consumptionSheet = XLSX.utils.json_to_sheet(consumptionExportData);

            // Add worksheets to workbook
            XLSX.utils.book_append_sheet(workbook, dtrInfoSheet, 'DTR Information');
            XLSX.utils.book_append_sheet(workbook, dtrStatsSheet, 'DTR Statistics');
            XLSX.utils.book_append_sheet(workbook, feedersSheet, 'DTR Feeders');
            XLSX.utils.book_append_sheet(workbook, alertsSheet, 'DTR Alerts');
            XLSX.utils.book_append_sheet(workbook, consumptionSheet, 'Daily Consumption');

            // Generate Excel file
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            
            // Create blob and download
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `dtr-${dtr.name}-complete-data.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        });
    };

    // Handle feeders export
    const handleFeedersExport = () => {
        console.log('Exporting feeders...');
        // Add feeders export logic here
    };

    // Handle feeder row click
    const handleFeederClick = (feederId: string) => {
        // Find the feeder data for the clicked feeder
        const feederData = feedersData.find(feeder => feeder.feederName === feederId);
        if (feederData) {
            navigate(`/feeder/${feederId}`, { 
                state: { 
                    feederData,
                    dtrId: dtrId,
                    dtrName: dtr.name
                } 
            });
        }
    };

    // Handle feeder view action
    const handleFeederView = (row: any) => {
        navigate(`/feeder/${row.feederName}`, { 
            state: { 
                feederData: row,
                dtrId: dtrId,
                dtrName: dtr.name
            } 
        }
    );
    };

    // Debug log to see current errors
    console.log('Current errorMessages state:', errorMessages);

    return (
        <Page
            sections={[
                // Error Section - Above PageHeader
                ...(errorMessages.length > 0 ? [{
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
                                            visibleErrors: errorMessages,
                                            onRetry: retryAllAPIs,
                                            onClose: () => removeError(0), // Remove the top error
                                            showRetry: true,
                                            maxVisibleErrors: 4, // Show max 4 errors at once
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                }] : []),
                {
                    layout: {
                        type: 'grid' as const,
                        columns: 1,
                        className: 'w-full',
                        rows: [
                            {
                                layout: 'row' as const,
                                className: 'w-full',
                                columns: [
                                    {
                                        name: 'PageHeader',
                                        props: {
                                            title: 'DTR Details',
                                            onBackClick: () => navigate('/dtr-dashboard'),
                                            backButtonText: 'Back to Dashboard',
                                            buttonsLabel: 'Export Data',
                                            variant: 'primary',
                                            onClick: () => handleExportData(),
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                },
                {
                    layout: {
                        type: 'grid' as const,
                        columns: 3,
                        className: 'border border-primary-border dark:border-dark-border rounded-3xl bg-white dark:bg-primary-dark-light p-4',
                        rows: [
                            {
                                layout: 'row' as const,
                                className: 'justify-between w-full',
                                span: { col: 3, row: 1 },
                                columns: [
                                    {
                                        name: 'SectionHeader',  
                                        props: {
                                            title: 'DTR Information',
                                            titleLevel: 2,
                                            titleSize: 'md',
                                            titleVariant: 'primary',
                                            titleWeight: 'bold',
                                            titleAlign: 'left',
                                            defaultTitleHeight:'0',
                                            className:'w-full',
                                            rightComponent: { name: 'LastComm', props: { value: lastComm } },
                                        },
                                       
                                    },
                                ],
                            },
                            {
                                layout: 'row' as const,
                                className: 'justify-between w-full',
                                span: { col: 3, row: 1 },
                                columns: [
                                    {   
                                       name: 'PageInformation',
                                       props: {
                                        gridColumns: 5,
                                        rows: [
                                            {
                                                layout: 'row',
                                                className: 'justify-between w-full',
                                                span: { col: 5, row: 1 },
                                                items: [
                                                    {
                                                        title: 'DTR No',
                                                        value: dtr.dtrNo,
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    },
                                                    {
                                                        title: 'DTR Name',
                                                        value: dtr.name,
                                                        align: 'start',
                                                        gap: 'gap-1',
                                                        statusIndicator: true
                                                    },
                                                    {
                                                        title: 'Division',
                                                        value: dtr.division,
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    },
                                                    {
                                                        title: 'Sub-Division',
                                                        value: dtr.subDivision,
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    },
                                                    {
                                                        title: 'Substation',
                                                        value: dtr.substation,
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    }
                                                ]
                                            },
                                            {
                                                layout: 'row',
                                                className: 'justify-between w-full',
                                                span: { col: 5, row: 1 },
                                                items: [
                                                    {
                                                        title: 'Feeder',
                                                        value: dtr.feeder,
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    },
                                                    {
                                                        title: 'Feeder No',
                                                        value: dtr.feederNo,
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    },
                                                   
                                                    {
                                                        title: 'Condition',
                                                        value: dtr.condition,
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    },
                                                    {
                                                        title: 'Capacity',
                                                        value: dtr.capacity,
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    },
                                                    {
                                                        title:'',
                                                        gap: 'gap-1'
                                                    },
                                                ]
                                            }
                                        ]
                                       }
                                    }
                                ]
                            }
                        ],
                    },
                },
                {
                    layout: {
                        type: 'grid' as const,
                        columns: 1,
                        className: 'w-full p-4 border border-primary-border dark:border-dark-border rounded-3xl bg-background-secondary dark:bg-primary-dark-light',
                        rows: [
                            {
                                layout: 'row' as const,
                                className: 'justify-between w-full ',
                                span: { col: 1, row: 1 },
                                columns: [
                                    {
                                        name: 'SectionHeader',
                                        props: {
                                            title: 'Distribution Transformer (DTR) Statistics',
                                            titleLevel: 2,
                                            titleSize: 'md',
                                            titleVariant: 'primary',
                                            titleWeight: 'bold',
                                            titleAlign: 'left',
                                            className:'w-full',
                                            rightComponent: { name: 'LastComm', props: { value: lastComm } },
                                        },
                                        span: { col: 1, row: 1 },
                                    },
                                ],
                            },
                            {
                                layout: 'grid' as const,
                                gridColumns: 5,
                                className: 'w-full gap-4',
                                columns: dtr.stats.map((stat) => ({
                                    name: 'Card',
                                    props: {
                                        title: stat.title,
                                        value: stat.value,
                                        subtitle1: stat.subtitle1,
                                        icon: stat.icon,
                                        bg: stat.bg || 'bg-stat-icon-gradient',
                                        valueFontSize: stat.valueFontSize || 'text-lg lg:text-xl md:text-lg sm:text-base',
                                        iconStyle: stat.iconStyle || FILTER_STYLES.BRAND_GREEN,
                                        loading: isDtrLoading,
                                    },
                                    span: { col: 1, row: 1 },
                                })),
                            },
                        ],
                    },
                },
               
                {
                    layout: {
                        type: 'grid' as const,
                        columns: 1,
                        className: '',
                        rows: [
                            {
                                layout: 'grid' as const,
                                gridColumns: 1,
                                columns: [
                                    {
                                        name: 'Table',
                                        props: {
                                            columns: [
                                                { key: 'sNo', label: 'S.No' },
                                                { key: 'feederName', label: 'Feeder Name' },
                                                { key: 'loadStatus', label: 'Load Status' },
                                                { key: 'condition', label: 'Condition' },
                                                { key: 'capacity', label: 'Capacity' },
                                                { key: 'address', label: 'Address' },
                                            ],
                                            data: feedersData,
                                            searchable: true,
                                            pagination: true,
                                            initialRowsPerPage: 10,
                                            rowsPerPageOptions: [5, 10, 15, 20, 25],
                                            emptyMessage: 'No Feeders Found',
                                            showActions: true,
                                            title: 'DTR Feeders',
                                            headerTitle: 'DTR Feeders',
                                            showHeader: true,
                                            showPaginationInfo: true,
                                            showRowsPerPageSelector: true,
                                            className: 'w-full',
                                            onExport: handleFeedersExport,
                                            onRowClick: (row: any) => handleFeederClick(row.feederName),
                                            actions: [
                                                {
                                                    label: 'View',
                                                    icon: '/icons/eye.svg',
                                                    onClick: handleFeederView,
                                                    variant: 'primary',
                                                    size: 'sm'
                                                }
                                            ],
                                            loading: isFeedersLoading,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                },
                {
                    layout: {
                        type: 'grid' as const,
                        columns: 1,
                        className: '',
                        rows: [
                            {
                                layout: 'grid' as const,
                                gridColumns: 1,
                                className:'pb-4',
                                columns: [
                                    {
                                        name: 'Table',
                                        
                                        props: {
                                            columns: [
                                                { key: 'alertId', label: 'Alert ID' },
                                                { key: 'type', label: 'Type' },
                                                { key: 'feederName', label: 'Feeder Name' },
                                                { key: 'occuredOn', label: 'Occured On' },
                                            ],
                                            data: alertsData,
                                            searchable: true,
                                            pagination: true,
                                            initialRowsPerPage: 10,
                                            rowsPerPageOptions: [5, 10, 15, 20, 25],
                                            emptyMessage: 'No Alerts Found',
                                            showActions: false,
                                            title: 'DTR Alerts',
                                            headerTitle: 'DTR Alerts',
                                            showHeader: true,
                                            showPaginationInfo: true,
                                            showRowsPerPageSelector: true,
                                            className: 'w-full',
                                            loading: isAlertsLoading,
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                },
            ]}
        />
    );
};

export default DTRDetailPage;
