import { lazy } from 'react';
import React, { Suspense, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
const Page = lazy(() => import('SuperAdmin/Page'));
import BACKEND_URL from '../config';

// Interfaces
interface Ticket {
    id: number;
    ticketNumber: string;
    subject: string;
    status: string;
    customerName: string;
    category: string;
    priority: string;
    assignedTo: string;
    createdAt: string;
    lastUpdated: string;
    description: string;
    uid: string;
    location: string;
    email: string;
    unitNumber: string;
    meterId: string;
    mobile: string;
    connectionType: string;
}

interface ActivityLogEntry {
    id: string | number;
    description: string;
    timestamp: string;
    status?: string;
    subText?: string;
    author?: string;
}

const TicketView: React.FC = () => {
    const navigate = useNavigate();
    const { ticketId } = useParams<{ ticketId: string }>();

    // State for tracking failed APIs (like Users.tsx)
    const [failedApis, setFailedApis] = useState<Array<{
        id: string;
        name: string;
        retryFunction: () => Promise<void>;
        errorMessage: string;
    }>>([]);

    // Loading states
    const [_isLoading, setIsLoading] = useState(true);
    const [isTicketLoading, setIsTicketLoading] = useState(true);
    const [isActivityLoading, setIsActivityLoading] = useState(true);

    // Hardcoded demo values (disable useAuth logic)
    const isAdmin = false;
    const basePath = '/user/tickets';
    const userDashboardPath = '/tickets';

    // Ticket data with smart fallbacks
    const [ticket, setTicket] = useState<Ticket>({
        id: 0,
        ticketNumber: '-',
        uid: '-',
        subject: '-',
        status: '-',
        customerName: '-',
        category: '-',
        priority: '-',
        assignedTo: '-',
        createdAt: '-',
        lastUpdated: '-',
        description: '-',
        location: '-',
        email: '-',
        unitNumber: '-',
        meterId: '-',
        mobile: '-',
        connectionType: '-',
    });

    // Activity log data with smart fallbacks
    const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

    // Retry specific API function (like Users.tsx)
    const retrySpecificAPI = (apiId: string) => {
        const api = failedApis.find((a) => a.id === apiId);
        if (api) {
            api.retryFunction();
        }
    };

    // Fetch ticket data from API
    const fetchTicketData = async () => {
        if (!ticketId) {
            setFailedApis([{
                id: 'ticketData',
                name: 'Ticket Data',
                retryFunction: fetchTicketData,
                errorMessage: 'No ticket ID provided. Please try again.',
            }]);
            setIsTicketLoading(false);
            return;
        }

        try {
            setIsTicketLoading(true);
            setFailedApis(prev => prev.filter(api => api.id !== 'ticketData'));
            
            const response = await fetch(`${BACKEND_URL}/tickets/${ticketId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            
            if (result.success) {
                const ticketData = result.data;
                setTicket({
                    id: ticketData.id || 0,
                    ticketNumber: ticketData.ticketNumber || '-',
                    uid: ticketData.uid || '-',
                    subject: ticketData.subject || '-',
                    status: ticketData.status || '-',
                    customerName: ticketData.customerName || '-',
                    category: ticketData.category || '-',
                    priority: ticketData.priority || '-',
                    assignedTo: ticketData.assignedTo || '-',
                    createdAt: ticketData.createdAt || '-',
                    lastUpdated: ticketData.lastUpdated || '-',
                    description: ticketData.description || '-',
                    location: ticketData.location || '-',
                    email: ticketData.email || '-',
                    unitNumber: ticketData.unitNumber || '-',
                    meterId: ticketData.meterId || '-',
                    mobile: ticketData.mobile || '-',
                    connectionType: ticketData.connectionType || '-',
                });
            } else {
                throw new Error(result.message || 'Failed to fetch ticket data');
            }
        } catch (error: any) {
            console.error('Error fetching ticket data:', error);
            
            // Add to failed APIs
            setFailedApis(prev => {
                if (!prev.find(api => api.id === 'ticketData')) {
                    return [...prev, {
                        id: 'ticketData',
                        name: 'Ticket Data',
                        retryFunction: fetchTicketData,
                        errorMessage: 'Failed to load Ticket Data. Please try again.',
                    }];
                }
                return prev;
            });
        } finally {
            setIsTicketLoading(false);
        }
    };

    // Fetch activity log data from API
    const fetchActivityLog = async () => {
        if (!ticketId) {
            setFailedApis(prev => {
                if (!prev.find(api => api.id === 'activityLog')) {
                    return [...prev, {
                        id: 'activityLog',
                        name: 'Activity Log',
                        retryFunction: fetchActivityLog,
                        errorMessage: 'No ticket ID provided. Please try again.',
                    }];
                }
                return prev;
            });
            setIsActivityLoading(false);
            return;
        }

        try {
            setIsActivityLoading(true);
            setFailedApis(prev => prev.filter(api => api.id !== 'activityLog'));
            
            const response = await fetch(`${BACKEND_URL}/tickets/${ticketId}/activity-log`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            
            if (result.success) {
                const activityData = result.data || [];
                setActivityLog(activityData.map((item: any) => ({
                    id: item.id || '-',
                    description: item.description || '-',
                    timestamp: item.timestamp || '-',
                    status: item.status || '-',
                    subText: item.subText || '-',
                    author: item.author || '-',
                })));
            } else {
                throw new Error(result.message || 'Failed to fetch activity log');
            }
        } catch (error: any) {
            console.error('Error fetching activity log:', error);
            
            // Add to failed APIs
            setFailedApis(prev => {
                if (!prev.find(api => api.id === 'activityLog')) {
                    return [...prev, {
                        id: 'activityLog',
                        name: 'Activity Log',
                        retryFunction: fetchActivityLog,
                        errorMessage: 'Failed to load Activity Log. Please try again.',
                    }];
                }
                return prev;
            });
        } finally {
            setIsActivityLoading(false);
        }
    };

    // Fetch data on component mount
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            await Promise.all([fetchTicketData(), fetchActivityLog()]);
            setIsLoading(false);
        };

        fetchData();
    }, [ticketId]);

    const handleOpenTicket = () => {
        // Handle opening the ticket
        // Add your ticket opening logic here
    };

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Page
                style={{
                    position: 'sticky',
                    top: 0,
                }}
                sections={[
                    // Error Section (show when there are failed APIs)
                    ...(failedApis.length > 0
                        ? [
                            {
                                layout: {
                                    type: 'column' as const,
                                    gap: 'gap-4',
                                },
                                components: [
                                    {
                                        name: 'Error',
                                        props: {
                                            visibleErrors: failedApis.map(
                                                (api) => api.errorMessage
                                            ),
                                            showRetry: true,
                                            maxVisibleErrors: 3, // Show max 3 errors at once
                                            failedApis: failedApis, // Pass all failed APIs for individual retry
                                            onRetrySpecific: retrySpecificAPI, // Pass the retry function
                                        },
                                    },
                                ],
                            },
                        ]
                        : []),
                    {
                        layout: {
                            type: 'column',
                            gap: 'gap-4',
                        },
                        components: [
                            {
                                name: 'PageHeader',
                                props: {
                                    title: `Ticket Details - #${ticket.ticketNumber !== '-' ? ticket.ticketNumber : 'Loading...'}`,
                                    onBackClick: () => {
                                        if (isAdmin) {
                                            navigate(basePath);
                                        } else {
                                            navigate(userDashboardPath);
                                        }
                                    },
                                    backButtonText: isAdmin
                                        ? 'Back to Tickets'
                                        : 'Back to Dashboard',
                                },
                            },
                        ],
                    },
                    {
                        layout: {
                            type: 'grid',
                            columns: 5,
                            gap: 'gap-4',
                            rows: [
                                {
                                    layout: "grid",
                                    gap: "gap-4",
                                    gridColumns: 5,
                                    gridRows: 2,
                                    span: { col: 5, row: 1 },
                                    className: '',
                                    columns: [
                                        {
                                            name: 'TicketConversationPanel',
                                            span: { col: 3, row: 1 },
                                            props: {
                                                title: 'Issue Details',
                                                data: {
                                                    leftColumn: [
                                                        {
                                                            label: 'Ticket ID',
                                                            value: ticket.ticketNumber !== '-' ? `#${ticket.ticketNumber}` : '-',
                                                        },
                                                    ],
                                                },
                                                loading: isTicketLoading,
                                            },
                                        },
                                        {
                                            name: 'TicketInformationPannel',
                                            span: { col: 2, row: 1 },
                                            props: {
                                                ticket: ticket,
                                                activityLog: activityLog,
                                                rightStatus: {
                                                    text: ticket.status !== '-' ? ticket.status : 'Loading...',
                                                    variant: "default",
                                                    onClick: () => handleOpenTicket()
                                                },
                                                loading: isTicketLoading || isActivityLoading,
                                            },
                                        },
                                    ]
                                },
                            ]
                        },
                    }
                ]}
            />
        </Suspense>
    );
};

export default TicketView;
