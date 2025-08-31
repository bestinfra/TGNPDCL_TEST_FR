import { lazy } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Suspense } from 'react';
const Page = lazy(() => import('SuperAdmin/Page'));
import type { FormInputConfig } from '../components/Form/types';
import BACKEND_URL from '../config';

export default function AddTicket() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [feederNumber, setFeederNumber] = useState('');
    const [location, setLocation] = useState('');
    const [dtrId, setDtrId] = useState('');


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

    // Form inputs configuration
    const formInputs: FormInputConfig[] = [
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
    ];

    // Function to handle DTR ID change and auto-populate fields
    async function handleDtrIdChange(dtrNumber: string) {
        // Update the DTR ID state immediately
        setDtrId(dtrNumber);
        
        if (dtrNumber && dtrNumber.trim()) {
            try {
                setLoading(true);
                setError('');
                setSuccess('');
                
                // Call the API to get DTR details
                const response = await fetch(`${BACKEND_URL}/tickets/dtr/${dtrNumber.trim()}`, {
                    method: 'GET',
                    credentials: 'include',
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    if (result.success && result.data) {
                        const dtrData = result.data;
                        
                        // Auto-populate the fields
                        setFeederNumber(dtrData.feeder?.serialNumber || dtrData.feeder?.meterNumber || 'No meter found');
                        setLocation(dtrData.location || 'Location not available');
                        
                        // Show success message
                        setSuccess(`DTR found! Feeder: ${dtrData.feeder?.serialNumber || dtrData.feeder?.meterNumber || 'No meter'}, Location: ${dtrData.location || '-'}`);
                    } else {
                        setError('DTR not found');
                        setFeederNumber('');
                        setLocation('');
                    }
                } else {
                    setError('Failed to fetch DTR details');
                    setFeederNumber('');
                    setLocation('');
                }
            } catch (error) {
                console.error('Error fetching DTR details:', error);
                setError('Error fetching DTR details');
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

    // Handle form data changes
    const handleFormChange = (newFormData: Record<string, any>) => {
        // Check if DTR ID has changed
        if (newFormData.DTRID !== dtrId) {
            handleDtrIdChange(newFormData.DTRID || '');
        }
    };

    const handleFormSubmit = async (formData: Record<string, any>) => {
        try {
            setLoading(true);
            setError('');

            // Prepare the data for the API
            const ticketData = {
                subject: formData.subject,
                description: formData.description,
                type: 'COMPLAINT',
                category: formData.category,
                priority: formData.Priority.toUpperCase(),
                dtrId: dtrId || null,
                feederNumber: feederNumber || null,
                location: location || null,
                attachments: formData.attachments || null,
            };

            const response = await fetch(`${BACKEND_URL}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ticketData),
                credentials: 'include',
            });

            const result = await response.json();

            if (result.success) {
                // Navigate back after successful creation
                setTimeout(() => {
                    navigate('/tickets');
                }, 1500);
            } else {
                setError(result.message || 'Failed to create ticket');
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            setError('Error creating ticket. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleFormCancel = () => {
        navigate('/tickets');
    };

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
                    ...(error ? [{
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
                    }] : []),
                    // Success Display Section
                    ...(success ? [{
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
                    }] : []),
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
                                                submitLabel: loading ? 'Creating...' : 'Submit',
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
                                                disabled: loading,
                                                onChange: handleFormChange,
                                                initialData: {
                                                    'DTRID': dtrId,
                                                    'Feeder Number': feederNumber,
                                                    'Location': location,
                                                },
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
