// Sub-App Authentication API Service
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4249';

interface LoginRequest {
  identifier: string;
  password: string;
  appId: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: number;
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    accessToken?: string;
    token?: string; // Fallback for backward compatibility
    appId: string;
  };
}

interface VerifyTokenResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: number;
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    };
    appId: string;
  };
}

interface ProfileResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: number;
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      createdAt: string;
    };
    appId: string;
  };
}

// Base API URL - Updated to use application-backend
const API_BASE = `${BACKEND_URL}/sub-app/auth`;

// Helper function to make API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies for authentication
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Login function
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  return apiRequest<LoginResponse>('/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
};

// Verify token function
export const verifyToken = async (token: string): Promise<VerifyTokenResponse> => {
  return apiRequest<VerifyTokenResponse>('/verify-token', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
};

// Get profile function
export const getProfile = async (token: string): Promise<ProfileResponse> => {
  return apiRequest<ProfileResponse>('/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
};

// Helper function to get stored token
export const getStoredToken = (): string | null => {
  return localStorage.getItem('tgnpdcl_token');
};

// Helper function to get stored user
export const getStoredUser = () => {
  const userStr = localStorage.getItem('tgnpdcl_user');
  return userStr ? JSON.parse(userStr) : null;
};

// Helper function to clear stored auth data
export const clearAuthData = (): void => {
  localStorage.removeItem('tgnpdcl_token');
  localStorage.removeItem('tgnpdcl_user');
};

// Helper function to check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = getStoredToken();
  return !!token;
};

// Refresh token function
interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
  };
}

export const refreshToken = async (): Promise<RefreshTokenResponse> => {
  const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4249';
  const API_BASE = `${BACKEND_URL}/sub-app/auth`;
  
  const response = await fetch(`${API_BASE}/refresh-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for refresh token
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Logout function that calls backend
export const logout = async (): Promise<void> => {
  const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4249';
  const API_BASE = `${BACKEND_URL}/sub-app/auth`;
  
  try {
    // Get token from localStorage for Authorization header
    const token = getStoredToken();
    
    // Call backend logout endpoint
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout API call failed:', error);
    // Continue with local cleanup even if API call fails
  } finally {
    // Always clear local data
    clearAuthData();
    window.location.href = '/login';
  }
}; 