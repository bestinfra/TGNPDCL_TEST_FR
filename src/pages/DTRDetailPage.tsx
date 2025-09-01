import { useState, useEffect, lazy } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
const Page = lazy(() => import('SuperAdmin/Page'));
import { FILTER_STYLES } from '@/contexts/FilterStyleContext';
import BACKEND_URL from '../config';

// Dummy data for fallback
const dummyDTRData = {
    name: '0',
    dtrNo: '0',
    division: '0',
    subDivision: '0',
    substation: '0',
    feeder: '0',
    feederNo: '0',
    condition: '0',
    capacity: '0',
    address: '0',
    location: { lat: 0, lng: 0 },
    lastCommunication: null,
    stats: [
        {
            title: 'Total LT Feeders',
            value: '0',
            icon: 'icons/feeder.svg',
            subtitle1: 'Connected to DTR',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'Total kW',
            value: '0',
            icon: 'icons/energy.svg',
            subtitle1: 'Active Power',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'Total kVA',
            value: '0',
            icon: 'icons/energy.svg',
            subtitle1: 'Apparent Power',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'Total kWh',
            value: '0',
            icon: 'icons/energy.svg',
            subtitle1: 'Cumulative Active Energy',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'Total kVAh',
            value: '0',
            icon: 'icons/energy.svg',
            subtitle1: 'Cumulative Apparent Energy',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'LT Feeders Fuse Blown',
            value: '0',
            icon: 'icons/power_failure.svg',
            subtitle1: 'Requires maintenance',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'Unbalanced LT Feeders',
            value: '0',
            icon: 'icons/power_failure.svg',
            subtitle1: 'Requires attention',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'Power On',
            value: '0',
            icon: 'icons/power_failure.svg',
            subtitle1: '',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
        },
        {
            title: 'Power Off',
            value: '0',
            icon: 'icons/power_failure.svg',
            subtitle1: '',
            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
            bg: 'bg-[var(--color-danger)]',
            iconStyle: FILTER_STYLES.WHITE,
        },
        {
            title: 'Status',
            value: '0',
            icon: 'icons/units.svg',
            subtitle1: '0',
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
    

    
    // State for API data
    const [dtr, setDtr] = useState(dummyDTRData);
    const [dailyConsumptionData, setDailyConsumptionData] = useState(dummyDailyConsumptionData);
    const [feedersData, setFeedersData] = useState(dummyFeedersData);
    const [alertsData, setAlertsData] = useState(dummyAlertsData);
    const [locationHierarchy, setLocationHierarchy] = useState<any[]>([]);
    const [feederStats, setFeederStats] = useState<any>(null);

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

    useEffect(() => {
        if (locationHierarchy.length > 0) {
            const feederLocation = locationHierarchy.find((loc: any) => loc.type === 'Feeder');
            if (feederLocation) {
                console.log('Location hierarchy changed, updating address to:', feederLocation.name);
                setDtr(prev => ({
                    ...prev,
                    address: feederLocation.name || 'N/A'
                }));
            }
        }
    }, [locationHierarchy]);

    // Load data on component mount
    useEffect(() => {
        const fetchDtrData = async () => {
            setIsDtrLoading(true);
            try {
                // Extract numeric DTR ID from the URL parameter
                const numericDtrId = dtrId && dtrId.match(/\d+/)?.[0];
                if (!numericDtrId) {
                    throw new Error('Invalid DTR ID format');
                }
                

                
                // Call the DTR endpoint to get DTR info
                const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}`);
                if (!response.ok) throw new Error('Failed to fetch DTR data');
                
                const data = await response.json();
                
                if (data.success) {
                    // Transform the API response to match the expected structure
                    const transformedDtrData = {
                        name: data.data?.dtr?.serialNumber || 'N/A',
                        dtrNo: data.data?.dtr?.dtrNumber || 'N/A',
                        division: 'N/A', // Not available in current API
                        subDivision: 'N/A', // Not available in current API
                        substation: 'N/A', // Not available in current API
                        feeder: 'N/A', // Not available in current API
                        feederNo: 'N/A', // Not available in current API
                        condition: data.data?.dtr?.status || 'N/A',
                        capacity: data.data?.dtr?.capacity || 'N/A',
                        address: data.data?.feeders?.[0]?.location?.name || data.data?.feeders?.[0]?.city || 'N/A',
                        location: { 
                            lat: data.data?.feeders?.[0]?.latitude || 0, 
                            lng: data.data?.feeders?.[0]?.longitude || 0 
                        },
                        lastCommunication: data.data?.dtr?.lastCommunication || null,
                        stats: dtr.stats // Keep existing stats for now
                    };
                    
                    console.log('DTR Address being set to:', transformedDtrData.address);
                    console.log('First feeder location data:', data.data?.feeders?.[0]?.location);
                    
                    setDtr(transformedDtrData);
                } else {
                    throw new Error(data.message || 'Failed to fetch DTR data');
                }
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
                // Extract numeric DTR ID from the URL parameter
                const numericDtrId = dtrId && dtrId.match(/\d+/)?.[0];
                if (!numericDtrId) {
                    throw new Error('Invalid DTR ID format');
                }
                

                
                // Call the consumptionAnalytics endpoint to get consumption data
                const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/consumptionAnalytics`);
                if (!response.ok) throw new Error('Failed to fetch consumption data');
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    // Transform the API response to match the expected structure
                    const transformedConsumptionData = {
                        xAxisData: data.data?.dailyData?.xAxisData || [],
                        seriesData: [{
                            name: 'Consumption',
                            data: data.data?.dailyData?.sums?.map((sum: string) => parseFloat(sum)) || []
                        }]
                    };
                    
                    setDailyConsumptionData(transformedConsumptionData);
                } else {
                    throw new Error(data.message || 'Failed to fetch consumption data');
                }
            } catch (error) {
                console.error('Error fetching consumption data:', error);
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
                // Extract numeric DTR ID from the URL parameter
                const numericDtrId = dtrId && dtrId.match(/\d+/)?.[0];
                if (!numericDtrId) {
                    throw new Error('Invalid DTR ID format');
                }
                

                
                // Call the DTR endpoint to get feeders list
                const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}`);
                if (!response.ok) throw new Error('Failed to fetch feeders data');
                
                const data = await response.json();
                
                if (data.success) {
                    // Transform the API response to match the expected structure
                    const transformedFeedersData = data.data?.feeders?.map((feeder: any, index: number) => ({
                        sNo: index + 1,
                        feederName: feeder.serialNumber || feeder.meterNumber || 'N/A',
                        loadStatus: feeder.status || 'N/A',
                        condition: feeder.status || 'N/A',
                        capacity: 'N/A', // Not available in current API
                        address: feeder.location?.name || feeder.city || 'N/A',
                    })) || [];
                    
                    setFeedersData(transformedFeedersData);
                    
                    // Set location hierarchy if available
                    if (data.data?.locationHierarchy) {
                        console.log('Location Hierarchy received:', data.data.locationHierarchy);
                        console.log('First feeder location:', data.data?.feeders?.[0]?.location);
                        setLocationHierarchy(data.data.locationHierarchy);
                        
                        // Update the address using the Feeder type from location hierarchy
                        const feederLocation = data.data.locationHierarchy.find((loc: any) => loc.type === 'Feeder');
                        if (feederLocation) {
                            console.log('Found Feeder location:', feederLocation);
                            console.log('Setting address to:', feederLocation.name);
                            setDtr(prev => {
                                console.log('Previous DTR state:', prev);
                                const updated = {
                                    ...prev,
                                    address: feederLocation.name || 'N/A'
                                };
                                console.log('Updated DTR state:', updated);
                                return updated;
                            });
                        } else {
                            console.log('No Feeder location found in hierarchy');
                        }
                    } else {
                        console.log('No location hierarchy data received');
                    }
                } else {
                    throw new Error(data.message || 'Failed to fetch feeders data');
                }
            } catch (error) {
                console.error('Error fetching feeders data:', error);
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
                // Extract numeric DTR ID from the URL parameter
                const numericDtrId = dtrId && dtrId.match(/\d+/)?.[0];
                if (!numericDtrId) {
                    throw new Error('Invalid DTR ID format');
                }
                

                
                // Call the alerts endpoint
                const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/alerts`);
                if (!response.ok) throw new Error('Failed to fetch alerts data');
                
                const data = await response.json();
                
                if (data.success) {
                    const transformedAlerts = data.data?.map((alert: any) => ({
                        ...alert,
                        feederName: alert.feederName || 'N/A'
                    })) || [];
                    
                    setAlertsData(transformedAlerts);
                } else {
                    throw new Error(data.message || 'Failed to fetch alerts data');
                }
            } catch (error) {
                console.error('Error fetching alerts data:', error);
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
        
        const fetchFeederStats = async () => {
            try {
                // Extract numeric DTR ID from the URL parameter
                const numericDtrId = dtrId && dtrId.match(/\d+/)?.[0];
                if (!numericDtrId) {
                    throw new Error('Invalid DTR ID format');
                }
                

                
                                // Call the feederStats endpoint to get DTR statistics
                const response = await fetch(`${BACKEND_URL}/dtrs/${numericDtrId}/feederStats`);
                if (!response.ok) throw new Error('Failed to fetch feeder stats');

                const data = await response.json();
                
                if (data.success) {
                    // Store the feeder stats data for use in other components
                    setFeederStats(data.data);
                    
                    // Update the DTR stats with real data from the API
                    const updatedStats = [
                        {
                            title: 'Total LT Feeders',
                            value: data.data?.totalLTFeeders || '0',
                            icon: 'icons/feeder.svg',
                            subtitle1: 'Connected to DTR',
                            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
                        },
                        {
                            title: 'Total kW',
                            value: data.data?.totalKW || '0',
                            icon: 'icons/energy.svg',
                            subtitle1: 'Active Power',
                            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
                        },
                        {
                            title: 'Total kVA',
                            value: data.data?.totalKVA || '0',
                            icon: 'icons/energy.svg',
                            subtitle1: 'Apparent Power',
                            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
                        },
                        {   
                            title: 'Total kWh',
                            value: data.data?.totalKWh || '0',
                            icon: 'icons/energy.svg',
                            subtitle1: 'Cumulative Active Energy',
                            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
                        },
                        {
                            title: 'Total kVAh',
                            value: data.data?.totalKVAh || '0',
                            icon: 'icons/energy.svg',
                            subtitle1: 'Cumulative Apparent Energy',
                            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
                        },
                        {
                            title: 'LT Feeders Fuse Blown',
                            value: data.data?.ltFuseBlown || '0',
                            icon: 'icons/power_failure.svg',
                            subtitle1: 'Requires maintenance',
                            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
                        },
                        {
                            title: 'Unbalanced LT Feeders',
                            value: data.data?.unbalancedLTFeeders || '0',
                            icon: 'icons/power_failure.svg',
                            subtitle1: 'Requires attention',
                            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
                        },
                        {
                            title: 'Power On',
                            value: data.data?.powerOnHours || '0',
                            icon: 'icons/power_failure.svg',
                            subtitle1: '',
                            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
                        },
                        {
                            title: 'Power Off',
                            value: data.data?.powerOffHours || '0',
                            icon: 'icons/power_failure.svg',
                            subtitle1: '',
                            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
                            bg: 'bg-[var(--color-danger)]',
                            iconStyle: FILTER_STYLES.WHITE,
                        },
                        {
                            title: 'Status',
                            value: data.data?.status || '0',
                            icon: 'icons/units.svg',
                            subtitle1: '0',
                            valueFontSize: 'text-lg lg:text-xl md:text-lg sm:text-base',
                            bg: 'bg-[var(--color-secondary)]',
                            iconStyle: FILTER_STYLES.WHITE,
                        },
                    ];
                    
                    // Update the DTR stats
                    setDtr(prev => ({
                        ...prev,
                        stats: updatedStats
                    }));
                }
            } catch (error) {
                console.error('Error fetching feeder stats:', error);
                // Don't add to errors since this is supplementary data
            }
        };
        
        fetchDtrData();
        fetchConsumptionData();
        fetchFeedersData();
        fetchAlertsData();
        
        // Also fetch feeder stats to update DTR statistics
        fetchFeederStats();
    }, [dtrId]);

    const lastComm = dtr.lastCommunication ? new Date(dtr.lastCommunication).toLocaleString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }) : 'N/A';

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
                    'Division': locationHierarchy.find(loc => loc.type === 'Division')?.name || 'N/A',
                    'Sub-Division': locationHierarchy.find(loc => loc.type === 'Sub-Division')?.name || 'N/A',
                    'Substation': locationHierarchy.find(loc => loc.type === 'Substation')?.name || 'N/A',
                    'Feeder': locationHierarchy.find(loc => loc.type === 'Feeder')?.name || 'N/A',
                    'Feeder No': locationHierarchy.find(loc => loc.type === 'Feeder')?.code || 'N/A',
                    'Rating': '15.00 kVA',
                    'Condition': dtr.condition,
                    'Capacity': dtr.capacity ,
                    'Address': dtr.address,
                    'Latitude': dtr.location.lat !== 0 ? dtr.location.lat.toFixed(6) : 'N/A',
                    'Longitude': dtr.location.lng !== 0 ? dtr.location.lng.toFixed(6) : 'N/A',
                    'Last Communication': lastComm,
                }
            ];

            // Prepare DTR Statistics data with S.No
            const dtrStatsData = dtr.stats.map((stat, index) => ({
                'S.No': index + 1,
                'Metric': stat.title,
                'Value': stat.value || 'N/A',
                'Subtitle': stat.subtitle1 || '',
            }));

            // Prepare Feeders data
            const feedersExportData = feedersData.map((feeder, index) => ({
                'S.No': index + 1,
                'Feeder Name': feeder.feederName || 'N/A',
                'Load Status': feeder.loadStatus || 'N/A',
                'Condition': feeder.condition || 'N/A',
                'Capacity': feeder.capacity || 'N/A',
                'Address': feeder.address || 'N/A',
            }));

            // Prepare Alerts data
            const alertsExportData = alertsData.map((alert, index) => ({
                'S.No': index + 1,
                'Alert ID': alert.alertId || 'N/A',
                'Type': alert.type || 'N/A',
                'Feeder Name': alert.feederName || 'N/A',
                'Occurred On': alert.occuredOn || 'N/A',
            }));

            // Prepare Daily Consumption data
            const consumptionExportData = dailyConsumptionData.xAxisData.map((date, index) => ({
                'S.No': index + 1,
                'Date': date || 'N/A',
                'Consumption (kWh)': dailyConsumptionData.seriesData[0]?.data[index] || 0,
            }));

            // Create sheets with auto-sizing
            const dtrInfoSheet = XLSX.utils.json_to_sheet(dtrInfoData);
            const dtrStatsSheet = XLSX.utils.json_to_sheet(dtrStatsData);
            const feedersSheet = XLSX.utils.json_to_sheet(feedersExportData);
            const alertsSheet = XLSX.utils.json_to_sheet(alertsExportData);
            const consumptionSheet = XLSX.utils.json_to_sheet(consumptionExportData);

            // Auto-size columns for all sheets
            const sheets = [
                { sheet: dtrInfoSheet, name: 'DTR Information' },
                { sheet: dtrStatsSheet, name: 'DTR Statistics' },
                { sheet: feedersSheet, name: 'DTR Feeders' },
                { sheet: alertsSheet, name: 'DTR Alerts' },
                { sheet: consumptionSheet, name: 'Daily Consumption' }
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
                                            titleSize: 'lg',
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
                                                        value: locationHierarchy.find(loc => loc.type === 'Division')?.name || 'N/A',
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    },
                                                    {
                                                        title: 'Sub-Division',
                                                        value: locationHierarchy.find(loc => loc.type === 'Sub-Division')?.name || 'N/A',
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    },
                                                    {
                                                        title: 'Substation',
                                                        value: locationHierarchy.find(loc => loc.type === 'Substation')?.name || 'N/A',
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
                                                        title: 'Condition',
                                                        value: dtr.condition,
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    },
                                                    {
                                                        title: 'Capacity',
                                                        value: `${dtr.capacity} kVA`,
                                                        align: 'start',
                                                        gap: 'gap-1',
                                                        progressBar: true,
                                                        currentValue: feederStats?.totalKVA || 0,
                                                        maxValue: dtr.capacity,
                                                        progressColor: 'bg-positive'

                                                    },
                                                    {
                                                        title: 'Address',
                                                        value: dtr.address,
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    },
                                                    {
                                                        title: 'Latitude',
                                                        value: dtr.location.lat !== 0 ? dtr.location.lat.toFixed(6) : 'N/A',
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    },
                                                    {
                                                        title: 'Longitude',
                                                        value: dtr.location.lng !== 0 ? dtr.location.lng.toFixed(6) : 'N/A',
                                                        align: 'start',
                                                        gap: 'gap-1'
                                                    }
                                                ]
                                            },
                                            
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
                                                titleSize: 'lg',
                                            titleVariant: 'primary',
                                            titleWeight: 'bold',
                                            titleAlign: 'left',
                                            className:'w-full',
                                            // rightComponent: { name: 'LastComm', props: { value: lastComm } },
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
                                                    icon: 'icons/eye.svg',
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
