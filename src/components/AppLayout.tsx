import React, { lazy, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
const Header = lazy(() => import('SuperAdmin/Header'));
const Sidebar = lazy(() => import('SuperAdmin/Sidebar'));

interface AppLayoutProps {
  children: React.ReactNode;
  apiBaseUrl?: string;
}

// interface NotificationStats {
//   total: number;
//   active: number;
//   resolved: number;
//   unread: number;
//   read: number;
//   byType: Record<string, number>;
//   byAbnormalityType: Record<string, number>;
//   byLevel: Record<string, number>;
// }

// Extend Window interface for WebSocket
declare global {
  interface Window {
    io?: (url: string) => {
      on: (event: string, callback: (data: any) => void) => void;
      off: (event: string, callback?: (data: any) => void) => void;
      emit: (event: string, data?: any) => void;
      disconnect: () => void;
    };
    notificationSocket?: any;
  }
}

function AppLayout({ children, apiBaseUrl }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

	// Resolve API base URL: prop -> env -> default '/api'
	const baseApiUrl = apiBaseUrl ?? (import.meta.env?.VITE_API_BASE_URL || '/api');

  // Notification state
  const [notifications, setNotifications] = useState<any[]>([]);
  // const [notificationStats, setNotificationStats] = useState<NotificationStats>({
  //   total: 0,
  //   active: 0,
  //   resolved: 0,
  //   unread: 0,
  //   read: 0,
  //   byType: {},
  //   byAbnormalityType: {},
  //   byLevel: {}
  // });
  //const [isNotificationLoading, setIsNotificationLoading] = useState(false);

  // Fetch notification stats
  // const fetchNotificationStats = async () => {
  //   try {
  //     setIsNotificationLoading(true);
  //     const response = await fetch('/api/notifications/stats', {
  //       method: 'GET',
  //       credentials: 'include',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     });

  //     if (response.ok) {
  //       const result = await response.json();
  //       if (result.success) {
  //         setNotificationStats(result.data);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error fetching notification stats:', error);
  //   } finally {
  //     setIsNotificationLoading(false);
  //   }
  // };


  // Fetch notifications list
  const fetchNotificationsList = async () => {
    try {
		const response = await fetch(`${baseApiUrl}/notifications`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.notifications) {
          const dbNotifications = result.data.notifications;

          // Transform notifications to match expected format
          const transformedNotifications = dbNotifications.map((notification: any) => ({
            ...notification,
            created_at: notification.created_at ? new Date(notification.created_at).toISOString() : new Date().toISOString()
          }));

          setNotifications(transformedNotifications);
          return transformedNotifications;
        }
      }

      // Return dummy data as fallback
      return getDummyNotifications();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return getDummyNotifications();
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: string) => {
    try {
		const response = await fetch(`${baseApiUrl}/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId
              ? { ...notif, is_read: true }
              : notif
          )
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsReadList = async () => {
    try {
		const response = await fetch(`${baseApiUrl}/notifications/mark-all-read`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, is_read: true }))
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  };

  // Dummy notifications fallback
  function getDummyNotifications() {
    return [
      {
        id: "1",
        type: "HT_FUSE_BLOWN",
        title: "HT Fuse Blown Alert",
        message: "HT fuse blown detected on DTR-001",
        created_at: new Date().toISOString(),
        is_read: false,
        abnormalitytype: "HT Fuse Blown",
        level: 2,
        status: "active"
      },
      {
        id: "2",
        type: "METER_ABNORMALITY",
        title: "Meter Abnormality",
        message: "Abnormal reading detected on meter MTR-123",
        created_at: new Date().toISOString(),
        is_read: true,
        abnormalitytype: "Voltage Drop",
        level: 1,
        status: "resolved"
      }
    ];
  }

  // Load notification stats and notifications on component mount
  useEffect(() => {
    // fetchNotificationStats();
    fetchNotificationsList();

    // Set up polling for notification stats every 30 seconds
    const interval = setInterval(() => {
      // fetchNotificationStats();
      fetchNotificationsList();
    }, 30000);

    // Set up WebSocket listener for real-time notifications (if available)
    const setupWebSocketListener = () => {
      // Check if socket.io is available
      if (typeof window !== 'undefined' && window.io) {
        try {
          // Connect to socket server on port 4250
          const socket = window.io('http://localhost:4250');

          socket.on('escalation_notification', (notification: any) => {
            console.log('New escalation notification received:', notification);
            // Refresh notification stats when new notification arrives
            // fetchNotificationStats();
          });

          socket.on('notification_resolved', (data: any) => {
            console.log('Notification resolved:', data);
            // Refresh notification stats when notification is resolved
            //  fetchNotificationStats();
          });

          socket.on('connect', () => {
            console.log('🔌 [SOCKET] Connected to notification server');
          });

          socket.on('disconnect', () => {
            console.log('🔌 [SOCKET] Disconnected from notification server');
          });

          socket.on('connect_error', (error: any) => {
            console.warn('🔌 [SOCKET] Connection error:', error);
          });

          // Store socket reference for cleanup
          (window as any).notificationSocket = socket;
        } catch (error) {
          console.warn('Failed to connect to socket server:', error);
        }
      } else {
        console.log('🔌 [SOCKET] Socket.io not available, using polling only');
      }
    };

    setupWebSocketListener();

    return () => {
      clearInterval(interval);
      // Clean up WebSocket listeners if needed
      if (typeof window !== 'undefined' && (window as any).notificationSocket) {
        const socket = (window as any).notificationSocket;
        socket.off('escalation_notification');
        socket.off('notification_resolved');
        socket.disconnect();
        (window as any).notificationSocket = null;
      }
    };
  }, []);

  // Update notifications when data changes
  useEffect(() => {
    // Store notifications globally so Header can access them
    (window as any).globalNotifications = notifications;
    (window as any).globalNotificationCount = notifications.length;

    // Dispatch custom event to notify Header about notification changes
    const event = new CustomEvent('notificationsUpdated', {
      detail: { notifications, count: notifications.length }
    });
    window.dispatchEvent(event);
  }, [notifications]);

  // Create a function that returns the current notifications state as a Promise
  const getCurrentNotifications = useCallback(async () => {
    // Return the current notifications immediately
    if (notifications.length > 0) {
      return notifications;
    }

    // If no notifications, try to fetch them
    try {
      const freshNotifications = await fetchNotificationsList();
      return freshNotifications;
    } catch (error) {
      // Return dummy data as fallback
      return getDummyNotifications();
    }
  }, [notifications]);

  // Expose transformed notifications for Header
  useEffect(() => {
    // Transform notifications to match Header's expected format
    const transformedNotifications = notifications.map((notification: any) => {
      return {
        id: notification.id.toString(),
        type: notification.type === 'HT_FUSE_BLOWN' ? 'warning' :
          notification.type === 'METER_ABNORMALITY' ? 'error' :
            notification.type === 'BILLING' ? 'info' :
              notification.type === 'TICKET' ? 'ticket' :
                notification.type === 'SYSTEM' ? 'success' : 'info',
        label: notification.type === 'HT_FUSE_BLOWN' ? 'HT Fuse Alert' :
          notification.type === 'METER_ABNORMALITY' ? 'Meter Alert' :
            notification.type === 'BILLING' ? 'Billing' :
              notification.type === 'TICKET' ? 'Support' :
                notification.type === 'SYSTEM' ? 'System' : 'Notification',
        title: notification.title,
        dateTime: notification.created_at ? new Date(notification.created_at).toLocaleString() : new Date().toLocaleString(),
        isUnread: !notification.is_read,
        isNew: !notification.is_read && isRecent(notification.created_at),
        redirectUrl: notification.redirect_url || '/dashboard',
        message: notification.message,
        category: notification.type === 'HT_FUSE_BLOWN' ? 'HT Fuse' :
          notification.type === 'METER_ABNORMALITY' ? 'Meter' :
            notification.type === 'BILLING' ? 'Billing' :
              notification.type === 'TICKET' ? 'Support' :
                notification.type === 'SYSTEM' ? 'System' : 'General'
      };
    });

    // Store transformed notifications globally
    (window as any).headerTransformedNotifications = transformedNotifications;

    // Dispatch event to Header with transformed notifications
    const event = new CustomEvent('setNotifications', {
      detail: { notifications: transformedNotifications }
    });
    window.dispatchEvent(event);
  }, [notifications]);

  // Helper function for isRecent
  function isRecent(createdAt: string): boolean {
    const notificationDate = new Date(createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60);
    return diffInHours < 24;
  }

  // Global search handler
  const handleGlobalSearch = async (query: string) => {

    if (!query || query.length < 2) {
      return;
    }

    try {
      // First try direct patterns for DTR format
      if (query.toUpperCase().startsWith('DTR')) {
        const dtrNumber = query.replace(/^DTR[-_]?/i, '');
        navigate(`/dtr-detail/${dtrNumber}`);
        return;
      }

      if (query.toUpperCase().startsWith('METER')) {
        const meterQuery = query.replace(/^METER[-_\s]?/i, '');
        const response = await fetch(`/api/dtrs/search?query=${encodeURIComponent(meterQuery)}`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
          const firstResult = result.data[0];
          navigate(`/dtr-detail/${firstResult.dtrNumber || firstResult.id}`);
          return;
        } else {
          alert(`No meter found for "${meterQuery}". Please check your search term.`);
          return;
        }
      }

      // For other queries, search the database
      const response = await fetch(`/api/dtrs/search?query=${encodeURIComponent(query)}`);
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        // Take the first result and navigate to DTR details
        const firstResult = result.data[0];
        navigate(`/dtr-detail/${firstResult.dtrNumber || firstResult.id}`);
      } else {
        // No DTR results found, show alert
        alert(`No DTR found for "${query}". Please check your search term.`);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert(`Search failed. Please try again.`);
    }
  };
  // Simplified page title mapping
  const pageTitles: Record<string, string> = {
    '/dtr-dashboard': 'DTR Dashboard',
    '/asset-management': 'Meter Management',
    '/users': 'Users',
    '/users/:userId': 'User Detail',
    '/add-user': 'Add User',
    '/role-management': 'Role Management',
    '/tickets': 'Tickets',
    '/tickets/:ticketId': 'Ticket View',
    '/add-ticket': 'Add Ticket',
    '/data-logger': 'Data Logger',
    '/meters': 'Meter List',
    '/meter-details/:meterId': 'Meter Details',
    '/': 'DTR Dashboard'
  };
  // Menu configuration
  const menuItems = [
    { title: 'DTR Dashboard', icon: 'icons/dashboard.svg', link: '/' },
    {
      title: 'Dashboard',
      icon: 'icons/dashboard.svg',
      hasSubmenu: true,
      submenu: [
        ,
        {
          title: 'Consumer Dashboard',
          link: '/consumer-dashboard',
        },
        ,
        {
          title: 'DTR Dashboard',
          link: '/dtr-dashboard',
        },
        ,
      ],
    },

    { title: 'MeterManagment', icon: 'icons/meter-bolt.svg', link: '/meters' },
    { title: 'Assets', icon: 'icons/workflow-setting-alt.svg', link: '/asset-management' },
    {
      title: 'User Management',
      icon: 'icons/user.svg',
      hasSubmenu: true,
      submenu: [
        ,
        {
          title: 'Users',
          link: '/users',
        },
        ,
        {
          title: 'User Detail',
          link: '/users/:userId',
        },
        ,
        {
          title: 'Add User',
          link: '/add-user',
        },
        ,
        {
          title: 'Role Management',
          link: '/role-management',
        },

      ],
    },
    ,
    { title: 'Users', icon: 'icons/user.svg', link: '/users' },
    { title: 'Role Management', icon: 'icons/roles.svg', link: '/role-management' },
    { title: 'All Tickets', icon: 'icons/customer-service.svg', link: '/tickets' },
    {
      title: 'Meter Management',
      icon: 'icons/meter-bolt.svg',
      hasSubmenu: true,
      submenu: [
        ,
        {
          title: 'Data Logger',
          link: '/asset-managment',
        },
        ,
        {
          title: 'Meter List',
          link: '/meters',
        },
        ,
        {
          title: 'Meter Details',
          link: '/meter-details/:meterId',
        },
        ,
        {
          title: 'Add Meter',
          link: '/add-meter',
        },
        ,
      ],
    },
    { title: 'Data Logger', icon: 'icons/meter-bolt.svg', link: '/data-logger' },
    { title: 'Meter List', icon: 'icons/meter-bolt.svg', link: '/meters' }

  ];
  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar
        currentPath={location.pathname}
        onNavigate={(path: string) => navigate(path)}
        menus={[{ category: 'GENERAL', items: menuItems }]}
        logo={{
          src: 'images/bi-logo-latest.svg',
          alt: 'Best Infra',
          collapsedSrc: 'images/changed-logo.svg',
        }}

        clientLogo={{
          src: 'images/tgnpdcl.png',
          alt: 'TGNPDCL Client',
          collapsedSrc: 'images/tgnpdcl.png',
        }}
        footer={{
          copyright: '© 2024 Best Infra',
          showThemeToggle: true,
          showShareButton: false,
        }}
        showAppDownload={false}
        onToggleTariff={false}
        enableSubAppThemeBridge={true}
      />
      <div className="flex flex-col flex-1">
        {/* Header */}
        <Header
          // key={`header-${notifications.length}-${notificationStats.unread || 0}-notifications`}
          title={pageTitles[location.pathname] || 'Dashboard'}
          onSearch={handleGlobalSearch}
			apiBaseUrl={baseApiUrl}
          tariff={false}
          // Notification props
          //  notificationCount={notificationStats.unread}
          // notificationStats={notificationStats}
          // isNotificationLoading={isNotificationLoading}
          onNotificationClick={() => {
            // Navigate to notifications page or show notification panel
            console.log('Notification clicked');
          }}
          onMarkAllAsRead={markAllNotificationsAsReadList}
          //  onRefreshNotifications={fetchNotificationStats}
          onFetchNotifications={getCurrentNotifications}
          onMarkAsRead={markNotificationAsRead}
          logoutRoute="/v2/tgnpdcl_smart/login"
        />
        {/* Main Content */}
        <main className="flex-1 p-6 bg-white overflow-auto dark:bg-primary-dark">
          {children}
        </main>
      </div>
    </div>
  );
}
export default AppLayout;