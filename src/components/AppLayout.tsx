import React, { lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
const Header = lazy(() => import('SuperAdmin/Header'));
const Sidebar = lazy(() => import('SuperAdmin/Sidebar'));
interface AppLayoutProps {
  children: React.ReactNode;
}
function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  // Simplified page title mapping
  const pageTitles: Record<string, string> = {
    '/dtr-dashboard': 'DTR Dashboard',
    '/asset-management': 'Asset Management',
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
    { title: 'DTR Dashboard', icon: '/icons/dashboard.svg', link: '/' },
    {
      title: 'Dashboard',
      icon: '/icons/dashboard.svg',
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
,
    { title: 'Assets', icon: '/icons/workflow-setting-alt.svg', link: '/asset-management' },
    {
      title: 'User Management',
      icon: '/icons/user.svg',
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
,
      ],
    },
,
    { title: 'Users', icon: '/icons/user.svg', link: '/users' },
    { title: 'Role Management', icon: '/icons/roles.svg', link: '/role-management' },
    { title: 'All Tickets', icon: '/icons/customer-service.svg', link: '/tickets' },
    {
      title: 'Meter Management',
      icon: '/icons/meter-bolt.svg',
      hasSubmenu: true,
      submenu: [
,
        {
          title: 'Data Logger',
          link: '/data-logger',
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
,
    { title: 'Data Logger', icon: '/icons/meter-bolt.svg', link: '/data-logger' },
    { title: 'Meter List', icon: '/icons/meter-bolt.svg', link: '/meters' }
  ];
  return (
      <div className="flex h-screen bg-white">
        {/* Sidebar */}
          <Sidebar 
            currentPath={location.pathname}
            onNavigate={(path: string) => navigate(path)}
            menus={[{ category: 'GENERAL', items: menuItems }]}
            logo={{
              src: '/images/bi-logo-latest.svg',
              alt: 'Best Infra',
              collapsedSrc: '/images/changed-logo.svg',
            }}
            clientLogo={{
              src: '/images/gmr-logo.png',
              alt: 'GMR Client',
              collapsedSrc: '/images/gmr-logo.png',
            }}
            footer={{
              copyright: '© 2024 Best Infra',
              showThemeToggle: true,
              showShareButton: false,
            }}
            showAppDownload={false}
          />
        <div className="flex flex-col flex-1">
          {/* Header */}
            <Header title={pageTitles[location.pathname] || 'Dashboard'} />
          {/* Main Content */}
          <main className="flex-1 p-6 bg-white overflow-auto dark:bg-primary-dark">
            {children}
          </main>
        </div>
      </div>
  );
}
export default AppLayout;