import { lazy } from 'react';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
const Page = lazy(() => import('SuperAdmin/Page'));
import BACKEND_URL from '../config';

interface DataLoggerDetails {
    sNo: number;
    modemSlNo: string;
    hwVersion: string;
    fwVersion: string;
    mobile: string;
    installationDate: string;
    status?: string;
    lastCommunication?: string;
    batteryLevel?: number;
    signalStrength?: number;
    location?: string;
    assignedMeters?: number;
    totalReadings?: number;
}

const DataLoggerDashboard: React.FC = () => {
    const { dataLoggerId } = useParams<{ dataLoggerId: string }>();
    const navigate = useNavigate();
    const [dataLogger, setDataLogger] = useState<DataLoggerDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [connectedMeters, setConnectedMeters] = useState<any[]>([]);

    // Initialize summary cards with - values
    const [summaryCards, setSummaryCards] = useState([
        {
            title: 'Status',
            value: '-',
            icon: 'icons/status.svg',
            subtitle1: '-',
            subtitle2: '',
        },
        {
            title: 'Battery Level',
            value: '-',
            icon: 'icons/battery-charge.svg',
            subtitle1: '-',
            subtitle2: '',
        },
        {
            title: 'Signal Strength',
            value: '-',
            icon: 'icons/signal.svg',
            subtitle1: '-',
            subtitle2: '',
        },
        {
            title: 'Assigned Meters',
            value: '-',
            icon: 'icons/meter.svg',
            subtitle1: '-',
            subtitle2: '',
        },
    ]);

    useEffect(() => {
        const fetchDataLoggerDetails = async () => {
            if (!dataLoggerId) return;
            
            setLoading(true);
            setError(null);
            try {
                // Fetch data logger details
                const response = await fetch(`${BACKEND_URL}/meters/dataloggers/${dataLoggerId}`);
                if (!response.ok) throw new Error('Failed to fetch data logger details');
                
                const result = await response.json();
                if (result.success) {
                    const data = result.data;
                    setDataLogger(data);
                    
                    // Update summary cards with real data
                    setSummaryCards([
                        {
                            title: 'Status',
                            value: data.status || '-',
                            icon: 'icons/status.svg',
                            subtitle1: data.lastCommunication 
                                ? `Last Communication: ${new Date(data.lastCommunication).toLocaleString()}`
                                : 'No communication data',
                            subtitle2: '',
                        },
                        {
                            title: 'Battery Level',
                            value: data.batteryLevel ? `${data.batteryLevel}%` : '-',
                            icon: 'icons/battery-charge.svg',
                            subtitle1: data.batteryLevel && data.batteryLevel < 20 
                                ? 'Low Battery Warning' 
                                : 'Battery OK',
                            subtitle2: '',
                        },
                        {
                            title: 'Signal Strength',
                            value: data.signalStrength ? `${data.signalStrength}%` : '-',
                            icon: 'icons/signal.svg',
                            subtitle1: data.signalStrength && data.signalStrength > 80 
                                ? 'Excellent Signal' 
                                : 'Signal OK',
                            subtitle2: '',
                        },
                        {
                            title: 'Assigned Meters',
                            value: data.assignedMeters?.toString() || '-',
                            icon: 'icons/meter.svg',
                            subtitle1: `Total Readings: ${data.totalReadings?.toLocaleString() || '-'}`,
                            subtitle2: '',
                        },
                    ]);

                    // Fetch connected meters for this data logger
                    try {
                        const metersResponse = await fetch(`${BACKEND_URL}/meters/dataloggers/${dataLoggerId}/meters`);
                        if (metersResponse.ok) {
                            const metersResult = await metersResponse.json();
                            if (metersResult.success) {
                                setConnectedMeters(metersResult.data || []);
                            }
                        }
                    } catch (metersError) {
                        console.error('Failed to fetch connected meters:', metersError);
                        setConnectedMeters([]);
                    }
                } else {
                    throw new Error(result.message || 'Failed to fetch data logger details');
                }
            } catch (error: any) {
                console.error('Error fetching data logger details:', error);
                setError('Failed to fetch data logger details. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchDataLoggerDetails();
    }, [dataLoggerId]);

    const handleRetry = () => {
        setError(null);
        window.location.reload();
    };

    return (
        <Page
            sections={[
                // Error section
                ...(error ? [{
                    layout: {
                        type: 'column' as const,
                        gap: 'gap-4',
                    },
                    components: [
                        {
                            name: 'Error',
                            props: {
                                visibleErrors: [error],
                                onRetry: handleRetry,
                                showRetry: true,
                                maxVisibleErrors: 1,
                            },
                        },
                    ],
                }] : []),
                // Header section
                {
                    layout: {
                        type: 'row' as const,
                        className: '',
                    },
                    components: [
                        {
                            name: 'PageHeader',
                            props: {
                                title: loading ? 'Loading Data Logger Details...' : 
                                       !dataLogger ? 'Data Logger Not Found' : 
                                       `Data Logger: ${dataLogger.modemSlNo}`,
                                onBackClick: () => navigate('/data-logger'),
                                backButtonText: 'Back to Data Logger',
                                buttonsLabel: dataLogger ? 'Edit Data Logger' : '',
                                variant: 'primary',
                                showMenu: dataLogger ? true : false,
                                showDropdown: dataLogger ? true : false,
                                menuItems: dataLogger ? [
                                    { id: 'configure', label: 'Configure' },
                                    { id: 'restart', label: 'Restart Device' },
                                    { id: 'firmware', label: 'Update Firmware' },
                                    { id: 'maintenance', label: 'Schedule Maintenance' },
                                    { id: 'export', label: 'Export Data' },
                                ] : [],
                            },
                        },
                    ],
                },
                // Cards section (show even when loading)
                {
                    layout: {
                        type: 'grid' as const,
                        columns: 4,
                        gap: 'gap-4',
                        className: '',
                    },
                    components: summaryCards.map((card, index) => ({
                        name: 'Card',
                        props: {
                            ...card,
                            key: index,
                            loading: loading,
                        },
                    })),
                },
                // Table section (always show)
                {
                    layout: {
                        type: 'grid' as const,
                        columns: 1,
                        gap: 'gap-4',
                        rows: [
                            {
                                layout: 'grid' as const,
                                gridColumns: 1,
                                gap: 'gap-4',
                                columns: [
                                    {
                                        name: 'Table',
                                        props: {
                                            data: connectedMeters,
                                            columns: [
                                                { key: 'meterSlNo', label: 'Meter Serial No.' },
                                                { key: 'consumerName', label: 'Consumer Name' },
                                                { key: 'lastReading', label: 'Last Reading' },
                                                { key: 'readingDate', label: 'Reading Date' },
                                                { key: 'status', label: 'Status' },
                                            ],
                                            loading: loading,
                                            showHeader: true,
                                            headerTitle: 'Connected Meters',
                                            // dateRange: 'Real-time data',
                                            searchable: true,
                                            sortable: true,
                                            availableTimeRanges:[], 
                                            pagination: true,
                                            showActions: true,
                                            text: 'Meters connected to this data logger',
                                            emptyMessage: 'No meters connected to this data logger',
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

export default DataLoggerDashboard;
