import { Suspense, useState, useEffect } from 'react';
import { lazy } from 'react';
import BACKEND_URL from '../config';
const Page = lazy(() => import('SuperAdmin/Page'));

// --- Types ---
interface HierarchyNode {
    hierarchy_id: string | number;
    hierarchy_name: string;
    hierarchy_type_title: string;
    children?: HierarchyNode[];
}

// Dummy hierarchy data structure
const dummyHierarchyData = [
    {
        id: 1,
        name: "India",
        hierarchy_type_title: "Country",
        children: [
            {
                id: 2,
                name: "Tamil Nadu",
                hierarchy_type_title: "State",
                children: [
                    {
                        id: 3,
                        name: "Chennai District",
                        hierarchy_type_title: "District",
                        children: [
                            {
                                id: 4,
                                name: "Chennai",
                                hierarchy_type_title: "City",
                                children: [
                                    {
                                        id: 5,
                                        name: "T. Nagar",
                                        hierarchy_type_title: "Area",
                                        count: 150
                                    },
                                    {
                                        id: 6,
                                        name: "Velachery",
                                        hierarchy_type_title: "Area",
                                        count: 200
                                    },
                                    {
                                        id: 7,
                                        name: "Anna Nagar",
                                        hierarchy_type_title: "Area",
                                        count: 180
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        id: 8,
                        name: "Coimbatore District",
                        hierarchy_type_title: "District",
                        children: [
                            {
                                id: 9,
                                name: "Coimbatore",
                                hierarchy_type_title: "City",
                                children: [
                                    {
                                        id: 10,
                                        name: "RS Puram",
                                        hierarchy_type_title: "Area",
                                        count: 120
                                    },
                                    {
                                        id: 11,
                                        name: "Gandhipuram",
                                        hierarchy_type_title: "Area",
                                        count: 95
                                    },
                                    {
                                        id: 12,
                                        name: "Peelamedu",
                                        hierarchy_type_title: "Area",
                                        count: 110
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                id: 13,
                name: "Telangana",
                hierarchy_type_title: "State",
                children: [
                    {
                        id: 14,
                        name: "Hyderabad District",
                        hierarchy_type_title: "District",
                        children: [
                            {
                                id: 15,
                                name: "Hyderabad",
                                hierarchy_type_title: "City",
                                children: [
                                    {
                                        id: 16,
                                        name: "Banjara Hills",
                                        hierarchy_type_title: "Area",
                                        count: 85
                                    },
                                    {
                                        id: 17,
                                        name: "Madhapur",
                                        hierarchy_type_title: "Area",
                                        count: 160
                                    },
                                    {
                                        id: 18,
                                        name: "Gachibowli",
                                        hierarchy_type_title: "Area",
                                        count: 140
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 19,
        name: "Kerala",
        hierarchy_type_title: "State",
        children: [
            {
                id: 20,
                name: "Kochi District",
                hierarchy_type_title: "District",
                children: [
                    {
                        id: 25,
                        name: "Ernakulam",
                        hierarchy_type_title: "City",
                        children: [
                            {
                                id: 26,
                                name: "Edappally",
                                hierarchy_type_title: "Area",
                                count: 60
                            },
                            {
                                id: 27,
                                name: "Fort Kochi",
                                hierarchy_type_title: "Area",
                                count: 45
                            }
                        ]
                    }
                ]
            },
            {
                id: 21,
                name: "Kozhikode District",
                hierarchy_type_title: "District",
                children: [
                    {
                        id: 28,
                        name: "Kozhikode",
                        hierarchy_type_title: "City",
                        children: [
                            {
                                id: 29,
                                name: "Kallayi",
                                hierarchy_type_title: "Area",
                                count: 30
                            },
                            {
                                id: 30,
                                name: "Beypore",
                                hierarchy_type_title: "Area",
                                count: 25
                            }
                        ]
                    }
                ]
            },
            {
                id: 22,
                name: "Kannur District",
                hierarchy_type_title: "District",
                children: [
                    {
                        id: 31,
                        name: "Kannur",
                        hierarchy_type_title: "City",
                        children: [
                            {
                                id: 32,
                                name: "Thalassery",
                                hierarchy_type_title: "Area",
                                count: 20
                            }
                        ]
                    }
                ]
            },
            {
                id: 23,
                name: "Kasaragod District",
                hierarchy_type_title: "District",
                children: [
                    {
                        id: 33,
                        name: "Kasaragod",
                        hierarchy_type_title: "City",
                        children: [
                            {
                                id: 34,
                                name: "Manjeshwar",
                                hierarchy_type_title: "Area",
                                count: 15
                            }
                        ]
                    }
                ]
            },
            {
                id: 24,
                name: "Kollam District",
                hierarchy_type_title: "District",
                children: [
                    {
                        id: 35,
                        name: "Kollam",
                        hierarchy_type_title: "City",
                        children: [
                            {
                                id: 36,
                                name: "Chinnakada",
                                hierarchy_type_title: "Area",
                                count: 18
                            }
                        ]
                    }
                ]
            },
            // Added more dummy districts for Kerala
            {
                id: 37,
                name: "Alappuzha District",
                hierarchy_type_title: "District",
                children: [
                    {
                        id: 38,
                        name: "Alappuzha",
                        hierarchy_type_title: "City",
                        children: [
                            {
                                id: 39,
                                name: "Ambalapuzha",
                                hierarchy_type_title: "Area",
                                count: 22
                            }
                        ]
                    }
                ]
            },
            {
                id: 40,
                name: "Thrissur District",
                hierarchy_type_title: "District",
                children: [
                    {
                        id: 41,
                        name: "Thrissur",
                        hierarchy_type_title: "City",
                        children: [
                            {
                                id: 42,
                                name: "Guruvayur",
                                hierarchy_type_title: "Area",
                                count: 28
                            }
                        ]
                    }
                ]
            }
        ]
    }
];

const PlusIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const ListIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
);

const DownloadIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

export default function AssetManagment() {
    const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [hierarchicalData, setHierarchicalData] = useState<HierarchyNode[]>([]);
    const [useDummyData, _setUseDummyData] = useState(false); // Toggle to use dummy data - SET TO FALSE TO USE REAL API
    const [errorMessages, setErrorMessages] = useState<string[]>([]);

    // Asset management menu items
    const assetManagementActions = [
        { id: 'edit-asset-title', label: 'Edit Asset Title' },
        { id: 'change-node-to-sub-node', label: 'Change Node to Sub Node' },
        { id: 'download-template', label: 'Download Template' },
        { id: 'duplicate-entire-asset', label: 'Duplicate Entire Asset' },
        { id: 'remove-sub-node-list', label: 'Remove Sub Node List' },
        { id: 'delete', label: 'Delete', isDestructive: true }
    ];

    // Handle asset actions
    const handleAssetAction = (actionId: string, node: any) => {
        console.log(`Action: ${actionId} on node:`, node);
        
        switch (actionId) {
            case 'edit-asset-title':
                // Handle edit asset title
                console.log('Editing asset title for:', node.name);
                break;
            case 'change-node-to-sub-node':
                // Handle change node to sub node
                console.log('Changing node to sub node for:', node.name);
                break;
            case 'download-template':
                // Handle download template
                console.log('Downloading template for:', node.name);
                break;
            case 'duplicate-entire-asset':
                // Handle duplicate asset
                console.log('Duplicating asset:', node.name);
                break;
            case 'remove-sub-node-list':
                // Handle remove sub node list
                console.log('Removing sub node list for:', node.name);
                break;
            case 'delete':
                // Handle delete
                console.log('Deleting asset:', node.name);
                break;
            default:
                console.log('Unknown action:', actionId);
        }
    };

    // Fetch hierarchical assets from API
    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/assets`);
                const data = await response.json();
                
                if (data.success) {
                    setHierarchicalData(data.data || []);
                }
            } catch (error) {
                console.log('Using dummy data due to API error:', error);
                // Add error message without adding data
                setErrorMessages(prev => {
                    if (!prev.includes("Failed to fetch assets")) {
                        return [...prev, "Failed to fetch assets"];
                    }
                    return prev;
                });
                // Keep using dummy data if API fails
            }
        };

        if (!useDummyData) {
            // Add initial delay to simulate loading
            setTimeout(() => {
                fetchAssets();
            }, 1000);
        }
    }, [useDummyData]);
    const [isSubNodeChecked, setIsSubNodeChecked] = useState(false);

    const handleTabChange = (newTabIndex: number) => {
        setActiveTab(newTabIndex);
        setIsSubNodeChecked(false); // Reset checkbox state when switching tabs
        console.log('Switched to tab:', newTabIndex);
    };

    const handleCheckboxChange = (checked: boolean) => {
        setIsSubNodeChecked(checked);
    };

    // Clear all error messages
    const clearErrors = () => {
        setErrorMessages([]);
    };

    // Remove a specific error message
    const removeError = (indexToRemove: number) => {
        setErrorMessages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    // Retry all APIs
    const retryAllAPIs = () => {
        clearErrors();
        // Retry all APIs by refreshing the page
        window.location.reload();
    };

    const tabs = [
        {
            label: 'Add Asset Name',
            content: null,
            icon: <PlusIcon />
        },
        {
            label: 'Upload List',
            content: null,
            icon: <ListIcon />
        },
        {
            label: 'Template',
            content: null,
            icon: <DownloadIcon />
        }
    ];

    // --- Generate form fields for each tab ---
    const generateFormFieldsForTab = (tabIndex: number) => {
        switch (tabIndex) {
            case 0: // Add Asset Name - Search and Input fields
                const baseFields = [
                    {
                        name: 'assetTitle',
                        type: 'text',
                        label: 'Asset Title',
                        placeholder: 'Asset Title (Ex. Locations)',
                        required: true,
                        validation: {
                            required: 'Asset title is required'
                        },
                        rightIcon: '/icons/search.svg'
                    },
                    {
                        name: 'assetName',
                        type: 'text',
                        label: 'Asset Name',
                        placeholder: 'Search and select asset name',
                        required: true,
                        validation: {
                            required: 'Asset name is required'
                        },
                    },
                    {
                        name: 'isSubNode',
                        type: 'checkbox',
                        label: 'Choose an asset below to assign this as a Sub Node.',
                        labelClassName: 'text-sm text-TextSecondary dark:text-gray-400',
                        checkboxLabelClassName: 'text-TextSecondary font-normal',
                        onChange: handleCheckboxChange,
                        value: isSubNodeChecked
                    }
                ];

                // Add conditional field when checkbox is checked
                if (isSubNodeChecked) {
                    baseFields.push({
                        name: 'parentAssetSearch',
                        type: 'text',
                        label: '',
                        placeholder: 'Search for parent Node',
                        required: true,
                        validation: {
                            required: 'Parent asset is required when creating a sub node'
                        },
                        rightIcon: '/icons/search.svg'
                    });
                }

                return baseFields;
            
            case 1: // Upload List - Drag and Drop
                return [
                    {
                        name: 'uploadFile',
                        type: 'chosenfile',
                        label: 'Upload File',
                        rightIcon: '/icons/search.svg',
                        placeholder: 'Drag and drop files here or click to browse',
                        required: true,
                        validation: {
                            required: 'File is required'
                        },
                        accept: '.csv,.xlsx,.xls',
                        multiple: true,
                        dragAndDrop: true
                    },
                ];
            
            case 2: // Template - Search only
                return [
                    {
                        name: 'templateSearch',
                        type: 'text',
                        label: 'Search Templates',
                        placeholder: 'Asset Title (Ex. Locations)',
                        required: false,
                        rightIcon: '/icons/search.svg'
                    },
                ];
            
            default:
                return [];
        }
    };

    // --- Get current form fields based on active tab ---
    const currentFormFields = generateFormFieldsForTab(activeTab);

    // --- Get current save button label ---
    const getSaveButtonLabel = () => {
        switch (activeTab) {
            case 0: return 'Create Asset';
            case 1: return 'Create List';
            case 2: return 'Download';
            default: return 'Save';
        }
    };

    // Recursive function to map all hierarchy levels
    const mapHierarchyRecursively = (nodes: HierarchyNode[]): any[] => {
        if (!nodes || nodes.length === 0) {
            return [{
                id: 'no-data',
                name: 'N/A',
                hierarchy_type_title: 'No Assets Available',
                children: [
                    
                ]
            }];
        }
        return nodes.map(node => ({
            id: node.hierarchy_id,
            name: node.hierarchy_name,
            hierarchy_type_title: node.hierarchy_type_title,
            children: node.children ? mapHierarchyRecursively(node.children) : []
        }));
    };

    // Recursive function to map hierarchy for NodeChart
    const mapHierarchyForNodeChart = (nodes: any[]): any[] => {
        if (!nodes || nodes.length === 0) {
            return [{
                name: 'N/A',
                backgroundColor: "#f5f5f5",
                borderColor: "",
                textColor: "#999999",
                Areas: []
            }];
        }
        return nodes.map(node => ({
            name: node.name || node.hierarchy_name,
            backgroundColor: "#e3f2fd",
            borderColor: "",
            textColor: "#424242",
            Areas: node.children ? mapHierarchyForNodeChart(node.children) : []
        }));
    };

    // Get the data to display - uses real API data when available
    const getDisplayData = () => {
        if (useDummyData) {
            return dummyHierarchyData;
        }
        return mapHierarchyRecursively(hierarchicalData);
    };




    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Page  
                sections={[
                    // Error Section (show when there are failed APIs)
                    ...(errorMessages.length > 0
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
                                                        visibleErrors: errorMessages,
                                                        showRetry: true,
                                                        maxVisibleErrors: 3, // Show max 3 errors at once
                                                        onRetry: retryAllAPIs, // Pass the retry function
                                                        onClose: removeError, // Pass the close function
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
                                                title: 'Asset Management',
                                                onBackClick: () => window.history.back(),
                                                backButtonText: 'Back to Dashboard',
                                                buttonsLabel: 'Add Asset',
                                                variant: 'primary',
                                                onClick: () => {
                                                    console.log('Add Asset');
                                                    setIsAddAssetModalOpen(true);
                                                },  
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                   
                    {
                        layout: {
                            type: 'grid',
                            columns: 4,
                            className: 'h-full',
                            rows: [
                                {
                                    layout: 'row',
                                    className:
                                        'border border-primary-border dark:border-dark-border rounded-3xl overflow-hidden',
                                    columns: [
                                        {
                                            name: 'TopLevelHierarchy',
                                            props: {
                                                nodes: getDisplayData(),
                                                title: 'Asset Hierarchy',
                                                actions: assetManagementActions,
                                                onActionClick: handleAssetAction,
                                                showActions: true
                                            },
                                        },
                                    ],
                                },
                       
                                {
                                    layout: 'row',
                                    span: { col: 3, row: 1 },
                                    className: 'h-full border border-primary-border dark:border-dark-border rounded-3xl overflow-hidden',
                                    columns: [
                                        {
                                            name: 'NodeChart',
                                            props: {
                                                data: {
                                                    Location: mapHierarchyForNodeChart(getDisplayData())
                                                },
                                                width: '100%',
                                                height: '100%',
                                                enableZoom: true,
                                                minZoom: 0.3,
                                                maxZoom: 2,
                                                initialZoom: 0.8,
                                                layout: 'horizontal',
                                                EdgeStyleLayout: 'polyline',
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
                            gap: 'gap-0',
                            rows: [
                                {
                                    layout: 'row',
                                    columns: [
                                        {
                                            name: 'Modal',
                                            props: {
                                                isOpen: isAddAssetModalOpen,
                                                onClose: () => {
                                                    setIsAddAssetModalOpen(false);
                                                    setActiveTab(0);
                                                    setIsSubNodeChecked(false);
                                                },
                                                title: 'Add New Asset',
                                                size: 'xl',
                                                showCloseIcon: true,
                                                showTabs: true,
                                                tabs: tabs,
                                                activeTabIndex: activeTab,
                                                onTabChange: handleTabChange,
                                                showForm: true,
                                                formFields: currentFormFields,
                                                onSave: async (formData: Record<string, any>) => {
                                                    console.log('Asset form data:', formData);
                                                    console.log('Active tab:', activeTab);
                                                    console.log('isSubNodeChecked state:', isSubNodeChecked);
                                                    console.log('formData.isSubNode:', formData.isSubNode);
                                                    
                                                    try {
                                                        let apiData;
                                                        
                                                        switch (activeTab) {
                                                            case 0: // Add Asset Name
                                                                apiData = {
                                                                    location_type_name: formData.assetTitle,
                                                                    location_names: formData.assetName ? [formData.assetName] : [],
                                                                    parent_location: formData.isSubNode && formData.parentAssetSearch ? formData.parentAssetSearch : null
                                                                };
                                                                console.log('API data being sent:', apiData);
                                                                console.log('DUMMY MODE: API call commented out, using dummy data');
                                                                break;
                                                                
                                                            case 1: // Upload List
                                                                console.log('File upload not implemented yet');
                                                                setIsAddAssetModalOpen(false);
                                                                return;
                                                                
                                                            case 2: // Template
                                                                console.log('Template download not implemented yet');
                                                                setIsAddAssetModalOpen(false);
                                                                return;
                                                                
                                                            default:
                                                                apiData = formData;
                                                        }
                                                        
                                                        const response = await fetch(`${BACKEND_URL}/assets`, {
                                                            method: 'POST',
                                                            headers: {
                                                                'Content-Type': 'application/json',
                                                            },
                                                            body: JSON.stringify(apiData)
                                                        });
                                                        
                                                        const result = await response.json();
                                                        
                                                        if (result.success) {
                                                            console.log('Asset added successfully:', result);
                                                            window.location.reload();
                                                        } else {
                                                            console.error('Failed to add asset:', result.message);
                                                            alert(`Failed to add asset: ${result.message}`);
                                                        }
                                                        
                                                    } catch (error) {
                                                        console.error('Error adding asset:', error);
                                                        alert('Error adding asset. Please try again.');
                                                    }
                                                    
                                                    setIsAddAssetModalOpen(false);
                                                },
                                                saveButtonLabel: getSaveButtonLabel(),
                                                cancelButtonLabel: 'Cancel',
                                                cancelButtonVariant: 'secondary',
                                                confirmButtonVariant: 'primary',
                                                formId: 'add-asset-form',
                                                gridLayout: {
                                                    gridRows: currentFormFields.length,
                                                    gridColumns: 1,
                                                    gap: 'gap-4'
                                                },
                                                tabsSize: 'md',
                                                tabsShowTabIcons: true,
                                                tabsShowTabLabels: true,
                                                tabsTabListClassName: 'bg-primary-lightest border-primary-border',
                                                tabsActiveTabButtonClassName: 'bg-primary text-white',
                                                tabsInactiveTabButtonClassName: 'text-neutral hover:bg-primary-lightest',
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
