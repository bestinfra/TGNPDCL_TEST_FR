import { lazy } from 'react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
const Page = lazy(() => import('SuperAdmin/Page'));
import { exportChartData } from '../utils/excelExport';
import { FILTER_STYLES } from '../contexts/FilterStyleContext';
import BACKEND_URL from '../config';


// Dummy data for fallback
const dummyInstantaneousStatsData = {
    rphVolt: 'N/A',
    yphVolt: 'N/A',
    bphVolt: 'N/A',
    instantKVA: 'N/A',
    mdKVA: 'N/A',
    rphCurr: 'N/A',
    yphCurr: 'N/A',
    bphCurr: 'N/A',
    neutralCurrent: 'N/A',
    freqHz: 'N/A',
    rphPF: 'N/A',
    yphPF: 'N/A',
    bphPF: 'N/A',
    avgPF: 'N/A',
    cumulativeKVAh: 'N/A',
    lastCommDate: null
};

const dummyConsumptionAnalyticsData = {
    xAxisData: ['N/A'],
    seriesData: [{ name: 'Consumption', data: [0] }],
    monthly: {
        xAxisData: ['N/A'],
        seriesData: [{ name: 'Consumption', data: [0] }]
    }
};

const dummyFeederInfoData = {
    dtr: {
        dtrNumber: 'N/A',
        capacity: 'N/A',
        status: 'N/A'
    },
    totalFeeders: 'N/A'
};

const dummyAlertsData = [
    {
        alertId: 'N/A',
        type: 'N/A',
        feederName: 'N/A',
        occuredOn: 'N/A',
    }
];

// Default stats data
const defaultStats = [
    { title: 'R-Phase Voltage', value: '257.686', icon: '/icons/r-phase-voltage.svg', subtitle1: 'Volts', bg: 'bg-[var(--color-danger)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE },
    { title: 'Y-Phase Voltage', value: '255.089', icon: '/icons/r-phase-voltage.svg', subtitle1: 'Volts', bg: 'bg-[var(--color-warning-alt)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE},
    { title: 'B-Phase Voltage', value: '254.417', icon: '/icons/r-phase-voltage.svg', subtitle1: 'Volts', bg: 'bg-[var(--color-primary)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE},
    { title: 'Apparent Power', value: '19.527', icon: '/icons/consumption.svg', subtitle1: 'kVA' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.BRAND_GREEN},
    { title: 'MD-kVA', value: '52.220', icon: '/icons/consumption.svg', subtitle1: 'kVA' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.BRAND_GREEN},
    { title: 'R-Phase Current', value: '15.892', icon: '/icons/r-phase-current.svg', subtitle1: 'Amps', bg: 'bg-[var(--color-danger)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE},
    { title: 'Y-Phase Current', value: '27.644', icon: '/icons/r-phase-current.svg', subtitle1: 'Amps', bg: 'bg-[var(--color-warning-alt)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE},
    { title: 'B-Phase Current', value: '33.984', icon: '/icons/r-phase-current.svg', subtitle1: 'Amps', bg: 'bg-[var(--color-primary)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8',valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base' ,iconStyle: FILTER_STYLES.WHITE},
    { title: 'Neutral Current', value: '12.980', icon: '/icons/consumption.svg', subtitle1: 'Amps' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.BRAND_GREEN},
    { title: 'Frequency', value: '49.980', icon: '/icons/frequency.svg', subtitle1: 'Hz' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.BRAND_GREEN},
    { title: 'R-Phase PF', value: '1.000', icon: '/icons/power-factor.svg', subtitle1: 'Power Factor', bg: 'bg-[var(--color-danger)]', iconClassName: 'w-4 h-4', width: 'w-8', height: 'h-8' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE}, 
    { title: 'Y-Phase PF', value: '-0.987', icon: '/icons/power-factor.svg', subtitle1: 'Power Factor', bg: 'bg-[var(--color-warning-alt)]', iconClassName: 'w-4 h-4', width: 'w-8', height: 'h-8' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE},
    { title: 'B-Phase PF', value: '0.998', icon: '/icons/power-factor.svg', subtitle1: 'Power Factor', bg: 'bg-[var(--color-primary)]', iconClassName: 'w-4 h-4', width: 'w-8', height: 'h-8' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE},
    { title: 'Avg PF', value: '-0.999', icon: '/icons/power-factor.svg', subtitle1: 'Power Factor' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.BRAND_GREEN},
    { title: 'Cummulative kVAh', value: '77902.296', icon: '/icons/consumption.svg', subtitle1: 'kVAh' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.BRAND_GREEN},
];

const Feeders = () => {
    const { dtrId, feederId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    console.log('Feeders Page - DTR ID:', dtrId, 'Feeder ID:', feederId);
    
    // Get passed data from navigation state
    const passedData = location.state as {
        feederData?: {
            sNo: number;
            feederName: string;
            loadStatus: string;
            rating: string;
            address: string;
        };
        dtrId?: string;
        dtrName?: string;
        dtrNumber?: string;
    } | null;
    
    // Determine if this is an individual feeder page or DTR page
    const isIndividualFeeder = !!feederId;
    const currentFeederId = feederId || dtrId;
    
    // Use passed feeder data if available, otherwise use default
    const feederData = passedData?.feederData;

    // State for API data - initialized with dummy data
    const [instantaneousStatsData, setInstantaneousStatsData] = useState<any>(dummyInstantaneousStatsData);
    const [consumptionAnalyticsData, setConsumptionAnalyticsData] = useState<any>(dummyConsumptionAnalyticsData);
    const [feederInfoData, setFeederInfoData] = useState<any>(dummyFeederInfoData);
    const [alertsData, setAlertsData] = useState(dummyAlertsData);
    const [kvaMetricsData, setKvaMetricsData] = useState<any>({
        xAxisData: [],
        seriesData: [{ name: 'kVA', data: [] }]
    });

    // Loading states - initialized to true
    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [isConsumptionLoading, setIsConsumptionLoading] = useState(true);
    const [isAlertsLoading, setIsAlertsLoading] = useState(true);
    const [isKvaMetricsLoading, setIsKvaMetricsLoading] = useState(true);

    // State for tracking failed APIs
    const [failedApis, setFailedApis] = useState<Array<{
        id: string;
        name: string;
        retryFunction: () => Promise<void>;
        errorMessage: string;
    }>>([]);

    // API Functions
    const fetchInstantaneousStats = async () => {
        // Use numeric ID from passed data or extract from dtrNumber
        const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
        if (!numericDtrId) return;

        setIsStatsLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/instantaneousStats`);
            const data = await response.json();
            
            if (data.success) {
                console.log('Instantaneous stats API response:', data.data);
                console.log('lastCommDate from API:', data.data.lastCommDate);
                // Ensure we're setting the actual API data, not mixing with dummy data
                const apiData = {
                    ...data.data,
                    lastCommDate: data.data.lastCommDate || null
                };
                console.log('Setting instantaneous stats data:', apiData);
                setInstantaneousStatsData(apiData);
            } else {
                throw new Error(data.message || 'Failed to fetch instantaneous stats');
            }
        } catch (error: any) {
            console.error('Error fetching instantaneous stats:', error);
            setInstantaneousStatsData(dummyInstantaneousStatsData);
            setFailedApis(prev => [...prev, {
                id: 'instantaneousStats',
                name: 'Instantaneous Stats',
                retryFunction: fetchInstantaneousStats,
                errorMessage: error.message || 'Failed to fetch instantaneous stats'
            }]);
        } finally {
            setIsStatsLoading(false);
        }
    };

    const fetchConsumptionAnalytics = async () => {
        // Use numeric ID from passed data or extract from dtrNumber
        const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
        if (!numericDtrId) return;

        setIsConsumptionLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/consumptionAnalytics`);
            const data = await response.json();
            
            if (data.status === 'success') {
                // Transform the data to match frontend expectations
                const transformedData = {
                    xAxisData: data.data.dailyData?.xAxisData || [],
                    seriesData: [{
                        name: 'Consumption',
                        data: data.data.dailyData?.sums?.map((sum: string) => parseFloat(sum)) || []
                    }],
                    monthly: {
                        xAxisData: data.data.monthlyData?.xAxisData || [],
                        seriesData: [{
                            name: 'Consumption',
                            data: data.data.monthlyData?.sums?.map((sum: string) => parseFloat(sum)) || []
                        }]
                    }
                };
                setConsumptionAnalyticsData(transformedData);
            } else {
                throw new Error(data.message || 'Failed to fetch consumption analytics');
            }
        } catch (error: any) {
            console.error('Error fetching consumption analytics:', error);
            setConsumptionAnalyticsData(dummyConsumptionAnalyticsData);
            setFailedApis(prev => [...prev, {
                id: 'consumptionAnalytics',
                name: 'Consumption Analytics',
                retryFunction: fetchConsumptionAnalytics,
                errorMessage: error.message || 'Failed to fetch consumption analytics'
            }]);
        } finally {
            setIsConsumptionLoading(false);
        }
    };

    const fetchFeederInfo = async () => {
        // Use numeric ID from passed data or extract from dtrNumber
        const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
        if (!numericDtrId) return;

        try {
            const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}`);
            const data = await response.json();
            
            if (data.success) {
                setFeederInfoData(data.data);
            } else {
                throw new Error(data.message || 'Failed to fetch feeder information');
            }
        } catch (error: any) {
            console.error('Error fetching feeder information:', error);
            setFeederInfoData(dummyFeederInfoData);
            setFailedApis(prev => [...prev, {
                id: 'feederInfo',
                name: 'Feeder Info',
                retryFunction: fetchFeederInfo,
                errorMessage: error.message || 'Failed to fetch feeder information'
            }]);
        }
    };

    const fetchAlerts = async () => {
        // Use numeric ID from passed data or extract from dtrNumber
        const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
        if (!numericDtrId) return;

        setIsAlertsLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/alerts`);
            const data = await response.json();
            
            if (data.success) {
                setAlertsData(data.data);
            } else {
                throw new Error(data.message || 'Failed to fetch alerts');
            }
        } catch (error: any) {
            console.error('Error fetching alerts:', error);
            setAlertsData(dummyAlertsData);
            setFailedApis(prev => [...prev, {
                id: 'alerts',
                name: 'Alerts',
                retryFunction: fetchAlerts,
                errorMessage: error.message || 'Failed to fetch alerts'
            }]);
        } finally {
            setIsAlertsLoading(false);
        }
    };

    const fetchKVAMetrics = async () => {
        // Use numeric ID from passed data or extract from dtrNumber
        const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
        if (!numericDtrId) return;

        setIsKvaMetricsLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/kvaMetrics`);
            const data = await response.json();
            console.log('kva metrics data', data);
            
            if (data.success) {
                // Transform the data to match frontend expectations
                const transformedData = {
                    xAxisData: data.data?.xAxisData || [],
                    seriesData: [{
                        name: 'kVA',
                        data: data.data?.seriesData || []
                    }]
                };
                setKvaMetricsData(transformedData);
            } else {
                throw new Error(data.message || 'Failed to fetch KVA metrics');
            }
        } catch (error: any) {
            console.error('Error fetching KVA metrics:', error);
            setKvaMetricsData({
                xAxisData: [],
                seriesData: [{ name: 'kVA', data: [] }]
            });
            setFailedApis(prev => [...prev, {
                id: 'kvaMetrics',
                name: 'KVA Metrics',
                retryFunction: fetchKVAMetrics,
                errorMessage: error.message || 'Failed to fetch KVA metrics'
            }]);
        } finally {
            setIsKvaMetricsLoading(false);
        }
    };

    // Generate stats from API data or use defaults
    const getStats = () => {
        if (instantaneousStatsData && Object.keys(instantaneousStatsData).length > 0 && instantaneousStatsData.rphVolt !== 'N/A') {
            return [
                { title: 'R-Phase Voltage', value: instantaneousStatsData.rphVolt?.toString() || '257.686', icon: '/icons/r-phase-voltage.svg', subtitle1: 'Volts', bg: 'bg-[var(--color-danger)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE, loading: isStatsLoading },
                { title: 'Y-Phase Voltage', value: instantaneousStatsData.yphVolt?.toString() || '255.089', icon: '/icons/r-phase-voltage.svg', subtitle1: 'Volts', bg: 'bg-[var(--color-warning-alt)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE, loading: isStatsLoading},
                { title: 'B-Phase Voltage', value: instantaneousStatsData.bphVolt?.toString() || '254.417', icon: '/icons/r-phase-voltage.svg', subtitle1: 'Volts', bg: 'bg-[var(--color-primary)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE, loading: isStatsLoading},
                { title: 'Apparent Power', value: instantaneousStatsData.instantKVA?.toString() || '19.527', icon: '/icons/consumption.svg', subtitle1: 'kVA' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.BRAND_GREEN, loading: isStatsLoading},
                { title: 'MD-kVA', value: instantaneousStatsData.mdKVA?.toString() || '52.220', icon: '/icons/consumption.svg', subtitle1: 'kVA' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.BRAND_GREEN, loading: isStatsLoading},
                { title: 'R-Phase Current', value: instantaneousStatsData.rphCurr?.toString() || '15.892', icon: '/icons/r-phase-current.svg', subtitle1: 'Amps', bg: 'bg-[var(--color-danger)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE, loading: isStatsLoading},
                { title: 'Y-Phase Current', value: instantaneousStatsData.yphCurr?.toString() || '27.644', icon: '/icons/r-phase-current.svg', subtitle1: 'Amps', bg: 'bg-[var(--color-warning-alt)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE, loading: isStatsLoading},
                { title: 'B-Phase Current', value: instantaneousStatsData.bphCurr?.toString() || '33.984', icon: '/icons/r-phase-current.svg', subtitle1: 'Amps', bg: 'bg-[var(--color-primary)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8',valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base' ,iconStyle: FILTER_STYLES.WHITE, loading: isStatsLoading},
                { title: 'Neutral Current', value: instantaneousStatsData.neutralCurrent?.toString() || '12.980', icon: '/icons/consumption.svg', subtitle1: 'Amps' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.BRAND_GREEN, loading: isStatsLoading},
                { title: 'Frequency', value: instantaneousStatsData.freqHz?.toString() || '49.980', icon: '/icons/frequency.svg', subtitle1: 'Hz' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.BRAND_GREEN, loading: isStatsLoading},
                { title: 'R-Phase PF', value: instantaneousStatsData.rphPF?.toString() || '1.000', icon: '/icons/power-factor.svg', subtitle1: 'Power Factor', bg: 'bg-[var(--color-danger)]', iconClassName: 'w-4 h-4', width: 'w-8', height: 'h-8' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE, loading: isStatsLoading}, 
                { title: 'Y-Phase PF', value: instantaneousStatsData.yphPF?.toString() || '-0.987', icon: '/icons/power-factor.svg', subtitle1: 'Power Factor', bg: 'bg-[var(--color-warning-alt)]', iconClassName: 'w-4 h-4', width: 'w-8', height: 'h-8' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE, loading: isStatsLoading},
                { title: 'B-Phase PF', value: instantaneousStatsData.bphPF?.toString() || '0.998', icon: '/icons/power-factor.svg', subtitle1: 'Power Factor', bg: 'bg-[var(--color-primary)]', iconClassName: 'w-4 h-4', width: 'w-8', height: 'h-8' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.WHITE, loading: isStatsLoading},
                { title: 'Avg PF', value: instantaneousStatsData.avgPF?.toString() || '-0.999', icon: '/icons/power-factor.svg', subtitle1: 'Power Factor' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.BRAND_GREEN, loading: isStatsLoading},
                { title: 'Cummulative kVAh', value: instantaneousStatsData.cumulativeKVAh?.toString() || '77902.296', icon: '/icons/consumption.svg', subtitle1: 'kVAh' ,valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',iconStyle: FILTER_STYLES.BRAND_GREEN, loading: isStatsLoading},
            ];
        }
        return defaultStats.map(stat => ({ ...stat, loading: isStatsLoading }));
    };

        // Monthly consumption data - will be updated from API
    const getMonthlyConsumptionData = () => {
        if (consumptionAnalyticsData && consumptionAnalyticsData.monthly) {
            return {
                xAxisData: consumptionAnalyticsData.monthly.xAxisData || [],
                seriesData: consumptionAnalyticsData.monthly.seriesData || [{ name: 'Consumption', data: [] }],
            };
        }
        return {
            xAxisData: [],
            seriesData: [{ name: 'Consumption', data: [] }],
        };
    };

    // Retry functions for each API
    const retryStatsAPI = async () => {
        setIsStatsLoading(true);
        try {
            const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
            if (!numericDtrId) return;

            const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/instantaneousStats`);
            if (!response.ok) throw new Error('Failed to fetch instantaneous stats');
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format');
            }
            
            const data = await response.json();
            if (data.success) {
                console.log('Retry - Instantaneous stats API response:', data.data);
                console.log('Retry - lastCommDate from API:', data.data.lastCommDate);
                // Ensure we're setting the actual API data, not mixing with dummy data
                const apiData = {
                    ...data.data,
                    lastCommDate: data.data.lastCommDate || null
                };
                console.log('Retry - Setting instantaneous stats data:', apiData);
                setInstantaneousStatsData(apiData);
                setFailedApis(prev => prev.filter(api => api.id !== 'instantaneousStats'));
            } else {
                throw new Error(data.message || 'Failed to fetch instantaneous stats');
            }
        } catch (err: any) {
            console.error("Error in Stats API:", err);
            setInstantaneousStatsData(dummyInstantaneousStatsData);
        } finally {
            setTimeout(() => {
                setIsStatsLoading(false);
            }, 1000);
        }
    };

    const retryConsumptionAPI = async () => {
        setIsConsumptionLoading(true);
        try {
            const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
            if (!numericDtrId) return;

            const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/consumptionAnalytics`);
            if (!response.ok) throw new Error('Failed to fetch consumption analytics');
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format');
            }
            
            const data = await response.json();
            if (data.status === 'success') {
                const transformedData = {
                    xAxisData: data.data.dailyData?.xAxisData || [],
                    seriesData: [{
                        name: 'Consumption',
                        data: data.data.dailyData?.sums?.map((sum: string) => parseFloat(sum)) || []
                    }],
                    monthly: {
                        xAxisData: data.data.monthlyData?.xAxisData || [],
                        seriesData: [{
                            name: 'Consumption',
                            data: data.data.monthlyData?.sums?.map((sum: string) => parseFloat(sum)) || []
                        }]
                    }
                };
                setConsumptionAnalyticsData(transformedData);
                setFailedApis(prev => prev.filter(api => api.id !== 'consumptionAnalytics'));
            } else {
                throw new Error(data.message || 'Failed to fetch consumption analytics');
            }
        } catch (err: any) {
            console.error("Error in Consumption API:", err);
            setConsumptionAnalyticsData(dummyConsumptionAnalyticsData);
        } finally {
            setTimeout(() => {
                setIsConsumptionLoading(false);
            }, 1000);
        }
    };

    const retryFeederInfoAPI = async () => {
        try {
            const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
            if (!numericDtrId) return;

            const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}`);
            if (!response.ok) throw new Error('Failed to fetch feeder information');
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format');
            }
            
            const data = await response.json();
            if (data.success) {
                setFeederInfoData(data.data);
                setFailedApis(prev => prev.filter(api => api.id !== 'feederInfo'));
            } else {
                throw new Error(data.message || 'Failed to fetch feeder information');
            }
        } catch (err: any) {
            console.error("Error in Feeder Info API:", err);
            setFeederInfoData(dummyFeederInfoData);
        }
    };

    const retryAlertsAPI = async () => {
        setIsAlertsLoading(true);
        try {
            const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
            if (!numericDtrId) return;

            const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/alerts`);
            if (!response.ok) throw new Error('Failed to fetch alerts');
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format');
            }
            
            const data = await response.json();
            if (data.success) {
                setAlertsData(data.data);
                setFailedApis(prev => prev.filter(api => api.id !== 'alerts'));
            } else {
                throw new Error(data.message || 'Failed to fetch alerts');
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

    const retryKVAMetricsAPI = async () => {
        setIsKvaMetricsLoading(true);
        try {
            const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
            if (!numericDtrId) return;

            const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/kvaMetrics`);
            if (!response.ok) throw new Error('Failed to fetch KVA metrics');
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format');
            }
            
            const data = await response.json();
            if (data.success) {
                const transformedData = {
                    xAxisData: data.data?.xAxisData || [],
                    seriesData: [{
                        name: 'kVA',
                        data: data.data?.seriesData || []
                    }]
                };
                setKvaMetricsData(transformedData);
                setFailedApis(prev => prev.filter(api => api.id !== 'kvaMetrics'));
            } else {
                throw new Error(data.message || 'Failed to fetch KVA metrics');
            }
        } catch (err: any) {
            console.error("Error in KVA Metrics API:", err);
            setKvaMetricsData({
                xAxisData: [],
                seriesData: [{ name: 'kVA', data: [] }]
            });
        } finally {
            setTimeout(() => {
                setIsKvaMetricsLoading(false);
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

    // Load data on component mount
    useEffect(() => {
        const fetchInstantaneousStats = async () => {
            setIsStatsLoading(true);
            try {
                const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
                if (!numericDtrId) return;

                const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/instantaneousStats`);
                if (!response.ok) throw new Error('Failed to fetch instantaneous stats');
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Invalid response format');
                }
                
                const data = await response.json();
                if (data.success) {
                    console.log('useEffect - Instantaneous stats API response:', data.data);
                    console.log('useEffect - lastCommDate from API:', data.data.lastCommDate);
                    // Ensure we're setting the actual API data, not mixing with dummy data
                    const apiData = {
                        ...data.data,
                        lastCommDate: data.data.lastCommDate || null
                    };
                    console.log('useEffect - Setting instantaneous stats data:', apiData);
                    setInstantaneousStatsData(apiData);
                } else {
                    throw new Error(data.message || 'Failed to fetch instantaneous stats');
                }
            } catch (error: any) {
                console.error('Error fetching instantaneous stats:', error);
                setInstantaneousStatsData(dummyInstantaneousStatsData);
                setFailedApis(prev => {
                    if (!prev.find(api => api.id === 'instantaneousStats')) {
                        return [...prev, { 
                            id: 'instantaneousStats', 
                            name: 'Instantaneous Stats', 
                            retryFunction: retryStatsAPI, 
                            errorMessage: 'Failed to load Instantaneous Statistics. Please try again.' 
                        }];
                    }
                    return prev;
                });
            } finally {
                setTimeout(() => {
                    setIsStatsLoading(false);
                }, 1000);
            }
        };

        const fetchConsumptionAnalytics = async () => {
            setIsConsumptionLoading(true);
            try {
                const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
                if (!numericDtrId) return;

                const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/consumptionAnalytics`);
                if (!response.ok) throw new Error('Failed to fetch consumption analytics');
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Invalid response format');
                }
                
                const data = await response.json();
                if (data.status === 'success') {
                    const transformedData = {
                        xAxisData: data.data.dailyData?.xAxisData || [],
                        seriesData: [{
                            name: 'Consumption',
                            data: data.data.dailyData?.sums?.map((sum: string) => parseFloat(sum)) || []
                        }],
                        monthly: {
                            xAxisData: data.data.monthlyData?.xAxisData || [],
                            seriesData: [{
                                name: 'Consumption',
                                data: data.data.monthlyData?.sums?.map((sum: string) => parseFloat(sum)) || []
                            }]
                        }
                    };
                    setConsumptionAnalyticsData(transformedData);
                } else {
                    throw new Error(data.message || 'Failed to fetch consumption analytics');
                }
            } catch (error: any) {
                setConsumptionAnalyticsData(dummyConsumptionAnalyticsData);
                setFailedApis(prev => {
                    if (!prev.find(api => api.id === 'consumptionAnalytics')) {
                        return [...prev, { 
                            id: 'consumptionAnalytics', 
                            name: 'Consumption Analytics', 
                            retryFunction: retryConsumptionAPI, 
                            errorMessage: 'Failed to load Consumption Analytics. Please try again.' 
                        }];
                    }
                    return prev;
                });
            } finally {
                setTimeout(() => {
                    setIsConsumptionLoading(false);
                }, 1000);
            }
        };

        const fetchFeederInfo = async () => {
            try {
                const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
                if (!numericDtrId) return;

                const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}`);
                if (!response.ok) throw new Error('Failed to fetch feeder information');
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Invalid response format');
                }
                
                const data = await response.json();
                if (data.success) {
                    setFeederInfoData(data.data);
                } else {
                    throw new Error(data.message || 'Failed to fetch feeder information');
                }
            } catch (error: any) {
                setFeederInfoData(dummyFeederInfoData);
                setFailedApis(prev => {
                    if (!prev.find(api => api.id === 'feederInfo')) {
                        return [...prev, { 
                            id: 'feederInfo', 
                            name: 'Feeder Information', 
                            retryFunction: retryFeederInfoAPI, 
                            errorMessage: 'Failed to load Feeder Information. Please try again.' 
                        }];
                    }
                    return prev;
                });
            }
        };

        const fetchAlertsData = async () => {
            setIsAlertsLoading(true);
            try {
                const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
                if (!numericDtrId) return;

                const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/alerts`);
                if (!response.ok) throw new Error('Failed to fetch alerts');
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Invalid response format');
                }
                
                const data = await response.json();
                if (data.success) {
                    setAlertsData(data.data);
                } else {
                    throw new Error(data.message || 'Failed to fetch alerts');
                }
            } catch (error: any) {
                setAlertsData(dummyAlertsData);
                setFailedApis(prev => {
                    if (!prev.find(api => api.id === 'alerts')) {
                        return [...prev, { 
                            id: 'alerts', 
                            name: 'Alerts Data', 
                            retryFunction: retryAlertsAPI, 
                            errorMessage: 'Failed to load Alerts Data. Please try again.' 
                        }];
                    }
                    return prev;
                });
            } finally {
                setTimeout(() => {
                    setIsAlertsLoading(false);
                }, 1000);
            }
        };

        const fetchKVAMetricsData = async () => {
            setIsKvaMetricsLoading(true);
            try {
                const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
                if (!numericDtrId) return;

                const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/kvaMetrics`);
                if (!response.ok) throw new Error('Failed to fetch KVA metrics');
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Invalid response format');
                }
                
                const data = await response.json();
                if (data.success) {
                    const transformedData = {
                        xAxisData: data.data?.xAxisData || [],
                        seriesData: [{
                            name: 'kVA',
                            data: data.data?.seriesData || []
                        }]
                    };
                    setKvaMetricsData(transformedData);
                } else {
                    throw new Error(data.message || 'Failed to fetch KVA metrics');
                }
            } catch (error: any) {
                setKvaMetricsData({
                    xAxisData: [],
                    seriesData: [{ name: 'kVA', data: [] }]
                });
                setFailedApis(prev => {
                    if (!prev.find(api => api.id === 'kvaMetrics')) {
                        return [...prev, { 
                            id: 'kvaMetrics', 
                            name: 'KVA Metrics Data', 
                            retryFunction: retryKVAMetricsAPI, 
                            errorMessage: 'Failed to load KVA Metrics Data. Please try again.' 
                        }];
                    }
                    return prev;
                });
            } finally {
                setTimeout(() => {
                    setIsKvaMetricsLoading(false);
                }, 1000);
            }
        };

        if (dtrId) {
            fetchInstantaneousStats();
            fetchConsumptionAnalytics();
            fetchFeederInfo();
            fetchAlertsData();
            fetchKVAMetricsData();
        }
    }, [dtrId]);

    // Enhanced data for Alerts Table with more entries
    const [_feederData, _setFeederData] = useState([
        { title: 'Feeder Name', description: 'D1F1(32500114)' },
        { title: 'Rating', description: '25.00 kVA' },
        { title: 'Address', description: 'Waddepally, Warangal, Telangana, India, 506001' },
    ]);

    // Handle Excel download for daily consumption chart
    const handleDailyChartDownload = () => {
        // Use KVA metrics data if available, otherwise use empty data
        const xAxisData = kvaMetricsData.xAxisData || [];
        const seriesData = kvaMetricsData.seriesData || [{ name: 'kVA', data: [] }];
        exportChartData(xAxisData, seriesData, 'feeder-kva-metrics-data');
    };

    // Handle Excel download for monthly consumption chart
    const handleMonthlyChartDownload = () => {
        const monthlyData = getMonthlyConsumptionData();
        exportChartData(monthlyData.xAxisData, monthlyData.seriesData, 'feeder-monthly-consumption-data');
    };

    // Debug: Log failedApis state
    console.log('Feeders - failedApis:', failedApis);
    console.log('Feeders - failedApis.length:', failedApis.length);
    console.log('Feeders - instantaneousStatsData:', instantaneousStatsData);
    console.log('Feeders - lastCommDate in state:', instantaneousStatsData?.lastCommDate);
    console.log('Feeders - kvaMetricsData:', kvaMetricsData);

    return (
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
                                            maxVisibleErrors: 3,
                                            failedApis: failedApis,
                                            onRetrySpecific: retrySpecificAPI,
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
                                            title: isIndividualFeeder ? `Feeder ${feederData?.feederName || currentFeederId}` : 'Feeder Information',
                                            onBackClick: () => {
                                                if (isIndividualFeeder) {
                                                    // Go back to the specific DTR detail page if we have the DTR ID
                                                    if (passedData?.dtrId) {
                                                        navigate(`/dtr-detail/${passedData.dtrId}`);
                                                    } else {
                                                        navigate('/dtr-dashboard');
                                                    }
                                                } else {
                                                    window.history.back();
                                                }
                                            },
                                            backButtonText: isIndividualFeeder ? (passedData?.dtrName ? `Back to ${passedData.dtrName}` : 'Back to DTR Dashboard') : 'Back to Dashboard',
                                            buttonsLabel: 'Export Data',
                                            variant: 'primary',
                                            onClick: () => handleDailyChartDownload(),
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
                        className: 'border border-primary-border dark:border-dark-border rounded-3xl bg-white p-4 dark:bg-primary-dark-light',
                        rows: [
                            {
                                layout: 'row' as const,
                                className: 'justify-between w-full',
                                span: { col: 3, row: 1 },
                                columns: [
                                    {
                                        name: 'SectionHeader',
                                        props: {
                                            title: isIndividualFeeder ? `Feeder ${feederData?.feederName || currentFeederId} Information` : 'DTR Information',
                                            titleLevel: 2,
                                            titleSize: 'md',
                                            titleVariant: 'primary',
                                            titleWeight: 'bold',
                                            titleAlign: 'left',
                                            defaultTitleHeight:'0',
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
                                        gridColumns: 3,
                                        rows: [
                                            {
                                                layout: 'row',
                                                className: 'justify-between w-full',
                                                span: { col: 3, row: 1 },
                                                items: [
                                                    {
                                                        title: 'DTR Number',
                                                        value: feederInfoData?.dtr?.dtrNumber || 'DTR-007',
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    },
                                                    {
                                                        title: 'Capacity',
                                                        value: `${feederInfoData?.dtr?.capacity || 100} kVA`,
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    },
                                                    {
                                                        title: 'Status',
                                                        value: feederInfoData?.dtr?.status || 'ACTIVE',
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    },
                                                    {
                                                        title: 'Total Feeders',
                                                        value: feederInfoData?.totalFeeders?.toString() || '1',
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    }
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
                        className: 'w-full p-4 border border-primary-border dark:border-dark-border rounded-3xl dark:bg-primary-dark-light',
                        rows: [
                            {
                                layout: 'row' as const,
                                className: 'justify-between w-full',
                                span: { col: 1, row: 1 },
                                columns: [
                                    {
                                        name: 'SectionHeader',
                                        props: {
                                            title: isIndividualFeeder ? `Feeder ${feederData?.feederName || currentFeederId} Information` : 'Instantaneous Stats',
                                            titleLevel: 2,
                                            titleSize: 'md',
                                            titleVariant: 'primary',
                                            titleWeight: 'bold',
                                            titleAlign: 'left',
                                            className:'w-full',
                                            rightComponent: { name: 'LastComm', props: { 
                                                value: (() => {
                                                    const lastComm = instantaneousStatsData?.lastCommDate;
                                                    console.log('LastComm component - lastCommDate:', lastComm);
                                                    if (lastComm && lastComm !== 'N/A' && lastComm !== null) {
                                                        try {
                                                            const date = new Date(lastComm);
                                                            if (!isNaN(date.getTime())) {
                                                                return date.toLocaleString('en-IN', { 
                                                                    year: 'numeric', 
                                                                    month: '2-digit', 
                                                                    day: '2-digit',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                    second: '2-digit',
                                                                    hour12: false
                                                                });
                                                            } else {
                                                                console.warn('Invalid date from lastCommDate:', lastComm);
                                                                return `Raw: ${lastComm}`;
                                                            }
                                                        } catch (error) {
                                                            console.error('Error parsing lastCommDate:', error);
                                                            return `Raw: ${lastComm}`;
                                                        }
                                                    }
                                                    return '2024-01-15 14:30:00';
                                                })()
                                            } },
                                        },
                                        span: { col: 1, row: 1 },
                                    },
                                ],
                            },
                            {
                                layout: 'grid' as const,
                                gridColumns: 5,
                                className: 'w-full gap-4',
                                columns: getStats().map((stat: any) => ({
                                    name: 'Card',
                                    props: {
                                        title: stat.title,
                                        value: stat.value,
                                        subtitle1: stat.subtitle1,
                                        icon: stat.icon,
                                        bg: stat.bg ,
                                        iconClassName: stat.iconClassName || 'w-4 h-4',
                                        iconStyle: stat.iconStyle || FILTER_STYLES.WHITE,
                                        width: stat.width || 'w-8',
                                        height: stat.height || 'h-8',
                                        valueFontSize: stat.valueFontSize || 'text-lg lg:text-xl md:text-lg sm:text-base',
                                        loading: stat.loading,
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
                        rows: [
                            {
                                layout: 'grid' as const,
                                className:"w-full",
                                columns: [
                                    {
                                        name: 'BarChart',
                                        props: {
                                            xAxisData: getMonthlyConsumptionData().xAxisData,
                                            seriesData: getMonthlyConsumptionData().seriesData,
                                            height: 320,
                                            showHeader: true,  
                                            headerTitle: 'Consumption Metrics Bar Chart',
                                            className: 'w-full',
                                            dateRange: 'Last 30 days',
                                            showDownloadButton: true,
                                            onDownload: () => handleMonthlyChartDownload(),
                                            showXAxisLabel: true,
                                            xAxisLabel: 'kWAh',
                                            isLoading: isConsumptionLoading,
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
                        rows: [
                            {
                                layout: 'grid' as const,
                                gridColumns:1,
                                columns: [
                                    {
                                        name: 'BarChart',
                                        props: {
                                            xAxisData: kvaMetricsData.xAxisData,
                                            seriesData: kvaMetricsData.seriesData,
                                            height: 320,
                                            ariaLabel: ' kVA Metrics Bar Chart',
                                            showHeader: true,
                                            handleDownload: handleDailyChartDownload,
                                            headerTitle: 'kVA Metrics',
                                            className: 'w-full',
                                            dateRange: 'Last 30 days',
                                            availableTimeRanges: ['Daily', 'Monthly', 'Yearly'],
                                            initialTimeRange: 'Daily',
                                            onTimeRangeChange: (range: string) => console.log('Time range changed to:', range),
                                            showDownloadButton: true,
                                            onDownload: () => handleDailyChartDownload(),
                                            showXAxisLabel: true,
                                            xAxisLabel: 'kVA',
                                            isLoading: isKvaMetricsLoading,
                                        },
                                        span: { col: 1, row: 1 },
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
                        className: 'border border-primary-border dark:border-dark-border rounded-3xl p-4 dark:bg-primary-dark-light',
                        rows: [
                            {
                                layout: 'row' as const,
                                columns: [
                                    {
                                        name: 'SectionHeader',
                                        props: {
                                            title: 'Feeder Location',
                                            titleLevel: 2,
                                            titleSize: 'md',
                                            titleVariant: 'primary',
                                            titleWeight: 'bold',
                                            titleAlign: 'left',
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
                                gridColumns:1,
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
                                            showActions: true,
                                            showHeader: 'true',
                                            headerTitle: 'Alerts',
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

export default Feeders;
