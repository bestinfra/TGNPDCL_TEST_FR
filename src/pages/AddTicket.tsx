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
  const [pendingDtrId, setPendingDtrId] = useState('');
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

  // Function to handle DTR ID change and auto-populate fields
  async function handleDtrIdChange(dtrNumber: string) {
    // Update the DTR ID state immediately
    setDtrId(dtrNumber);

    if (dtrNumber && dtrNumber.trim()) {
      try {
        setLoading(true);
        setError('');
        setSuccess('');

        // Use apiClient for proper authentication handling
        const result = await apiClient.get(`/tickets/dtr/${dtrNumber.trim()}`);

        if (result.success && result.data) {
          const dtrData = result.data;

          // Auto-populate the fields
          setFeederNumber(
            dtrData.feeder?.serialNumber || dtrData.feeder?.meterNumber || 'No meter found'
          );
          setLocation(dtrData.location || 'Location not available');

          // Show success message
          setSuccess(
            `DTR found! Feeder: ${
              dtrData.feeder?.serialNumber || dtrData.feeder?.meterNumber || 'No meter'
            }, Location: ${dtrData.location || '-'}`
          );
        } else {
          setError('DTR not found');
          setFeederNumber('');
          setLocation('');
        }
      } catch (error: any) {
        console.error('Error fetching DTR details:', error);
        setError(error.message || 'Error fetching DTR details');
        setFeederNumber('');
        setLocation('');
      } finally {
        setLoading(false);
      }
    } else {
      setFeederNumber('');
      setLocation('');
      setSuccess('');
    }
  }

  // Use useEffect to handle DTR ID changes (prevents setState during render)
  useEffect(() => {
    if (pendingDtrId && pendingDtrId !== dtrId) {
      // Use setTimeout to ensure state updates happen after render
      const timeoutId = setTimeout(() => {
        handleDtrIdChange(pendingDtrId);
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [pendingDtrId, dtrId]);

  // Handle form data changes - memoized to prevent re-renders
  const handleFormChange = useCallback((newFormData: Record<string, any>) => {
    // Use setTimeout to defer state update
    setTimeout(() => {
      setPendingDtrId(newFormData.DTRID || '');
    }, 0);
  }, []);

  const handleFormSubmit = useCallback(
    async (formData: Record<string, any>) => {
      try {
        setLoading(true);
        setError('');
        setSuccess('');

        // Prepare the data for the API
        const ticketData = {
          subject: formData.subject,
          description: formData.description,
          type: 'COMPLAINT',
          category: formData.category,
          priority: formData.Priority?.toUpperCase() || formData.priority?.toUpperCase(),
          dtrId: dtrId || null,
          feederNumber: feederNumber || null,
          location: location || null,
          attachments: formData.attachments || null,
        };

        // Use apiClient for proper authentication handling
        const result = await apiClient.post('/tickets', ticketData);

        if (result.success) {
          setSuccess('Ticket created successfully! Redirecting...');
          // Navigate back after successful creation
          setTimeout(() => {
            navigate('/tickets');
          }, 1500);
        } else {
          setError(result.message || 'Failed to create ticket');
        }
      } catch (error: any) {
        console.error('Error creating ticket:', error);

        // Check if it's an authentication error
        if (error.response?.status === 401 || error.message?.includes('authenticated')) {
          setError('You must be logged in to create tickets. Redirecting to login...');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
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
