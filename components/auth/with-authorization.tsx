"use client";

import React from 'react';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { Permission, Role } from '@/features/auth/types';
import Forbidden from './forbidden';
import { Spinner } from '@/components/ui/spinner';

interface WithAuthorizationProps {
  // Props that might be passed to the wrapped component
  [key: string]: unknown;
}

interface AuthorizationConfig {
  permission?: Permission;
  role?: Role;
}

/**
 * A Higher-Order Component (HOC) that protects a component based on user permissions and/or roles.
 *
 * @param {React.ComponentType<P>} WrappedComponent - The component to protect.
 * @param {Permission | AuthorizationConfig} config - The permission/role required to view the component.
 * @returns {React.FC<P>} A new component that renders the WrappedComponent if the user
 * has the required permission/role, otherwise renders a Forbidden page.
 */
export function withAuthorization<P extends WithAuthorizationProps>(
  WrappedComponent: React.ComponentType<P>,
  config: Permission | AuthorizationConfig
): React.FC<P> {
  const AuthorizedComponent: React.FC<P> = (props) => {
    const { canAccess, isLoading } = usePermissions();

    if (isLoading) {
      return <Spinner />;
    }

    // Handle backward compatibility - if config is a string, treat it as permission
    const permission = typeof config === 'string' ? config : config.permission;
    const role = typeof config === 'object' ? config.role : undefined;

    if (!canAccess(permission, role)) {
      return <Forbidden />;
    }

    return <WrappedComponent {...props} />;
  };

  // Assign a display name for better debugging
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  AuthorizedComponent.displayName = `withAuthorization(${displayName})`;

  return AuthorizedComponent;
}
