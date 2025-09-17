import { lazy } from 'react';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
const Page = lazy(() => import('SuperAdmin/Page'));
import BACKEND_URL from '../config';

// Get meter details from backend
const getMeterDetails = async (meterNumber: string) => {
  const response = await fetch(`${BACKEND_URL}/meters/${meterNumber}`);
  return response.json();
};

const MeterDetails: React.FC = () => {
    const navigate = useNavigate();
    const params = useParams();
    // Extract just the meter number, remove any extra path parts
    const meterSlNo = (params.meterSlNo || params.id || Object.values(params)[0] || '').replace('meter-details/', '');
    

    
    const [isLoading, setIsLoading] = useState(true);
    const [meterData, setMeterData] = useState<any>(null);
    const [forceUpdate, setForceUpdate] = useState(0);

    // State for tracking failed APIs (like Users.tsx)
    const [failedApis, setFailedApis] = useState<Array<{
        id: string;
        name: string;
        retryFunction: () => Promise<void>;
        errorMessage: string;
    }>>([]);

    // Meter cards data - Using useState with smart fallbacks
    const [summaryCards, setSummaryCards] = useState([
        {
            title: 'Current Reading',
            value: '-',
            icon: 'icons/current-reading.svg',
            subtitle1: '-',
            subtitle2: '-',
        },
        {
            title: 'Status',
            value: '-',
            icon: 'icons/status.svg',
            subtitle1: '-',
            subtitle2: '-',
        },
        {
            title: 'Meter Type',
            value: '-',
            icon: 'icons/units.svg',
            subtitle1: '-',
            subtitle2: '-',
        },
        {
            title: 'Location',
            value: '-',
            icon: 'icons/location.svg',
            subtitle1: '-',
            subtitle2: '-',
        },
    ]);

    // Meter information data - Using useState with smart fallbacks
    const [meterInfoRow1, setMeterInfoRow1] = useState([
        { title: 'Meter Sl No.', value: '-' },
        { title: 'Modem Sl No', value: '-' },
        { title: 'UID', value: '-' },
        { title: 'Assigned To', value: '-' },
        { title: 'Meter Make', value: '-' },
    ]);

    const [meterInfoRow2, setMeterInfoRow2] = useState([
        { title: 'Meter CT Ratio', value: '-' },
        { title: 'Meter PT Ratio', value: '-' },
        { title: 'External CT Ratio', value: '-' },
        { title: 'External PT Ratio', value: '-' },
        { title: 'Multiplication Factor', value: '-' },
    ]);

    // Table data - Using useState with smart fallbacks
    const [meterInfoData, setMeterInfoData] = useState<any[]>([]);

    // Chart data - Using useState with smart fallbacks
    const [chartData, setChartData] = useState({
        xAxisData: [] as string[],
        seriesData: [] as Array<{ name: string; data: number[] }>,
        seriesColors: ['#1976d2', '#ff9800'],
        timeRangeData: {} as any
    });

    const meterDetailAction = [
        {
            label: "View",
            icon: "icons/eye.svg",
        },
        {
            label: 'edit',
            icon: 'icons/edit.svg'
        },
        {
            label: 'delete',
            icon: 'icons/delete.svg'
        }
    ];

    // Update computed data when meter data changes
    useEffect(() => {
        if (meterData) {
            // Update summary cards with real data using smart fallbacks
            setSummaryCards([
                {
                    title: 'Current Reading',
                    value: meterData.currentReading ? `${meterData.currentReading} kWh` : '-',
                    icon: 'icons/current-reading.svg',
                    subtitle1: meterData.lastReadingDate ? `Last Reading: ${new Date(meterData.lastReadingDate).toLocaleDateString()}` : 'No readings available',
                    subtitle2: 'Current Reading',
                },
                {
                    title: 'Status',
                    value: meterData.status || '-',
                    icon: 'icons/status.svg',
                    subtitle1: `Meter: ${meterData.status || 'Unknown'}`,
                    subtitle2: 'Status',
                },
                {
                    title: 'Meter Type',
                    value: meterData.type || 'N/A',
                    icon: 'icons/units.svg',
                    subtitle1: meterData.phase ? `${meterData.phase} Phase` : 'Phase info not available',
                    subtitle2: 'Type',
                },
                {
                    title: 'Location',
                    value: meterData.location || '-',
                    icon: 'icons/location.svg',
                    subtitle1: meterData.installationDate ? `Installed: ${new Date(meterData.installationDate).toLocaleDateString()}` : 'Installation date not available',
                    subtitle2: 'Location',
                },
            ]);

            // Update meter information rows with smart fallbacks
            const newMeterInfoRow1 = [
                { title: 'Meter Sl No.', value: meterData.meterNumber || 'N/A' },
                { title: 'Modem Sl No', value: meterData.serialNumber || 'N/A' },
                { title: 'UID', value: meterData.manufacturer || 'N/A' },
                { title: 'Assigned To', value: meterData.consumerInfo?.name || 'N/A' },
                { title: 'Meter Make', value: meterData.manufacturer || 'N/A' },
            ];
            setMeterInfoRow1(newMeterInfoRow1);
            // Force component re-render by updating a key
            setForceUpdate(Date.now());

            setMeterInfoRow2([
                { title: 'Meter CT Ratio', value: meterData.meterConfig?.ctRatio || 'N/A' },
                { title: 'Meter PT Ratio', value: meterData.meterConfig?.ptRatio || 'N/A' },
                { title: 'External CT Ratio', value: meterData.meterConfig?.adoptedCTRatio || 'N/A' },
                { title: 'External PT Ratio', value: meterData.meterConfig?.adoptedPTRatio || 'N/A' },
                { title: 'Multiplication Factor', value: meterData.meterConfig?.mf || 'N/A' },
            ]);
            
            // Update table data with current meter info
            const tableData = [{
                slNo: 1,
                meterSlNo: meterData.meterNumber || 'N/A',
                modemSlNo: meterData.serialNumber || 'N/A',
                meterType: meterData.type || 'N/A',
                meterMake: meterData.manufacturer || 'N/A',
                consumerName: meterData.consumerInfo?.name || 'N/A',
                location: meterData.location || 'N/A',
                installationDate: meterData.installationDate ? new Date(meterData.installationDate).toLocaleDateString() : 'N/A',
            }];
            setMeterInfoData(tableData);

            // Update chart data with smart fallbacks using meterReadingsAggregated
            if (meterData.meterReadingsAggregated) {
                const dailyData = meterData.meterReadingsAggregated.daily || [];
                const weeklyData = meterData.meterReadingsAggregated.weekly || [];
                const monthlyData = meterData.meterReadingsAggregated.monthly || [];
                
                // Use daily data by default, can be changed by time range selector
                setChartData({
                    xAxisData: dailyData.map((reading: any) => reading.label || 'N/A'),
                    seriesData: [
                        {
                            name: 'kWh',
                            data: dailyData.map((reading: any) => reading.kWh || 0)
                        },
                        {
                            name: 'kW',
                            data: dailyData.map((reading: any) => reading.kW || 0)
                        }
                    ],
                    seriesColors: ['#3B82F6', '#10B981'],
                    // Store all time range data for switching
                    timeRangeData: {
                        daily: {
                            xAxisData: dailyData.map((reading: any) => reading.label || 'N/A'),
                            seriesData: [
                                { name: 'kWh', data: dailyData.map((reading: any) => reading.kWh || 0) },
                                { name: 'kW', data: dailyData.map((reading: any) => reading.kW || 0) }
                            ]
                        },
                        weekly: {
                            xAxisData: weeklyData.map((reading: any) => reading.label || 'N/A'),
                            seriesData: [
                                { name: 'kWh', data: weeklyData.map((reading: any) => reading.kWh || 0) },
                                { name: 'kW', data: weeklyData.map((reading: any) => reading.kW || 0) }
                            ]
                        },
                        monthly: {
                            xAxisData: monthlyData.map((reading: any) => reading.label || 'N/A'),
                            seriesData: [
                                { name: 'kWh', data: monthlyData.map((reading: any) => reading.kWh || 0) },
                                { name: 'kW', data: monthlyData.map((reading: any) => reading.kW || 0) }
                            ]
                        }
                    }
                });
            } else {
                setChartData({
                    xAxisData: [],
                    seriesData: [
                        { name: 'kWh', data: [] },
                        { name: 'kW', data: [] }
                    ],
                    seriesColors: ['#3B82F6', '#10B981'],
                    timeRangeData: {}
                });
            }
        } else {
            // Set fallback data when there are errors or no meter data
            setSummaryCards([
                {
                    title: 'Current Reading',
                    value: '-',
                    icon: 'icons/current-reading.svg',
                    subtitle1: '-',
                    subtitle2: '-',
                },
                {
                    title: 'Status',
                    value: '-',
                    icon: 'icons/status.svg',
                    subtitle1: '-',
                    subtitle2: '-',
                },
                {
                    title: 'Meter Type',
                    value: '-',
                    icon: 'icons/units.svg',
                    subtitle1: '-',
                    subtitle2: '-',
                },
                {
                    title: 'Location',
                    value: '-',
                    icon: 'icons/location.svg',
                    subtitle1: '-',
                    subtitle2: '-',
                },
            ]);

            setMeterInfoRow1([
                { title: 'Meter Sl No.', value: '-' },
                { title: 'Modem Sl No', value: '-' },
                { title: 'UID', value: '-' },
                { title: 'Assigned To', value: '-' },
                { title: 'Meter Make', value: '-' },
            ]);

            setMeterInfoRow2([
                { title: 'Meter CT Ratio', value: '-' },
                { title: 'Meter PT Ratio', value: '-' },
                { title: 'External CT Ratio', value: '-' },
                { title: 'External PT Ratio', value: '-' },
                { title: 'Multiplication Factor', value: '-' },
            ]);

            setMeterInfoData([]);
            setChartData({
                xAxisData: [],
                seriesData: [{
                    name: 'Meter Readings',
                    data: []
                }],
                seriesColors: ['var(--color-primary)', 'var(--color-secondary)'],
                timeRangeData: {}
            });
        }
    }, [meterData, failedApis.length]);

    // Fetch meter data from API
    const fetchMeterData = async () => {
        if (!meterSlNo) {
            setFailedApis([{
                id: 'meterData',
                name: 'Meter Data',
                retryFunction: fetchMeterData,
                errorMessage: 'No meter serial number provided. Please try again.',
            }]);
            setIsLoading(false);
            return;
        }
        
        try {
            setIsLoading(true);
            setFailedApis([]);
            
            const result = await getMeterDetails(meterSlNo);
            
            if (result.success) {
                setMeterData(result.data);
        
            } else {
                throw new Error(result.message || 'Failed to fetch meter data');
            }
        } catch (error: any) {
            console.error('Error fetching meter data:', error);
            setMeterData(null);
            
            // Add to failed APIs with specific error messages
            setFailedApis([
                {
                    id: 'meterData',
                    name: 'Meter Data',
                    retryFunction: fetchMeterData,
                    errorMessage: 'Failed to load Meter Data. Please try again.',
                },
                {
                    id: 'meterReadings',
                    name: 'Meter Readings',
                    retryFunction: fetchMeterData,
                    errorMessage: 'Failed to load Meter Readings. Please try again.',
                },
                {
                    id: 'meterHistory',
                    name: 'Meter History',
                    retryFunction: fetchMeterData,
                    errorMessage: 'Failed to load Meter History. Please try again.',
                },
                {
                    id: 'meterConfiguration',
                    name: 'Meter Configuration',
                    retryFunction: fetchMeterData,
                    errorMessage: 'Failed to load Meter Configuration. Please try again.',
                },
                {
                    id: 'meterStatus',
                    name: 'Meter Status',
                    retryFunction: fetchMeterData,
                    errorMessage: 'Failed to load Meter Status. Please try again.',
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMeterData();
    }, [meterSlNo]);

    // Retry specific API function (like Users.tsx)
    const retrySpecificAPI = (apiId: string) => {
        const api = failedApis.find((a) => a.id === apiId);
        if (api) {
            api.retryFunction();
        }
    };

    const meterInfoColumns = [
        { key: 'slNo', label: 'Sl No' },
        { key: 'meterSlNo', label: 'Meter SI No' },
        { key: 'modemSlNo', label: 'Modem SI No' },
        { key: 'meterType', label: 'Meter Type' },
        { key: 'meterMake', label: 'Meter Make' },
        // { key: 'consumerName', label: 'Consumer Name' },
        { key: 'location', label: 'Location' },
        { key: 'installationDate', label: 'Installation Date' },
    ];

    return (
        <div className="min-h-screen">
            <Page
                key={`meter-details-${meterSlNo}-${forceUpdate}`}
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
                    // Meter Details Header
                    {
                        layout: {
                            type: 'column',
                            gap: 'gap-4',
                        },
                        components: [
                            {
                                name: 'PageHeader',
                                props: {
                                    title: meterData ? `Meter ${meterData.meterSerialNumber || meterSlNo}` : 'Meter Details',
                                    onBackClick: () => navigate('/meters'),
                                    backButtonText: 'Back to Meters',
                                },
                            },
                        ],
                    },
                    // Meter Summary Cards
                    {
                        layout: {
                            type: 'grid',
                            columns: 4,
                            gap: 'gap-4',
                        },
                        components: summaryCards.map((cardData) => ({
                            name: 'Card',
                            props: {
                                ...cardData,
                                icon: cardData.icon || 'icons/default.svg',
                                bg: "bg-stat-icon-gradient",
                                loading: isLoading,
                            },
                        })),
                    },
                    // Feeder Information Section (with meter config ratios inside)
                    {
                        layout: {
                            type: 'grid',
                            columns: 3,
                            className: 'border border-primary-border rounded-3xl bg-white p-4',
                            rows: [
                                {
                                    layout: 'row' as const,
                                    className: 'justify-between w-full',
                                    span: { col: 3, row: 1 },
                                    columns: [
                                        {   
                                           name: 'PageInformation',
                                           props: {
                                            title: 'Meter Information',
                                            isSectionHeader: true,
                                            layout: 'row',
                                            align: 'between',
                                            gap: 'gap-4',
                                            className: 'text-lg font-semibold'
                                           }
                                        }
                                    ]
                                },
                                // First Row - Basic Meter Information
                                {
                                    layout: 'row' as const,
                                    className: 'justify-between w-full mb-4',
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
                                                    items: meterInfoRow1.map(item => ({
                                                        title: item.title,
                                                        value: item.value,
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    }))
                                                }
                                            ]
                                           }
                                        }
                                    ]
                                },
                                // Second Row - Meter Configuration
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
                                                    items: meterInfoRow2.map(item => ({
                                                        title: item.title,
                                                        value: item.value,
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    }))
                                                }
                                            ]
                                           }
                                        }
                                    ]
                                }
                            ]
                        }
                    },
                    // Meter Readings Chart Section
                    {
                        layout: {
                            type: 'column',
                            gap: 'gap-4',
                        },
                        components: [
                            {
                                name: 'BarChart',
                                props: {
                                    showHeader: true,
                                    headerTitle: 'Meter Readings',
                                    dateRange: '',
                                    availableTimeRanges: ['Daily', 'Weekly', 'Monthly'],
                                    initialTimeRange: 'Daily',
                                    showDownloadButton: true,
                                    height: '400px',
                                    xAxisData: chartData.xAxisData,
                                    seriesData: chartData.seriesData,
                                    seriesColors: chartData.seriesColors,
                                    showXAxisLabel: true,
                                    xAxisLabel: 'kWh',
                                    onTimeRangeChange: (range: string) => {
                                
                                        
                                        // Switch chart data based on time range
                                        if (meterData?.meterReadingsAggregated && chartData.timeRangeData) {
                                            const timeRange = range.toLowerCase();
                                            const newData = chartData.timeRangeData[timeRange];
                                            
                                            if (newData) {
                                                setChartData(prev => ({
                                                    ...prev,
                                                    xAxisData: newData.xAxisData,
                                                    seriesData: newData.seriesData
                                                }));
                                            }
                                        }
                                    },
                                    onViewTypeChange: (_viewType: string) => {
                                        // Handle view type change if needed
                                    },
                                    onDownload: (_timeRange: string, _viewType: string) => {
                                        // Handle download if needed
                                    },
                                    isLoading: isLoading,
                                }
                            }
                        ]
                    },
                    // Meter History Section
                    {
                        layout:{
                            type:"column" as const,
                            gap:"gap-4"
                        },
                        components:[
                            {
                                name:'Table',
                                props:{
                                    data: meterInfoData,
                                    columns: meterInfoColumns,
                                    actions: meterDetailAction,
                                    showActions: false,
                                    showHeader: true,
                                    headerTitle: 'Meter History',
                                    searchable: true,
                                    pagination: true,
                                    initialRowsPerPage: 10,
                                    className:"[&_.relative]:mt-0",
                                    emptyMessage: "No meter history found",
                                    loading: isLoading,
                                    availableTimeRanges: [],                                        
                                }
                            }
                        ]
                    }
                ]}
            />
        </div>
    );
};

export default MeterDetails;