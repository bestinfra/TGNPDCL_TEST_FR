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
        alertId: 'ALT001',
        type: 'Overload',
        feederName: 'D1F1(32500114)',
        occuredOn: '2024-01-15 14:30:00',
    },
    {
        alertId: 'ALT002',
        type: 'Power Failure',
        feederName: 'D1F1(32500114)',
        occuredOn: '2024-01-15 12:15:00',
    }
];

// Default stats data
const defaultStats = [
    { title: 'R-Phase Voltage', value: 'N/A', icon: '/icons/r-phase-voltage.svg', subtitle1: 'Volts', bg: 'bg-[var(--color-danger)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base', iconStyle: FILTER_STYLES.WHITE },
    { title: 'Y-Phase Voltage', value: 'N/A', icon: '/icons/r-phase-voltage.svg', subtitle1: 'Volts', bg: 'bg-[var(--color-warning-alt)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base', iconStyle: FILTER_STYLES.WHITE },
    { title: 'B-Phase Voltage', value: 'N/A', icon: '/icons/r-phase-voltage.svg', subtitle1: 'Volts', bg: 'bg-[var(--color-primary)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base', iconStyle: FILTER_STYLES.WHITE },
    { title: 'Apparent Power', value: 'N/A', icon: '/icons/consumption.svg', subtitle1: 'kVA', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base', iconStyle: FILTER_STYLES.BRAND_GREEN },
    { title: 'MD-kVA', value: 'N/A', icon: '/icons/consumption.svg', subtitle1: 'kVA', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base', iconStyle: FILTER_STYLES.BRAND_GREEN },
    { title: 'R-Phase Current', value: 'N/A', icon: '/icons/r-phase-current.svg', subtitle1: 'Amps', bg: 'bg-[var(--color-danger)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base', iconStyle: FILTER_STYLES.WHITE },
    { title: 'Y-Phase Current', value: 'N/A', icon: '/icons/r-phase-current.svg', subtitle1: 'Amps', bg: 'bg-[var(--color-warning-alt)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base', iconStyle: FILTER_STYLES.WHITE },
    { title: 'B-Phase Current', value: 'N/A', icon: '/icons/r-phase-current.svg', subtitle1: 'Amps', bg: 'bg-[var(--color-primary)]', iconClassName: 'w-3 h-3', width: 'w-8', height: 'h-8', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base', iconStyle: FILTER_STYLES.WHITE },
    { title: 'Neutral Current', value: 'N/A', icon: '/icons/consumption.svg', subtitle1: 'Amps', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base', iconStyle: FILTER_STYLES.BRAND_GREEN },
    { title: 'Frequency', value: 'N/A', icon: '/icons/frequency.svg', subtitle1: 'Hz', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base', iconStyle: FILTER_STYLES.BRAND_GREEN },
    { title: 'R-Phase PF', value: 'N/A', icon: '/icons/power-factor.svg', subtitle1: 'Power Factor', bg: 'bg-[var(--color-danger)]', iconClassName: 'w-4 h-4', width: 'w-8', height: 'h-8', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base', iconStyle: FILTER_STYLES.WHITE }, 
    { title: 'Y-Phase PF', value: 'N/A', icon: '/icons/power-factor.svg', subtitle1: 'Power Factor', bg: 'bg-[var(--color-warning-alt)]', iconClassName: 'w-4 h-4', width: 'w-8', height: 'h-8', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base', iconStyle: FILTER_STYLES.WHITE },
    { title: 'B-Phase PF', value: 'N/A', icon: '/icons/power-factor.svg', subtitle1: 'Power Factor', bg: 'bg-[var(--color-primary)]', iconClassName: 'w-4 h-4', width: 'w-8', height: 'h-8', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base', iconStyle: FILTER_STYLES.WHITE },
    { title: 'Avg PF', value: 'N/A', icon: '/icons/power-factor.svg', subtitle1: 'Power Factor', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base', iconStyle: FILTER_STYLES.BRAND_GREEN },
    { title: 'Cummulative kVAh', value: 'N/A', icon: '/icons/consumption.svg', subtitle1: 'kVAh', valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base', iconStyle: FILTER_STYLES.BRAND_GREEN },
];

const Feeders = () => {
    const { dtrId, feederId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    

    
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

    // If we have a feederId but no passedData, we need to construct the data structure
    // This handles the case when navigating directly to /feeder/SN18132429
    const effectiveFeederData = passedData?.feederData || (feederId ? {
        feederName: feederId,
        // We'll need to get other feeder details from the API
    } : null);

    // Determine the effective DTR ID to use for API calls
    const getEffectiveDtrId = () => {
        // First try passedData.dtrId
        if (passedData?.dtrId) {
            return passedData.dtrId;
        }
        
        // Then try to extract from dtrId parameter
        if (dtrId && dtrId.match(/\d+/)?.[0]) {
            return dtrId.match(/\d+/)?.[0];
        }
        
        // If we have a feederId, we need to find the DTR ID from the backend
        // For now, return null and handle this case in the API calls
        if (feederId) {
            return null; // We'll need to handle this specially
        }
        
        return dtrId;
    };

    const effectiveDtrId = getEffectiveDtrId();

    // Function to find DTR ID from feeder ID
    const findDtrIdFromFeederId = async (feederId: string): Promise<string | null> => {
        try {
    
            
            // We need to search for the feeder to find its DTR ID
            // This could be done by searching through all DTRs or by a specific feeder search endpoint
            // For now, let's try to search through the DTRs endpoint with a search parameter
            
            // Option 1: Search through DTRs with feeder name
            const searchResponse = await fetch(`${BACKEND_URL}/dtrs?search=${feederId}`);
            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                if (searchData.success && searchData.data.length > 0) {
                    // Find the DTR that contains this feeder
                    for (const dtr of searchData.data) {
                        // Check if this DTR has the feeder
                        const dtrResponse = await fetch(`${BACKEND_URL}/dtrs/${dtr.dtrId || dtr.dtrNumber}`);
                        if (dtrResponse.ok) {
                            const dtrData = await dtrResponse.json();
                            if (dtrData.success && dtrData.data?.feeders) {
                                const hasFeeder = dtrData.data.feeders.some((feeder: any) => 
                                    feeder.serialNumber === feederId || 
                                    feeder.meterNumber === feederId
                                );
                                if (hasFeeder) {
                    
                                    return dtr.dtrId || dtr.dtrNumber;
                                }
                            }
                        }
                    }
                }
            }
            
            console.warn('findDtrIdFromFeederId - Could not find DTR ID for feeder:', feederId);
            return null;
        } catch (error) {
            console.error('findDtrIdFromFeederId - Error:', error);
            return null;
        }
    };

    // State to store the resolved DTR ID when we find it from feeder ID
    const [resolvedDtrId, setResolvedDtrId] = useState<string | null>(effectiveDtrId || null);

    // State for API data - initialized with dummy data
    const [instantaneousStatsData, setInstantaneousStatsData] = useState<any>(dummyInstantaneousStatsData);
    const [consumptionAnalyticsData, setConsumptionAnalyticsData] = useState<any>(dummyConsumptionAnalyticsData);
    const [feederInfoData, setFeederInfoData] = useState<any>(dummyFeederInfoData);
    const [alertsData, setAlertsData] = useState(dummyAlertsData);
    const [kvaMetricsData, setKvaMetricsData] = useState<any>({
        xAxisData: [],
        seriesData: [{ name: 'kVA', data: [] }]
    });

    // Loading states - initialized to false
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    const [isConsumptionLoading, setIsConsumptionLoading] = useState(false);
    const [isAlertsLoading, setIsAlertsLoading] = useState(false);
    const [isKvaMetricsLoading, setIsKvaMetricsLoading] = useState(false);

    // State for tracking failed APIs
    const [failedApis, setFailedApis] = useState<Array<{
        id: string;
        name: string;
        retryFunction: () => Promise<void>;
        errorMessage: string;
    }>>([]);

    // State for time range toggles
    const [consumptionTimeRange, setConsumptionTimeRange] = useState<'Daily' | 'Monthly'>('Daily');
    const [kvaTimeRange, setKvaTimeRange] = useState<'Daily' | 'Monthly'>('Daily');

    // API Functions
    const fetchInstantaneousStats = async () => {
        // Use resolved DTR ID
        let numericDtrId = resolvedDtrId;
        
        // If we don't have a DTR ID but we have a feeder ID, we need to find the DTR ID first
        if (!numericDtrId && feederId) {

            const foundDtrId = await findDtrIdFromFeederId(feederId);
            if (foundDtrId) {
                setResolvedDtrId(foundDtrId);
                numericDtrId = foundDtrId;
            } else {
                console.warn('fetchInstantaneousStats - Could not find DTR ID for feeder:', feederId);
                return;
            }
        }
        
        if (!numericDtrId) {
            console.warn('fetchInstantaneousStats - No DTR ID available');
            return;
        }



        setIsStatsLoading(true);
        try {
            // If we have specific feeder data, we need to get individual meter data
            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/instantaneousStats`;
            
            // If we have specific feeder data, we should get individual meter stats
            if (effectiveFeederData?.feederName) {

            }
            
            const response = await fetch(endpoint);
            const data = await response.json();
            
            if (data.success) {
                
                
                // If we have specific feeder data, we might need to adjust the data
                let apiData = {
                    ...data.data,
                    lastCommDate: data.data.lastCommDate || null
                };
                
                // If this is for a specific feeder, we might need to adjust the data
                if (effectiveFeederData?.feederName) {
    
                    // For now, use the DTR-level data, but this could be enhanced
                    // when backend supports individual meter stats
                }
                

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
        // Use resolved DTR ID
        let numericDtrId = resolvedDtrId;
        
        // If we don't have a DTR ID but we have a feeder ID, we need to find the DTR ID first
        if (!numericDtrId && feederId) {

            const foundDtrId = await findDtrIdFromFeederId(feederId);
            if (foundDtrId) {
                setResolvedDtrId(foundDtrId);
                numericDtrId = foundDtrId;
            } else {
                console.warn('fetchConsumptionAnalytics - Could not find DTR ID for feeder:', feederId);
                return;
            }
        }
        
        if (!numericDtrId) {
            console.warn('fetchConsumptionAnalytics - No DTR ID available');
            return;
        }



        setIsConsumptionLoading(true);
        try {
            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/consumptionAnalytics`;
            
            // If we have specific feeder data, we should get individual meter consumption
            if (effectiveFeederData?.feederName) {
                
            }
            
            const response = await fetch(endpoint);
            const data = await response.json();
            
            if (data.status === 'success') {
                // Transform the data to match frontend expectations
                let transformedData = {
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
                
                // If this is for a specific feeder, we might need to adjust the data
                if (effectiveFeederData?.feederName) {
    
                    // For now, use the DTR-level data, but this could be enhanced
                    // when backend supports individual meter consumption
                }
                
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
        // Use resolved DTR ID
        let numericDtrId = resolvedDtrId;
        
        // If we don't have a DTR ID but we have a feeder ID, we need to find the DTR ID first
        if (!numericDtrId && feederId) {

            const foundDtrId = await findDtrIdFromFeederId(feederId);
            if (foundDtrId) {
                setResolvedDtrId(foundDtrId);
                numericDtrId = foundDtrId;
            } else {
                console.warn('fetchFeederInfo - Could not find DTR ID for feeder:', feederId);
                return;
            }
        }
        
        if (!numericDtrId) {
            console.warn('fetchFeederInfo - No DTR ID available');
            return;
        }



        try {
            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}`;
            
            // If we have specific feeder data, we should get individual meter info
            if (effectiveFeederData?.feederName) {
    
            }
            
            const response = await fetch(endpoint);
            const data = await response.json();
            
            if (data.success) {
                let feederInfo = data.data;
                
                // If this is for a specific feeder, we need to filter the data
                if (effectiveFeederData?.feederName) {
                    const feederName = effectiveFeederData.feederName;
    
                    
                    // Find the specific feeder in the DTR's feeders list
                    const specificFeeder = feederInfo.feeders?.find((feeder: any) => 
                        feeder.serialNumber === feederName ||
                        feeder.meterNumber === feederName
                    );
                    
                    if (specificFeeder) {
    
                        // Create feeder-specific info
                        feederInfo = {
                            dtr: feederInfo.dtr,
                            totalFeeders: 1, // This is now for a specific feeder
                            specificFeeder: {
                                serialNumber: specificFeeder.serialNumber,
                                meterNumber: specificFeeder.meterNumber,
                                manufacturer: specificFeeder.manufacturer,
                                model: specificFeeder.model,
                                type: specificFeeder.type,
                                phase: specificFeeder.phase,
                                status: specificFeeder.status,
                                location: specificFeeder.location,
                                city: specificFeeder.city
                            }
                        };
                    } else {
                        console.warn('fetchFeederInfo - Specific feeder not found in DTR data');
                    }
                }
                
                setFeederInfoData(feederInfo);
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
        // Use resolved DTR ID
        let numericDtrId = resolvedDtrId;
        
        // If we don't have a DTR ID but we have a feeder ID, we need to find the DTR ID first
        if (!numericDtrId && feederId) {

            const foundDtrId = await findDtrIdFromFeederId(feederId);
            if (foundDtrId) {
                setResolvedDtrId(foundDtrId);
                numericDtrId = foundDtrId;
            } else {
                console.warn('fetchAlerts - Could not find DTR ID for feeder:', feederId);
                return;
            }
        }
        
        if (!numericDtrId) {
            console.warn('fetchAlerts - No DTR ID available');
            return;
        }



        setIsAlertsLoading(true);
        try {
            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/alerts`;
            
            // If we have specific feeder data, we should get individual meter alerts
            if (effectiveFeederData?.feederName) {
                
            }
            
            const response = await fetch(endpoint);
            const data = await response.json();

            
            if (data.success) {
                // Transform the data to ensure it matches the table column structure
                               let transformedAlerts = data.data?.map((alert: any) => ({
                    ...alert,
                    feederName: effectiveFeederData?.feederName || alert.feederName || 'N/A'
                })) || [];
                
                if (effectiveFeederData?.feederName) {
                    const targetFeederName = effectiveFeederData.feederName;
                    
                    transformedAlerts = transformedAlerts.map((alert: any) => ({
                        ...alert,
                        feederName: targetFeederName
                    }));
                }
                
                // If transformation resulted in all N/A values, log the raw data for debugging
                if (transformedAlerts.every((alert: any) => 
                    alert.alertId === 'N/A' && 
                    alert.type === 'N/A' && 
                    alert.feederName === 'N/A' && 
                    alert.occuredOn === 'N/A'
                )) {
                    console.warn('All alerts transformed to N/A. Raw API data:', data.data);
                }
                
                setAlertsData(transformedAlerts);
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
        // Use resolved DTR ID
        let numericDtrId = resolvedDtrId;
        
        // If we don't have a DTR ID but we have a feeder ID, we need to find the DTR ID first
        if (!numericDtrId && feederId) {

            const foundDtrId = await findDtrIdFromFeederId(feederId);
            if (foundDtrId) {
                setResolvedDtrId(foundDtrId);
                numericDtrId = foundDtrId;
            } else {
                console.warn('fetchKVAMetrics - Could not find DTR ID for feeder:', feederId);
                return;
            }
        }
        
        if (!numericDtrId) {
            console.warn('fetchKVAMetrics - No DTR ID available');
            return;
        }



        setIsKvaMetricsLoading(true);
        try {
            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/kvaMetrics`;
            
            // If we have specific feeder data, we should get individual meter KVA metrics
            if (effectiveFeederData?.feederName) {
                
            }
            
            const response = await fetch(endpoint);
            const data = await response.json();
            
            
            if (data.status === 'success') {
                // Transform the data to match frontend expectations

                let transformedData = {
                    xAxisData: data.data?.dailyData?.xAxisData || [],
                    seriesData: [{
                        name: 'kVA',
                        data: data.data?.dailyData?.sums?.map((sum: string) => parseFloat(sum)) || []
                    }],
                    monthly: {
                        xAxisData: data.data?.monthlyData?.xAxisData || [],
                        seriesData: [{
                            name: 'kVA',
                            data: data.data?.monthlyData?.sums?.map((sum: string) => parseFloat(sum)) || []
                        }]
                    }
                };
                

                
                // If this is for a specific feeder, we might need to adjust the data
                if (effectiveFeederData?.feederName) {
    
                    // For now, use the DTR-level data, but this could be enhanced
                    // when backend supports individual meter KVA metrics
                }
                
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

        // Get consumption data based on selected time range
    const getConsumptionData = () => {
        console.log('getConsumptionData called with timeRange:', consumptionTimeRange);
        console.log('Available consumption data:', consumptionAnalyticsData);
        
        if (consumptionTimeRange === 'Daily') {
            if (consumptionAnalyticsData && consumptionAnalyticsData.xAxisData) {
                const data = {
                    xAxisData: consumptionAnalyticsData.xAxisData || [],
                    seriesData: consumptionAnalyticsData.seriesData || [{ name: 'Consumption', data: [] }],
                };
                console.log('Returning daily consumption data:', data);
                return data;
            }
        } else if (consumptionTimeRange === 'Monthly') {
            if (consumptionAnalyticsData && consumptionAnalyticsData.monthly) {
                const data = {
                    xAxisData: consumptionAnalyticsData.monthly.xAxisData || [],
                    seriesData: consumptionAnalyticsData.monthly.seriesData || [{ name: 'Consumption', data: [] }],
                };
                console.log('Returning monthly consumption data:', data);
                return data;
            }
        }
        console.log('No data available, returning empty data');
        return {
            xAxisData: [],
            seriesData: [{ name: 'Consumption', data: [] }],
        };
    };

    // Get KVA metrics data based on selected time range
    const getKvaMetricsData = () => {
        console.log('getKvaMetricsData called with timeRange:', kvaTimeRange);
        console.log('Available KVA data:', kvaMetricsData);
        
        if (kvaTimeRange === 'Daily') {
            if (kvaMetricsData && kvaMetricsData.xAxisData) {
                const data = {
                    xAxisData: kvaMetricsData.xAxisData || [],
                    seriesData: kvaMetricsData.seriesData || [{ name: 'kVA', data: [] }],
                };
                console.log('Returning daily KVA data:', data);
                return data;
            }
        } else if (kvaTimeRange === 'Monthly') {
            if (kvaMetricsData && kvaMetricsData.monthly) {
                const data = {
                    xAxisData: kvaMetricsData.monthly.xAxisData || [],
                    seriesData: kvaMetricsData.monthly.seriesData || [{ name: 'kVA', data: [] }],
                };
                console.log('Returning monthly KVA data:', data);
                return data;
            }
        }
        console.log('No KVA data available, returning empty data');
        return {
            xAxisData: [],
            seriesData: [{ name: 'kVA', data: [] }],
        };
    };

    // Retry functions for each API
    const retryStatsAPI = async () => {
        setIsStatsLoading(true);
        try {
            const numericDtrId = passedData?.dtrId || (dtrId && dtrId.match(/\d+/)?.[0]) || dtrId;
            if (!numericDtrId) return;

            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/instantaneousStats`;
            
            // If we have specific feeder data, we need to get individual meter data
            if (passedData?.feederData?.feederName) {
    
            }
            
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Failed to fetch instantaneous stats');
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format');
            }
            
            const data = await response.json();
            if (data.success) {
                
                
                // If we have specific feeder data, we might need to adjust the data
                let apiData = {
                    ...data.data,
                    lastCommDate: data.data.lastCommDate || null
                };
                

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

            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/consumptionAnalytics`;
            

            
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Failed to fetch consumption analytics');
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format');
            }
            
            const data = await response.json();
            if (data.status === 'success') {
                let transformedData = {
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
            setIsConsumptionLoading(false);
        }
    };

    const retryFeederInfoAPI = async () => {
        try {
            // Use resolved DTR ID
            let numericDtrId = resolvedDtrId;
            
            if (!numericDtrId) {
                console.warn('retryFeederInfoAPI - No DTR ID available');
                return;
            }

            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}`;
            
            // If we have specific feeder data, we should get individual meter info
            if (effectiveFeederData?.feederName) {
                console.log('retryFeederInfoAPI - Fetching individual feeder info for:', effectiveFeederData.feederName);
            }
            
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Failed to fetch feeder information');
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format');
            }
            
            const data = await response.json();
            if (data.success) {
                let feederInfo = data.data;
                
                // If this is for a specific feeder, we need to filter the data
                if (effectiveFeederData?.feederName) {
                    const feederName = effectiveFeederData.feederName;
                    console.log('retryFeederInfoAPI - Filtering data for specific feeder:', feederName);
                    
                    // Find the specific feeder in the DTR's feeders list
                    const specificFeeder = feederInfo.feeders?.find((feeder: any) => 
                        feeder.serialNumber === feederName ||
                        feeder.meterNumber === feederName
                    );
                    
                    if (specificFeeder) {
                        console.log('retryFeederInfoAPI - Found specific feeder:', specificFeeder);
                        // Create feeder-specific info
                        feederInfo = {
                            dtr: feederInfo.dtr,
                            totalFeeders: 1, // This is now for a specific feeder
                            specificFeeder: {
                                serialNumber: specificFeeder.serialNumber,
                                meterNumber: specificFeeder.meterNumber,
                                manufacturer: specificFeeder.manufacturer,
                                model: specificFeeder.model,
                                type: specificFeeder.type,
                                phase: specificFeeder.phase,
                                status: specificFeeder.status,
                                location: specificFeeder.location,
                                city: specificFeeder.city
                            }
                        };
                    } else {
                        console.warn('retryFeederInfoAPI - Specific feeder not found in DTR data');
                    }
                }
                
                setFeederInfoData(feederInfo);
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
            // Use resolved DTR ID
            let numericDtrId = resolvedDtrId;
            
            if (!numericDtrId) {
                console.warn('retryAlertsAPI - No DTR ID available');
                return;
            }

            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/alerts`;
            
            // If we have specific feeder data, we should get individual meter alerts
            if (effectiveFeederData?.feederName) {
                console.log('retryAlertsAPI - Fetching individual feeder alerts for:', effectiveFeederData.feederName);
            }
            
            const response = await fetch(endpoint);
            const data = await response.json();
            console.log('Retry - Alerts API response:', data.data);
            
            if (data.success) {
                // Transform the data to ensure it matches the table column structure
                               // Backend now returns: { alertId: 'id', type: 'type', feederName: 'feederName', occuredOn: 'occuredOn' }
                // Just update the feederName if we have specific feeder data
                let transformedAlerts = data.data?.map((alert: any) => ({
                    ...alert,
                    feederName: effectiveFeederData?.feederName || alert.feederName || 'N/A'
                })) || [];
                
                // If this is for a specific feeder, filter alerts for that feeder only
                if (effectiveFeederData?.feederName) {
                    const targetFeederName = effectiveFeederData.feederName;
                    console.log('retryAlertsAPI - Filtering alerts for specific feeder:', targetFeederName);
                    
                    // Since we're showing alerts for a specific feeder, we'll show all alerts
                    // but mark them as belonging to this feeder
                    transformedAlerts = transformedAlerts.map((alert: any) => ({
                        ...alert,
                        feederName: targetFeederName
                    }));
                    
                    console.log('retryAlertsAPI - Filtered alerts for specific feeder:', transformedAlerts);
                }
                
                console.log('Retry - Transformed alerts data:', transformedAlerts);
                setAlertsData(transformedAlerts);
                setFailedApis(prev => prev.filter(api => api.id !== 'alerts'));
            } else {
                throw new Error(data.message || 'Failed to fetch alerts');
            }
        } catch (err: any) {
            console.error("Error in Alerts API:", err);
            setAlertsData(dummyAlertsData);
        } finally {
            setIsAlertsLoading(false);
        }
    };

    const retryKVAMetricsAPI = async () => {
        setIsKvaMetricsLoading(true);
        try {
            // Use resolved DTR ID
            let numericDtrId = resolvedDtrId;
            
            if (!numericDtrId) {
                console.warn('retryKVAMetricsAPI - No DTR ID available');
                return;
            }

            let endpoint = `${BACKEND_URL}/dtrs/${numericDtrId}/kvaMetrics`;
            
            // If we have specific feeder data, we should get individual meter KVA metrics
            if (effectiveFeederData?.feederName) {
                console.log('retryKVAMetricsAPI - Fetching individual feeder KVA metrics for:', effectiveFeederData.feederName);
            }
            
            const response = await fetch(endpoint);
            const data = await response.json();
            console.log('Retry - KVA metrics API response:', data.data);
            
            if (data.status === 'success') {
                let transformedData = {
                    xAxisData: data.data?.dailyData?.xAxisData || [],
                    seriesData: [{
                        name: 'kVA',
                        data: data.data?.dailyData?.sums?.map((sum: string) => parseFloat(sum)) || []
                    }],
                    monthly: {
                        xAxisData: data.data?.monthlyData?.xAxisData || [],
                        seriesData: [{
                            name: 'kVA',
                            data: data.data?.monthlyData?.sums?.map((sum: string) => parseFloat(sum)) || []
                        }]
                    }
                };
                
                // If this is for a specific feeder, we might need to adjust the data
                if (effectiveFeederData?.feederName) {
                    console.log('retryKVAMetricsAPI - Adjusting KVA metrics data for specific feeder:', effectiveFeederData.feederName);
                }
                
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
            setIsKvaMetricsLoading(false);
        }
    };

    // Retry specific API
    const retrySpecificAPI = (apiId: string) => {
        const api = failedApis.find(a => a.id === apiId);
        if (api) {
            api.retryFunction();
        }
    };

    // Effect to resolve DTR ID from feeder ID when needed
    useEffect(() => {
        const resolveDtrId = async () => {
            if (!resolvedDtrId && feederId) {
                console.log('useEffect - resolveDtrId - No DTR ID available, searching for DTR ID from feeder ID:', feederId);
                const foundDtrId = await findDtrIdFromFeederId(feederId);
                if (foundDtrId) {
                    console.log('useEffect - resolveDtrId - Found DTR ID:', foundDtrId);
                    setResolvedDtrId(foundDtrId);
                } else {
                    console.warn('useEffect - resolveDtrId - Could not find DTR ID for feeder:', feederId);
                }
            }
        };

        resolveDtrId();
    }, [feederId, resolvedDtrId]);

    // Effect to log time range changes for debugging
    useEffect(() => {
        console.log('Consumption time range changed to:', consumptionTimeRange);
        console.log('KVA time range changed to:', kvaTimeRange);
    }, [consumptionTimeRange, kvaTimeRange]);

    // Load data on component mount
    useEffect(() => {
        // Only proceed if we have a resolved DTR ID or if we're not looking for individual feeder data
        if (!resolvedDtrId && feederId) {
            console.log('useEffect - Waiting for DTR ID to be resolved for feeder:', feederId);
            return;
        }

        if (resolvedDtrId || dtrId) {
            console.log('useEffect - Starting API calls with DTR ID:', resolvedDtrId || dtrId);
            fetchInstantaneousStats();
            fetchConsumptionAnalytics();
            fetchFeederInfo();
            fetchAlerts();
            fetchKVAMetrics();
        } else {
            console.log('useEffect - No DTR ID available, skipping API calls');
        }
    }, [resolvedDtrId, dtrId]);

    // Enhanced data for Alerts Table with more entries
    const [_feederData, _setFeederData] = useState([
        { title: 'Feeder Name', description: 'D1F1(32500114)' },
        { title: 'Rating', description: '25.00 kVA' },
        { title: 'Address', description: 'Waddepally, Warangal, Telangana, India, 506001' },
    ]);

    // Comprehensive export function for all feeder data
    const handleExportData = () => {
        import('xlsx').then((XLSX) => {
            const workbook = XLSX.utils.book_new();

            // 1. Feeder Information
            const feederInfoExportData = [
                {
                    'DTR Number': feederInfoData?.dtr?.dtrNumber || 'N/A',
                    'Capacity': feederInfoData?.dtr?.capacity ? `${feederInfoData.dtr.capacity} kVA` : 'N/A',
                    'Status': feederInfoData?.dtr?.status || 'N/A',
                    'Total Feeders': feederInfoData?.totalFeeders?.toString() || 'N/A',
                    'Feeder Name': effectiveFeederData?.feederName || 'N/A',
                    'Feeder Serial Number': feederInfoData?.specificFeeder?.serialNumber || 'N/A',
                    'Feeder Meter Number': feederInfoData?.specificFeeder?.meterNumber || 'N/A',
                    'Manufacturer': feederInfoData?.specificFeeder?.manufacturer || 'N/A',
                    'Model': feederInfoData?.specificFeeder?.model || 'N/A',
                    'Type': feederInfoData?.specificFeeder?.type || 'N/A',
                    'Phase': feederInfoData?.specificFeeder?.phase || 'N/A',
                    'Location': feederInfoData?.specificFeeder?.location?.name || feederInfoData?.specificFeeder?.city || 'N/A',
                }
            ];

            // 2. Instantaneous Statistics
            const statsData = getStats();
            const instantaneousStatsExportData = statsData.map((stat, index) => ({
                'S.No': index + 1,
                'Metric': stat.title,
                'Value': stat.value || 'N/A',
                'Unit': stat.subtitle1 || '',
            }));

            // 3. Consumption Analytics Data
            const consumptionExportData = consumptionAnalyticsData.xAxisData.map((date: any, index: number) => ({
                'S.No': index + 1,
                'Date': date || 'N/A',
                'Daily Consumption (kWh)': consumptionAnalyticsData.seriesData[0]?.data[index] || 0,
                'Monthly Consumption (kWh)': consumptionAnalyticsData.monthly?.seriesData[0]?.data[index] || 0,
            }));

            // 4. KVA Metrics Data
            const kvaMetricsExportData = kvaMetricsData.xAxisData.map((date: any, index: number) => ({
                'S.No': index + 1,
                'Date': date || 'N/A',
                'kVA Value': kvaMetricsData.seriesData[0]?.data[index] || 0,
            }));

            // 5. Alerts Data
            const alertsExportData = alertsData.map((alert, index) => ({
                'S.No': index + 1,
                'Alert ID': alert.alertId || 'N/A',
                'Type': alert.type || 'N/A',
                'Feeder Name': alert.feederName || 'N/A',
                'Occurred On': alert.occuredOn || 'N/A',
            }));

            // Create sheets with auto-sizing
            const feederInfoSheet = XLSX.utils.json_to_sheet(feederInfoExportData);
            const instantaneousStatsSheet = XLSX.utils.json_to_sheet(instantaneousStatsExportData);
            const consumptionSheet = XLSX.utils.json_to_sheet(consumptionExportData);
            const kvaMetricsSheet = XLSX.utils.json_to_sheet(kvaMetricsExportData);
            const alertsSheet = XLSX.utils.json_to_sheet(alertsExportData);

            // Auto-size columns for all sheets
            const sheets = [
                { sheet: feederInfoSheet, name: 'Feeder Information' },
                { sheet: instantaneousStatsSheet, name: 'Instantaneous Stats' },
                { sheet: consumptionSheet, name: 'Consumption Analytics' },
                { sheet: kvaMetricsSheet, name: 'KVA Metrics' },
                { sheet: alertsSheet, name: 'Alerts' }
            ];

            sheets.forEach(({ sheet }) => {
                const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
                const cols = [];
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    let maxWidth = 10;
                    for (let R = range.s.r; R <= range.e.r; ++R) {
                        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                        const cell = sheet[cellAddress];
                        if (cell && cell.v) {
                            const cellLength = cell.v.toString().length;
                            maxWidth = Math.max(maxWidth, cellLength);
                        }
                    }
                    cols[C] = { width: Math.min(maxWidth + 2, 50) };
                }
                sheet['!cols'] = cols;
            });

            // Add worksheets to workbook
            XLSX.utils.book_append_sheet(workbook, feederInfoSheet, 'Feeder Information');
            XLSX.utils.book_append_sheet(workbook, instantaneousStatsSheet, 'Instantaneous Stats');
            XLSX.utils.book_append_sheet(workbook, consumptionSheet, 'Consumption Analytics');
            XLSX.utils.book_append_sheet(workbook, kvaMetricsSheet, 'KVA Metrics');
            XLSX.utils.book_append_sheet(workbook, alertsSheet, 'Alerts');

            // Generate Excel file
            const feederName = effectiveFeederData?.feederName || currentFeederId || 'feeder';
            const fileName = `${feederName}-complete-data.xlsx`;
            
            XLSX.writeFile(workbook, fileName);
        });
    };

    // Handle Excel download for daily consumption chart (legacy function - keeping for backward compatibility)
    const handleDailyChartDownload = () => {
        // Use KVA metrics data if available, otherwise use empty data
        const xAxisData = kvaMetricsData.xAxisData || [];
        const seriesData = kvaMetricsData.seriesData || [{ name: 'kVA', data: [] }];
        exportChartData(xAxisData, seriesData, 'feeder-kva-metrics-data');
    };

    // Handle Excel download for consumption chart based on current time range
    const handleConsumptionChartDownload = () => {
        const data = getConsumptionData();
        const timeRange = consumptionTimeRange.toLowerCase();
        exportChartData(data.xAxisData, data.seriesData, `feeder-${timeRange}-consumption-data`);
    };

    // Handle Excel download for KVA metrics chart based on current time range
    const handleKvaMetricsChartDownload = () => {
        const data = getKvaMetricsData();
        const timeRange = kvaTimeRange.toLowerCase();
        exportChartData(data.xAxisData, data.seriesData, `feeder-${timeRange}-kva-metrics-data`);
    };

    // Debug: Log failedApis state
    console.log('Feeders - failedApis:', failedApis);
    console.log('Feeders - failedApis.length:', failedApis.length);
    if (failedApis.length > 0) {
        console.log('Feeders - Failed API details:', failedApis.map(api => ({
            id: api.id,
            name: api.name,
            errorMessage: api.errorMessage
        })));
    }

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
                                            title: isIndividualFeeder ? `Feeder ${feederData?.feederName || currentFeederId}` : (effectiveFeederData?.feederName ? `Feeder ${effectiveFeederData.feederName}` : 'Feeder Information'),
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
                                            title: isIndividualFeeder ? `Feeder ${feederData?.feederName || currentFeederId} Information` : (effectiveFeederData?.feederName ? `Feeder ${effectiveFeederData.feederName} Information` : 'DTR Information'),
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
                                            title: isIndividualFeeder ? `Feeder ${feederData?.feederName || currentFeederId} Information` : (effectiveFeederData?.feederName ? `Feeder ${effectiveFeederData.feederName} Information` : 'Instantaneous Stats'),
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
                                            xAxisData: getConsumptionData().xAxisData,
                                            seriesData: getConsumptionData().seriesData,
                                            height: 320,
                                            showHeader: true,  
                                            headerTitle: `${consumptionTimeRange} Consumption Metrics Bar Chart`,
                                            className: 'w-full',
                                            dateRange: 'Last 30 days',
                                            availableTimeRanges: ['Daily', 'Monthly', 'Yearly'],
                                            initialTimeRange: consumptionTimeRange,
                                            onTimeRangeChange: (range: string) => {
                                                console.log('Consumption chart time range changed to:', range);
                                                setConsumptionTimeRange(range as 'Daily' | 'Monthly');
                                            },
                                            showDownloadButton: true,
                                            onDownload: () => handleConsumptionChartDownload(),
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
                                            xAxisData: getKvaMetricsData().xAxisData,
                                            seriesData: getKvaMetricsData().seriesData,
                                            height: 320,
                                            ariaLabel: ' kVA Metrics Bar Chart',
                                            showHeader: true,
                                            handleDownload: handleDailyChartDownload,
                                            headerTitle: `${kvaTimeRange} kVA Metrics`,
                                            className: 'w-full',
                                            dateRange: 'Last 30 days',
                                            availableTimeRanges: ['Daily', 'Monthly', 'Yearly'],
                                            initialTimeRange: kvaTimeRange,
                                            onTimeRangeChange: (range: string) => {
                                                console.log('KVA Metrics chart time range changed to:', range);
                                                setKvaTimeRange(range as 'Daily' | 'Monthly');
                                            },
                                            showDownloadButton: true,
                                            onDownload: () => handleKvaMetricsChartDownload(),
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
