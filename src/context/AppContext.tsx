import React, { createContext, useContext, useEffect, useState } from 'react';
interface AppContextType {
    isSidebarCollapsed: boolean;
    toggleSidebar: () => void;
    isDarkMode: boolean;
}
const AppContext = createContext<AppContextType>({
    isSidebarCollapsed: false,
    toggleSidebar: () => {},
    isDarkMode: false,
});
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const savedState = localStorage.getItem('sidebarCollapsed');
        return savedState ? JSON.parse(savedState) : false;
    });
    const [isDarkMode] = useState(() => {
        const savedState = localStorage.getItem('darkMode');
        return savedState ? JSON.parse(savedState) : false;
    });
    useEffect(() => {
        localStorage.setItem(
            'sidebarCollapsed',
            JSON.stringify(isSidebarCollapsed)
        );
    }, [isSidebarCollapsed]);
    const toggleSidebar = () => {
        setIsSidebarCollapsed((prev: boolean) => !prev);
    };
    return (
        <AppContext.Provider
            value={{
                isSidebarCollapsed,
                toggleSidebar,
                isDarkMode,
            }}>
            {children}
        </AppContext.Provider>
    );
};
export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};