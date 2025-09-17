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

const nonActionableCardTypes = [
  'daily-kwh','monthly-kwh',
  'daily-kvah','monthly-kvah',
  'daily-kw','monthly-kw',
  'daily-kva','monthly-kva'
];

const DTRTable: React.FC = () => {
  const navigate = useNavigate();
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardType, setCardType] = useState<string | null>(null);
  const [cardTitle, setCardTitle] = useState<string>('DTR Management');
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

    if (type) setCardType(type);
    if (title) setCardTitle(decodeURIComponent(title));
  }, []);

  const getTableColumns = () => {
    switch (cardType) {
      case 'total-dtrs':
        return [
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'feedersCount', label: 'Feeders Count' },
          {
            key: 'commStatus',
            label: 'Communication-Status',
            statusIndicator: {},
            isActive: (value: string | number | boolean | null | undefined) =>
              String(value).toLowerCase() === "active",
          },
          { key: 'lastCommunication', label: 'Last Communication' },
        ];
      case 'total-lt-feeders':
        return [
          { key: 'sNo', label: 'S.No' },
          { key: 'meterSerialNumber', label: 'Meter Number' },
          { key: 'modemSerialNumber', label: 'Modem Serial Number' },
          { key: 'meterType', label: 'Meter Type' },
          { key: 'meterMake', label: 'Meter Make' },
          { key: 'location', label: 'Location' },
          { key: 'installationDate', label: 'Installation Date' },
        ];
      case 'fuse-blown':
      case 'lt-fuse-blown':
      case 'ht-fuse-blown':
        return [
          { key: 'slNo', label: 'S.No' },
          { key: 'meterNo', label: 'Meter Number' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'location', label: 'Location' },
          { key: 'fuseType', label: 'Fuse Type' },
          { key: 'blownTime', label: 'Blown Time' },
          { key: 'lastReadingDate', label: 'Last Reading Date' },
        ];
      case 'overloaded-feeders':
      case 'underloaded-feeders':
        return [
          { key: 'slNo', label: 'S.No' },
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'manufacturer', label: 'Manufacturer' },
          { key: 'model', label: 'Model' },
          { key: 'capacity', label: 'Capacity' },
          //{ key: 'loadPercentage', label: 'Load %' },
          { key: 'feedersCount', label: 'Feeders Count' },
          { key: 'location', label: 'Location' },
          { key: 'status', label: 'Status' },
        ];
      case 'unbalanced-dtrs':
        return [
          { key: 'dtrId', label: 'DTR ID' },
          { key: 'dtrName', label: 'DTR Name' },
          { key: 'phaseA', label: 'Phase A (A)' },
          { key: 'phaseB', label: 'Phase B (A)' },
          { key: 'phaseC', label: 'Phase C (A)' },
          //{ key: 'imbalance', label: 'Imbalance %' },
          { key: 'location', label: 'Location' },
        ];
      case 'power-failure-feeders':
        return [
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
              String(value).toLowerCase() === "active",
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

        let url = "";
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("pageSize", pageSize.toString());
        if (search) params.append("search", search);

        switch (cardType) {
          case "total-dtrs":
            url = `${BACKEND_URL}/dtrs?${params.toString()}`;
            break;
          case "total-lt-feeders":
            url = `${BACKEND_URL}/meters?page=${page}&limit=${pageSize}`;
            break;
          case "fuse-blown":
            url = `${BACKEND_URL}/dtrs/fuse-blown-meters?${params.toString()}`;
            break;
          case "overloaded-feeders":
            url = `${BACKEND_URL}/dtrs/overloaded-dtrs?${params.toString()}`;
            break;
          case "underloaded-feeders":
            url = `${BACKEND_URL}/dtrs/underloaded-dtrs?${params.toString()}`;
            break;
          case "ht-fuse-blown":
            url = `${BACKEND_URL}/dtrs/ht-fuse-blown`;
            break;
          case "lt-fuse-blown":
            url = `${BACKEND_URL}/dtrs/lt-fuse-blown`;
            break;
          case "unbalanced-dtrs":
            url = `${BACKEND_URL}/dtrs/unbalanced-dtrs`;
            break;
          case "power-failure-feeders":
            url = `${BACKEND_URL}/dtrs/power-failure-feeders`;
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

        const response = await fetch(url, { credentials: "include" });
        if (!response.ok) throw new Error(`Failed to fetch data for ${cardType}`);

        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) throw new Error("Invalid response format");

        const data = await response.json();

        if (data.success) {
          safeSetTableData(data.data || []);
          const paginationData = data.pagination || data;
          setServerPagination({
            currentPage: paginationData.currentPage || paginationData.page || 1,
            totalPages: paginationData.totalPages || Math.ceil((paginationData.total || 0) / (paginationData.pageSize || pageSize)),
            totalCount: paginationData.totalCount || paginationData.total || 0,
            limit: paginationData.limit || paginationData.pageSize || pageSize,
            hasNextPage: paginationData.hasNextPage || false,
            hasPrevPage: paginationData.hasPrevPage || false,
          });
          setError(null);
        } else {
          throw new Error(data.message || `Failed to fetch data for ${cardType}`);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch data. Please try again.");
        console.error(`❌ Error fetching ${cardType}:`, err);
      } finally {
        setLoading(false);
      }
    },
    [cardType]
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
    if (cardType === 'total-dtrs' && row.dtrId != null) navigate(`/dtr-detail/${row.dtrId}`);
    else if (cardType === 'total-lt-feeders' && row.meterSerialNumber != null) navigate(`/meters?search=${row.meterSerialNumber}`);
    else if (cardType === 'fuse-blown' && row.meterNo != null) navigate(`/meters?search=${row.meterNo}`);
   // else if (['overloaded-feeders', 'underloaded-feeders'].includes(cardType) && row.dtrId != null) navigate(`/dtr-detail/${row.dtrId}`);
  };

  const handleEdit = (_row: TableData) => {};

  const handlePageChange = (page: number) => fetchData(page, serverPagination.limit);
  const handleSearch = (searchTerm: string) => fetchData(1, serverPagination.limit, searchTerm);

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
                        onView: !nonActionableCardTypes.includes(cardType || '') ? handleView : undefined,
                        onEdit: !nonActionableCardTypes.includes(cardType || '') ? handleEdit : undefined,
                        onRowClick: !nonActionableCardTypes.includes(cardType || '') ? handleView : undefined,
                        text: cardTitle,
                        className: 'w-full',
                        emptyMessage: `No ${cardTitle.toLowerCase()} data found`,
                        rowsPerPageOptions: [10, 25, 50],
                        initialRowsPerPage: 10,
                        showSkeletonActionButtons: true,
                        onPageChange: handlePageChange,
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
