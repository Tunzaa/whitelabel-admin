/**
 * Auth Module - Re-exports from our centralized core module
 *
 * This file provides backward compatibility for code that imports from
 * the old structure. It re-exports everything from the new core module.
 */

// Re-export functions from the core auth module
export {
  extractUserRoles
} from '../core/auth';

// Re-export useAuthStore from the auth feature
export { default as useAuthStore } from '../../features/auth/store';

// Re-export types with proper syntax for isolatedModules
import type { AuthUser, CustomUser, AuthState } from '../core/auth';
export type { AuthUser, CustomUser, AuthState };

// For complete backward compatibility
export { default } from '../core/auth';
