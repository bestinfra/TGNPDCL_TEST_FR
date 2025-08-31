import { lazy } from 'react';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
const Page = lazy(() => import('SuperAdmin/Page'));
import BACKEND_URL from '../config';

const MeterDetails: React.FC = () => {
    const navigate = useNavigate();
    const { meterSlNo } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [meterData, setMeterData] = useState<any>(null);

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
            value: 'N/A',
            icon: '/icons/current-reading.svg',
            subtitle1: 'N/A',
            subtitle2: 'N/A',
        },
        {
            title: 'Status',
            value: 'N/A',
            icon: '/icons/status.svg',
            subtitle1: 'N/A',
            subtitle2: 'N/A',
        },
        {
            title: 'Meter Type',
            value: 'N/A',
            icon: '/icons/units.svg',
            subtitle1: 'N/A',
            subtitle2: 'N/A',
        },
        {
            title: 'Location',
            value: 'N/A',
            icon: '/icons/location.svg',
            subtitle1: 'N/A',
            subtitle2: 'N/A',
        },
    ]);

    // Meter information data - Using useState with smart fallbacks
    const [meterInfoRow1, setMeterInfoRow1] = useState([
        { title: 'Meter Sl No.', value: 'N/A' },
        { title: 'Modem Sl No', value: 'N/A' },
        { title: 'UID', value: 'N/A' },
        { title: 'Assigned To', value: 'N/A' },
        { title: 'Meter Make', value: 'N/A' },
    ]);

    const [meterInfoRow2, setMeterInfoRow2] = useState([
        { title: 'Meter CT Ratio', value: 'N/A' },
        { title: 'Meter PT Ratio', value: 'N/A' },
        { title: 'External CT Ratio', value: 'N/A' },
        { title: 'External PT Ratio', value: 'N/A' },
        { title: 'Multiplication Factor', value: 'N/A' },
    ]);

    // Table data - Using useState with smart fallbacks
    const [meterInfoData, setMeterInfoData] = useState<any[]>([]);

    // Chart data - Using useState with smart fallbacks
    const [chartData, setChartData] = useState({
        xAxisData: [] as string[],
        seriesData: [] as Array<{ name: string; data: number[] }>,
        seriesColors: ['#1976d2', '#ff9800']
    });

    const meterDetailAction = [
        {
            label: "View",
            icon: "/icons/eye.svg",
        },
        {
            label: 'edit',
            icon: '/icons/edit.svg'
        },
        {
            label: 'delete',
            icon: '/icons/delete.svg'
        }
    ];

    // Update computed data when meter data changes
    useEffect(() => {
        if (meterData && failedApis.length === 0) {
            // Update summary cards with real data using smart fallbacks
            setSummaryCards([
                {
                    title: 'Current Reading',
                    value: meterData.currentReading ? `${meterData.currentReading} kWh` : 'N/A',
                    icon: '/icons/current-reading.svg',
                    subtitle1: meterData.lastReadingDate ? `Last Reading: ${meterData.lastReadingDate}` : 'No readings available',
                    subtitle2: meterData.consumption ? `Consumption: ${meterData.consumption} kWh` : 'N/A',
                },
                {
                    title: 'Status',
                    value: meterData.status || 'N/A',
                    icon: '/icons/status.svg',
                    subtitle1: meterData.lastCommunication ? `Last Communication: ${new Date(meterData.lastCommunication).toLocaleString()}` : 'No communication data',
                    subtitle2: '',
                },
                {
                    title: 'Meter Type',
                    value: meterData.meterType || 'N/A',
                    icon: '/icons/units.svg',
                    subtitle1: meterData.phase ? `Phase Type: ${meterData.phase}` : 'Phase info not available',
                    subtitle2: '',
                },
                {
                    title: 'Location',
                    value: meterData.location || 'N/A',
                    icon: '/icons/location.svg',
                    subtitle1: meterData.installationDate ? `Installation Date: ${new Date(meterData.installationDate).toLocaleDateString()}` : 'Installation date not available',
                    subtitle2: '',
                },
            ]);

            // Update meter information rows with smart fallbacks
            setMeterInfoRow1([
                { title: 'Meter Sl No.', value: meterData.meterSerialNumber || 'N/A' },
                { title: 'Modem Sl No', value: meterData.modemSerialNumber || 'N/A' },
                { title: 'UID', value: meterData.uid || 'N/A' },
                { title: 'Assigned To', value: meterData.consumerName || 'N/A' },
                { title: 'Meter Make', value: meterData.meterMake || 'N/A' },
            ]);

            setMeterInfoRow2([
                { title: 'Meter CT Ratio', value: meterData.meterCTRatio || 'N/A' },
                { title: 'Meter PT Ratio', value: meterData.meterPTRatio || 'N/A' },
                { title: 'External CT Ratio', value: meterData.externalCTRatio || 'N/A' },
                { title: 'External PT Ratio', value: meterData.externalPTRatio || 'N/A' },
                { title: 'Multiplication Factor', value: meterData.multiplicationFactor || 'N/A' },
            ]);
            
            // Update table data with smart fallbacks
            if (meterData.history && meterData.history.length > 0) {
                setMeterInfoData(meterData.history.map((item: any, index: number) => ({
                    slNo: index + 1,
                    meterSlNo: item.meterSerialNumber || 'N/A',
                    modemSlNo: item.modemSerialNumber || 'N/A',
                    meterType: item.meterType || 'N/A',
                    meterMake: item.meterMake || 'N/A',
                    consumerName: item.consumerName || 'N/A',
                    location: item.location || 'N/A',
                    installationDate: item.installationDate ? new Date(item.installationDate).toLocaleDateString() : 'N/A',
                })));
            } else {
                setMeterInfoData([]);
            }

            // Update chart data with smart fallbacks
            if (meterData.readings && meterData.readings.length > 0) {
                setChartData({
                    xAxisData: meterData.readings.map((reading: any) => reading.date || 'N/A'),
                    seriesData: [{
                        name: 'Meter Readings',
                        data: meterData.readings.map((reading: any) => reading.value || 0)
                    }],
                    seriesColors: ['var(--color-primary)', 'var(--color-secondary)']
                });
            } else {
                setChartData({
                    xAxisData: [],
                    seriesData: [{
                        name: 'Meter Readings',
                        data: []
                    }],
                    seriesColors: ['var(--color-primary)', 'var(--color-secondary)']
                });
            }
        } else {
            // Set fallback data when there are errors or no meter data
            setSummaryCards([
                {
                    title: 'Current Reading',
                    value: 'N/A',
                    icon: '/icons/current-reading.svg',
                    subtitle1: 'N/A',
                    subtitle2: 'N/A',
                },
                {
                    title: 'Status',
                    value: 'N/A',
                    icon: '/icons/status.svg',
                    subtitle1: 'N/A',
                    subtitle2: 'N/A',
                },
                {
                    title: 'Meter Type',
                    value: 'N/A',
                    icon: '/icons/units.svg',
                    subtitle1: 'N/A',
                    subtitle2: 'N/A',
                },
                {
                    title: 'Location',
                    value: 'N/A',
                    icon: '/icons/location.svg',
                    subtitle1: 'N/A',
                    subtitle2: 'N/A',
                },
            ]);

            setMeterInfoRow1([
                { title: 'Meter Sl No.', value: 'N/A' },
                { title: 'Modem Sl No', value: 'N/A' },
                { title: 'UID', value: 'N/A' },
                { title: 'Assigned To', value: 'N/A' },
                { title: 'Meter Make', value: 'N/A' },
            ]);

            setMeterInfoRow2([
                { title: 'Meter CT Ratio', value: 'N/A' },
                { title: 'Meter PT Ratio', value: 'N/A' },
                { title: 'External CT Ratio', value: 'N/A' },
                { title: 'External PT Ratio', value: 'N/A' },
                { title: 'Multiplication Factor', value: 'N/A' },
            ]);

            setMeterInfoData([]);
            setChartData({
                xAxisData: [],
                seriesData: [{
                    name: 'Meter Readings',
                    data: []
                }],
                seriesColors: ['var(--color-primary)', 'var(--color-secondary)']
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
            
            const response = await fetch(`${BACKEND_URL}/meters/${meterSlNo}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            
            if (result.success) {
                setMeterData(result.data);
                console.log('Meter data:', result.data);
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
        { key: 'consumerName', label: 'Consumer Name' },
        { key: 'location', label: 'Location' },
        { key: 'installationDate', label: 'Installation Date' },
    ];

    return (
        <div className="min-h-screen">
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
                                icon: cardData.icon || '/icons/default.svg',
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
                                        console.log('Time range changed:', range);
                                    },
                                    onViewTypeChange: (viewType: string) => {
                                        console.log('View type changed:', viewType);
                                    },
                                    onDownload: (timeRange: string, viewType: string) => {
                                        console.log('Download requested:', timeRange, viewType);
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
