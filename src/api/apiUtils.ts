// API Utilities for TGNPDCL
// This file provides utilities to connect to the backend API

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4249';

/**
 * Get access token from localStorage
 */
const getAccessToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Set access token in localStorage
 */
const setAccessToken = (token: string): void => {
  localStorage.setItem('token', token);
};

/**
 * Refresh access token using refresh token cookie
 */
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  // If already refreshing, return the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const API_BASE = `${BACKEND_URL}/sub-app/auth`;
      const response = await fetch(`${API_BASE}/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for refresh token
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data?.accessToken) {
        const newToken = data.data.accessToken;
        setAccessToken(newToken);
        return newToken;
      }
      
      throw new Error('Invalid refresh token response');
    } catch (error) {
      console.error('Token refresh error:', error);
      // Clear tokens on refresh failure
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Make API requests to the backend
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a request with automatic token handling and refresh
   */
  private async makeRequest(
    endpoint: string,
    method: string,
    options: RequestInit = {},
    body?: any
  ) {
    const url = `${this.baseUrl}${endpoint}`;
    let token = getAccessToken();

    // Build headers with Authorization if token exists
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Make initial request
    let response = await fetch(url, {
      method,
      headers,
      ...(body ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
      credentials: 'include',
      ...options,
    });

    // Handle 401 - Token expired, try to refresh
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      
      // Only refresh if it's a token expiration error
      if (errorData.code === 'TOKEN_EXPIRED' || errorData.message?.includes('expired')) {
        const newToken = await refreshAccessToken();
        
        if (newToken) {
          // Retry the original request with new token
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(url, {
            method,
            headers,
            ...(body ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
            credentials: 'include',
            ...options,
          });
        } else {
          // Refresh failed, redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          throw new Error('Authentication failed. Please login again.');
        }
      }
    }

    if (!response.ok) {
      // For non-401 errors, try to parse error message
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If JSON parsing fails, use default message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Make a GET request
   */
  async get(endpoint: string, options: RequestInit = {}) {
    return this.makeRequest(endpoint, 'GET', options);
  }

  /**
   * Make a POST request
   */
  async post(endpoint: string, data: any, options: RequestInit = {}) {
    return this.makeRequest(endpoint, 'POST', options, data);
  }

  /**
   * Make a PUT request
   */
  async put(endpoint: string, data: any, options: RequestInit = {}) {
    return this.makeRequest(endpoint, 'PUT', options, data);
  }

  /**
   * Make a DELETE request
   */
  async delete(endpoint: string, options: RequestInit = {}) {
    return this.makeRequest(endpoint, 'DELETE', options);
  }

  /**
   * Check backend health
   */
  async healthCheck() {
    try {
      const health = await this.get('/api/health');
      return { status: 'healthy', data: health };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { status: 'unhealthy', error: errorMessage };
    }
  }

  /**
   * Get backend environment info
   */
  async getEnvironmentInfo() {
    try {
      const env = await this.get('/api/env');
      return { status: 'success', data: env };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { status: 'error', error: errorMessage };
    }
  }
}

// Create a default API client instance
export const apiClient = new ApiClient();

// Export commonly used API functions
export const api = {
  // Health check
  health: () => apiClient.healthCheck(),
  
  // Environment info
  env: () => apiClient.getEnvironmentInfo(),
  
  // Example API endpoints (customize based on your backend)
  users: {
    getAll: () => apiClient.get('/api/users'),
    getById: (id: string) => apiClient.get(`/api/users/${id}`),
    create: (data: any) => apiClient.post('/api/users', data),
    update: (id: string, data: any) => apiClient.put(`/api/users/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/users/${id}`),
  },
  
  // Add more API endpoints as needed
  // Example: posts, comments, etc.
};

export default apiClient;
