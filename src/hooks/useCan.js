/**
 * useCan hook - Check permissions on client side (UI only)
 */

import { useAuth } from './useAuth';

/**
 * Hook to check if user has specific permission
 * @param {string} resource - Resource name (users, schedules, etc.)
 * @param {string} action - Action name (view, edit, delete)
 * @returns {boolean} - True if user has permission
 */
export function useCan(resource, action) {
  const { user, permissions, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !permissions) {
    return false;
  }
  
  // Admin has all permissions
  if (user?.role?.name === 'ADMIN') {
    return true;
  }
  
  const requiredPermission = `${resource}.${action}`;
  return permissions.includes(requiredPermission);
}

/**
 * Hook to check multiple permissions at once
 * @param {Array} permissionsList - Array of {resource, action} objects
 * @returns {Object} - Object with permission results
 */
export function useCanMultiple(permissionsList) {
  const { permissions, user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !permissions) {
    return permissionsList.reduce((acc, { resource, action }) => {
      acc[`${resource}.${action}`] = false;
      return acc;
    }, {});
  }
  
  const isAdmin = user?.role?.name === 'ADMIN';
  
  return permissionsList.reduce((acc, { resource, action }) => {
    const key = `${resource}.${action}`;
    acc[key] = isAdmin || permissions.includes(key);
    return acc;
  }, {});
}

/**
 * Hook to check if user has specific role
 * @param {...string} roles - Role names to check
 * @returns {boolean} - True if user has any of the roles
 */
export function useHasRole(...roles) {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !user?.role?.name) {
    return false;
  }
  
  return roles.includes(user.role.name);
}

/**
 * Hook to check if user is admin
 * @returns {boolean} - True if user is admin
 */
export function useIsAdmin() {
  const { user, isAuthenticated } = useAuth();
  return isAuthenticated && user?.role?.name === 'ADMIN';
}

/**
 * Custom hook for conditional rendering based on permissions
 * @param {string} resource 
 * @param {string} action 
 * @returns {Object} - { canAccess, isLoading }
 */
export function usePermissionGuard(resource, action) {
  const { isLoading, isAuthenticated } = useAuth();
  const canAccess = useCan(resource, action);
  
  return {
    canAccess: isAuthenticated && canAccess,
    isLoading,
    isAuthenticated
  };
}

export default useCan;










