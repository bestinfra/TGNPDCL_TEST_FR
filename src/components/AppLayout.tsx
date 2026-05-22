import React, { lazy, useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
const Header = lazy(() => import("SuperAdmin/Header"));
const Sidebar = lazy(() => import("SuperAdmin/Sidebar"));

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
        clearSidebarPermissions?: () => void;
    }
}

type SidebarMenuItem = {
    title: string;
    icon: string;
    link?: string;
    hasSubmenu?: boolean;
    submenu?: { title: string; link: string }[];
};

/** Read permission names from JWT (same token keys as SuperAdmin/Sidebar). */
function getPermissionsFromToken(): string[] {
    try {
        const possibleTokenNames = ["token", "accessToken", "GMRAccesstoken"];
        let token: string | null = null;
        for (const name of possibleTokenNames) {
            token = localStorage.getItem(name);
            if (token) break;
        }
        if (!token) return [];

        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(
                    (c) =>
                        `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`,
                )
                .join(""),
        );
        const decoded = JSON.parse(jsonPayload);
        return Array.isArray(decoded.permissions) ? decoded.permissions : [];
    } catch {
        return [];
    }
}

function hasDailyConsumptionPermission(perms: string[]): boolean {
    return perms.some(
        (p) =>
            p === "daily_consumption" ||
            p === "DAILY_CONSUMPTION" ||
            p.toLowerCase() === "daily_consumption",
    );
}

/**
 * Build sidebar items from JWT permissions (aligned with SuperAdmin/Sidebar
 * buildGroupedMenusFromPermissions) plus Daily Consumption when permitted.
 */
function buildSidebarMenusFromPermissions(perms: string[]): SidebarMenuItem[] {
    const items: SidebarMenuItem[] = [];

    const hasDTR = perms.includes("dtr_dashboard");
    const hasConsumerDashboard = perms.includes("consumer_dashboard");
    const hasBothDashboards = hasDTR && hasConsumerDashboard;

    if (hasDTR || hasConsumerDashboard) {
        if (hasBothDashboards) {
            items.push({
                title: "Dashboard",
                icon: "icons/dashboard.svg",
                hasSubmenu: true,
                submenu: [
                    { title: "DTR Dashboard", link: "/dtr-dashboard" },
                    { title: "Consumer Dashboard", link: "/consumer-dashboard" },
                ],
            });
        } else if (hasDTR) {
            items.push({
                title: "Dashboard",
                icon: "icons/dashboard.svg",
                link: "/dtr-dashboard",
            });
        } else if (hasConsumerDashboard) {
            items.push({
                title: "Dashboard",
                icon: "icons/dashboard.svg",
                link: "/consumer-dashboard",
            });
        }
    }

    const normalizePermKey = (p: string) => p.toLowerCase().replace(/_/g, "-");
    const hasMetersInventoryPerm = perms.some((p) => {
        const v = normalizePermKey(p);
        return (
            v === "view-meters" ||
            v === "meter-inventory" ||
            v === "meter-list" ||
            v === "meters-inventory" ||
            v === "meter-details" ||
            v === "add-meter"
        );
    });
    if (
        hasMetersInventoryPerm ||
        perms.includes("commands") ||
        perms.includes("meter_management") ||
        perms.includes("meter_list")
    ) {
        items.push({
            title: "Meters",
            icon: "icons/meter-bolt.svg",
            link: "/meters",
        });
    }

    if (hasDailyConsumptionPermission(perms)) {
        items.push({
            title: "Daily Consumption",
            icon: "icons/consumption.svg",
            link: "/asset-management",
        });
    }

    if (perms.includes("tickets")) {
        items.push({
            title: "Tickets",
            icon: "icons/customer-service.svg",
            link: "/tickets",
        });
    }

    if (perms.includes("reports")) {
        items.push({
            title: "MIS Reports",
            icon: "icons/reports2.svg",
            link: "/reports",
        });
    }

    if (perms.includes("asset_management")) {
        items.push({
            title: "Estate Management",
            icon: "icons/Asset_managment.svg",
            link: "/asset-management",
        });
    }

    const userChildren: { title: string; link: string }[] = [];
    if (perms.includes("users") || perms.includes("user_management_default")) {
        userChildren.push({ title: "Users", link: "/users" });
    }
    if (perms.includes("role_management")) {
        userChildren.push({
            title: "Role Management",
            link: "/role-management",
        });
    }
    if (userChildren.length > 0) {
        items.push({
            title: "User Management",
            icon: "icons/user_managment.svg",
            hasSubmenu: true,
            submenu: userChildren,
        });
    }

    const seen: Record<string, boolean> = {};
    return items.filter((it) =>
        seen[it.title] ? false : (seen[it.title] = true),
    );
}

function AppLayout({ children, apiBaseUrl }: AppLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();

    // Resolve API base URL: prop -> env -> default '/api'
    const baseApiUrl =
        apiBaseUrl ?? (import.meta.env?.VITE_API_BASE_URL || "/api");

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
                method: "GET",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const result = await response.json();
                if (
                    result.success &&
                    result.data &&
                    result.data.notifications
                ) {
                    const dbNotifications = result.data.notifications;

                    // Transform notifications to match expected format
                    const transformedNotifications = dbNotifications.map(
                        (notification: any) => ({
                            ...notification,
                            created_at: notification.created_at
                                ? new Date(
                                      notification.created_at,
                                  ).toISOString()
                                : new Date().toISOString(),
                        }),
                    );

                    setNotifications(transformedNotifications);
                    return transformedNotifications;
                }
            }

            setNotifications([]);
            return [];
        } catch (error) {
            console.error("Error fetching notifications:", error);
            setNotifications([]);
            return [];
        }
    };

    // Mark notification as read
    const markNotificationAsRead = async (notificationId: string) => {
        try {
            console.log(
                `🔵 [FRONTEND] markNotificationAsRead called with ID: ${notificationId}`,
            );
            console.log(
                `🔵 [FRONTEND] API URL: ${baseApiUrl}/notifications/${notificationId}/read`,
            );

            const response = await fetch(
                `${baseApiUrl}/notifications/${notificationId}/read`,
                {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );

            console.log(`🔵 [FRONTEND] Response status: ${response.status}`);

            if (response.ok) {
                const result = await response.json();
                console.log(`✅ [FRONTEND] Mark as read successful:`, result);

                setNotifications((prev) =>
                    prev.map((notif) =>
                        notif.id === notificationId
                            ? { ...notif, is_read: true }
                            : notif,
                    ),
                );
                return true;
            } else {
                const errorData = await response.json();
                console.error(`❌ [FRONTEND] Mark as read failed:`, errorData);
                return false;
            }
        } catch (error) {
            console.error(
                "❌ [FRONTEND] Error marking notification as read:",
                error,
            );
            return false;
        }
    };

    // Mark all notifications as read
    const markAllNotificationsAsReadList = async () => {
        try {
            console.log(`🟣 [FRONTEND] markAllNotificationsAsRead called`);
            console.log(
                `🟣 [FRONTEND] API URL: ${baseApiUrl}/notifications/mark-all-read`,
            );

            const response = await fetch(
                `${baseApiUrl}/notifications/mark-all-read`,
                {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                },
            );

            console.log(`🟣 [FRONTEND] Response status: ${response.status}`);

            if (response.ok) {
                const result = await response.json();
                console.log(
                    `✅ [FRONTEND] Mark all as read successful:`,
                    result,
                );

                setNotifications((prev) =>
                    prev.map((notif) => ({ ...notif, is_read: true })),
                );

                // Refresh the notifications list to get updated data
                await fetchNotificationsList();

                return true;
            } else {
                const errorData = await response.json();
                console.error(
                    `❌ [FRONTEND] Mark all as read failed:`,
                    errorData,
                );
                return false;
            }
        } catch (error) {
            console.error(
                "❌ [FRONTEND] Error marking all notifications as read:",
                error,
            );
            return false;
        }
    };

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
            if (typeof window !== "undefined" && window.io) {
                try {
                    // Connect to socket server on port 4250
                    const socket = window.io("http://localhost:4250");

                    socket.on(
                        "escalation_notification",
                        (notification: any) => {
                            console.log(
                                "New escalation notification received:",
                                notification,
                            );
                            // Refresh notification stats when new notification arrives
                            // fetchNotificationStats();
                        },
                    );

                    socket.on("notification_resolved", (data: any) => {
                        console.log("Notification resolved:", data);
                        // Refresh notification stats when notification is resolved
                        //  fetchNotificationStats();
                    });

                    socket.on("connect", () => {
                        console.log(
                            "🔌 [SOCKET] Connected to notification server",
                        );
                    });

                    socket.on("disconnect", () => {
                        console.log(
                            "🔌 [SOCKET] Disconnected from notification server",
                        );
                    });

                    socket.on("connect_error", (error: any) => {
                        console.warn("🔌 [SOCKET] Connection error:", error);
                    });

                    // Store socket reference for cleanup
                    (window as any).notificationSocket = socket;
                } catch (error) {
                    console.warn("Failed to connect to socket server:", error);
                }
            } else {
                console.log(
                    "🔌 [SOCKET] Socket.io not available, using polling only",
                );
            }
        };

        setupWebSocketListener();

        return () => {
            clearInterval(interval);
            // Clean up WebSocket listeners if needed
            if (
                typeof window !== "undefined" &&
                (window as any).notificationSocket
            ) {
                const socket = (window as any).notificationSocket;
                socket.off("escalation_notification");
                socket.off("notification_resolved");
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
        const event = new CustomEvent("notificationsUpdated", {
            detail: { notifications, count: notifications.length },
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
            return [];
        }
    }, [notifications]);

    // Expose transformed notifications for Header
    useEffect(() => {
        // Transform notifications to match Header's expected format
        const transformedNotifications = notifications.map(
            (notification: any) => {
                return {
                    id: notification.id.toString(),
                    type:
                        notification.type === "HT_FUSE_BLOWN"
                            ? "warning"
                            : notification.type === "METER_ABNORMALITY"
                              ? "error"
                              : notification.type === "BILLING"
                                ? "info"
                                : notification.type === "TICKET"
                                  ? "ticket"
                                  : notification.type === "SYSTEM"
                                    ? "success"
                                    : "info",
                    label:
                        notification.type === "HT_FUSE_BLOWN"
                            ? "HT Fuse Alert"
                            : notification.type === "METER_ABNORMALITY"
                              ? "Meter Alert"
                              : notification.type === "BILLING"
                                ? "Billing"
                                : notification.type === "TICKET"
                                  ? "Support"
                                  : notification.type === "SYSTEM"
                                    ? "System"
                                    : "Notification",
                    title: notification.title,
                    dateTime: notification.created_at
                        ? new Date(notification.created_at).toLocaleString()
                        : new Date().toLocaleString(),
                    isUnread: !notification.is_read,
                    isNew:
                        !notification.is_read &&
                        isRecent(notification.created_at),
                    redirectUrl: notification.redirect_url || "/dashboard",
                    message: notification.message,
                    category:
                        notification.type === "HT_FUSE_BLOWN"
                            ? "HT Fuse"
                            : notification.type === "METER_ABNORMALITY"
                              ? "Meter"
                              : notification.type === "BILLING"
                                ? "Billing"
                                : notification.type === "TICKET"
                                  ? "Support"
                                  : notification.type === "SYSTEM"
                                    ? "System"
                                    : "General",
                };
            },
        );

        // Store transformed notifications globally
        (window as any).headerTransformedNotifications =
            transformedNotifications;

        // Dispatch event to Header with transformed notifications
        const event = new CustomEvent("setNotifications", {
            detail: { notifications: transformedNotifications },
        });
        window.dispatchEvent(event);
    }, [notifications]);

    // Helper function for isRecent
    function isRecent(createdAt: string): boolean {
        const notificationDate = new Date(createdAt);
        const now = new Date();
        const diffInHours =
            (now.getTime() - notificationDate.getTime()) / (1000 * 60 * 60);
        return diffInHours < 24;
    }

    // Search suggestions handler - for autocomplete dropdown as user types
    const handleSearchSuggestions = async (query: string) => {
        if (!query || query.length < 2) {
            return [];
        }

        try {
            const trimmedQuery = query.trim();
            const fullUrl = `${baseApiUrl}/dtrs/search?query=${encodeURIComponent(
                trimmedQuery,
            )}`;

            const response = await fetch(fullUrl, {
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                const result = await response.json();

                if (result.success && result.data && result.data.length > 0) {
                    // ✅ Transform to match SearchResult interface that Input component expects
                    const suggestions = result.data.map(
                        (item: any, index: number) => {
                            // ✅ Use backend's type field (backend determines based on query starting with 'D')
                            const searchType = item.type; // 'dtr' if query starts with D, else 'meter'

                            if (searchType === "meter") {
                                // Meter search result - show meter number prominently
                                return {
                                    id: `meter-${index}`,
                                    name: `Meter: ${
                                        item.meter?.meterNumber ||
                                        item.meter?.serialNumber ||
                                        "Unknown"
                                    }`,
                                    meter:
                                        item.meter?.meterNumber ||
                                        item.meter?.serialNumber ||
                                        "Unknown",
                                    // uid: item.meter?.meterNumber || item.meter?.serialNumber || item.dtrNumber,
                                    consumerNumber: `${item.dtrNumber}`,
                                    // Store original data for navigation
                                    _originalData: item,
                                    _searchType: "meter",
                                };
                            } else {
                                // DTR search result - show DTR number prominently
                                const displayName = item.meter
                                    ? `DTR ${item.dtrNumber} (has meter: ${
                                          item.meter.meterNumber ||
                                          item.meter.serialNumber
                                      })`
                                    : `DTR ${item.dtrNumber}`;

                                return {
                                    id: `dtr-${index}`,
                                    name: displayName,
                                    meter: item.location || "Unknown Location",
                                    uid: item.dtrNumber,
                                    consumerNumber: item.dtrNumber,
                                    // Store original data for navigation
                                    _originalData: item,
                                    _searchType: "dtr",
                                };
                            }
                        },
                    );

                    return suggestions;
                }
            }

            return [];
        } catch (error) {
            console.error("Search suggestions error:", error);
            return [];
        }
    };

    // Search result click handler - when user clicks a suggestion
    const handleSearchResultClick = (result: any) => {
        // Check if this is a DTR/Meter search result
        if (result._searchType === "meter") {
            // For meter searches: Navigate to /feeder page with state
            const originalData = result._originalData;
            if (!originalData?.dtrId) return;
            const feederDtrId = String(originalData.dtrId).trim();
            if (!feederDtrId) return;
            const meterNumber =
                originalData.meter.meterNumber ||
                originalData.meter.serialNumber;

            navigate(`/feeder/${feederDtrId}`, {
                state: {
                    feederData: {
                        feederName: meterNumber,
                        dtrNumber: originalData.dtrNumber,
                        dtrId: feederDtrId,
                    },
                    dtrId: feederDtrId,
                    dtrName: originalData.dtrNumber,
                    highlightMeter: meterNumber,
                },
            });
        } else if (result._searchType === "dtr") {
            const originalData = result._originalData;
            if (!originalData?.id) return;
            navigate(`/dtr-detail/${originalData.id}`);
        } else {
            // Fallback for other search types (consumers, etc.)
            if (result.consumerNumber) {
                navigate(`/consumers/${result.consumerNumber}`);
            }
        }
    };

    // Global search handler - when user presses Enter without selecting a suggestion
    const handleGlobalSearch = async (query: string) => {
        if (!query || query.length < 2) {
            return;
        }

        try {
            const trimmedQuery = query.trim();

            // Search using API
            const fullUrl = `${baseApiUrl}/dtrs/search?query=${encodeURIComponent(
                trimmedQuery,
            )}`;
            const response = await fetch(fullUrl, {
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                const result = await response.json();

                if (result.success && result.data && result.data.length > 0) {
                    const firstResult = result.data[0];

                    // If result has meter info and query is likely a meter number (short, numeric)
                    if (firstResult.meter && /^\d{1,4}$/.test(trimmedQuery)) {
                        if (!firstResult?.dtrId) return;
                        const feederDtrId = String(firstResult.dtrId).trim();
                        if (!feederDtrId) return;
                        navigate(`/feeder/${feederDtrId}`, {
                            state: {
                                dtrId: feederDtrId,
                                highlightMeter:
                                    firstResult.meter.meterNumber ||
                                    firstResult.meter.serialNumber,
                            },
                        });
                        return;
                    } else {
                        if (!firstResult?.id) return;
                        navigate(`/dtr-detail/${firstResult.id}`);
                        return;
                    }
                }
            }

            // No results
            alert(
                `No results found for "${trimmedQuery}". Please check your search term.`,
            );
        } catch (error) {
            console.error("Search error:", error);
            alert(`Search failed. Please try again.`);
        }
    };
    // Simplified page title mapping
    const pageTitles: Record<string, string> = {
        "/dtr-dashboard": "DTR Dashboard",
        "/meter-alerts": "Meter Events",
        "/meter-alert": "Meter Events",
        "/reports": "MIS Reports",
        "/asset-management": "Asset Management",
        "/users": "Users",
        "/users/:userId": "User Detail",
        "/add-user": "Add User",
        "/role-management": "Role Management",
        "/tickets": "Tickets",
        "/tickets/:ticketId": "Ticket View",
        "/add-ticket": "Add Ticket",
        "/data-logger": "Data Logger",
        "/meters": "Meter Management",
        "/meter-details/:meterId": "Meter Details",
        "/": "DTR Dashboard",
    };
    const permissions = useMemo(
        () => getPermissionsFromToken(),
        [location.pathname, location.search],
    );
    const menuItems = useMemo(
        () => buildSidebarMenusFromPermissions(permissions),
        [permissions],
    );

    // SuperAdmin/Sidebar ignores `menus` when JWT permissions exist; clear so our
    // permission-built list (includes daily_consumption) is used.
    useEffect(() => {
        window.clearSidebarPermissions?.();
    }, [menuItems]);
    const handleSidebarNavigate = (rawPath: string) => {
        const path = (rawPath || "").trim();
        const normalized = path.toLowerCase().replace(/\/+$/, "");

        // Normalize common sidebar variants to stable routes.
        if (
            normalized.includes("meter-alerts") ||
            normalized.includes("meter-alert") ||
            normalized.includes("meterevents") ||
            normalized.includes("meter-events")
        ) {
            navigate("/meter-alerts");
            return;
        }

        if (normalized.includes("mis-report") || normalized.includes("ms-report")) {
            navigate("/reports");
            return;
        }

        navigate(path || "/");
    };

    return (
        <div className="flex h-screen bg-white">
            {/* Sidebar */}
            <Sidebar
                currentPath={location.pathname}
                onNavigate={handleSidebarNavigate}
                menus={
                    menuItems.length > 0
                        ? [{ category: "GENERAL", items: menuItems }]
                        : undefined
                }
                logo={{
                    src: "images/bi-logo-latest.svg",
                    alt: "Best Infra",
                    collapsedSrc: "images/changed-logo.svg",
                }}
                clientLogo={{
                    src: "images/tgnpdcl.png",
                    alt: "TGNPDCL Client",
                    collapsedSrc: "images/tgnpdcl.png",
                }}
                footer={{
                    copyright: "© 2024 Best Infra",
                    showThemeToggle: true,
                    showShareButton: false,
                }}
                showAppDownload={false}
                onToggleTariff={false}
                enableSubAppThemeBridge={true}
                tokenName="token"
            />
            <div className="flex flex-col flex-1">
                {/* Header */}
                <Header
                    // key={`header-${notifications.length}-${notificationStats.unread || 0}-notifications`}l
                    title={pageTitles[location.pathname] || "Dashboard"}
                    onSearch={handleGlobalSearch}
                    onSearchSuggestions={handleSearchSuggestions}
                    onSearchResultClick={handleSearchResultClick}
                    apiBaseUrl={baseApiUrl}
                    tariff={false}
                    // Notification props
                    //  notificationCount={notificationStats.unread}
                    // notificationStats={notificationStats}
                    // isNotificationLoading={isNotificationLoading}
                    onNotificationClick={() => {
                        // Navigate to notifications page or show notification panel
                        console.log("Notification clicked");
                    }}
                    onMarkAllNotificationsAsRead={
                        markAllNotificationsAsReadList
                    }
                    //  onRefreshNotifications={fetchNotificationStats}
                    onFetchNotifications={getCurrentNotifications}
                    onMarkNotificationAsRead={markNotificationAsRead}
                    logoutRoute="/login"
                    // clientLogo={{
                    //     src: "images/tgnpdcl.png",
                    //     alt: "Client Logo",
                    //     title: "Client Information",
                    // }}
                    // clientName="TGNPDCL GROUP"
                    showProfileSettings={false} // Hide profile menu
                    showLogout={true}
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
