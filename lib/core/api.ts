/**
 * Centralized API Client & Token Management
 *
 * Provides a simple, centralized API client with token management
 * and automatic token refresh.
 */

import axios, { AxiosInstance } from 'axios';
import { toast } from 'sonner';
import { create } from 'zustand';

// API Response type for consistent typing
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

// API Error format
export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

// Token Management
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

const getRefreshToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refresh_token');
  }
  return null;
};

const setTokens = (accessToken: string, refreshToken?: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
  }
};

const clearTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
  }
};

// API Error Store for global error handling
export const useApiErrorStore = create<{
  error: ApiError | null;
  setError: (error: ApiError) => void;
  clearError: () => void;
}>((set) => ({
  error: null,
  setError: (error: ApiError) => set({ error }),
  clearError: () => set({ error: null }),
}));

// Create the API client
const createApiClient = () => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

  // Main API client with interceptors
  const apiClient = axios.create({
    baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });

  // File upload client (no default Content-Type)
  const fileUploadClient = axios.create({
    baseURL,
    timeout: 30000,
  });

  // Auth-specific client (without token refresh to avoid circular references)
  const authClient = axios.create({
    baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });

  // --- Auth Interceptor ---
  function addAuthInterceptors(client: AxiosInstance) {
    // Add auth token and tenant ID to requests
    client.interceptors.request.use(
      (config) => {
        // Prevent requests to /tenants/null or /tenants/undefined
        if (config.url?.includes('/tenants/null') || config.url?.includes('/tenants/undefined')) {
          return Promise.reject(new Error('Invalid Tenant ID in URL'));
        }

        const token = getToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;

        // Get tenant ID from localStorage
        if (typeof window !== 'undefined') {
          try {
            const tenantStorage = localStorage.getItem('selected-tenant-storage');
            if (tenantStorage) {
              const parsed = JSON.parse(tenantStorage);
              const tenantId = parsed?.state?.selectedTenantId;
              if (tenantId) {
                config.headers['X-Tenant-ID'] = tenantId;
              }
            }
          } catch {
            // Ignore parsing errors
          }
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    let isRefreshing = false;
    let failedQueue: { resolve: (token: string) => void; reject: (err: any) => void }[] = [];

    const processQueue = (error: any, token: string | null = null) => {
      failedQueue.forEach(prom => {
        if (error) {
          prom.reject(error);
        } else {
          prom.resolve(token!);
        }
      });
      failedQueue = [];
    };

    // Handle 401 errors and token refresh
    client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const { response } = error;

        // Handle expired tokens (401 Unauthorized)
        if (response?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then(token => {
                originalRequest.headers['Authorization'] = 'Bearer ' + token;
                return client(originalRequest);
              })
              .catch(err => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const refreshToken = getRefreshToken();
            if (!refreshToken) {
              const noTokenError = new Error('No refresh token available');
              processQueue(noTokenError, null);
              clearTokens();
              if (typeof window !== 'undefined') window.location.href = '/';
              return Promise.reject(noTokenError);
            }

            const refreshResponse = await authClient.post('/auth/refresh', {
              refresh_token: refreshToken
            });

            const data = refreshResponse.data as any;
            if (data.access_token) {
              setTokens(data.access_token, data.refresh_token);
              client.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
              originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
              processQueue(null, data.access_token);
              return client(originalRequest);
            }
            // If refresh response is malformed
            throw new Error('Invalid token refresh response');
          } catch (refreshError) {
            processQueue(refreshError, null);
            clearTokens();
            if (typeof window !== 'undefined') window.location.href = '/';
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        // Global error handling
        if (response?.data?.message && response?.status !== 401) {
          toast.error(response.data.message);
        }

        return Promise.reject(error);
      }
    );

    // Add retry for network errors
    client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const { config, response } = error;
        if (!config || !config.retries) return Promise.reject(error);

        if ((!response || response.status >= 500) && config.retries > 0) {
          config.retries--;
          return client(config);
        }

        return Promise.reject(error);
      }
    );
  }

  // Apply interceptors to both apiClient and fileUploadClient
  addAuthInterceptors(apiClient);
  addAuthInterceptors(fileUploadClient);

  // Simple wrapper functions
  return {
    get: <T>(url: string, params?: any, headers?: Record<string, string>) => {
      return apiClient.get<ApiResponse<T>>(url, { params, headers });
    },
    post: <T>(url: string, data?: any, headers?: Record<string, string>) => {
      return apiClient.post<ApiResponse<T>>(url, data, { headers });
    },
    put: <T>(url: string, data?: any, headers?: Record<string, string>) => {
      return apiClient.put<ApiResponse<T>>(url, data, { headers });
    },
    patch: <T>(url: string, data?: any, headers?: Record<string, string>) => {
      return apiClient.patch<ApiResponse<T>>(url, data, { headers });
    },
    delete: <T>(url: string, data?: any, headers?: Record<string, string>) => {
      return apiClient.delete<ApiResponse<T>>(url, { data, headers });
    },
    // File upload method using fileUploadClient
    postFile: <T>(url: string, data?: any, headers?: Record<string, string>) => {
      return fileUploadClient.post<T>(url, data, { headers });
    },
    // Auth specific methods (using authClient)
    auth: {
      login: async (email: string, password: string) => {
        const response = await authClient.post('/auth/login', {
          identifier: email,
          password,
          is_phone: false
        });

        const data = response.data as any;
        if (data.access_token) {
          setTokens(data.access_token, data.refresh_token);
        }

        return data;
      },
      refreshToken: async (refreshToken: string) => {
        const response = await authClient.post('/auth/refresh', {
          refresh_token: refreshToken
        });

        const data = response.data as any;
        if (data.access_token) {
          setTokens(data.access_token, data.refresh_token);
        }

        return data;
      },
      logout: () => {
        clearTokens();
      },
      getToken,
      getRefreshToken,
      setTokens,
      clearTokens,
    }
  };
};

// Export a singleton instance
const api = createApiClient();
export default api;
