import { lazy } from 'react';
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BACKEND_URL from '../config';

const Page = lazy(() => import('SuperAdmin/Page'));

// Define TableData type locally since we're using federated components
interface TableData {
  [key: string]: string | number | boolean | null | undefined;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const nonActionableCardTypes: string[] = [
  // Consumption-related tables are now actionable (can navigate to DTR detail)
  // 'daily-kwh','monthly-kwh',
  // 'daily-kvah','monthly-kvah',
  // 'daily-kw','monthly-kw',
  // 'daily-kva','monthly-kva'
];

const DTRTable: React.FC = () => {
  const navigate = useNavigate();
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardType, setCardType] = useState<string | null>(null);
  const [cardTitle, setCardTitle] = useState<string>('DTR Management');
  const [searchTerm, setSearchTerm] = useState('');
  const [hierarchyId, setHierarchyId] = useState<string | null>(null);
  const [serverPagination, setServerPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const safeSetTableData = (data: TableData[]) => {
    if (data && data.length > 0) {
      console.log(`[DTRTable] Setting table data with ${data.length} items`);
      setTableData(data);
    } else {
      console.log(`[DTRTable] Setting empty table data - API returned no data`);
      setTableData([]);
    }
  };

  // Apply URL params only once
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const title = urlParams.get('title');
    const selectedHierarchyId = urlParams.get('hierarchyId') || urlParams.get('lastSelectedId');

    if (type) setCardType(type);
    if (title) setCardTitle(decodeURIComponent(title));
    if (selectedHierarchyId) setHierarchyId(selectedHierarchyId);
  }, []);

  const getTableColumns = () => {
    switch (cardType) {
      case 'communicating-meters':
      case 'non-communicating-meters':
        return [
          { key: 'slNo', label: 'S.No' },
          { key: 'meterNo', label: 'Meter Number' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'location', label: 'Location' },
          { key: 'communicationStatus', label: 'Communication Status' },
          { key: 'lastCommunicationDate', label: 'Last Communication' },
        ];
      case 'total-dtrs':
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'feedersCount', label: 'Feeders Count' },
          {
            key: 'commStatus',
            label: 'Communication-Status',
            statusIndicator: {},
            isActive: (value: string | number | boolean | null | undefined) =>
              String(value).toLowerCase() === 'active',
          },
          { key: 'lastCommunication', label: 'Last Communication' },
        ];
      case 'total-lt-feeders':
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'meterNo', label: 'Meter Number' },
          { key: 'communicationStatus', label: 'Communication Status' },
          { key: 'location', label: 'Location' },
          { key: 'lastCommunicationDate', label: 'Last Communication Date' },

          //{ key: 'installationDate', label: 'Installation Date' },
        ];
      case 'fuse-blown':
      case 'lt-fuse-blown':
      case 'ht-fuse-blown':
        return [
          { key: 'slNo', label: 'S.No' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'meterNo', label: 'Meter Number' },
          { key: 'location', label: 'Location' },
          { key: 'fuseType', label: 'Fuse Type' },
          { key: 'lastReadingDate', label: 'Last Communication Date' },
        ];
      case 'overloaded-feeders':
      case 'underloaded-feeders':
        return [
          { key: 'slNo', label: 'S.No' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'manufacturer', label: 'Manufacturer' },
          { key: 'communicationStatus', label: 'Communication Status' },
          { key: 'feedersCount', label: 'Feeders Count' },
          { key: 'capacity', label: 'Capacity' },
          { key: 'loadPercentage', label: 'Load %' },
          { key: 'location', label: 'Location' },
          { key: 'lastCommunication', label: 'Last Communication' },
        ];
      case 'unbalanced-dtrs':
        return [
          { key: 'slNo', label: 'S.No' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'location', label: 'Location' },
          { key: 'communicationStatus', label: 'Communication Status' },
          { key: 'neutralCurrent', label: 'Neutral Current' },
          { key: 'lastCommunication', label: 'Last Communication' },
        ];
      case 'power-failure-feeders':
        return [
          { key: 'slNo', label: 'S.No' },
          { key: 'feederId', label: 'DTR ID' },
          { key: 'feederName', label: 'DTR Name' },
          { key: 'meterNo', label: 'Meter Number' },
          { key: 'communicationStatus', label: 'Communication Status' },
          { key: 'location', label: 'Location' },
          { key: 'failureTime', label: 'Failure Time' },
          { key: 'lastCommunication', label: 'Last Communication' },
        ];
      case 'daily-kwh':
      case 'monthly-kwh':
        return [
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
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'kva', label: 'kVA Reading' },
          { key: 'powerFactor', label: 'Power Factor' },
          { key: 'location', label: 'Location' },
          { key: 'timestamp', label: 'Timestamp' },
        ];
      default:
        return [
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'feedersCount', label: 'Feeders Count' },
          {
            key: 'commStatus',
            label: 'Communication-Status',
            statusIndicator: {},
            isActive: (value: string | number | boolean | null | undefined) =>
              String(value).toLowerCase() === 'active',
          },
          { key: 'lastCommunication', label: 'Last Communication' },
        ];
    }
  };

  const fetchData = useCallback(
    async (page: number = 1, pageSize: number = 10, search?: string) => {
      setLoading(true);
      try {
        if (!cardType) return;

        let url = '';
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('pageSize', pageSize.toString());
        if (search) params.append('search', search);
        if (hierarchyId) params.append('hierarchyId', hierarchyId);

        switch (cardType) {
          case 'total-dtrs':
            url = `${BACKEND_URL}/dtrs?${params.toString()}`;
            break;
          case 'communicating-meters':
            url = `${BACKEND_URL}/dtrs/communicating-meters?${params.toString()}`;
            break;
          case 'non-communicating-meters':
            url = `${BACKEND_URL}/dtrs/non-communicating-meters?${params.toString()}`;
            break;
          case 'total-lt-feeders':
            url = `${BACKEND_URL}/dtrs/all-meters?${params.toString()}`;
            break;
          case 'fuse-blown':
            url = `${BACKEND_URL}/dtrs/fuse-blown-meters?${params.toString()}`;
            break;
          case 'overloaded-feeders':
            url = `${BACKEND_URL}/dtrs/overloaded-dtrs?${params.toString()}`;
            break;
          case 'underloaded-feeders':
            url = `${BACKEND_URL}/dtrs/underloaded-dtrs?${params.toString()}`;
            break;
          case 'ht-fuse-blown':
            url = `${BACKEND_URL}/dtrs/ht-fuse-blown?${params.toString()}`;
            break;
          case 'lt-fuse-blown':
            url = `${BACKEND_URL}/dtrs/lt-fuse-blown?${params.toString()}`;
            break;
          case 'unbalanced-dtrs':
            url = `${BACKEND_URL}/dtrs/unbalanced-dtrs?${params.toString()}`;
            break;
          case 'power-failure-feeders':
            url = `${BACKEND_URL}/dtrs/power-failure-feeders?${params.toString()}`;
            break;

          default:
            if (nonActionableCardTypes.includes(cardType)) {
              safeSetTableData([]);
              setServerPagination({
                currentPage: 1,
                totalPages: 1,
                totalCount: 0,
                limit: pageSize,
                hasNextPage: false,
                hasPrevPage: false,
              });
              setError(null);
              setLoading(false);
              return;
            } else {
              throw new Error(`Unsupported card type: ${cardType}`);
            }
        }

        console.log(`[DTRTable] Fetching data for ${cardType} from: ${url}`);
        console.log(`[DTRTable] Request params:`, { page, pageSize, search });

        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error(`Failed to fetch data for ${cardType}`);

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) throw new Error('Invalid response format');

        const data = await response.json();
        console.log(`[DTRTable] Full API response for ${cardType}:`, data);

        if (data.success) {
          let rows = data.data || [];
          console.log(`[DTRTable] Raw data for ${cardType}:`, rows.length, 'rows');
          console.log(`[DTRTable] Sample row:`, rows[0]);

          // No client-side filter needed; backend returns filtered rows

          safeSetTableData(rows);

          // Derive pagination after filter
          if (data.pagination) {
            setServerPagination({
              currentPage: data.pagination.currentPage,
              totalPages: data.pagination.totalPages,
              totalCount: data.pagination.totalCount,
              limit: data.pagination.limit,
              hasNextPage: data.pagination.hasNextPage,
              hasPrevPage: data.pagination.hasPrevPage,
            });
          } else {
            // Fallback for endpoints without pagination object
            const totalFiltered = rows.length;
            setServerPagination({
              currentPage: 1,
              totalPages: 1,
              totalCount: totalFiltered,
              limit: totalFiltered,
              hasNextPage: false,
              hasPrevPage: false,
            });
          }
          setError(null);
        } else {
          throw new Error(data.message || `Failed to fetch data for ${cardType}`);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data. Please try again.');
        console.error(`❌ Error fetching ${cardType}:`, err);
      } finally {
        setLoading(false);
      }
    },
    [cardType, hierarchyId]
  );

  useEffect(() => {
    if (!cardType) return;
    setTableData([]);
    setLoading(true);
    setError(null);
    setServerPagination({
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      limit: 10,
      hasNextPage: false,
      hasPrevPage: false,
    });
    fetchData(1, 10);
  }, [cardType, fetchData]);

  const handleView = (row: TableData) => {
    if (!row) return;

    if (cardType === 'total-lt-feeders') {
      const dtrId = row.dtrId;
      if (dtrId != null) {
        navigate(`/feeder/${dtrId}`, {
          state: {
            feederData: {
              meterNumber: row.meterNo,
              dtrId: dtrId,
              dtrName: row.dtrName,
              location: row.location,
              communicationStatus: row.communicationStatus,
              lastCommunicationDate: row.lastCommunicationDate,
            },
            dtrId: dtrId,
            dtrName: row.dtrName,
          },
        });
        return;
      }
    }

    // For DTR-related tables, navigate to DTR detail page
    if (
      [
        'total-dtrs',
        'fuse-blown',
        'ht-fuse-blown',
        'lt-fuse-blown',
        'overloaded-feeders',
        'underloaded-feeders',
        'unbalanced-dtrs',
        'power-failure-feeders',
      ].includes(cardType || '')
    ) {
      const dtrId = row.dtrId || row.feederId; // feederId is used for power-failure-feeders
      if (dtrId != null) {
        navigate(`/dtr-detail/${dtrId}`);
        return;
      }
    }

    // For meter-related tables, navigate to meter search
    if (
      (cardType === 'communicating-meters' || cardType === 'non-communicating-meters') &&
      row.meterNo != null
    ) {
      navigate(`/meters?search=${row.meterNo}`);
      return;
    }

    if (cardType === 'fuse-blown' && row.meterNo != null) {
      navigate(`/meters?search=${row.meterNo}`);
      return;
    }

    // For consumption-related tables, navigate to DTR detail if dtrId is available
    if (
      [
        'daily-kwh',
        'monthly-kwh',
        'daily-kvah',
        'monthly-kvah',
        'daily-kw',
        'monthly-kw',
        'daily-kva',
        'monthly-kva',
      ].includes(cardType || '')
    ) {
      if (row.dtrId != null) {
        navigate(`/dtr-detail/${row.dtrId}`);
        return;
      }
    }
  };

  const handlePageChange = (page: number, limit?: number) => {
    const pageSize = limit ?? serverPagination.limit;
    setServerPagination((prev) => ({ ...prev, currentPage: page, limit: pageSize }));
    fetchData(page, pageSize, searchTerm.trim() || undefined);
  };

  const handleRowsPerPageChange = (limit: number) => {
    setServerPagination((prev) => ({ ...prev, currentPage: 1, limit }));
    fetchData(1, limit, searchTerm.trim() || undefined);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    fetchData(1, serverPagination.limit, value.trim() || undefined);
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Page
        sections={[
          ...(error
            ? [
                {
                  layout: {
                    type: 'column',
                    gap: 'gap-4',
                    rows: [
                      {
                        layout: 'column',
                        columns: [
                          {
                            name: 'Error',
                            props: {
                              visibleErrors: [error],
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
          {
            layout: {
              type: 'column',
              gap: 'gap-4',
              rows: [
                {
                  layout: 'row',
                  columns: [
                    {
                      name: 'PageHeader',
                      props: {
                        title: cardTitle,
                        onBackClick: () => navigate('/dtr-dashboard'),
                        backButtonText: 'Back to Dashboard',
                        buttonsLabel: cardType === 'total-lt-feeders' ? 'Export' : 'Add New',
                        variant: 'primary',
                        onClick: undefined,
                      },
                    },
                  ],
                },
              ],
            },
          },
          {
            layout: {
              type: 'column',
              gap: 'gap-4',
              rows: [
                {
                  layout: 'column',
                  columns: [
                    {
                      name: 'Table',
                      key: cardType || 'default',
                      props: {
                        data: tableData,
                        columns: getTableColumns(),
                        loading,
                        searchable: true,
                        sortable: true,
                        pagination: true,
                        showHeader: true,
                        showActions: !nonActionableCardTypes.includes(cardType || ''),
                        onView: !nonActionableCardTypes.includes(cardType || '')
                          ? handleView
                          : undefined,
                        // onEdit: !nonActionableCardTypes.includes(cardType || '') ? handleEdit : undefined,
                        onRowClick: !nonActionableCardTypes.includes(cardType || '')
                          ? handleView
                          : undefined,
                        text: cardTitle,
                        className: 'w-full',
                        emptyMessage: `No ${cardTitle.toLowerCase()} data found`,
                        rowsPerPageOptions: [10, 20, 25, 50],
                        initialRowsPerPage: serverPagination.limit,
                        itemsPerPage: serverPagination.limit,
                        pageSize: serverPagination.limit,
                        currentPage: serverPagination.currentPage,
                        totalPages: serverPagination.totalPages,
                        totalCount: serverPagination.totalCount,
                        showSkeletonActionButtons: true,
                        onPageChange: handlePageChange,
                        onPageSizeChange: handleRowsPerPageChange,
                        onRowsPerPageChange: handleRowsPerPageChange,
                        onSearch: handleSearch,
                        serverPagination,
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
