import { Suspense, useState, useEffect, lazy, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
const Page = lazy(() => import("SuperAdmin/Page"));
import { apiClient } from '../api/apiUtils';

interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  spacing?: string;
}

const EXCLUDED_KEYS = new Set([
  'sNo', 'slNo', 'reportName', 'reportType', 'generatedDate', 
  'status', 'analysisValidation', 'meterSINo', 'meterLocation'
]);

const STANDARD_ORDER = [
  'timestamp', 'date', 'billingDate', 'consumptionDate', 'occurredOn', 
  'occurrenceDate', 'eventDate', 'surveyDate', 'recoveryDate', 'recoveredOn',
  'duration', 'kwh', 'kvah', 'kvarh', 'kw', 'kva', 'kvar', 'voltage', 
  'current', 'power', 'frequency', 'pf', 'powerFactor'
];

const extractAllKeysFromData = (data: any[]): string[] => {
  const allKeys = new Set<string>();
  
  data.forEach((item) => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach((key) => {
        if (key !== 'sNo' && key !== 'slNo') {
          allKeys.add(key);
        }
      });
    }
  });
  
  const filteredKeys = Array.from(allKeys).filter(key => !EXCLUDED_KEYS.has(key));
  const orderedKeys: string[] = [];
  const remainingKeys: string[] = [];
  
  STANDARD_ORDER.forEach(key => {
    if (filteredKeys.includes(key)) {
      orderedKeys.push(key);
    }
  });
  
  filteredKeys.forEach(key => {
    if (!STANDARD_ORDER.includes(key)) {
      remainingKeys.push(key);
    }
  });
  
  return [...orderedKeys, ...remainingKeys.sort()];
};

const formatColumnLabel = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
};

const generateDynamicColumns = (
  dataKeys: string[],
  baseColumns: TableColumn[] = []
): TableColumn[] => {
  const columns: TableColumn[] = [...baseColumns];
  
  dataKeys.forEach((key) => {
    const existingColumn = columns.find(col => col.key === key);
    if (!existingColumn) {
      columns.push({
        key: key,
        label: formatColumnLabel(key),
        sortable: true,
        searchable: true,
      });
    }
  });
  
  return columns;
};

const getReportApiEndpoint = (validationType: string, meterSINo: string, page: number = 1, pageSize: number = 10): string => {
  const endpointMap: Record<string, string> = {
    'instantaneous': `/reports/instantaneous/${meterSINo}`,
    'billing-data': `/reports/billing/${meterSINo}?page=${page}&pageSize=${pageSize}`,
    'consumption': `/reports/consumption/${meterSINo}?page=${page}&pageSize=${pageSize}`,
    'power-failure': `/reports/power-failure/${meterSINo}?page=${page}&pageSize=${pageSize}`,
    'event-off': `/reports/event-off/${meterSINo}?page=${page}&pageSize=${pageSize}`,
    'ls-data': `/reports/ls-data/${meterSINo}?page=${page}&pageSize=${pageSize}`,
  };
  
  return endpointMap[validationType] || `/reports/${validationType}/${meterSINo}`;
};

const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return new Date().toISOString().split('T')[0];
  return new Date(date).toISOString().split('T')[0];
};

const calculateAverage = (values: number[]): number | null => {
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum > 0 ? sum / values.length : null;
};

const transformApiDataToTableFormat = (apiData: any[], validationType: string, meterSINo: string): any[] => {
  if (!apiData || !Array.isArray(apiData)) {
    return [];
  }

  return apiData.map((item, index) => {
    const baseRow = {
      sNo: index + 1,
      meterSINo: meterSINo,
      analysisValidation: validationType,
    };

    switch (validationType) {
      case 'instantaneous': {
        const rphVolt = item.rphVolt != null ? Number(item.rphVolt) : 0;
        const yphVolt = item.yphVolt != null ? Number(item.yphVolt) : 0;
        const bphVolt = item.bphVolt != null ? Number(item.bphVolt) : 0;
        const rphCurr = item.rphCurr != null ? Number(item.rphCurr) : 0;
        const yphCurr = item.yphCurr != null ? Number(item.yphCurr) : 0;
        const bphCurr = item.bphCurr != null ? Number(item.bphCurr) : 0;
        
        const avgVoltage = calculateAverage([rphVolt, yphVolt, bphVolt]);
        const avgCurrent = calculateAverage([rphCurr, yphCurr, bphCurr]);
        const frequency = item.freqHz != null ? Number(item.freqHz) : (item.frequency != null ? Number(item.frequency) : null);
        const avgPowerFactor = item.avgPF != null ? Number(item.avgPF) : (item.avgPowerFactor != null ? Number(item.avgPowerFactor) : null);
        
        const formatNumber = (val: number | null) => val != null ? Number(val.toFixed(2)) : null;
        
        return {
          ...item,
          ...baseRow,
          reportName: `Instantaneous Report - ${meterSINo}`,
          reportType: 'Instantaneous',
          generatedDate: item.timestamp ? formatDate(item.timestamp) : (item.lastCommDate || new Date().toISOString().split('T')[0]),
          status: 'Completed',
          meterLocation: item.location || '',
          frequency: formatNumber(frequency),
          avgVoltage: formatNumber(avgVoltage),
          avgCurrent: formatNumber(avgCurrent),
          avgPowerFactor: formatNumber(avgPowerFactor),
          freqHz: item.freqHz != null ? Number(item.freqHz) : null,
          avgPF: item.avgPF != null ? Number(item.avgPF) : null,
        };
      }
      
      case 'billing-data':
        return {
          ...baseRow,
          reportName: `Billing Report - ${meterSINo}`,
          reportType: 'Billing Analysis',
          generatedDate: formatDate(item.billingDate || item.date),
          status: 'Completed',
          meterLocation: item.location || '',
          ...item,
        };
      
      case 'consumption':
        return {
          ...baseRow,
          reportName: `Consumption Report - ${meterSINo}`,
          reportType: 'Consumption Analysis',
          generatedDate: formatDate(item.consumptionDate || item.date),
          status: 'Completed',
          meterLocation: item.location || '',
          ...item,
        };
      
      case 'power-failure':
        return {
          ...baseRow,
          reportName: `Power Failure Report - ${meterSINo}`,
          reportType: 'Power Failure',
          generatedDate: formatDate(item.occurredOn || item.occurrenceDate),
          status: item.status || 'Active',
          meterLocation: item.location || '',
          ...item,
        };
      
      case 'event-off':
        return {
          ...baseRow,
          reportName: `Event OFF Report - ${meterSINo}`,
          reportType: 'Event OFF',
          generatedDate: formatDate(item.eventDate || item.date),
          status: item.status || 'Completed',
          meterLocation: item.location || '',
          ...item,
        };
      
      case 'ls-data':
        return {
          ...item,
          ...baseRow,
          reportName: `LS Data Report - ${meterSINo}`,
          reportType: 'LS Data',
          generatedDate: item.surveyDate || item.date || formatDate(null),
          status: 'Completed',
          meterLocation: item.location || '',
        };
      
      default:
        return {
          ...baseRow,
          reportName: `Report - ${meterSINo}`,
          reportType: 'Report',
          generatedDate: formatDate(null),
          status: 'Completed',
          meterLocation: '',
          ...item,
        };
    }
  });
};

const getBaseColumns = (): TableColumn[] => [
  { key: 'sNo', label: 'S.No', spacing: 'px-1 py-1', sortable: true },
  { key: 'meterSINo', label: 'Meter SI No', sortable: true, searchable: true },
  { key: 'analysisValidation', label: 'Analysis & Validation', sortable: true, searchable: true },
];

const INITIAL_PAGINATION = {
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  limit: 10,
  hasNextPage: false,
  hasPrevPage: false,
};

export default function ReportsView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const meterSINo = searchParams.get('meterSINo');
  const analysisValidationParam = searchParams.get('analysisValidation');
  const meterLocationParam = searchParams.get('meterLocation');

  const initialFilterValues = {
    analysisValidation: analysisValidationParam || '',
    meterLocation: meterLocationParam || '',
    meterSINo: meterSINo || '',
  };

  const [filterValues, setFilterValues] = useState(initialFilterValues);
  const [dateRangeFilter, setDateRangeFilter] = useState('');
  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [meterSINoOptions, setMeterSINoOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);
  const [dynamicColumns, setDynamicColumns] = useState<TableColumn[]>(getBaseColumns());
  const [serverPagination, setServerPagination] = useState(INITIAL_PAGINATION);
  
  const lastFetchedTableDataRef = useRef<any[]>([]);
  const lastFetchedColumnsRef = useRef<TableColumn[]>(getBaseColumns());
  const lastFetchedPaginationRef = useRef(INITIAL_PAGINATION);
  const filtersChangedRef = useRef(false);

  const isGetDataDisabled = !filterValues.meterSINo || !filterValues.analysisValidation;
  const isResetDisabled = 
    filterValues.analysisValidation === initialFilterValues.analysisValidation &&
    filterValues.meterLocation === initialFilterValues.meterLocation &&
    filterValues.meterSINo === initialFilterValues.meterSINo &&
    !hasDataBeenFetched;

  const isClearingDataRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const hasDataBeenFetchedRef = useRef(false);
  const previousFilterValuesRef = useRef(filterValues);
  const allowFetchRef = useRef(false);

  const fetchReportData = async (page: number = 1, pageSize: number = 10) => {
    if (!allowFetchRef.current) {
      return;
    }
    
    if (isClearingDataRef.current) {
      return;
    }
    
    if (!filterValues.meterSINo || !filterValues.analysisValidation) {
      if (window.opener) {
        window.close();
      } else {
        navigate('/reports');
      }
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = getReportApiEndpoint(
        filterValues.analysisValidation,
        filterValues.meterSINo,
        page,
        pageSize
      );

      const response = await apiClient.get(endpoint);

      if (response && (response.success === true || response.success === undefined)) {
        let transformedData: any[] = [];
        
        if (filterValues.analysisValidation === 'instantaneous') {
          if (response.data) {
            transformedData = Array.isArray(response.data) ? response.data : [response.data];
          } else {
            transformedData = [];
          }
        } else {
          transformedData = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);
        }

        if (transformedData.length === 0) {
          setTableData([]);
          lastFetchedTableDataRef.current = [];
          setDynamicColumns(getBaseColumns());
          lastFetchedColumnsRef.current = getBaseColumns();
          setIsLoading(false);
          return;
        }

        const tableFormattedData = transformApiDataToTableFormat(
          transformedData,
          filterValues.analysisValidation,
          filterValues.meterSINo
        );

        if (tableFormattedData && tableFormattedData.length > 0) {
          const dataKeys = extractAllKeysFromData(tableFormattedData);
          const generatedColumns = generateDynamicColumns(dataKeys, getBaseColumns());
          setDynamicColumns(generatedColumns);
          lastFetchedColumnsRef.current = generatedColumns;
          setTableData(tableFormattedData);
          lastFetchedTableDataRef.current = tableFormattedData;
        } else {
          setTableData([]);
          lastFetchedTableDataRef.current = [];
          setDynamicColumns(getBaseColumns());
          lastFetchedColumnsRef.current = getBaseColumns();
        }
        
        filtersChangedRef.current = false;

        if (response.meta && response.meta.pagination) {
          const paginationInfo = {
            currentPage: response.meta.pagination.currentPage || page,
            totalPages: response.meta.pagination.totalPages || 1,
            totalCount: response.meta.pagination.totalCount || 0,
            limit: response.meta.pagination.pageSize || pageSize,
            hasNextPage: response.meta.pagination.hasNextPage || false,
            hasPrevPage: response.meta.pagination.hasPrevPage || false,
          };
          setServerPagination(paginationInfo);
          lastFetchedPaginationRef.current = paginationInfo;
        } else if (response.pagination) {
          const paginationInfo = {
            currentPage: response.pagination.currentPage || page,
            totalPages: response.pagination.totalPages || 1,
            totalCount: response.pagination.totalCount || response.pagination.total || 0,
            limit: response.pagination.limit || response.pagination.pageSize || pageSize,
            hasNextPage: response.pagination.hasNextPage || false,
            hasPrevPage: response.pagination.hasPrevPage || false,
          };
          setServerPagination(paginationInfo);
          lastFetchedPaginationRef.current = paginationInfo;
        } else if (response.page) {
          const paginationInfo = {
            currentPage: response.page || page,
            totalPages: response.totalPages || Math.ceil((response.total || 0) / (response.pageSize || pageSize)) || 1,
            totalCount: response.total || 0,
            limit: response.pageSize || pageSize,
            hasNextPage: (response.page || page) < (response.totalPages || 1),
            hasPrevPage: (response.page || page) > 1,
          };
          setServerPagination(paginationInfo);
          lastFetchedPaginationRef.current = paginationInfo;
        }
      } else {
        setTableData([]);
        lastFetchedTableDataRef.current = [];
      }
    } catch (error: any) {
      setTableData([]);
      lastFetchedTableDataRef.current = [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialFilterValues.meterSINo) {
      setMeterSINoOptions([{ value: initialFilterValues.meterSINo, label: initialFilterValues.meterSINo }]);
    }
  }, []);

  useEffect(() => {
    isInitialMountRef.current = false;
    previousFilterValuesRef.current = filterValues;
  }, []);

  useEffect(() => {
    hasDataBeenFetchedRef.current = hasDataBeenFetched;
  }, [hasDataBeenFetched]);

  useEffect(() => {
    if (isInitialMountRef.current) {
      previousFilterValuesRef.current = filterValues;
      return;
    }

    const prev = previousFilterValuesRef.current;
    const hasChanged = 
      prev.analysisValidation !== filterValues.analysisValidation ||
      prev.meterSINo !== filterValues.meterSINo ||
      prev.meterLocation !== filterValues.meterLocation;

    if (hasChanged && hasDataBeenFetchedRef.current) {
      filtersChangedRef.current = true;
      previousFilterValuesRef.current = filterValues;
    } else {
      previousFilterValuesRef.current = filterValues;
    }
  }, [filterValues.analysisValidation, filterValues.meterSINo, filterValues.meterLocation]);

  const handleGetData = () => {
    if (!filterValues.meterSINo || !filterValues.analysisValidation) {
      alert(`Please select both Analysis & Validation and Meter SI No.\n\nCurrent values:\n- Analysis Validation: ${filterValues.analysisValidation || 'Not selected'}\n- Meter SI No: ${filterValues.meterSINo || 'Not selected'}`);
      return;
    }
    
    if (isClearingDataRef.current) {
      setTimeout(() => {
        handleGetData();
      }, 150);
      return;
    }
    
    allowFetchRef.current = true;
    setHasDataBeenFetched(true);
    hasDataBeenFetchedRef.current = true;
    fetchReportData().finally(() => {
      allowFetchRef.current = false;
    });
  };

  const handlePageChange = (newPage: number) => {
    if (!hasDataBeenFetchedRef.current) {
      return;
    }
    allowFetchRef.current = true;
    fetchReportData(newPage, serverPagination.limit).finally(() => {
      allowFetchRef.current = false;
    });
  };

  const handleResetFilters = () => {
    allowFetchRef.current = false;
    filtersChangedRef.current = false;
    setFilterValues(initialFilterValues);
    setTableData([]);
    lastFetchedTableDataRef.current = [];
    setDateRangeFilter('');
    setHasDataBeenFetched(false);
    hasDataBeenFetchedRef.current = false;
    const baseCols = getBaseColumns();
    setDynamicColumns(baseCols);
    lastFetchedColumnsRef.current = baseCols;
    setServerPagination(INITIAL_PAGINATION);
    lastFetchedPaginationRef.current = INITIAL_PAGINATION;
  };

  const handleDateRangeFilterChange = (_key: string, value: string) => {
    setDateRangeFilter(value);
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Page
        sections={[
          {
            layout: {
              type: 'column',
              gap: 'gap-4',
              rows: [
                {
                  layout: 'column',
                  columns: [
                    {
                      name: 'PageHeader',
                      props: {
                        title: `Report - Meter SI No: ${filterValues.meterSINo || 'N/A'}`,
                        onBackClick: () => {
                          if (window.opener) {
                            window.close();
                          } else {
                            navigate('/reports');
                          }
                        },
                        backButtonText: window.opener ? 'Close' : 'Back to Reports',
                      },
                    },
                  ],
                },
              ],
            },
          },
          {
            layout: {
              type: 'row' as const,
              gap: 'gap-4',
              className:
                'flex items-center justify-between w-full border border-primary-border dark:border-dark-border rounded-3xl p-4 bg-background-secondary dark:bg-primary-dark-light [&>*:nth-child(4)]:ml-auto',
              rows: [
                {
                  layout: 'row',
                  columns: [
                    {
                      name: 'Dropdown',
                      props: {
                        name: 'analysisValidation',
                        value: filterValues.analysisValidation,
                        onChange: (e: { target: { name: string; value: string } }) => {
                          setFilterValues({
                            ...filterValues,
                            [e.target.name]: e.target.value,
                          });
                        },
                        options: [
                          { value: 'instantaneous', label: 'Instantaneous' },
                          { value: 'billing-data', label: 'Billing Data' },
                          { value: 'consumption', label: 'Consumption' },
                          { value: 'power-failure', label: 'Power Failure' },
                          { value: 'event-off', label: 'Event OFF' },
                          { value: 'ls-data', label: 'LS Data' },
                        ],
                        placeholder: 'Analysis & Validation',
                        searchable: false,
                      }
                    },
                    {
                      name: 'Dropdown',
                      props: {
                        name: 'meterSINo',
                        value: filterValues.meterSINo || '',
                        onChange: (e: { target: { name: string; value: string } }) => {
                          setFilterValues((prev) => ({
                            ...prev,
                            [e.target.name]: e.target.value,
                          }));
                        },
                        options: meterSINoOptions,
                        placeholder: 'Meter SI No',
                        searchable: false,
                        disabled: true,
                        className: 'opacity-60 cursor-not-allowed',
                      }
                    }
                  ]
                },
                {
                  layout: 'row',
                  columns: [
                    {
                      name: 'Button',
                      props: {
                        variant: 'primary',
                        onClick: handleGetData,
                        children: 'Get Data',
                        disabled: isGetDataDisabled,
                        className: isGetDataDisabled ? 'opacity-50 cursor-not-allowed' : '',
                      }
                    },
                    {
                      name: 'Button',
                      props: {
                        variant: 'secondary',
                        onClick: handleResetFilters,
                        children: 'Reset',
                        disabled: isResetDisabled,
                        className: isResetDisabled ? 'opacity-50 cursor-not-allowed' : '',
                      }
                    },
                  ]
                },
              ]
            },
          },
          {
            layout: {
              type: 'column',
              gap: 'gap-4',
              rows: [
                {
                  layout: 'grid',
                  gridColumns: 1,
                  className: 'pb-4',
                  columns: [
                    {
                      name: 'Table',
                      props: {
                        data: tableData,
                        columns: dynamicColumns,
                        showHeader: false,
                        minColumnWidth: 120,
                        searchable: true,
                        searchContainerClassName: 'bg-background-secondary p-4 rounded-3xl',
                        selectable: true,
                        pagination: true,
                        serverPagination: serverPagination,
                        rowsPerPageOptions: [5, 10, 15, 25, 50],
                        initialRowsPerPage: 10,
                        itemsPerPage: serverPagination.limit,
                        showPagination: true,
                        pageSize: serverPagination.limit,
                        onPageChange: handlePageChange,
                        emptyMessage: 'No Reports Found',
                        headerTitle: 'Reports Management',
                        isLoading: isLoading,
                        className: 'w-full',
                        // enableHorizontalScroll: filterValues.analysisValidation !== 'power-failure',
                        showSearchBarDownload: true,
                        showFilterButton: true,
                        showFilterDropdowns: true,
                        customFilterOptions: [
                          {
                            key: 'dateRange',
                            label: 'Date Range',
                            type: 'rangePicker',
                            placeholder: 'Select Date Range',
                            selectionMode: 'date',
                          },
                        ],
                        customFilter: {
                          dateRange: dateRangeFilter,
                        },
                        onCustomFilterChange: handleDateRangeFilterChange,
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
}
