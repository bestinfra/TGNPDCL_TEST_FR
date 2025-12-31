
import { Suspense, useState, useEffect, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
const Page = lazy(() => import("SuperAdmin/Page"));
import { apiClient } from '../api/apiUtils';
import { APP_CONFIG } from '../config/constants';

const REPORT_TYPES = [
  { type: 'Load Analysis', validation: 'instantaneous' },
  { type: 'Billing Analysis', validation: 'power-failure' },
  { type: 'Energy Analysis', validation: 'energies' },
  { type: 'Consumption Analysis', validation: 'consumption' },
  { type: 'Meter Reading', validation: 'max-demand' },

  { type: 'Summary Report', validation: 'event-on' },
  { type: 'Validation Analysis', validation: 'event-off' },
  { type: 'Peak Analysis', validation: 'load-survey' },
  { type: 'Financial Analysis', validation: 'daily-energies' },
];

const STATUS_OPTIONS = ['Completed', 'In Progress', 'Pending'];

const tableColumns = [
  { key: 'sNo', label: 'S.No', spacing: 'px-1 py-1' },
  { key: 'meterSINo', label: 'Meter SI No' },
  { key: 'reportName', label: 'Report Name' },
  { key: 'reportType', label: 'Report Type' },
  { key: 'generatedDate', label: 'Generated Date' },
  { key: 'analysisValidation', label: 'Analysis & Validation' },
  { key: 'status', label: 'Status' },
];

const openReportWindow = (url: string) => {
  const currentLeft = window.screenX || window.screenLeft || 0;
  const currentTop = window.screenY || window.screenTop || 0;
  const currentWidth = window.outerWidth || window.innerWidth || 1920;
  const currentHeight = window.outerHeight || window.innerHeight || 1080;
  const leftPosition = currentLeft + currentWidth;
  const screenWidth = window.screen.availWidth;
  const screenHeight = window.screen.availHeight;
  const finalLeft = Math.max(0, Math.min(leftPosition, screenWidth - currentWidth));
  const finalTop = Math.max(0, Math.min(currentTop, screenHeight - currentHeight));
  
  const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
  if (newWindow) {
    setTimeout(() => {
      try {
        window.focus();
      } catch (e) {
        // Ignore focus errors
      }
    }, 50);
    
    const positionWindow = () => {
      try {
        if (newWindow && !newWindow.closed) {
          newWindow.moveTo(finalLeft, finalTop);
          newWindow.resizeTo(currentWidth, currentHeight);
        }
      } catch (e) {
        console.log('Window positioning not available');
      }
    };
    
    [100, 300, 500].forEach(delay => setTimeout(positionWindow, delay));
  }
};

const generateReportsFromMeters = (meters: any[]) => {
  return meters.flatMap((meter, meterIndex) => {
    const meterSerial = meter.meterSerialNumber || meter.meterNumber || 'N/A';
    return REPORT_TYPES.map((reportType, reportIndex) => ({
      sNo: meterIndex * REPORT_TYPES.length + reportIndex + 1,
      reportName: `${reportType.type} - ${meterSerial}`,
      reportType: reportType.type,
      generatedDate: new Date().toISOString().split('T')[0],
      status: STATUS_OPTIONS[reportIndex % STATUS_OPTIONS.length],
      analysisValidation: reportType.validation,
      meterSINo: meterSerial,
      meterLocation: meter.location || '',
    }));
  });
};

export default function Reports() {
  const navigate = useNavigate();
  const [viewAll, setViewAll] = useState(false);
  const [filterValues, setFilterValues] = useState({
    analysisValidation: '',
    meterLocation: '',
    meterSINo: '',
  });

  const [isTableLoading, setIsTableLoading] = useState(true);
  const [meterOptions, setMeterOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const isAnalysisValidationSelected = !!filterValues.analysisValidation;
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<{
    analysisValidation?: string;
    meterSINo?: string;
  }>({});

  const fetchAllMeters = async () => {
    const allMeters: any[] = [];
    let currentPage = 1;
    let hasNextPage = true;
    
    while (hasNextPage) {
      const data = await apiClient.get(`/meters?page=${currentPage}&limit=100`);
      if (data.success) {
        allMeters.push(...data.data);
        hasNextPage = data.pagination?.hasNextPage || false;
        currentPage++;
      } else {
        break;
      }
    }
    
    return allMeters;
  };

  const processMetersData = (meters: any[]) => {
    const uniqueMeters = new Set<string>();
    
    meters.forEach((meter: any) => {
      const meterSerial = meter.meterSerialNumber || meter.meterNumber || '';
      if (meterSerial) uniqueMeters.add(meterSerial);
    });
    
    setMeterOptions(Array.from(uniqueMeters).map(value => ({ value, label: value })));
    setTableData(generateReportsFromMeters(meters));
  };

  useEffect(() => {
    const loadMeters = async () => {
      setIsTableLoading(true);
      try {
        const meters = await fetchAllMeters();
        processMetersData(meters);
      } catch (error: any) {
        console.error('Error fetching meters:', error);
        setTableData([]);
      } finally {
        setIsTableLoading(false);
      }
    };
    
    loadMeters();
  }, []);

  useEffect(() => {
    if (selectedRows.length > 0 && !filterValues.analysisValidation) {
      setValidationErrors((prev) => ({
        ...prev,
        analysisValidation: 'Please select the values ',
      }));
      setTouchedFields((prev) => new Set(prev).add('analysisValidation'));
    } else if (selectedRows.length > 0 && filterValues.analysisValidation) {
      setValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated.analysisValidation;
        return updated;
      });
    }
  }, [selectedRows, filterValues.analysisValidation]);

  const buildReportUrl = (additionalParams?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (filterValues.analysisValidation) {
      params.append('analysisValidation', filterValues.analysisValidation);
    }
    if (filterValues.meterLocation) {
      params.append('meterLocation', filterValues.meterLocation);
    }
    if (filterValues.meterSINo) {
      params.append('meterSINo', filterValues.meterSINo);
    }
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        params.append(key, value);
      });
    }
    // Use the same basename logic as App.tsx
    const basename = import.meta.env.VITE_BASE_PATH?.replace(/\/$/, '') || APP_CONFIG.BASENAME;
    return `${window.location.origin}${basename}/reports/view?${params.toString()}`;
  };

  const handleGetData = () => {
    let meterSINoToUse = filterValues.meterSINo;
    let analysisValidationToUse = filterValues.analysisValidation;
    
    if (selectedRows.length > 0) {
      const selectedRow = tableData.find(row => selectedRows.includes(String(row.sNo)));
      if (selectedRow) {
        meterSINoToUse = meterSINoToUse || selectedRow.meterSINo;
        analysisValidationToUse = analysisValidationToUse || selectedRow.analysisValidation;
      }
    }
    
    if (!meterSINoToUse) {
      alert('Please select a Meter SI No');
      return;
    }
    
    const updatedFilterValues = {
      ...filterValues,
      meterSINo: meterSINoToUse,
      analysisValidation: analysisValidationToUse,
    };
    
    setFilterValues(updatedFilterValues);
    openReportWindow(buildReportUrl());
  };

  const handleResetFilters = async () => {
    setFilterValues({
      analysisValidation: '',
      meterLocation: '',
      meterSINo: '',
    });
    setValidationErrors({});
    setTouchedFields(new Set());
    setSelectedRows([]);
    
    setIsTableLoading(true);
    try {
      const meters = await fetchAllMeters();
      processMetersData(meters);
    } catch (error: any) {
      console.error('Error refetching meters:', error);
    } finally {
      setIsTableLoading(false);
    }
  };

  const handleRowClick = (row: any) => {
    openReportWindow(buildReportUrl({
      reportId: String(row.sNo),
      reportName: row.reportName || '',
      reportType: row.reportType || '',
    }));
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
                        title: 'Reports',
                        onBackClick: () => navigate('/dashboard'),
                        backButtonText: 'Back to Dashboard',
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
                          const newValue = e.target.value;
                          const fieldName = e.target.name;
                          
                          setFilterValues((prev) => ({
                            ...prev,
                            [fieldName]: newValue,
                          }));
                          
                          setTouchedFields((prev) => new Set(prev).add(fieldName));
                          
                          if (!newValue) {
                            setValidationErrors((prev) => ({
                              ...prev,
                              analysisValidation: 'Analysis & Validation is required',
                            }));
                          } else {
                            setValidationErrors((prev) => {
                              const updated = { ...prev };
                              delete updated.analysisValidation;
                              return updated;
                            });
                          }
                        },
                        options: [
                          { value: 'instantaneous', label: 'Instantaneous' },
                          { value: 'consumption', label: 'Consumption' },
                          { value: 'billing-data', label: 'Billing data' },
                          { value: 'power-failure', label: 'Power Failure' },
                          { value: 'energies', label: 'Energies' },
                          { value: 'event-on', label: 'Event ON' },
                          { value: 'event-off', label: 'Event OFF' },
                          { value: 'max-demand', label: 'Max Demand' },
                          { value: 'load-survey', label: 'Load Survey' },
                          { value: 'daily-energies', label: 'Daily Energies' },
                        ],
                        placeholder: 'Analysis & Validation',
                        searchable: false,
                        error: (touchedFields.has('analysisValidation') || selectedRows.length > 0) ? validationErrors.analysisValidation : undefined,
                      }
                    },
                   
                    {
                      name: 'Dropdown',
                      props: {
                        name: 'meterSINo',
                        value: filterValues.meterSINo || '',
                        onChange: (e: { target: { name: string; value: string } }) => {
                          const newValue = e.target.value;
                          const fieldName = e.target.name;
                          
                          setFilterValues((prev) => ({
                            ...prev,
                            [fieldName]: newValue,
                          }));
                          
                          setTouchedFields((prev) => new Set(prev).add(fieldName));
                          
                          if (!newValue) {
                            setValidationErrors((prev) => ({
                              ...prev,
                              meterSINo: 'Meter SI No is required',
                            }));
                          } else {
                            setValidationErrors((prev) => {
                              const updated = { ...prev };
                              delete updated.meterSINo;
                              return updated;
                            });
                          }
                        },
                        options: meterOptions,
                        placeholder: 'Meter SI No (Search)',
                        searchable: true,
                        loading: isTableLoading,
                        error: touchedFields.has('meterSINo') ? validationErrors.meterSINo : undefined,
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
                        disabled: (!filterValues.analysisValidation || !filterValues.meterSINo) && selectedRows.length === 0,
                        className: ((!filterValues.analysisValidation || !filterValues.meterSINo) && selectedRows.length === 0) ? 'opacity-50 cursor-not-allowed' : '',
                      }
                    },
                    {
                      name: 'Button',
                      props: {
                        variant: 'secondary',
                        onClick: handleResetFilters,
                        children: 'Reset',
                        disabled: !filterValues.analysisValidation && selectedRows.length === 0,
                        className: (!filterValues.analysisValidation && selectedRows.length === 0) ? 'opacity-50 cursor-not-allowed' : '',
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
                  layout: 'row',
                  className: 'flex items-center gap-4',
                  columns: [
                    {
                      name: 'CheckboxInput',
                      props: {
                        value: viewAll,
                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                          setViewAll(e.target.checked);
                        },
                        label: 'View All',
                        id: 'viewAll',
                        name: 'viewAll',
                        className: '',
                      },
                    },
                  ],
                },
              ],
            },
          },
          ...(viewAll
            ? [
                {
                  layout: {
                    type: 'column' as const,
                    gap: 'gap-4',
                    rows: [
                      {
                        layout: 'grid' as const,
                        gridColumns: 1,
                        className: 'pb-4',
                        columns: [
                          {
                            name: 'Table',
                            props: {
                              data: tableData,
                              columns: tableColumns,
                              showHeader: false,
                              minColumnWidth: 120,
                              searchable: true,
                              searchContainerClassName: 'bg-background-secondary p-4 rounded-3xl',
                              selectable: true,
                              selectedRows: selectedRows,
                              onSelectionChange: setSelectedRows,
                              pagination: true,
                              rowsPerPageOptions: [5, 10, 15, 25, 50],
                              initialRowsPerPage: 10,
                              itemsPerPage: 10,
                              showPagination: true,
                              pageSize: 10,
                              emptyMessage: 'No Reports Found',
                              headerTitle: 'Reports Management',
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
                               isLoading: isTableLoading,
                               className: 'w-full',
                               showSearchBarDownload: true,
                               downloadDisabled: !isAnalysisValidationSelected,
                               showFilterButton: true,
                               onRowClick: handleRowClick,
                             },
                          },
                        ],
                      },
                    ],
                  },
                },
              ]
            : []),
        ]}
      />
    </Suspense>
  );
}
