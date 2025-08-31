import React, { createContext, useContext, useEffect, useState } from 'react';
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'moderator' | 'accountant';
  accessLevel?: string;
}
export interface LoginResult {
  success: boolean;
  message?: string;
}
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string, appId?: string) => Promise<LoginResult>;
  logout: () => void;
  loading: boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
interface AuthProviderProps {
  children: React.ReactNode;
}
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);
  const login = async (identifier: string, password: string, appId?: string): Promise<LoginResult> => {
    try {
      // Sub-apps use the application-backend authentication
      const endpoint = '/api/sub-app-auth/login';
      const requestBody = { identifier, password, appId: appId || 'TGNPDCL' };
      console.log('Login attempt:', { endpoint, requestBody });
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      console.log('Response status:', response.status);
      if (!response.ok) {
        console.error('HTTP Error:', response.status, response.statusText);
        return { success: false, message: `HTTP ${response.status}: ${response.statusText}` };
      }
      const responseText = await response.text();
      console.log('Response text:', responseText);
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return { success: false, message: 'Invalid response from server' };
      }
      if (data.success && data.data) {
        const { user: userData, token: userToken } = data.data;
        // Store in localStorage
        localStorage.setItem('token', userToken);
        localStorage.setItem('user', JSON.stringify(userData));
        // Update state
        setToken(userToken);
        setUser(userData);
        return { success: true };
      } else {
        console.error('Login failed:', data.message);
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error occurred' };
    }
  };
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };
  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    loading,
  };
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
// Default export for lazy loading
export default AuthProvider;