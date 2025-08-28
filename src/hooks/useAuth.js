/**
 * Auth Hooks - Custom hooks cho authentication và authorization
 */

import { useContext, useCallback, useState, useEffect } from 'react';
import AuthContext from '../contexts/AuthContext';
import { authAPI, rolesAPI, adminAPI } from '../services/authAPI-rbac';

/**
 * Hook chính để sử dụng auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook để kiểm tra permissions với loading state
 */
export function usePermission(resource, action) {
  const { hasPermission, isLoading } = useAuth();
  
  return {
    hasPermission: hasPermission(resource, action),
    isLoading
  };
}

/**
 * Hook để kiểm tra roles với loading state
 */
export function useRole(...roles) {
  const { hasRole, isLoading, role } = useAuth();
  
  return {
    hasRole: hasRole(...roles),
    currentRole: role,
    isLoading
  };
}

/**
 * Hook để quản lý login state
 */
export function useLogin() {
  const { login, isLoading, error, clearError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = useCallback(async (username, password) => {
    setIsSubmitting(true);
    clearError();
    
    try {
      const result = await login(username, password);
      return result;
    } finally {
      setIsSubmitting(false);
    }
  }, [login, clearError]);

  return {
    login: handleLogin,
    isLoading: isLoading || isSubmitting,
    error,
    clearError
  };
}

/**
 * Hook để quản lý roles data
 */
export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [rolesResponse, groupsResponse] = await Promise.all([
        rolesAPI.getRoles(),
        rolesAPI.getGroups()
      ]);

      if (rolesResponse.success) {
        setRoles(rolesResponse.data.roles);
      }

      if (groupsResponse.success) {
        setGroups(groupsResponse.data.groups);
      }
    } catch (err) {
      setError(err.message);
      console.error('❌ Lỗi fetch roles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    roles,
    groups,
    loading,
    error,
    refetch: fetchRoles
  };
}

/**
 * Hook để quản lý permissions matrix
 */
export function usePermissionsMatrix() {
  const [matrix, setMatrix] = useState({});
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMatrix = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await rolesAPI.getPermissionsMatrix();
      
      if (response.success) {
        setMatrix(response.data.matrix);
        setSummary(response.data.summary);
      }
    } catch (err) {
      setError(err.message);
      console.error('❌ Lỗi fetch permissions matrix:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  return {
    matrix,
    summary,
    loading,
    error,
    refetch: fetchMatrix
  };
}

/**
 * Hook để quản lý users (admin)
 */
export function useAdminUsers() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async (params = {}) => {
    if (!isAdmin) {
      setError('Không có quyền admin');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await adminAPI.getUsers(params);
      
      if (response.success) {
        setUsers(response.data.users);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      setError(err.message);
      console.error('❌ Lỗi fetch admin users:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const updateUserRole = useCallback(async (userId, role, groupCode) => {
    if (!isAdmin) {
      throw new Error('Không có quyền admin');
    }

    try {
      const response = await adminAPI.updateUserRole(userId, role, groupCode);
      
      if (response.success) {
        // Cập nhật user trong state
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === userId 
              ? { ...user, role, groupCode }
              : user
          )
        );
        return response;
      }
    } catch (err) {
      console.error('❌ Lỗi update user role:', err);
      throw err;
    }
  }, [isAdmin]);

  const deleteUser = useCallback(async (userId) => {
    if (!isAdmin) {
      throw new Error('Không có quyền admin');
    }

    try {
      const response = await adminAPI.deleteUser(userId);
      
      if (response.success) {
        // Xóa user khỏi state
        setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
        return response;
      }
    } catch (err) {
      console.error('❌ Lỗi delete user:', err);
      throw err;
    }
  }, [isAdmin]);

  const bulkUpdateRoles = useCallback(async (updates) => {
    if (!isAdmin) {
      throw new Error('Không có quyền admin');
    }

    try {
      const response = await adminAPI.bulkUpdateRoles(updates);
      
      if (response.success) {
        // Cập nhật users trong state
        setUsers(prevUsers => {
          const updatedUsers = [...prevUsers];
          
          response.data.updated.forEach(updated => {
            const index = updatedUsers.findIndex(user => user._id === updated.userId);
            if (index !== -1) {
              updatedUsers[index] = { 
                ...updatedUsers[index], 
                role: updated.role, 
                groupCode: updated.groupCode 
              };
            }
          });
          
          return updatedUsers;
        });
        
        return response;
      }
    } catch (err) {
      console.error('❌ Lỗi bulk update roles:', err);
      throw err;
    }
  }, [isAdmin]);

  return {
    users,
    pagination,
    loading,
    error,
    fetchUsers,
    updateUserRole,
    deleteUser,
    bulkUpdateRoles,
    refetch: fetchUsers
  };
}

/**
 * Hook để quản lý thống kê admin
 */
export function useAdminStats() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) {
      setError('Không có quyền admin');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await adminAPI.getStats();
      
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      setError(err.message);
      console.error('❌ Lỗi fetch admin stats:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin, fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}

/**
 * Hook để kiểm tra quyền truy cập component
 */
export function useAccess(resource, action) {
  const { canAccess, isLoading } = useAuth();
  
  return {
    canAccess: canAccess(resource, action),
    isLoading,
    render: (component) => canAccess(resource, action) ? component : null
  };
}

/**
 * Hook để xử lý conditional rendering dựa trên role
 */
export function useRoleGuard(...allowedRoles) {
  const { hasRole, isLoading } = useAuth();
  
  const isAllowed = hasRole(...allowedRoles);
  
  return {
    isAllowed,
    isLoading,
    render: (component) => isAllowed ? component : null,
    renderElse: (component, elseComponent) => isAllowed ? component : elseComponent
  };
}

export default useAuth;
