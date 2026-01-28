import { lazy } from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Suspense } from 'react';
const Page = lazy(() => import('SuperAdmin/Page'));
import type { FormInputConfig } from '../components/Form/types';
import { apiClient } from '../api/apiUtils';

export default function AddTicket() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [feederNumber, setFeederNumber] = useState('');
  const [location, setLocation] = useState('');
  const [dtrId, setDtrId] = useState('');
  // const [pendingDtrId, setPendingDtrId] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await apiClient.get('/tickets/stats');
        setIsCheckingAuth(false);
      } catch (error: any) {
        console.error('Authentication check failed:', error);
        setError('You must be logged in to create tickets. Redirecting to login...');
        setIsCheckingAuth(false);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    };

    checkAuth();
  }, [navigate]);

  const MIN_DTR_LENGTH = 5;
  useEffect(() => {
    if (!dtrId || dtrId.trim().length < MIN_DTR_LENGTH) {
      setFeederNumber('');
      setLocation('');
      return;
    }

    const debounceTimer = setTimeout(() => {
      fetchDtrDetails(dtrId.trim());
    }, 800);

    return () => clearTimeout(debounceTimer);
  }, [dtrId]);

  const fetchDtrDetails = async (dtrNumber: string) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const result = await apiClient.get(`/tickets/dtr/${dtrNumber}`);

      if (result.success && result.data) {
        const dtrData = result.data;

        setFeederNumber(
          dtrData.feeder?.serialNumber ||
          dtrData.feeder?.meterNumber ||
          ''
        );
        setLocation(dtrData.location || '');

        setSuccess(
          `DTR found! Feeder: ${
            dtrData.feeder?.serialNumber ||
            dtrData.feeder?.meterNumber ||
            '-'
          }, Location: ${dtrData.location || '-'}`
        );
      } else {
        setError('DTR not found');
        setFeederNumber('');
        setLocation('');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching DTR details');
      setFeederNumber('');
      setLocation('');
    } finally {
      setLoading(false);
    }
  };

  const priorityOptions = [
    { value: '', label: 'Select Priority' },
    { value: 'LOW', label: 'Low Priority' },
    { value: 'MEDIUM', label: 'Medium Priority' },
    { value: 'HIGH', label: 'High Priority' },
    { value: 'URGENT', label: 'Urgent Priority' },
  ];

  const categoryOptions = [
    { value: '', label: 'Select Category' },
    { value: 'BILLING', label: 'Billing Issue' },
    { value: 'METER', label: 'Meter Reading' },
    { value: 'CONNECTION', label: 'Connection/Disconnection' },
    { value: 'TECHNICAL', label: 'Technical Problem' },
    { value: 'OTHER', label: 'Other' },
  ];

  // Memoize form inputs configuration to prevent re-creation
  const formInputs: FormInputConfig[] = useMemo(
    () => [
      // Row 1: 3 inputs
      {
        name: 'DTRID',
        type: 'text',
        label: 'DTR ID',
        placeholder: 'Enter DTR ID',
        required: true,
        row: 1,
        col: 1,
        defaultValue: dtrId,
      },
      {
        name: 'Feeder Number',
        type: 'text',
        label: 'Feeder Number',
        placeholder: 'Enter Feeder Number',
        required: true,
        row: 1,
        col: 2,
        defaultValue: feederNumber,
      },
      {
        name: 'Location',
        type: 'text',
        label: 'Location',
        placeholder: 'Enter Location',
        required: true,
        row: 1,
        col: 3,
        defaultValue: location,
      },
      // Row 2: 2 dropdowns + 1 text input
      {
        name: 'Priority',
        type: 'dropdown',
        label: 'Priority',
        options: priorityOptions,
        required: true,
        row: 2,
        col: 1,
      },
      {
        name: 'category',
        type: 'dropdown',
        label: 'Category',
        options: categoryOptions,
        required: true,
        row: 2,
        col: 2,
      },
      {
        name: 'subject',
        type: 'text',
        label: 'Subject',
        placeholder: 'Enter Ticket Subject',
        required: true,
        row: 2,
        col: 3,
      },
      // Row 3: Full textarea
      {
        name: 'description',
        type: 'textareafield',
        label: 'Description',
        placeholder: 'Enter detailed description of the issue',
        required: true,
        row: 3,
        col: 1,
        colSpan: 3,
      },
      // Row 4: File upload
      {
        name: 'attachments',
        type: 'file',
        label: 'Attachments',
        required: false,
        row: 4,
        col: 1,
        colSpan: 3,
      },
    ],
    [dtrId, feederNumber, location]
  );

  // Removed Function to handle DTR ID change and auto-populate fields

  // Removed Use useEffect to handle DTR ID changes (prevents setState during render)

  // RemovedHandle form data changes - memoized to prevent re-renders

  const handleFormChange = useCallback(
  (newFormData: Record<string, any>) => {
    const newDtrId = newFormData.DTRID || '';

    // Update input immediately (no API call yet)
    setDtrId(newDtrId);
  },
  []
);


 // Handle form submission - memoized to prevent re-renders 
  const handleFormSubmit = useCallback(
  async (formData: Record<string, any>) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const fd = new FormData();

      fd.append('subject', formData.subject);
      fd.append('description', formData.description);
      fd.append('type', 'COMPLAINT');
      fd.append('category', formData.category);
      fd.append(
        'priority',
        formData.Priority?.toUpperCase() || formData.priority?.toUpperCase()
      );

      if (dtrId) fd.append('dtrId', dtrId);
      if (feederNumber) fd.append('feederNumber', feederNumber);
      if (location) fd.append('location', location);

      // IMPORTANT: field name MUST match multer → upload.single("attachment")
      if (formData.attachments && formData.attachments.length > 0) {
        fd.append('attachment', formData.attachments[0]); 
      }

      const result = await apiClient.post('/tickets', fd);

      if (result.success) {
        setSuccess('Ticket created successfully! Redirecting...');
        setTimeout(() => navigate('/tickets'), 1500);
      } else {
        setError(result.message || 'Failed to create ticket');
      }
    } catch (error: any) {
      console.error('Error creating ticket:', error);

      if (error.response?.status === 401) {
        setError('You must be logged in to create tickets. Redirecting...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(error.message || 'Error creating ticket. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  },
  [dtrId, feederNumber, location, navigate]
);


  const handleFormCancel = useCallback(() => {
    navigate('/tickets');
  }, [navigate]);

  // Memoize initial data to prevent unnecessary re-renders
  const initialFormData = useMemo(
    () => ({
      DTRID: dtrId,
      'Feeder Number': feederNumber,
      Location: location,
    }),
    [dtrId, feederNumber, location]
  );

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <Page
          sections={[
            {
              layout: {
                type: 'row' as const,
                gap: 'gap-4',
                rows: [
                  {
                    layout: 'row' as const,
                    columns: [
                      {
                        name: 'PageHeader',
                        props: {
                          title: 'Create New Ticket',
                          onBackClick: () => navigate('/tickets'),
                          showMenu: false,
                          showDropdown: false,
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
                rows: [
                  {
                    layout: 'row' as const,
                    columns: [
                      {
                        name: 'Alert',
                        props: {
                          type: 'info',
                          message: 'Checking authentication...',
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

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Page
        sections={[
          // Page Header Section
          {
            layout: {
              type: 'row' as const,
              gap: 'gap-4',
              rows: [
                {
                  layout: 'row' as const,
                  columns: [
                    {
                      name: 'PageHeader',
                      props: {
                        title: 'Create New Ticketsssss',
                        onBackClick: () => navigate('/tickets'),
                        showMenu: false,
                        showDropdown: false,
                      },
                    },
                  ],
                },
              ],
            },
          },
          // Error Display Section
          ...(error
            ? [
                {
                  layout: {
                    type: 'row' as const,
                    gap: 'gap-4',
                    rows: [
                      {
                        layout: 'row' as const,
                        columns: [
                          {
                            name: 'Alert',
                            props: {
                              type: 'error',
                              message: error,
                              onClose: () => setError(''),
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              ]
            : []),
          // Success Display Section
          ...(success
            ? [
                {
                  layout: {
                    type: 'row' as const,
                    gap: 'gap-4',
                    rows: [
                      {
                        layout: 'row' as const,
                        columns: [
                          {
                            name: 'Alert',
                            props: {
                              type: 'success',
                              message: success,
                              onClose: () => setSuccess(''),
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              ]
            : []),
          // Form Section
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
                      name: 'Form',
                      props: {
                        inputs: formInputs,
                        onSubmit: handleFormSubmit,
                        submitLabel: isCheckingAuth
                          ? 'Checking authentication...'
                          : loading
                          ? 'Creating...'
                          : 'Submit',
                        cancelLabel: 'Cancel',
                        showFormActions: true,
                        cancelAction: handleFormCancel,
                        gridLayout: {
                          gridRows: 4,
                          gridColumns: 3,
                          gap: 'gap-4',
                          className: 'w-full',
                        },
                        formBackground:
                          'bg-white dark:bg-gray-800 border border-primary-border dark:border-gray-700 p-4 rounded-2xl ',
                        className: 'w-full',
                        disabled: loading || isCheckingAuth,
                        onChange: handleFormChange,
                        initialData: initialFormData,
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
