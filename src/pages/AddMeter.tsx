import { lazy } from 'react';
import { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
const Page = lazy(() => import('SuperAdmin/Page'));
import type { FormInputConfig } from '../components/Form/types';

export default function AddMeter() {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form inputs configuration - exact layout as shown in the image
    const formInputs: FormInputConfig[] = [
        {
            name: 'uid',
            type: 'text',
            label: 'UID',
            placeholder: 'UID',
            required: true,
            row: 1,
            col: 1,
        },
        {
            name: 'serialNumber',
            type: 'text',
            label: 'Serial Number',
            placeholder: 'Serial Number',
            required: true,
            row: 1,
            col: 2,
        },
        {
            name: 'location',
            type: 'text',
            label: 'Location',
            placeholder: 'Location',
            required: true,
            row: 1,
            col: 3,
        },
        {
            name: 'phaseType',
            type: 'dropdown',
            label: 'Phase Type',
            placeholder: 'Phase Type',
            options: [
                { value: '', label: 'Select Phase Type' },
                { value: 'single', label: 'Single Phase' },
                { value: 'three', label: 'Three Phase' },
            ],
            required: true,
            row: 2,
            col: 1,
        },
        {
            name: 'meterType',
            type: 'dropdown',
            label: 'Meter Type',
            placeholder: 'Meter Type',
            options: [
                { value: '', label: 'Select Meter Type' },
                { value: 'digital', label: 'Digital' },
                { value: 'analog', label: 'Analog' },
                { value: 'smart', label: 'Smart' },
            ],
            required: true,
            row: 2,
            col: 2,
        },
        {
            name: 'paymentType',
            type: 'dropdown',
            label: 'Payment Type',
            placeholder: 'Payment Type',
            options: [
                { value: '', label: 'Select Payment Type' },
                { value: 'prepaid', label: 'Prepaid' },
                { value: 'postpaid', label: 'Postpaid' },
            ],
            required: true,
            row: 2,
            col: 3,
        },
        {
            name: 'connectedLoad',
            type: 'number',
            label: 'Connected Load (kW)',
            placeholder: 'Connected Load (kW)',
            required: true,
            row: 3,
            col: 1,
        },
        {
            name: 'installationDate',
            type: 'date',
            label: 'Installation Date',
            placeholder: 'mm/dd/yyyy',
            required: true,
            row: 3,
            col: 2,
        },
        {
            name: 'status',
            type: 'dropdown',
            label: 'Status',
            placeholder: 'Active',
            options: [
                { value: '', label: 'Select Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'maintenance', label: 'Maintenance' },
            ],
            required: true,
            row: 3,
            col: 3,
        },
        {
            name: 'notes',
            type: 'textareafield',
            label: 'Discription (optional)',
            placeholder: 'Notes (optional)',
            required: false,
            row: 4,
            col: 1,
            colSpan: 3,
        },
    ];

    const handleFormSubmit = async (formData: Record<string, any>) => {
        setIsSubmitting(true);
        try {
            console.log('Saving meter data:', formData);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            
            console.log('Meter created successfully');
            navigate('/meters');
        } catch (error) {
            console.error('Error creating meter:', error);
        } finally {
            setIsSubmitting(false);
        }
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
                                                title: 'Meters List',
                                                onBackClick: () => navigate('/dashboard'),
                                                backButtonText: 'Back to Dashboard',
                                                showMenu: false,
                                                showDropdown: false,
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
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
                                                submitLabel: isSubmitting ? 'Saving...' : 'Add Meter',
                                                cancelLabel: '', // Empty string to hide cancel button
                                                showFormActions: true,
                                                submitAction: () => {
                                                    // This will be handled by the form's internal submit
                                                },
                                                gridLayout: {
                                                    gridRows: 4,
                                                    gridColumns: 3,
                                                    gap: 'gap-4',
                                                    className: 'w-full',
                                                },
                                                className: 'w-full',
                                                showLabels: false,
                                                showBorders: true,
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