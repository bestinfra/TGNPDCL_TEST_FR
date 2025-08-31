import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './LocalAuthWrapper';
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'moderator' | 'accountant')[];
  fallbackPath?: string;
}
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles, 
  fallbackPath = '/unauthorized' 
}) => {
  const { user, isAuthenticated, loading } = useAuth();
  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  // Check role-based access if allowedRoles is specified
  if (allowedRoles && user) {
    const hasRequiredRole = allowedRoles.includes(user.role);
    if (!hasRequiredRole) {
      return <Navigate to={fallbackPath} replace />;
    }
  }
  // Render children if all checks pass
  return <>{children}</>;
};
// Default export for lazy loading
export default ProtectedRoute;