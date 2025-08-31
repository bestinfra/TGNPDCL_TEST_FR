import { lazy } from 'react';
import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
const Page = lazy(() => import('SuperAdmin/Page'));

// Define TableData type locally since we're using federated components
interface TableData {
  [key: string]: string | number | boolean | null | undefined;
}

const DTRTable: React.FC = () => {
  const navigate = useNavigate();
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardType, setCardType] = useState<string>('total-dtrs');
  const [cardTitle, setCardTitle] = useState<string>('DTR Management');

  // Check URL parameters to determine which card was clicked
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const title = urlParams.get('title');
    if (type) {
      setCardType(type);
    }
    if (title) {
      setCardTitle(decodeURIComponent(title));
    }
  }, []);

  // Dynamic table columns based on card type
  const getTableColumns = () => {
    switch (cardType) {
      case 'total-dtrs':
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'capacity', label: 'Capacity (kVA)' },
          { key: 'location', label: 'Location' },
          { key: 'status', label: 'Status' },
          { key: 'lastUpdate', label: 'Last Update' },
        ];
      case 'total-lt-feeders':
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'feederId', label: 'Feeder ID' },
          { key: 'feederName', label: 'Feeder Name' },
          { key: 'dtrName', label: 'Connected DTR' },
          { key: 'load', label: 'Current Load (A)' },
          { key: 'status', label: 'Status' },
          { key: 'lastUpdate', label: 'Last Update' },
        ];
      case 'fuse-blown':
      case 'lt-fuse-blown':
      case 'ht-fuse-blown':
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'fuseType', label: 'Fuse Type' },
          { key: 'blownTime', label: 'Blown Time' },
          { key: 'location', label: 'Location' },
          { key: 'status', label: 'Status' },
        ];
      case 'overloaded-feeders':
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'feederId', label: 'Feeder ID' },
          { key: 'feederName', label: 'Feeder Name' },
          { key: 'currentLoad', label: 'Current Load (A)' },
          { key: 'ratedCapacity', label: 'Rated Capacity (A)' },
          { key: 'overloadPercentage', label: 'Overload %' },
          { key: 'location', label: 'Location' },
        ];
      case 'underloaded-feeders':
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'feederId', label: 'Feeder ID' },
          { key: 'feederName', label: 'Feeder Name' },
          { key: 'currentLoad', label: 'Current Load (A)' },
          { key: 'ratedCapacity', label: 'Rated Capacity (A)' },
          { key: 'utilization', label: 'Utilization %' },
          { key: 'location', label: 'Location' },
        ];
      case 'unbalanced-dtrs':
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'phaseA', label: 'Phase A (A)' },
          { key: 'phaseB', label: 'Phase B (A)' },
          { key: 'phaseC', label: 'Phase C (A)' },
          { key: 'imbalance', label: 'Imbalance %' },
          { key: 'location', label: 'Location' },
        ];
      case 'power-failure-feeders':
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'feederId', label: 'Feeder ID' },
          { key: 'feederName', label: 'Feeder Name' },
          { key: 'failureTime', label: 'Failure Time' },
          { key: 'affectedConsumers', label: 'Affected Consumers' },
          { key: 'estimatedRestoration', label: 'Est. Restoration' },
          { key: 'location', label: 'Location' },
        ];
      case 'daily-kwh':
      case 'monthly-kwh':
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'kwh', label: 'kWh Reading' },
          { key: 'previousReading', label: 'Previous Reading' },
          { key: 'consumption', label: 'Consumption' },
          { key: 'location', label: 'Location' },
          { key: 'timestamp', label: 'Timestamp' },
        ];
      case 'daily-kvah':
      case 'monthly-kvah':
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'kvah', label: 'kVAh Reading' },
          { key: 'previousReading', label: 'Previous Reading' },
          { key: 'consumption', label: 'Consumption' },
          { key: 'location', label: 'Location' },
          { key: 'timestamp', label: 'Timestamp' },
        ];
      case 'daily-kw':
      case 'monthly-kw':
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'kw', label: 'kW Reading' },
          { key: 'powerFactor', label: 'Power Factor' },
          { key: 'location', label: 'Location' },
          { key: 'timestamp', label: 'Timestamp' },
        ];
      case 'daily-kva':
      case 'monthly-kva':
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'kva', label: 'kVA Reading' },
          { key: 'powerFactor', label: 'Power Factor' },
          { key: 'location', label: 'Location' },
          { key: 'timestamp', label: 'Timestamp' },
        ];
      default:
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'status', label: 'Status' },
          { key: 'location', label: 'Location' },
          { key: 'lastUpdate', label: 'Last Update' },
        ];
    }
  };

  // Generate dynamic data based on card type
  const generateDynamicData = (): TableData[] => {
    const baseData = [];
    const count = Math.floor(Math.random() * 10) + 5; // Random count between 5-15

    for (let i = 1; i <= count; i++) {
      const baseItem: TableData = {
        sNo: i,
        id: `${cardType}-${i}`,
        name: `Sample ${cardTitle} Item ${i}`,
        status: Math.random() > 0.3 ? 'Active' : 'Inactive',
        location: `Zone ${String.fromCharCode(65 + (i % 3))}`,
        lastUpdate: `${Math.floor(Math.random() * 60)} min ago`,
      };

      // Add specific fields based on card type
      switch (cardType) {
        case 'total-dtrs':
          baseItem.dtrId = `DTR-${String(i).padStart(4, '0')}`;
          baseItem.dtrName = `Transformer ${i}`;
          baseItem.capacity = `${Math.floor(Math.random() * 500) + 100}`;
          break;
        case 'total-lt-feeders':
          baseItem.feederId = `FEEDER-${String(i).padStart(4, '0')}`;
          baseItem.feederName = `LT Feeder ${i}`;
          baseItem.dtrName = `DTR-${String(Math.floor(Math.random() * 10) + 1).padStart(4, '0')}`;
          baseItem.load = `${Math.floor(Math.random() * 100) + 20}`;
          break;
        case 'fuse-blown':
        case 'lt-fuse-blown':
        case 'ht-fuse-blown':
          baseItem.dtrId = `DTR-${String(i).padStart(4, '0')}`;
          baseItem.dtrName = `Transformer ${i}`;
          baseItem.fuseType = cardType === 'ht-fuse-blown' ? 'HT Fuse' : 'LT Fuse';
          baseItem.blownTime = `${Math.floor(Math.random() * 24)} hours ago`;
          break;
        case 'overloaded-feeders':
          baseItem.feederId = `FEEDER-${String(i).padStart(4, '0')}`;
          baseItem.feederName = `LT Feeder ${i}`;
          baseItem.currentLoad = `${Math.floor(Math.random() * 50) + 80}`;
          baseItem.ratedCapacity = '100';
          baseItem.overloadPercentage = `${Math.floor(Math.random() * 20) + 80}`;
          break;
        case 'unbalanced-dtrs':
          baseItem.dtrId = `DTR-${String(i).padStart(4, '0')}`;
          baseItem.dtrName = `Transformer ${i}`;
          baseItem.phaseA = `${Math.floor(Math.random() * 50) + 30}`;
          baseItem.phaseB = `${Math.floor(Math.random() * 50) + 30}`;
          baseItem.phaseC = `${Math.floor(Math.random() * 50) + 30}`;
          baseItem.imbalance = `${Math.floor(Math.random() * 30) + 5}`;
          break;
        case 'daily-kwh':
        case 'monthly-kwh':
          baseItem.dtrId = `DTR-${String(i).padStart(4, '0')}`;
          baseItem.dtrName = `Transformer ${i}`;
          baseItem.kwh = `${Math.floor(Math.random() * 1000) + 500}`;
          baseItem.previousReading = `${Math.floor(Math.random() * 1000) + 400}`;
          baseItem.consumption = `${Math.floor(Math.random() * 100) + 50}`;
          baseItem.timestamp = new Date().toLocaleString();
          break;
        default:
          // Use base item for unknown types
          break;
      }

      baseData.push(baseItem);
    }

    return baseData;
  };

  // Fetch data based on card type
  const fetchData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call based on cardType
      // const response = await fetch(`/api/dtrs/${cardType}`);
      // const data = await response.json();
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate dynamic data based on card type
      const dynamicData = generateDynamicData();
      setTableData(dynamicData);
      setError(null);
      
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [cardType]);

  // Handle row actions
  const handleView = (row: TableData) => {
    console.log('View item:', row);
    // Navigate to detail view
    // navigate(`/detail/${row.id}`);
  };

  const handleEdit = (row: TableData) => {
    console.log('Edit item:', row);
    // Navigate to edit form
    // navigate(`/edit/${row.id}`);
  };



  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Page
        sections={[
          // Error Section (show when there are errors)
          ...(error
            ? [
              {
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
                            visibleErrors: error ? [error] : [],
                            showRetry: true,
                            onRetry: () => fetchData(),
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            ]
            : []),
          // Page Header Section
          {
            layout: {
              type: 'column' as const,
              gap: 'gap-4',
              rows: [
                {
                  layout: 'row' as const,
                  columns: [
                    {
                      name: 'PageHeader',
                      props: {
                        title: cardTitle,
                        onBackClick: () => navigate('/dtr-dashboard'),
                        backButtonText: 'Back to Dashboard',
                        buttonsLabel: 'Add New',
                        variant: 'primary',
                        onClick: () => console.log('Add New clicked'),
                      },
                    },
                  ],
                },
              ],
            },
          },
          // Table Section
          {
            layout: {
              type: 'column' as const,
              gap: 'gap-4',
              rows: [
                {
                  layout: 'column' as const,
                  columns: [
                    {
                      name: 'Table',
                      props: {
                        data: tableData,
                        columns: getTableColumns(),
                        loading: loading,
                        searchable: true,
                        sortable: true,
                        pagination: true,
                        showHeader: true,
                        showActions: true,
                        onView: handleView,
                        onEdit: handleEdit,
                        text: cardTitle,
                        availableTimeRanges: [],
                        className: 'w-full',
                        emptyMessage: `No ${cardTitle.toLowerCase()} data found`,
                        rowsPerPageOptions: [10, 25, 50],
                        initialRowsPerPage: 10,
                        showSkeletonActionButtons: true,
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
};

export default DTRTable;
