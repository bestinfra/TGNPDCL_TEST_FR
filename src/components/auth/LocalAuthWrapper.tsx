import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE_URL } from '@/config';
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
  code?: string;
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
      const endpoint = `${API_BASE_URL}/sub-app/auth/login`;
      const requestBody = { identifier, password, appId: appId || 'TGNPDCL' };

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 20000);

      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: controller.signal,
          body: JSON.stringify(requestBody),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return {
            success: false,
            message:
              'Login timed out. Is the backend running at http://localhost:4249?',
          };
        }
        throw error;
      } finally {
        window.clearTimeout(timeoutId);
      }
      const responseText = await response.text();
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(responseText) as Record<string, unknown>;
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return { success: false, message: 'Invalid response from server' };
      }

      if (!response.ok) {
        return {
          success: false,
          message:
            (typeof data.message === 'string' && data.message) ||
            `HTTP ${response.status}: ${response.statusText}`,
          code: typeof data.code === 'string' ? data.code : undefined,
        };
      }

      const payload = data.data as Record<string, unknown> | undefined;
      if (data.success && payload) {
        const userToken =
          (payload.token as string | undefined) ||
          (payload.accessToken as string | undefined);
        const userData = payload.user;

        if (!userToken) {
          console.error('Token missing in response');
          return { success: false, message: 'Token missing in response' };
        }

        // Store in localStorage
        localStorage.setItem('token', userToken);
        localStorage.setItem('user', JSON.stringify(userData));
        // Update state
        setToken(userToken);
        setUser(userData as User);
        return { success: true };
      } else {
        console.error('Login failed:', data.message);
        return {
          success: false,
          message:
            (typeof data.message === 'string' && data.message) || 'Login failed',
          code: typeof data.code === 'string' ? data.code : undefined,
        };
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
