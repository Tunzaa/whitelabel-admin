/**
 * Core Module - Simple exports of our core functionality
 */

// Export API module
export { default as api } from './api';
export { useApiErrorStore } from './api';

// Export Auth module
export { default as auth } from './auth';
export {
  extractUserRoles
} from './auth';

// Export useAuthStore from the auth feature
export { default as useAuthStore } from '../../features/auth/store';

// Export types with proper syntax for isolatedModules
import type { ApiResponse, ApiError } from './api';
import type { AuthUser, CustomUser, AuthState } from './auth';

export type { ApiResponse, ApiError, AuthUser, CustomUser, AuthState };
