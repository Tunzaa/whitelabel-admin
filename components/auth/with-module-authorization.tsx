import React from 'react';
import { useModules } from '@/features/auth/hooks/use-modules';
import Forbidden from './forbidden';
import { Spinner } from '@/components/ui/spinner';

interface WithModuleAuthorizationProps {
  // Props that might be passed to the wrapped component
  [key: string]: any;
}

interface ModuleAuthorizationConfig {
  module: string;
}

/**
 * A Higher-Order Component (HOC) that protects a component based on module enablement.
 *
 * @param {React.ComponentType<P>} WrappedComponent - The component to protect.
 * @param {string} moduleName - The module name required to view the component.
 * @returns {React.FC<P>} A new component that renders the WrappedComponent if the module is enabled, otherwise renders a Forbidden page.
 */
export function withModuleAuthorization<P extends WithModuleAuthorizationProps>(
  WrappedComponent: React.ComponentType<P>,
  moduleName: string
): React.FC<P> {
  const AuthorizedComponent: React.FC<P> = (props) => {
    const { isModuleEnabled, isLoading } = useModules();

    if (isLoading) {
      return <Spinner />;
    }

    if (!isModuleEnabled(moduleName)) {
      return <Forbidden reason="module" moduleName={moduleName} />;
    }

    return <WrappedComponent {...props} />;
  };

  // Assign a display name for better debugging
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  AuthorizedComponent.displayName = `withModuleAuthorization(${displayName})`;

  return AuthorizedComponent;
}
