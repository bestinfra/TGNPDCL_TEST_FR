import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import Cookies from 'js-cookie';
import { useApp } from '@context/AppContext';
import '@/styles/custom.css';
// Button component should come from SuperAdmin via federation
// import Button from 'SuperAdmin/Button';
interface SubMenuItem {
    title: string;
    link?: string;
    icon?: string;
    count?: number;
    hasSubmenu?: boolean;
    submenu?: SubMenuItem[];
}
interface MenuItem {
    title: string;
    icon: string;
    link?: string;
    hasSubmenu?: boolean;
    submenu?: SubMenuItem[];
    count?: number;
}
interface MenuCategory {
    category: string;
    items: MenuItem[];
}
interface SidebarProps {
    isCollapsed: boolean;
    currentPath?: string;
    onNavigate?: (path: string) => void;
    menus?: MenuCategory[];
    appDownload?: {
        enabled: boolean;
        title: string;
        subtitle: string;
        buttonText: string;
        backgroundImage: string;
        downloadUrl: string;
        logo: {
            src: string;
            alt: string;
        };
    };
    footer?: {
        showShareButton: boolean;
    };
    showThemeToggle?: boolean;
    showAppDownload?: boolean;
    className?: string;
    onThemeToggle?: () => void;
    onShareClick?: () => void;
    onLogout?: () => void;
}
const defaultMenus: MenuCategory[] = [
    {
        category: 'GENERAL',
        items: [
            {
                title: 'SuperAdmin Dashboard', 
                icon: '/icons/dashboard.svg',
                link: '/superadmin',
            },
            // {
            //     title: 'DTR Dashboard',
            //     icon: '/icons/dashboard.svg',
            //     link: '/dtr-dashboard',
            // },
            // {
            //     title: 'Tickets',
            //     icon: '/icons/customer-service.svg',
            //     link: '/tickets',   
            // },
            {
                title:'All Tickets',
                icon:'/icons/dashboard.svg',
                link:'/all-tickets',
            },
            // {   
            //         title: 'Bills',
            //         icon: '/icons/bills.svg',
            //         link: '/user-management',
            //         hasSubmenu: true,
            //         submenu: [
            //             {
            //                 title: 'Prepaid',
            //                 link: '/prepaid ',
            //             },
            //             {
            //                 title: 'Postpaid',
            //                 link: '/postpaid ',
            //             },
            //         ],
            //     },
            // {
            //     title:'ConsumerDetails',
            //     icon:'/icons/dashboard.svg',
            //     link:'/consumer-details',
            // }
        ],
    },
    {
        category: 'ADMIN SETTINGS',
        items: [
            // {
            //     title: 'Meter Management',
            //     icon: '/icons/Asset_managment.svg',
            //     link: '/asset-managment',
            // },
            // {
            //     title: 'Meter List',
            //     icon: '/icons/meter_managment.svg',
            //     link: '/meters',
            // },
            {
                title: 'User Management',
                link: '/users',
                icon:'/icons/user_managment.svg',
            },
            {
                    title: 'Meter List',
                    icon: '/icons/meter_managment.svg',
                    link: '/meters',
                },
                {
                    title: 'Consumer Dashboard',
                    icon: '/icons/dashboard.svg',
                    link: '/consumer-dashboard',
                },
                {
                    title:'Role Permissions',
                    icon:'/icons/roles.svg',
                    link:'/roles-permissions',
                },
                {
                    title:'Individual Detail',
                    icon:'/icons/roles.svg',
                    link:'/individual-detail',
                }
                ,
                {
                    title:'Data Logger',
                    icon:'/icons/roles.svg',
                    link:'/data-logger',
                }
            // {   
            //     title: 'User Management',
            //     icon: '/icons/user_managment.svg',
            //     link: '/user-management',
            //     hasSubmenu: true,
            //     submenu: [
            //         {
            //             title: 'Role Management',
            //             link: '/role-management ',
            //         },
            //     ],
            // },
            // {
            //     title: 'User Management',
            //     icon: '/icons/user_managment.svg',
            //     link: '/user-management',
            //     hasSubmenu: true,
            //     submenu: [
            //         {
            //             title: 'Role Management',
            //             link: '/role-management ',
            //         },
            //     ],
            // },
        ],
    },
];
const defaultProps: Partial<
    Omit<SidebarProps, 'isCollapsed' | 'onThemeToggle'>
> = {
    appDownload: {
        enabled: true,
        title: 'Download our Mobile App',
        subtitle: 'Get easy in another way',
        buttonText: 'Download App',
        backgroundImage: '/images/download-app.svg',
        downloadUrl: 'https://your-app-download-url.com',
        logo: {
            src: '/images/changed-logo.svg',
            alt: 'App Logo',
        },
    },
    onLogout: () => {
        const allCookies = Cookies.get();
        Object.keys(allCookies).forEach((cookieName) => {
            Cookies.remove(cookieName);
        });
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/auth/logout';
    },
};
const Sidebar = ({
    currentPath,
    onNavigate,
    menus = defaultMenus,
    appDownload = defaultProps.appDownload,
    footer = defaultProps.footer,
    showThemeToggle = true,
    showAppDownload = true,
    className = '',
    onLogout = defaultProps.onLogout,
    onThemeToggle,
    onShareClick,
}: Omit<SidebarProps, 'isCollapsed'>) => {
    const { isDarkMode, isSidebarCollapsed } = useApp();
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(
        {}
    );
    // Use currentPath prop if provided, otherwise fallback to useLocation for standalone usage
    let pathname = currentPath;
    try {
        const location = useLocation();
        if (!pathname) pathname = location.pathname;
    } catch {
        // useLocation failed, use currentPath or default to '/'
        pathname = currentPath || '/';
    }
    const toggleSubmenu = (menuTitle: string) => {
        setExpandedMenus((prev) => ({
            ...prev,
            [menuTitle]: !prev[menuTitle],
        }));
    };
    return (
        <div
            className={`transition-[width] duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-72'
                }`}>
            <nav
                className={`h-screen flex flex-col justify-between items-center w-full bg-background-secondary dark:bg-primary-dark-light border-r border-r-primary-border relative dark:border-dark-border transition-[width] duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-72'
                    } ${className}`}
                aria-label="Main navigation">
                <div className="flex flex-col w-full h-fit overflow-hidden overflow-y-auto scrollbar-hide">
                    <header
                        className={` dark:bg-primary-dark flex justify-center border-b border-b-primary-border dark:border-dark-border items-center ${isSidebarCollapsed
                                ? 'bg-primary px-4'
                                : 'bg-white px-10'
                            } py-6`}>
                        <img
                            src={
                                isSidebarCollapsed
                                    ? isDarkMode
                                        ? '/images/bi-white-logo.svg'
                                        : '/images/changed-logo.svg'
                                    : isDarkMode
                                        ? '/images/bi-white-logo.svg'
                                        : '/images/bi-blue-logo.svg'
                            }
                            alt="Company Logo"
                            className={`md:block ${isSidebarCollapsed ? 'w-8' : 'w-[170px]'
                                }`}
                        />
                    </header>
                    <main className="flex p-4 flex-col w-full md:block dark:bg-primary-dark-light">
                        {menus.map((category, categoryIndex) => (
                            <section
                                key={categoryIndex}
                                className="flex flex-col w-full"
                                aria-label={category.category}>
                                {!isSidebarCollapsed && (
                                    <h2 className="px-4 py-2 text-sm font-semibold uppercase text-neutral-dark  dark:text-white">
                                        {category.category}
                                    </h2>
                                )}
                                <ul className="list-none p-0 m-0 gap-1 flex flex-col">
                                    {category.items.map(
                                        (menuItem, itemIndex) => (
                                            <li key={itemIndex}>
                                                {menuItem.hasSubmenu ? (
                                                    <div className="relative w-full">
                                                        <button
                                                            onClick={() =>
                                                                toggleSubmenu(
                                                                    menuItem.title
                                                                )
                                                            }
                                                            className={`flex items-center gap-4 py-3 px-4 mb-1 text-sm cursor-pointer rounded-lg w-full text-left ${pathname ===
                                                                    menuItem.link
                                                                    ? 'text-primary bg-white dark:bg-brand-blue dark:text-white custom-shadow text-sm font-bold hover:font-semibold'
                                                                    : 'text-main hover:bg-white hover:text-primary hover:font-semibold dark:text-white dark:hover:bg-primary-dark-light dark:hover:text-white text-sm font-normal'
                                                                }`}
                                                            aria-expanded={
                                                                expandedMenus[
                                                                menuItem
                                                                    .title
                                                                ]
                                                            }
                                                            aria-controls={`submenu-${menuItem.title}`}>
                                                            <span className="w-6 h-6 flex items-center justify-center">
                                                                <img
                                                                    src={
                                                                        menuItem.icon
                                                                    }
                                                                    alt=""
                                                                    className={`w-6 h-6 icon-dark-filter transition-all duration-200 ${pathname ===
                                                                            menuItem.link
                                                                            ? 'icon-filter'
                                                                            : 'group-hover:icon-filter'
                                                                        }`}
                                                                    aria-hidden="true"
                                                                />
                                                            </span>
                                                            {!isSidebarCollapsed && (
                                                                <div className="flex items-center justify-between w-full gap-2">
                                                                    <span>
                                                                        {
                                                                            menuItem.title
                                                                        }
                                                                    </span>
                                                                    <span
                                                                        className={`transition-transform ${expandedMenus[
                                                                                menuItem
                                                                                    .title
                                                                            ]
                                                                                ? 'rotate-180'
                                                                                : ''
                                                                            }`}>
                                                                        <img
                                                                            src="/icons/arrow-down.svg"
                                                                            alt=""
                                                                            className="w-3 h-3"
                                                                            aria-hidden="true"
                                                                        />
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </button>
                                                        {!isSidebarCollapsed && (
                                                            <ul
                                                                id={`submenu-${menuItem.title}`}
                                                                className={`relative flex flex-col overflow-hidden transition-all duration-300 ease-in-out pl-0 ${expandedMenus[
                                                                        menuItem
                                                                            .title
                                                                    ]
                                                                        ? 'max-h-[500px] opacity-100'
                                                                        : 'max-h-0 opacity-0'
                                                                    }`}>
                                                                {/* Vertical line for submenu */}
                                                                <span className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 z-0"></span>  
                                                                {menuItem.submenu?.map(
                                                                    (
                                                                        subItem,
                                                                        subIndex
                                                                    ) => (
                                                                        <li
                                                                            key={
                                                                                subIndex
                                                                            }
                                                                            className="relative">
                                                                            {/* Horizontal line for each submenu item */}
                                                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-gray-200 z-20"></span>
                                                                            <button
                                                                                onClick={() =>
                                                                                    subItem.link &&
                                                                                    onNavigate?.(
                                                                                        subItem.link
                                                                                    )
                                                                                }
                                                                                className={`block ml-4 mr-4 py-3 px-4 pl-8 rounded-lg transition-all duration-200 w-full text-left text-sm relative z-10 ${pathname ===
                                                                                        subItem.link
                                                                                        ? 'bg-[linear-gradient(to_right,transparent_0_10%,white_8%_100%)] text-primary shadow font-bold'
                                                                                        : 'text-gray-400 hover:text-primary font-normal'
                                                                                    }`}>
                                                                                {
                                                                                    subItem.title
                                                                                }
                                                                            </button>
                                                                        </li>
                                                                    )
                                                                )}
                                                            </ul>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            if (
                                                                menuItem.title ===
                                                                'Logout' &&
                                                                onLogout
                                                            ) {
                                                                onLogout();
                                                            } else if (
                                                                menuItem.link
                                                            ) {
                                                                onNavigate?.(
                                                                    menuItem.link
                                                                );
                                                            }
                                                        }}
                                                        className={`flex items-center gap-4 py-3 px-4  text-sm cursor-pointer group rounded-lg w-full text-left ${pathname ===
                                                                menuItem.link
                                                                ? 'text-primary bg-white dark:bg-primary dark:text-white custom-shadow font-bold'
                                                                : 'text-main hover:bg-white hover:text-primary hover:font-semibold dark:text-white dark:hover:bg-primary-dark-light dark:hover:text-white font-normal'
                                                            }`}>
                                                        <span className="w-6 h-6 flex items-center justify-center">
                                                            <img
                                                                src={
                                                                    menuItem.icon
                                                                }
                                                                alt=""
                                                                className={`w-6 h-6 icon-dark-filter transition-all duration-200 ${pathname ===
                                                                        menuItem.link
                                                                        ? 'icon-filter'
                                                                        : ''
                                                                    }`}
                                                                aria-hidden="true"
                                                            />
                                                        </span>
                                                        {!isSidebarCollapsed && (
                                                            <div className={`flex items-center justify-between w-full gap-2 ${pathname === menuItem.link ? 'font-bold' : 'font-normal hover:font-semibold'}`}>
                                                                <span>
                                                                    {
                                                                        menuItem.title
                                                                    }
                                                                </span>
                                                                {menuItem.count && (
                                                                    <span
                                                                        className={`w-7 h-7 rounded-full text-xs text-white font-bold flex justify-center group-hover:bg-brand items-center ${pathname ===
                                                                                menuItem.link
                                                                                ? 'bg-primary dark:bg-secondary'
                                                                                : 'bg-primary dark:bg-secondary'
                                                                            }`}>
                                                                        {
                                                                            menuItem.count
                                                                        }
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </button>
                                                )}
                                            </li>
                                        )
                                    )}
                                </ul>
                            </section>
                        ))}
                    </main>
                </div>
                <footer className="flex flex-col w-full justify-between gap-5 h-fit p-4 dark:bg-primary-dark-light">
                    {!isSidebarCollapsed ? (
                        <>
                            {showAppDownload && appDownload?.enabled && (
                                <section className="rounded-lg bg-[url('/images/download-app.svg')] bg-cover bg-center flex flex-col items-center justify-center p-6 gap-4">
                                    <div className="flex items-center justify-between w-full">
                                        <span className="w-10 h-10 bg-primary rounded-full transition-all duration-300 flex justify-center items-center">
                                            <img
                                                src={appDownload.logo.src}
                                                alt={appDownload.logo.alt}
                                                className="w-5 h-5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <span className="bg-secondary text-white text-xs font-medium rounded-lg px-2 py-1">
                                            New
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="text-white text-2xl font-bold">
                                            {appDownload.title}
                                        </h3>
                                        <p className="text-white text-sm font-semibold">
                                            {appDownload.subtitle}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors duration-200"
                                            onClick={() => {
                                                window.open(
                                                    appDownload.downloadUrl,
                                                    '_blank'
                                                );
                                            }}
                                        >
                                            {appDownload.buttonText}
                                        </button>
                                        {footer?.showShareButton && (
                                            <span
                                                className="w-10 h-10 flex items-center justify-center bg-white rounded-full p-2 cursor-pointer transition-colors duration-300 hover:bg-primary-lightest"
                                                aria-label="Share app"
                                                onClick={onShareClick}>
                                                <img
                                                    src="/icons/share.svg"
                                                    alt=""
                                                    className="w-5 h-5 filter"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                        )}
                                    </div>
                                </section>
                            )}
                            <div className="flex items-center justify-between w-full">
                                <p className="text-xs text-light dark:text-subinfo">
                                    © {new Date().getFullYear()} Bestinfra Pvt. Ltd.
                                </p>
                                {showThemeToggle && (
                                    <button
                                        className="w-10 h-10 border border-primary-border dark:border-dark-border rounded-full flex justify-center items-center cursor-pointer"
                                        aria-label="Toggle dark mode"
                                        onClick={onThemeToggle}>
                                        <img
                                            className="w-5 h-5"
                                            src={`${
                                                isDarkMode
                                                    ? '/icons/sun.svg'
                                                    : '/icons/moon.svg'
                                            }`}
                                            alt=""
                                            aria-hidden="true"
                                        />
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-4 gap-4 w-full">
                            <span className="w-10 h-10 bg-transparent p-2 rounded-full">
                                <img
                                    src="/icons/andriod-app.svg"
                                    alt=""
                                    className="filter"
                                    aria-hidden="true"
                                />
                            </span>
                            {showThemeToggle && (
                                <button
                                    className="w-10 h-10 border border-light-border dark:border-dark-border rounded-full flex justify-center items-center cursor-pointer"
                                    aria-label="Toggle dark mode"
                                    onClick={onThemeToggle}>
                                    <img
                                        className="w-5 h-5"
                                        src={`${
                                            isDarkMode
                                                ? '/icons/sun.svg'
                                                : '/icons/moon.svg'
                                        }`}
                                        alt=""
                                        aria-hidden="true"
                                    />
                                </button>
                            )}
                        </div>
                    )}
                </footer>
            </nav>
        </div>
    );
};
export default Sidebar;
// font-medium