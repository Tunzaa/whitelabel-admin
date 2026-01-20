/**
 * Centralized API Client & Token Management
 *
 * This module provides a simple, centralized API client with token management
 * and automatic token refresh.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
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

// Token Management - Handles both localStorage and session storage methods
const getToken = () => {
  // First check localStorage
  if (typeof window !== 'undefined') {
    const localToken = localStorage.getItem('token');
    if (localToken) return localToken;

    // If not in localStorage, try to get from Next.js session
    // Note: This won't directly access HTTP-only cookies, but the session
    // data might be available in the window.__NEXT_DATA__ object
    try {
      // @ts-ignore - This is a Next.js specific property
      const nextData = window.__NEXT_DATA__;
      if (nextData?.props?.pageProps?.session?.accessToken) {
        // We found a token in the session, let's also save it to localStorage for future use
        const sessionToken = nextData.props.pageProps.session.accessToken;
        localStorage.setItem('token', sessionToken);
        return sessionToken;
      }
    } catch (e) {
      console.error('Error accessing session data:', e);
    }
  }
  return null;
};

const getRefreshToken = () => {
  // Check localStorage first
  if (typeof window !== 'undefined') {
    const localRefreshToken = localStorage.getItem('refresh_token');
    if (localRefreshToken) return localRefreshToken;

    // Try to get from Next.js session
    try {
      // @ts-ignore - This is a Next.js specific property
      const nextData = window.__NEXT_DATA__;
      if (nextData?.props?.pageProps?.session?.user?.token) {
        // Save to localStorage for future use
        const sessionRefreshToken = nextData.props.pageProps.session.user.token;
        localStorage.setItem('refresh_token', sessionRefreshToken);
        return sessionRefreshToken;
      }
    } catch (e) {
      console.error('Error accessing session refresh token:', e);
    }
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

// Function to synchronize tokens from NextAuth session to localStorage
// Call this from components after login
const syncTokensFromSession = () => {
  if (typeof window !== 'undefined') {
    try {
      // @ts-ignore - This is a Next.js specific property
      const nextData = window.__NEXT_DATA__;
      const session = nextData?.props?.pageProps?.session;

      if (session?.accessToken) {
        localStorage.setItem('token', session.accessToken);
      }

      if (session?.user?.token) {
        localStorage.setItem('refresh_token', session.user.token);
      }
    } catch (e) {
      console.error('Error synchronizing tokens from session:', e);
    }
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
  
  // Debug: Log the base URL to verify it's being read
  if (typeof window !== 'undefined') {
    console.log('API Base URL:', baseURL);
  }

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
    // No headers here; Axios will set Content-Type for FormData
  });

  // Auth-specific client (without token refresh to avoid circular references)
  const authClient = axios.create({
    baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });

  // --- Monitoring Interceptor ---
  const addMonitoringInterceptors = (client: AxiosInstance) => {
    client.interceptors.request.use((config) => {
      // @ts-ignore
      config.metadata = { startTime: new Date() };
      return config;
    });

    client.interceptors.response.use(
      (response) => {
        // @ts-ignore
        const startTime = response.config.metadata?.startTime;
        if (startTime) {
          const duration = new Date().getTime() - startTime.getTime();
          if (duration > 5000) {
            console.warn(`[Slow Request] ${response.config.method?.toUpperCase()} ${response.config.url} took ${duration}ms`);
          }
        }
        return response;
      },
      (error) => {
        // @ts-ignore
        const startTime = error.config?.metadata?.startTime;
        if (startTime) {
          const duration = new Date().getTime() - startTime.getTime();
          console.error(`[Request Failed] ${error.config?.method?.toUpperCase()} ${error.config?.url} failed after ${duration}ms`);
        }
        return Promise.reject(error);
      }
    );
  };

  addMonitoringInterceptors(apiClient);
  addMonitoringInterceptors(fileUploadClient);
  addMonitoringInterceptors(authClient);

  // --- Interceptor logic as a reusable function ---
  function addAuthInterceptors(client: AxiosInstance) {
    // Add auth token to requests
    client.interceptors.request.use(
      (config) => {
        const token = getToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
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


  // --- Request Deduplication Logic ---
  const pendingRequests = new Map<string, Promise<any>>();

  const generateRequestKey = (method: string, url: string, config: AxiosRequestConfig = {}): string => {
    const { data, params } = config;
    // A simple but effective way to serialize the request identifying properties.
    // Sorting keys ensures that {a: 1, b: 2} and {b: 2, a: 1} produce the same key.
    const sortedData = data && typeof data === 'object' ? JSON.stringify(Object.keys(data).sort().reduce((obj, key) => { (obj as any)[key] = data[key]; return obj; }, {})) : '';
    const sortedParams = params && typeof params === 'object' ? JSON.stringify(Object.keys(params).sort().reduce((obj, key) => { (obj as any)[key] = params[key]; return obj; }, {})) : '';
    return `${method.toUpperCase()}:${url}:${sortedData}:${sortedParams}`;
  };

  const requestWithDeduplication = <T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    config: AxiosRequestConfig = {}
  ) => {
    const key = generateRequestKey(method, url, config);

    if (pendingRequests.has(key)) {
      // console.log(`[Deduplication] Found pending request for key: ${key}`);
      return pendingRequests.get(key)! as Promise<import('axios').AxiosResponse<ApiResponse<T>>>;
    }

    const promise = apiClient
      .request<ApiResponse<T>>({
        method,
        url,
        ...config,
      })
      .finally(() => {
        pendingRequests.delete(key);
      });

    pendingRequests.set(key, promise);
    return promise;
  };

  // Simple wrapper functions with deduplication
  return {
    get: <T>(url: string, params?: any, headers?: Record<string, string>) => {
      return requestWithDeduplication<T>('get', url, { params, headers });
    },
    post: <T>(url: string, data?: any, headers?: Record<string, string>) => {
      return requestWithDeduplication<T>('post', url, { data, headers });
    },
    put: <T>(url: string, data?: any, headers?: Record<string, string>) => {
      return requestWithDeduplication<T>('put', url, { data, headers });
    },
    patch: <T>(url: string, data?: any, headers?: Record<string, string>) => {
      return requestWithDeduplication<T>('patch', url, { data, headers });
    },
    delete: <T>(url: string, data?: any, headers?: Record<string, string>) => {
      return requestWithDeduplication<T>('delete', url, { data, headers });
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
      syncTokensFromSession
    }
  };
};

// Export a singleton instance
const api = createApiClient();
export default api;
