import { Permission } from '../features/auth/types';

/**
 * Cache utility for storing sensitive data with encoding to prevent tampering
 */

const CACHE_PREFIX = 'whitelabel_admin_cache_';
const CACHE_VERSION = 'v1';
const APP_SALT = process.env.NEXT_PUBLIC_APP_SALT || 'default_salt_change_in_prod';

// Simple encoding using base64 with salt
const encodeData = (data: any): string => {
  const jsonString = JSON.stringify(data);
  const saltedData = `${APP_SALT}:${jsonString}:${CACHE_VERSION}`;
  return btoa(saltedData);
};

const decodeData = (encodedData: string): any => {
  try {
    const decodedString = atob(encodedData);
    const parts = decodedString.split(':');
    if (parts.length < 3 || parts[parts.length - 1] !== CACHE_VERSION) {
      throw new Error('Invalid cache format or version');
    }
    const salt = parts[0];
    if (salt !== APP_SALT) {
      throw new Error('Invalid salt');
    }
    const jsonString = parts.slice(1, -1).join(':');
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to decode cached data:', error);
    return null;
  }
};

// Cache keys
export const CACHE_KEYS = {
  PERMISSIONS: 'permissions',
  MODULES: 'modules',
  TENANTS: 'tenants',
} as const;

type CacheKey = typeof CACHE_KEYS[keyof typeof CACHE_KEYS];

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  tenantId?: string;
  userId?: string;
}

const getCacheKey = (key: CacheKey, tenantId?: string, userId?: string): string => {
  return `${CACHE_PREFIX}${key}_${tenantId || 'global'}_${userId || 'anonymous'}`;
};

export const setCachedData = <T>(
  key: CacheKey,
  data: T,
  tenantId?: string,
  userId?: string
): void => {
  try {
    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      tenantId,
      userId,
    };
    const encoded = encodeData(cacheEntry);
    sessionStorage.setItem(getCacheKey(key, tenantId, userId), encoded);
  } catch (error) {
    console.warn('Failed to cache data:', error);
  }
};

export const getCachedData = <T>(
  key: CacheKey,
  tenantId?: string,
  userId?: string,
  maxAge: number = 30 * 60 * 1000 // 30 minutes default
): T | null => {
  try {
    const cacheKey = getCacheKey(key, tenantId, userId);
    const encoded = sessionStorage.getItem(cacheKey);
    if (!encoded) return null;

    const cacheEntry: CacheEntry<T> = decodeData(encoded);
    if (!cacheEntry || !cacheEntry.data) return null;

    // Check if cache is expired
    if (Date.now() - cacheEntry.timestamp > maxAge) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }

    return cacheEntry.data;
  } catch (error) {
    console.warn('Failed to retrieve cached data:', error);
    return null;
  }
};

export const clearCache = (key?: CacheKey, tenantId?: string, userId?: string): void => {
  if (key && tenantId && userId) {
    sessionStorage.removeItem(getCacheKey(key, tenantId, userId));
  } else if (key && tenantId) {
    // Clear all entries for this tenant
    const prefix = `${CACHE_PREFIX}${key}_${tenantId}_`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const storageKey = sessionStorage.key(i);
      if (storageKey && storageKey.startsWith(prefix)) {
        keysToRemove.push(storageKey);
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } else if (key) {
    // Clear all entries for this key
    const prefix = `${CACHE_PREFIX}${key}_`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const storageKey = sessionStorage.key(i);
      if (storageKey && storageKey.startsWith(prefix)) {
        keysToRemove.push(storageKey);
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } else {
    // Clear all cache
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const storageKey = sessionStorage.key(i);
      if (storageKey && storageKey.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(storageKey);
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  }
};

// Specific helpers for permissions
export const setCachedPermissions = (
  permissions: Permission[],
  tenantId: string,
  userId: string
): void => {
  setCachedData(CACHE_KEYS.PERMISSIONS, permissions, tenantId, userId);
};

export const getCachedPermissions = (
  tenantId: string,
  userId: string
): Permission[] | null => {
  return getCachedData<Permission[]>(CACHE_KEYS.PERMISSIONS, tenantId, userId);
};

// Specific helpers for modules
export const setCachedModules = (
  modules: Record<string, boolean>,
  tenantId: string
): void => {
  setCachedData(CACHE_KEYS.MODULES, modules, tenantId);
};

export const getCachedModules = (tenantId: string): Record<string, boolean> | null => {
  return getCachedData<Record<string, boolean>>(CACHE_KEYS.MODULES, tenantId);
};
