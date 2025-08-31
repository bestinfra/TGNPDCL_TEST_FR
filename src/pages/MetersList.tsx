import { lazy } from 'react';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
const Page = lazy(() => import('SuperAdmin/Page'));
// Define TableData type locally since we're using federated components
interface TableData {
  [key: string]: string | number | boolean | null | undefined;
}
import BACKEND_URL from '../config';

const MetersList: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('');
    const [type, setType] = useState('');
    const [mapping, setMapping] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Meter cards data - Empty initially, will show skeleton while loading
    const [meterCards, setMeterCards] = useState([
        {
            title: 'Total Meters',
            value: '',
            icon: '/icons/meter.svg',
            subtitle1: '',
            subtitle2: '',
        },
        {
            title: 'Meter Makes',
            value: '',
            icon: '/icons/meter-make.svg',
            subtitle1: '',
            subtitle2: '',
        },
        {
            title: 'Mapped Meters',
            value: '',
            icon: '/icons/mapped-meter.svg',
            subtitle1: '',
            subtitle2: '',
        },
        {
            title: 'Connection Type',
            value: '',
            icon: '/icons/connection-type.svg',
            subtitle1: '',
            subtitle2: '',
        },
    ]);

    // Table data
    const [tableData, setTableData] = useState<TableData[]>([]);

    // Fetch data from API
    useEffect(() => {
        const fetchAllMeters = async () => {
            try {
                setIsLoading(true);
                setError(null);
                
                let allMeters: any[] = [];
                let currentPage = 1;
                let hasNextPage = true;
                
                console.log('Fetching all meters from:', `${BACKEND_URL}/meters`);
                
                // Fetch all pages to get all meters
                while (hasNextPage) {
                    const response = await fetch(`${BACKEND_URL}/meters?page=${currentPage}&limit=100`);
                    const data = await response.json();
                    
                    if (data.success) {
                        console.log(`Page ${currentPage} data:`, data.data);
                        allMeters = [...allMeters, ...data.data];
                        
                        // Check if there are more pages
                        hasNextPage = data.pagination?.hasNextPage || false;
                        currentPage++;
                    } else {
                        console.error('Failed to fetch meters:', data.message);
                        break;
                    }
                }
                
                console.log('Total meters fetched:', allMeters.length);
                
                // Process all table data to match existing structure
                const processedData = allMeters.map((meter: any, _index: number) => ({
                    slNo: meter.sNo,
                    meterSlNo: meter.meterSerialNumber,
                    modemSlNo: meter.modemSerialNumber,
                    meterType: meter.meterType,
                    meterMake: meter.meterMake,
                    consumerName: meter.consumerName,
                    location: meter.location,
                    installationDate: meter.installationDate ? new Date(meter.installationDate).toLocaleDateString() : '',
                    status: 'Active', // Set default status since backend doesn't provide it
                }));
                
                console.log('Processed meter data:', processedData);
                setTableData(processedData);
                
                // Update meter cards with real data only if we have meters
                if (allMeters.length > 0) {
                    setMeterCards([
                        {
                            title: 'Total Meters',
                            value: String(allMeters.length),
                            icon: '/icons/meter.svg',
                            subtitle1: `${allMeters.length} Total`,
                            subtitle2: 'Meters Available',
                        },
                        {
                            title: 'Meter Makes',
                            value: String(new Set(allMeters.map((m: any) => m.meterMake)).size),
                            icon: '/icons/meter-make.svg',
                            subtitle1: 'Unique Makes',
                            subtitle2: 'Available',
                        },
                        {
                            title: 'Mapped Meters',
                            value: String(allMeters.length),
                            icon: '/icons/mapped-meter.svg',
                            subtitle1: 'All Meters',
                            subtitle2: 'Mapped',
                        },
                        {
                            title: 'Connection Type',
                            value: 'Mixed',
                            icon: '/icons/connection-type.svg',
                            subtitle1: 'Various Types',
                            subtitle2: 'Available',
                        },
                    ]);
                }
            } catch (error) {
                console.error('Error fetching meters:', error);
                setError('Failed to fetch meters data. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchAllMeters();
    }, []);

    const tableColumns = [
        { key: 'slNo', label: 'Sl No' },
        { key: 'meterSlNo', label: 'Meter SI No' },
        { key: 'modemSlNo', label: 'Modem SI No' },
        { key: 'meterType', label: 'Meter Type' },
        { key: 'meterMake', label: 'Meter Make' },
        { key: 'consumerName', label: 'Consumer Name' },
        { key: 'location', label: 'Location' },
        { key: 'installationDate', label: 'Installation Date' },
        { 
            key: 'status', 
            label: 'Status',
            statusIndicator: {},
            isActive: (value: string | number | boolean | null | undefined) => String(value).toLowerCase() === 'active'
        },
    ];

    const tableActions = [
        {
            label: 'View',
            icon: '/icons/eye.svg',
            onClick: (row: TableData) => navigate(`/meter-details/${row.meterSlNo}`),
        },
    ];

    // Filter options
    const statusOptions = [
        { value: '', label: 'Filter By Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'In-Active' },
    ];
    const typeOptions = [
        { value: '', label: 'Filter By Meter Types' },
        { value: 'prepaid', label: 'Prepaid' },
        { value: 'postpaid', label: 'Postpaid' },
    ];
    const mappingOptions = [
        { value: '', label: 'Filter By Mapping' },
        { value: 'mapped', label: 'Mapped' },
        { value: 'unmapped', label: 'Unmapped' },
    ];

    const handleFilterChange = (e: { target: { name: string; value: string } }) => {
        const { name, value } = e.target;
        if (name === 'status') setStatus(value);
        if (name === 'type') setType(value);
        if (name === 'mapping') setMapping(value);
    };

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
                    },
                    components: [
                        {
                            name: 'PageHeader',
                            props: {
                                title: 'Meters List',
                                onBackClick: () => window.history.back(),
                                backButtonText: 'Back to Dashboard',
                                buttonsLabel: '',
                                variant: 'primary',
                                onClick: () => {},
                                showMenu: true,
                                showDropdown: true,
                                menuItems: [
                                    { id: 'all', label: 'All Meters' },
                                    { id: 'active', label: 'Active' },
                                    { id: 'inactive', label: 'Inactive' },
                                    { id: 'prepaid', label: 'Prepaid' },
                                    { id: 'postpaid', label: 'Postpaid' },
                                    { id: 'mapped', label: 'Mapped' },
                                    { id: 'unmapped', label: 'Unmapped' }
                                ],
                                onMenuItemClick: (itemId: string) => {
                                    console.log(`Filter by: ${itemId}`);
                                    if (itemId === 'active' || itemId === 'inactive') {
                                        setStatus(itemId);
                                    } else if (itemId === 'prepaid' || itemId === 'postpaid') {
                                        setType(itemId);
                                    } else if (itemId === 'mapped' || itemId === 'unmapped') {
                                        setMapping(itemId);
                                    } else if (itemId === 'all') {
                                        setStatus('');
                                        setType('');
                                        setMapping('');
                                    }
                                },
                            },
                        },
                    ],
                },
                // Overview Cards section
                {
                    layout: {
                        type: 'grid' as const,
                        columns: 4,
                        gap: 'gap-4',
                    },
                    components: meterCards.map((card) => ({
                        name: 'Card',
                        props: {
                            title: card.title,
                            value: card.value,
                            icon: card.icon,
                            subtitle1: card.subtitle1,
                            subtitle2: card.subtitle2,
                            bg: "bg-stat-icon-gradient",
                            loading: isLoading,
                        },
                    })),
                },
                // Filters section
                {
                    layout: {
                        type: 'grid' as const,
                        columns: 3,
                        gap: 'gap-4',
                    },
                    components: [
                        {
                            name: 'Dropdown',
                            props: {
                                name: 'status',
                                value: status,
                                onChange: handleFilterChange,
                                options: statusOptions,
                                className: 'w-full',
                            },
                        },
                        {
                            name: 'Dropdown',
                            props: {
                                name: 'type',
                                value: type,
                                onChange: handleFilterChange,
                                options: typeOptions,
                                className: 'w-full',
                            },
                        },
                        {
                            name: 'Dropdown',
                            props: {
                                name: 'mapping',
                                value: mapping,
                                onChange: handleFilterChange,
                                options: mappingOptions,
                                className: 'w-full',
                            },
                        },
                    ],
                },
                // Table section
                {
                    layout: {
                        type: 'column' as const,
                        className: 'w-full',
                    },
                    components: [
                        {
                            name: 'Table',
                            props: {
                                data: tableData,
                                columns: tableColumns,
                                actions: tableActions,
                                showActions: true,
                                searchable: true,
                                pagination: true,
                                initialRowsPerPage: 10,
                                emptyMessage: 'No data available',
                                className: 'w-full',
                                loading: isLoading,
                            },
                        },
                    ],
                },
            ]}
        />
    );
};

export default MetersList; 