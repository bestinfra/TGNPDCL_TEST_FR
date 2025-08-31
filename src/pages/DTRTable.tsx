import { lazy } from 'react';
import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import BACKEND_URL from '../config';
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
  const [hasRealData, setHasRealData] = useState(false);

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
  // Fetch data based on card type
  const fetchData = async () => {
    setLoading(true);
    try {
      let apiData = null;
      
      // Call specific API based on card type
      if (cardType === 'ht-fuse-blown') {
        console.log('Fetching HT Fuse Blown data from:', `${BACKEND_URL}/dtrs/ht-fuse-blown`);
        const response = await fetch(`${BACKEND_URL}/dtrs/ht-fuse-blown`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API response:', result);
        
        if (result.success) {
          apiData = result.data || []; // Ensure we have an array even if empty
          setHasRealData(true);
        } else {
          throw new Error(result.message || 'Failed to fetch HT Side Fuse Blown data');
        }
      } else if (cardType === 'lt-fuse-blown') {
        const response = await fetch(`${BACKEND_URL}/dtrs/lt-fuse-blown`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          apiData = result.data || []; // Ensure we have an array even if empty
          setHasRealData(true);
        } else {
          throw new Error(result.message || 'Failed to fetch LT Side Fuse Blown data');
        }
      } else if (cardType === 'unbalanced-dtrs') {
        const response = await fetch(`${BACKEND_URL}/dtrs/unbalanced-dtrs`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API response:', result);
        
        if (result.success) {
          apiData = result.data || []; // Ensure we have an array even if empty
          setHasRealData(true);
          console.log('✅ Unbalanced DTRs data received:', apiData.length, 'records');
        } else {
          throw new Error(result.message || 'Failed to fetch Unbalanced DTRs data');
        }
      } else if (cardType === 'power-failure-feeders') {
        console.log('Fetching Power Failure Feeders data from:', `${BACKEND_URL}/dtrs/power-failure-feeders`);
        const response = await fetch(`${BACKEND_URL}/dtrs/power-failure-feeders`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API response:', result);
        
        if (result.success) {
          apiData = result.data || []; // Ensure we have an array even if empty
          setHasRealData(true);
          console.log('✅ Power Failure Feeders data received:', apiData.length, 'records');
        } else {
          throw new Error(result.message || 'Failed to fetch Power Failure Feeders data');
        }
      }
      
      // Use API data if available, otherwise show empty table
      if (apiData !== null) {
        setTableData(apiData);
      } else {
        // No API data available - show empty table for all card types
        setTableData([]);
      }
      
      setError(null);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please try again.');
      
      // Handle error fallback - keep existing data if available, otherwise show empty
      if (!hasRealData) {
        setTableData([]);
      } else {
        console.log('Keeping real API data despite error');
      }
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
                        emptyMessage: cardType === 'ht-fuse-blown' 
                          ? 'No HT side fuse blown incidents found. This indicates all DTRs have healthy voltage levels.' 
                          : cardType === 'lt-fuse-blown'
                          ? 'No LT side fuse blown incidents found. All LT feeders are operating normally.'
                          : cardType === 'unbalanced-dtrs'
                          ? 'No unbalanced DTRs found. All transformers have balanced load distribution.'
                          : cardType === 'power-failure-feeders'
                          ? 'No power failure incidents found. All feeders are operating normally.'
                          : `No ${cardTitle.toLowerCase()} data found`,
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
